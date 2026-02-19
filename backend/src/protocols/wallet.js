const fetch = require("node-fetch");
const { ethers } = require("ethers");
const { provider } = require("../blockchain/provider");
const { getERC20Contract } = require("../blockchain/contracts");
const config = require("../config");

/**
 * Fetch token list from BSCScan API for a given address.
 * Falls back to manual token checks if BSCScan API key is unavailable.
 * @param {string} userAddress
 * @returns {Promise<Array>} Array of token balance objects
 */
async function getTokenListFromBSCScan(userAddress) {
  if (!config.bscscanApiKey) {
    // Fallback: check known tokens manually
    return await getKnownTokenBalances(userAddress);
  }

  try {
    const url = `https://api.bscscan.com/api?module=account&action=tokenlist&address=${userAddress}&apikey=${config.bscscanApiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "1" && Array.isArray(data.result)) {
      return data.result.map((t) => ({
        tokenAddress: t.TokenAddress,
        symbol: t.TokenSymbol || "UNKNOWN",
        name: t.TokenName || "Unknown Token",
        decimals: parseInt(t.TokenDivisor) || 18,
        balance: t.TokenQuantity || "0",
      }));
    }

    // If BSCScan returns error, fall back
    return await getKnownTokenBalances(userAddress);
  } catch (err) {
    console.error("[Wallet] BSCScan API error:", err.message);
    return await getKnownTokenBalances(userAddress);
  }
}

/**
 * Check balances for well-known BSC tokens.
 * @param {string} userAddress
 * @returns {Promise<Array>}
 */
async function getKnownTokenBalances(userAddress) {
  const knownTokens = [
    { address: config.tokens.WBNB, symbol: "WBNB", decimals: 18 },
    { address: config.tokens.USDT, symbol: "USDT", decimals: 18 },
    { address: config.tokens.USDC, symbol: "USDC", decimals: 18 },
    { address: config.tokens.BUSD, symbol: "BUSD", decimals: 18 },
    { address: config.tokens.ETH, symbol: "ETH", decimals: 18 },
    { address: config.tokens.BTCB, symbol: "BTCB", decimals: 18 },
    { address: config.tokens.DAI, symbol: "DAI", decimals: 18 },
  ];

  const results = await Promise.all(
    knownTokens.map(async (token) => {
      try {
        const contract = getERC20Contract(token.address);
        const balance = await contract.balanceOf(userAddress);
        return {
          tokenAddress: token.address,
          symbol: token.symbol,
          name: token.symbol,
          decimals: token.decimals,
          balance: ethers.formatUnits(balance, token.decimals),
        };
      } catch {
        return {
          tokenAddress: token.address,
          symbol: token.symbol,
          name: token.symbol,
          decimals: token.decimals,
          balance: "0",
        };
      }
    })
  );

  return results.filter((r) => parseFloat(r.balance) > 0);
}

/**
 * Fetch USD prices from DexScreener API for BSC tokens.
 * @param {string[]} tokenAddresses
 * @returns {Promise<Object>} Map of address -> priceUSD
 */
async function getTokenPricesFromDexScreener(tokenAddresses) {
  const prices = {};

  // DexScreener supports batch lookup by token address
  // We batch into groups of 30 for API efficiency
  const batchSize = 30;
  for (let i = 0; i < tokenAddresses.length; i += batchSize) {
    const batch = tokenAddresses.slice(i, i + batchSize);
    const addressList = batch.join(",");

    try {
      const url = `https://api.dexscreener.com/latest/dex/tokens/${addressList}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.pairs && Array.isArray(data.pairs)) {
        for (const pair of data.pairs) {
          if (pair.chainId === "bsc") {
            const baseAddr = pair.baseToken?.address?.toLowerCase();
            const quoteAddr = pair.quoteToken?.address?.toLowerCase();
            const priceUsd = parseFloat(pair.priceUsd) || 0;

            if (baseAddr && priceUsd > 0 && !prices[baseAddr]) {
              prices[baseAddr] = {
                priceUSD: priceUsd,
                priceChange24h: pair.priceChange?.h24 || 0,
                liquidity: pair.liquidity?.usd || 0,
                volume24h: pair.volume?.h24 || 0,
              };
            }

            // Also map quote token if it's a stablecoin pair
            if (
              quoteAddr &&
              !prices[quoteAddr] &&
              config.stablecoins
                .map((s) => s.toLowerCase())
                .includes(quoteAddr)
            ) {
              prices[quoteAddr] = {
                priceUSD: 1.0,
                priceChange24h: 0,
                liquidity: pair.liquidity?.usd || 0,
                volume24h: pair.volume?.h24 || 0,
              };
            }
          }
        }
      }
    } catch (err) {
      console.error("[Wallet] DexScreener API error:", err.message);
    }
  }

  // Hardcode stablecoin prices as fallback
  for (const stable of config.stablecoins) {
    const stableLower = stable.toLowerCase();
    if (!prices[stableLower]) {
      prices[stableLower] = {
        priceUSD: 1.0,
        priceChange24h: 0,
        liquidity: 0,
        volume24h: 0,
      };
    }
  }

  return prices;
}

