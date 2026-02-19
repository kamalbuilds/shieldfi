const { ethers } = require("ethers");
const {
  pancakePositionManager,
  pancakeFactory,
  getPoolContract,
  getERC20Contract,
} = require("../blockchain/contracts");
const config = require("../config");

/**
 * Calculate the price from sqrtPriceX96 (Uniswap V3 / PancakeSwap V3 format).
 * @param {bigint} sqrtPriceX96
 * @param {number} decimals0
 * @param {number} decimals1
 * @returns {number} price of token0 in terms of token1
 */
function sqrtPriceX96ToPrice(sqrtPriceX96, decimals0, decimals1) {
  const sqrtPrice = Number(sqrtPriceX96) / 2 ** 96;
  const price = sqrtPrice * sqrtPrice;
  // Adjust for decimal differences
  return price * Math.pow(10, decimals0 - decimals1);
}

/**
 * Calculate token amounts from liquidity and tick range.
 * @param {bigint} liquidity
 * @param {number} currentTick
 * @param {number} tickLower
 * @param {number} tickUpper
 * @param {number} decimals0
 * @param {number} decimals1
 * @returns {{ amount0: number, amount1: number }}
 */
function getAmountsFromLiquidity(
  liquidity,
  currentTick,
  tickLower,
  tickUpper,
  decimals0,
  decimals1
) {
  const liq = Number(liquidity);

  const sqrtPriceCurrent = Math.sqrt(1.0001 ** currentTick);
  const sqrtPriceLower = Math.sqrt(1.0001 ** tickLower);
  const sqrtPriceUpper = Math.sqrt(1.0001 ** tickUpper);

  let amount0 = 0;
  let amount1 = 0;

  if (currentTick < tickLower) {
    // All in token0
    amount0 =
      liq * (1 / sqrtPriceLower - 1 / sqrtPriceUpper) / Math.pow(10, decimals0);
  } else if (currentTick >= tickUpper) {
    // All in token1
    amount1 =
      liq * (sqrtPriceUpper - sqrtPriceLower) / Math.pow(10, decimals1);
  } else {
    // Mixed
    amount0 =
      liq *
      (1 / sqrtPriceCurrent - 1 / sqrtPriceUpper) /
      Math.pow(10, decimals0);
    amount1 =
      liq * (sqrtPriceCurrent - sqrtPriceLower) / Math.pow(10, decimals1);
  }

  return {
    amount0: Math.max(0, amount0),
    amount1: Math.max(0, amount1),
  };
}

/**
 * Calculate impermanent loss percentage.
 * @param {number} entryPrice - Price at entry
 * @param {number} currentPrice - Current price
 * @returns {number} IL percentage (positive means loss)
 */
function calculateImpermanentLoss(entryPrice, currentPrice) {
  if (entryPrice <= 0 || currentPrice <= 0) return 0;
  const priceRatio = currentPrice / entryPrice;
  const sqrtRatio = Math.sqrt(priceRatio);
  const il = (2 * sqrtRatio) / (1 + priceRatio) - 1;
  return Math.abs(il) * 100; // Return as positive percentage
}

/**
 * Get the pool price data for a PancakeSwap V3 pool.
 * @param {string} poolAddress
 * @returns {Promise<{sqrtPriceX96: bigint, currentTick: number, token0Price: number, token1Price: number}>}
 */
async function getPoolPrice(poolAddress) {
  const pool = getPoolContract(poolAddress);
  const slot0 = await pool.slot0();
  const sqrtPriceX96 = slot0[0];
  const currentTick = Number(slot0[1]);

  // Get token addresses and decimals
  const [token0Addr, token1Addr] = await Promise.all([
    pool.token0(),
    pool.token1(),
  ]);

  const token0Contract = getERC20Contract(token0Addr);
  const token1Contract = getERC20Contract(token1Addr);

  let decimals0 = 18;
  let decimals1 = 18;
  try {
    decimals0 = Number(await token0Contract.decimals());
    decimals1 = Number(await token1Contract.decimals());
  } catch (e) {
    // Default to 18
  }

  const token0Price = sqrtPriceX96ToPrice(sqrtPriceX96, decimals0, decimals1);
  const token1Price = token0Price > 0 ? 1 / token0Price : 0;

  return {
    sqrtPriceX96,
    currentTick,
    token0Price,
    token1Price,
    token0: token0Addr,
    token1: token1Addr,
    decimals0,
    decimals1,
  };
}

