const { ethers } = require("ethers");
const {
  venusComptroller,
  venusOracle,
  getVTokenContract,
} = require("../blockchain/contracts");
const config = require("../config");

/**
 * Get the Venus APY for a given vToken.
 * @param {string} vTokenAddress
 * @returns {Promise<{supplyAPY: number, borrowAPY: number}>}
 */
async function getVenusAPY(vTokenAddress) {
  const vToken = getVTokenContract(vTokenAddress);

  const [supplyRatePerBlock, borrowRatePerBlock] = await Promise.all([
    vToken.supplyRatePerBlock(),
    vToken.borrowRatePerBlock(),
  ]);

  // APY = ((1 + ratePerBlock / 1e18) ^ blocksPerYear - 1) * 100
  const blocksPerYear = config.blocksPerYear;
  const supplyRate = Number(supplyRatePerBlock) / 1e18;
  const borrowRate = Number(borrowRatePerBlock) / 1e18;

  const supplyAPY = (Math.pow(1 + supplyRate, blocksPerYear) - 1) * 100;
  const borrowAPY = (Math.pow(1 + borrowRate, blocksPerYear) - 1) * 100;

  return {
    supplyAPY: Math.min(supplyAPY, 999999), // cap insane values
    borrowAPY: Math.min(borrowAPY, 999999),
  };
}

/**
 * Calculate a health factor from Venus account liquidity data.
 * liquidity > 0 means the account is healthy; shortfall > 0 means it can be liquidated.
 * @param {bigint} liquidity - Excess liquidity in USD (18 decimals)
 * @param {bigint} shortfall - Shortfall in USD (18 decimals)
 * @param {number} totalBorrowUSD - Total borrow value in USD
 * @returns {number} health factor (e.g. 2.5 means 2.5x over-collateralised)
 */
function calculateHealthFactor(liquidity, shortfall, totalBorrowUSD) {
  if (totalBorrowUSD === 0) {
    return 999; // No borrows = effectively infinite health
  }

  const liquidityUSD = Number(ethers.formatEther(liquidity));
  const shortfallUSD = Number(ethers.formatEther(shortfall));

  if (shortfallUSD > 0) {
    // Account is below liquidation threshold
    // Health factor is < 1 in this case
    return Math.max(0, 1 - shortfallUSD / totalBorrowUSD);
  }

  // Health factor = (totalBorrowUSD + excessLiquidity) / totalBorrowUSD
  return (totalBorrowUSD + liquidityUSD) / totalBorrowUSD;
}

/**
 * Get all Venus Protocol positions for a user address.
 * @param {string} userAddress
 * @returns {Promise<Object>} Full Venus position data
 */