/**
 * Get full wallet token balances with USD values and portfolio analysis.
 * @param {string} userAddress
 * @returns {Promise<Object>}
 */
async function getTokenBalances(userAddress) {
  try {
    // 1. Get native BNB balance
    const bnbBalance = await provider.getBalance(userAddress);
    const bnbBalanceFormatted = parseFloat(ethers.formatEther(bnbBalance));

    // 2. Get token list
    const tokenList = await getTokenListFromBSCScan(userAddress);

    // 3. Collect all addresses for price lookup
    const allAddresses = [
      config.tokens.WBNB, // Use WBNB for BNB price
      ...tokenList.map((t) => t.tokenAddress),
    ];

    // 4. Get USD prices
    const prices = await getTokenPricesFromDexScreener(allAddresses);

    // 5. Build token list with USD values
    const bnbPriceData = prices[config.tokens.WBNB.toLowerCase()] || {
      priceUSD: 0,
      priceChange24h: 0,
      liquidity: 0,
    };

    const tokens = [];

    // Add native BNB
    if (bnbBalanceFormatted > 0) {
      tokens.push({
        token: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // Native BNB sentinel
        symbol: "BNB",
        balance: parseFloat(bnbBalanceFormatted.toFixed(6)),
        priceUSD: bnbPriceData.priceUSD,
        valueUSD: parseFloat(
          (bnbBalanceFormatted * bnbPriceData.priceUSD).toFixed(2)
        ),
        priceChange24h: bnbPriceData.priceChange24h,
        liquidity: bnbPriceData.liquidity,
        isNative: true,
      });
    }

    // Add ERC20 tokens
    for (const t of tokenList) {
      const balance = parseFloat(t.balance);
      if (balance <= 0) continue;

      const priceData = prices[t.tokenAddress.toLowerCase()] || {
        priceUSD: 0,
        priceChange24h: 0,
        liquidity: 0,
      };

      tokens.push({
        token: ethers.getAddress(t.tokenAddress),
        symbol: t.symbol,
        balance: parseFloat(balance.toFixed(6)),
        priceUSD: priceData.priceUSD,
        valueUSD: parseFloat((balance * priceData.priceUSD).toFixed(2)),
        priceChange24h: priceData.priceChange24h,
        liquidity: priceData.liquidity,
        isNative: false,
      });
    }

    // 6. Calculate totals and portfolio composition
    const totalValueUSD = tokens.reduce((sum, t) => sum + t.valueUSD, 0);

    const portfolio = tokens
      .map((t) => ({
        ...t,
        percentage:
          totalValueUSD > 0
            ? parseFloat(((t.valueUSD / totalValueUSD) * 100).toFixed(2))
            : 0,
      }))
      .sort((a, b) => b.valueUSD - a.valueUSD);

    // 7. Find max concentration
    const maxConcentration =
      portfolio.length > 0 ? portfolio[0].percentage : 0;

    return {
      tokens: portfolio,
      totalValueUSD: parseFloat(totalValueUSD.toFixed(2)),
      tokenCount: portfolio.length,
      maxConcentration: parseFloat(maxConcentration.toFixed(2)),
      maxConcentrationToken:
        portfolio.length > 0 ? portfolio[0].symbol : "N/A",
    };
  } catch (err) {
    console.error("[Wallet] Error fetching balances:", err.message);
    return {
      tokens: [],
      totalValueUSD: 0,
      tokenCount: 0,
      maxConcentration: 0,
      maxConcentrationToken: "N/A",
      error: err.message,
    };
  }
}

module.exports = {
  getTokenBalances,
  getTokenPricesFromDexScreener,
  getTokenListFromBSCScan,
};