/**
 * Get all PancakeSwap V3 LP positions for a user.
 * @param {string} userAddress
 * @returns {Promise<Array>} Array of position objects
 */
async function getLPPositions(userAddress) {
  try {
    const balanceBN = await pancakePositionManager.balanceOf(userAddress);
    const balance = Number(balanceBN);

    if (balance === 0) {
      return [];
    }

    // Get all position token IDs
    const tokenIdPromises = [];
    for (let i = 0; i < balance; i++) {
      tokenIdPromises.push(
        pancakePositionManager.tokenOfOwnerByIndex(userAddress, i)
      );
    }
    const tokenIds = await Promise.all(tokenIdPromises);

    // Get all position data
    const positions = await Promise.all(
      tokenIds.map(async (tokenId) => {
        try {
          const position = await pancakePositionManager.positions(tokenId);

          const token0 = position[2]; // token0 address
          const token1 = position[3]; // token1 address
          const fee = Number(position[4]); // fee tier
          const tickLower = Number(position[5]);
          const tickUpper = Number(position[6]);
          const liquidity = position[7]; // uint128

          if (BigInt(liquidity) === 0n) {
            return null; // Skip empty positions
          }

          const tokensOwed0 = position[10];
          const tokensOwed1 = position[11];

          // Get the pool address
          const poolAddress = await pancakeFactory.getPool(
            token0,
            token1,
            fee
          );

          if (
            poolAddress === "0x0000000000000000000000000000000000000000"
          ) {
            return null;
          }

          // Get pool data
          const poolData = await getPoolPrice(poolAddress);
          const currentTick = poolData.currentTick;

          // Get token symbols
          const token0Symbol =
            config.tokenSymbols[ethers.getAddress(token0)] || "UNKNOWN";
          const token1Symbol =
            config.tokenSymbols[ethers.getAddress(token1)] || "UNKNOWN";

          // Calculate token amounts from liquidity and tick range
          const amounts = getAmountsFromLiquidity(
            liquidity,
            currentTick,
            tickLower,
            tickUpper,
            poolData.decimals0,
            poolData.decimals1
          );

          // Check if position is in range
          const inRange = currentTick >= tickLower && currentTick < tickUpper;

          // Estimate IL (using midpoint of tick range as entry)
          const entryTick = (tickLower + tickUpper) / 2;
          const entryPrice = 1.0001 ** entryTick;
          const currentPrice = 1.0001 ** currentTick;
          const impermanentLoss = calculateImpermanentLoss(
            entryPrice,
            currentPrice
          );

          // Uncollected fees
          const feesEarned0 =
            Number(tokensOwed0) / Math.pow(10, poolData.decimals0);
          const feesEarned1 =
            Number(tokensOwed1) / Math.pow(10, poolData.decimals1);

          return {
            positionId: tokenId.toString(),
            token0: ethers.getAddress(token0),
            token1: ethers.getAddress(token1),
            token0Symbol,
            token1Symbol,
            fee,
            feeTier: `${fee / 10000}%`,
            liquidity: liquidity.toString(),
            tickLower,
            tickUpper,
            currentTick,
            inRange,
            token0Amount: parseFloat(amounts.amount0.toFixed(8)),
            token1Amount: parseFloat(amounts.amount1.toFixed(8)),
            feesEarned0: parseFloat(feesEarned0.toFixed(8)),
            feesEarned1: parseFloat(feesEarned1.toFixed(8)),
            impermanentLoss: parseFloat(impermanentLoss.toFixed(4)),
            poolAddress,
          };
        } catch (err) {
          console.error(
            `[PancakeSwap] Error reading position ${tokenId}:`,
            err.message
          );
          return null;
        }
      })
    );

    return positions.filter((p) => p !== null);
  } catch (err) {
    console.error("[PancakeSwap] Error fetching LP positions:", err.message);
    return [];
  }
}

module.exports = {
  getLPPositions,
  calculateImpermanentLoss,
  getPoolPrice,
  sqrtPriceX96ToPrice,
  getAmountsFromLiquidity,
};