async function getVenusPositions(userAddress) {
  try {
    // 1. Get markets the user has entered
    const enteredMarkets = await venusComptroller.getAssetsIn(userAddress);

    if (!enteredMarkets || enteredMarkets.length === 0) {
      return {
        markets: [],
        healthFactor: 999,
        totalSupplyUSD: 0,
        totalBorrowUSD: 0,
        liquidationRisk: "NONE",
        netAPY: 0,
      };
    }

    // 2. Get account liquidity (error, liquidity, shortfall)
    const [error, liquidity, shortfall] =
      await venusComptroller.getAccountLiquidity(userAddress);

    // 3. For each entered market, get supply/borrow balances and prices
    const marketData = await Promise.all(
      enteredMarkets.map(async (vTokenAddress) => {
        const vToken = getVTokenContract(vTokenAddress);
        const vAddr = vTokenAddress.toLowerCase();

        // Parallel calls
        const [
          accountSnapshot,
          underlyingPrice,
          supplyRatePerBlock,
          borrowRatePerBlock,
        ] = await Promise.all([
          vToken.getAccountSnapshot(userAddress),
          venusOracle.getUnderlyingPrice(vTokenAddress),
          vToken.supplyRatePerBlock(),
          vToken.borrowRatePerBlock(),
        ]);

        // getAccountSnapshot returns: (error, vTokenBalance, borrowBalance, exchangeRateMantissa)
        const [snapError, vTokenBalance, borrowBalance, exchangeRate] =
          accountSnapshot;

        // Get symbol
        const symbol =
          config.vTokenNames[ethers.getAddress(vTokenAddress)] || "Unknown";

        // Determine decimals based on token type
        // vBNB underlying (BNB) has 18 decimals, all others also 18 on BSC
        const underlyingDecimals = 18;

        // Calculate supply balance in underlying tokens
        // supplyBalance = vTokenBalance * exchangeRate / 1e18
        const supplyBalanceRaw =
          (BigInt(vTokenBalance) * BigInt(exchangeRate)) / BigInt(1e18);
        const supplyBalance =
          Number(supplyBalanceRaw) / Math.pow(10, underlyingDecimals);
        const borrowBalanceNum =
          Number(borrowBalance) / Math.pow(10, underlyingDecimals);

        // Price is in USD with 18 decimals
        const priceUSD = Number(underlyingPrice) / 1e18;

        const supplyUSD = supplyBalance * priceUSD;
        const borrowUSD = borrowBalanceNum * priceUSD;

        // Calculate APYs
        const blocksPerYear = config.blocksPerYear;
        const supplyRate = Number(supplyRatePerBlock) / 1e18;
        const borrowRate = Number(borrowRatePerBlock) / 1e18;
        const supplyAPY = (Math.pow(1 + supplyRate, blocksPerYear) - 1) * 100;
        const borrowAPY = (Math.pow(1 + borrowRate, blocksPerYear) - 1) * 100;

        return {
          vTokenAddress: ethers.getAddress(vTokenAddress),
          symbol,
          supplyBalance,
          borrowBalance: borrowBalanceNum,
          supplyUSD,
          borrowUSD,
          priceUSD,
          supplyAPY: Math.min(supplyAPY, 999999),
          borrowAPY: Math.min(borrowAPY, 999999),
        };
      })
    );

    // Aggregate totals
    const totalSupplyUSD = marketData.reduce(
      (sum, m) => sum + m.supplyUSD,
      0
    );
    const totalBorrowUSD = marketData.reduce(
      (sum, m) => sum + m.borrowUSD,
      0
    );

    // Calculate health factor
    const healthFactor = calculateHealthFactor(
      liquidity,
      shortfall,
      totalBorrowUSD
    );

    // Net APY
    let netAPY = 0;
    if (totalSupplyUSD > 0) {
      const weightedSupplyAPY = marketData.reduce(
        (sum, m) =>
          sum + (m.supplyAPY * m.supplyUSD) / Math.max(totalSupplyUSD, 1),
        0
      );
      const weightedBorrowAPY =
        totalBorrowUSD > 0
          ? marketData.reduce(
              (sum, m) =>
                sum +
                (m.borrowAPY * m.borrowUSD) / Math.max(totalBorrowUSD, 1),
              0
            )
          : 0;
      netAPY =
        weightedSupplyAPY -
        (weightedBorrowAPY * totalBorrowUSD) / Math.max(totalSupplyUSD, 1);
    }

    // Liquidation risk classification
    let liquidationRisk;
    if (healthFactor >= 2.0) liquidationRisk = "LOW";
    else if (healthFactor >= 1.5) liquidationRisk = "MODERATE";
    else if (healthFactor >= 1.2) liquidationRisk = "HIGH";
    else liquidationRisk = "CRITICAL";

    return {
      markets: marketData.filter(
        (m) => m.supplyBalance > 0 || m.borrowBalance > 0
      ),
      healthFactor: parseFloat(healthFactor.toFixed(4)),
      totalSupplyUSD: parseFloat(totalSupplyUSD.toFixed(2)),
      totalBorrowUSD: parseFloat(totalBorrowUSD.toFixed(2)),
      liquidationRisk,
      netAPY: parseFloat(netAPY.toFixed(2)),
      liquidityUSD: parseFloat(Number(ethers.formatEther(liquidity)).toFixed(2)),
      shortfallUSD: parseFloat(Number(ethers.formatEther(shortfall)).toFixed(2)),
    };
  } catch (err) {
    console.error("[Venus] Error fetching positions:", err.message);
    return {
      markets: [],
      healthFactor: 999,
      totalSupplyUSD: 0,
      totalBorrowUSD: 0,
      liquidationRisk: "UNKNOWN",
      netAPY: 0,
      error: err.message,
    };
  }
}

module.exports = {
  getVenusPositions,
  getVenusAPY,
  calculateHealthFactor,
};
