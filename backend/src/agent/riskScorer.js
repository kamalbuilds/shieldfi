/**
 * ShieldFi Risk Scorer
 * Calculates a unified risk score (0-100) from DeFi position data.
 */

/**
 * Calculate liquidation proximity score (0-30 pts).
 * @param {number} healthFactor - Venus health factor
 * @returns {{ score: number, detail: string }}
 */
function scoreLiquidationProximity(healthFactor) {
  if (healthFactor >= 999) {
    return { score: 0, detail: "No active borrows" };
  }
  if (healthFactor > 2.0) {
    return { score: 0, detail: `Health factor ${healthFactor.toFixed(2)} (safe)` };
  }
  if (healthFactor > 1.5) {
    return {
      score: 10,
      detail: `Health factor ${healthFactor.toFixed(2)} (watch)`,
    };
  }
  if (healthFactor > 1.2) {
    return {
      score: 20,
      detail: `Health factor ${healthFactor.toFixed(2)} (elevated risk)`,
    };
  }
  return {
    score: 30,
    detail: `Health factor ${healthFactor.toFixed(2)} (CRITICAL - near liquidation)`,
  };
}

/**
 * Calculate impermanent loss score (0-25 pts).
 * @param {Array} lpPositions - PancakeSwap V3 LP positions
 * @returns {{ score: number, detail: string, maxIL: number }}
 */
function scoreImpermanentLoss(lpPositions) {
  if (!lpPositions || lpPositions.length === 0) {
    return { score: 0, detail: "No LP positions", maxIL: 0 };
  }

  const maxIL = Math.max(...lpPositions.map((p) => p.impermanentLoss || 0));

  if (maxIL < 1) {
    return { score: 0, detail: `Max IL: ${maxIL.toFixed(2)}% (negligible)`, maxIL };
  }
  if (maxIL < 3) {
    return {
      score: 10,
      detail: `Max IL: ${maxIL.toFixed(2)}% (moderate)`,
      maxIL,
    };
  }
  if (maxIL < 5) {
    return {
      score: 18,
      detail: `Max IL: ${maxIL.toFixed(2)}% (significant)`,
      maxIL,
    };
  }
  return {
    score: 25,
    detail: `Max IL: ${maxIL.toFixed(2)}% (HIGH)`,
    maxIL,
  };
}

/**
 * Calculate concentration risk score (0-20 pts).
 * @param {Object} walletData - Wallet token balances
 * @returns {{ score: number, detail: string }}
 */
function scoreConcentrationRisk(walletData) {
  const maxConcentration = walletData.maxConcentration || 0;
  const topToken = walletData.maxConcentrationToken || "N/A";

  if (maxConcentration < 30) {
    return {
      score: 0,
      detail: `Well diversified (max ${maxConcentration.toFixed(1)}% in ${topToken})`,
    };
  }
  if (maxConcentration < 50) {
    return {
      score: 10,
      detail: `Moderate concentration (${maxConcentration.toFixed(1)}% in ${topToken})`,
    };
  }
  if (maxConcentration < 70) {
    return {
      score: 15,
      detail: `High concentration (${maxConcentration.toFixed(1)}% in ${topToken})`,
    };
  }
  return {
    score: 20,
    detail: `Extreme concentration (${maxConcentration.toFixed(1)}% in ${topToken})`,
  };
}

/**
 * Calculate volatility exposure score (0-15 pts).
 * Based on 24h price changes of held tokens.
 * @param {Object} walletData - Wallet token balances
 * @returns {{ score: number, detail: string }}
 */
function scoreVolatilityExposure(walletData) {
  const tokens = walletData.tokens || [];
  if (tokens.length === 0) {
    return { score: 0, detail: "No tokens to assess" };
  }

  // Weight by portfolio percentage
  let weightedVolatility = 0;
  let totalWeight = 0;

  for (const token of tokens) {
    const change = Math.abs(token.priceChange24h || 0);
    const weight = token.percentage || 0;
    weightedVolatility += change * weight;
    totalWeight += weight;
  }

  const avgVolatility =
    totalWeight > 0 ? weightedVolatility / totalWeight : 0;

  if (avgVolatility < 2) {
    return {
      score: 0,
      detail: `Low volatility (weighted avg ${avgVolatility.toFixed(1)}% 24h change)`,
    };
  }
  if (avgVolatility < 5) {
    return {
      score: 5,
      detail: `Moderate volatility (weighted avg ${avgVolatility.toFixed(1)}% 24h change)`,
    };
  }
  if (avgVolatility < 10) {
    return {
      score: 10,
      detail: `High volatility (weighted avg ${avgVolatility.toFixed(1)}% 24h change)`,
    };
  }
  return {
    score: 15,
    detail: `Extreme volatility (weighted avg ${avgVolatility.toFixed(1)}% 24h change)`,
  };
}

/**
 * Calculate liquidity risk score (0-10 pts).
 * Based on token liquidity depths.
 * @param {Object} walletData - Wallet token balances
 * @returns {{ score: number, detail: string }}
 */
function scoreLiquidityRisk(walletData) {
  const tokens = walletData.tokens || [];
  if (tokens.length === 0) {
    return { score: 0, detail: "No tokens to assess" };
  }

  // Check if any significant holding has low liquidity
  let lowLiquidityExposure = 0;

  for (const token of tokens) {
    const pct = token.percentage || 0;
    const liq = token.liquidity || 0;

    // If a token with >10% portfolio allocation has <$100k liquidity
    if (pct > 10 && liq < 100000 && liq > 0) {
      lowLiquidityExposure += pct;
    }
    // If a token with >5% allocation has <$10k liquidity
    if (pct > 5 && liq < 10000 && liq > 0) {
      lowLiquidityExposure += pct * 2; // Double weight for very low liquidity
    }
  }

  if (lowLiquidityExposure < 5) {
    return { score: 0, detail: "Good liquidity across holdings" };
  }
  if (lowLiquidityExposure < 15) {
    return {
      score: 3,
      detail: `Some low-liquidity exposure (${lowLiquidityExposure.toFixed(1)}%)`,
    };
  }
  if (lowLiquidityExposure < 30) {
    return {
      score: 6,
      detail: `Significant low-liquidity exposure (${lowLiquidityExposure.toFixed(1)}%)`,
    };
  }
  return {
    score: 10,
    detail: `High low-liquidity exposure (${lowLiquidityExposure.toFixed(1)}%)`,
  };
}

/**
 * Generate recommendations based on the risk breakdown.
 * @param {Object} breakdown
 * @param {Object} venusData
 * @param {Array} lpData
 * @param {Object} walletData
 * @returns {string[]}
 */
function generateRecommendations(breakdown, venusData, lpData, walletData) {
  const recommendations = [];

  if (breakdown.liquidationProximity.score >= 20) {
    const borrowTokens = (venusData.markets || [])
      .filter((m) => m.borrowBalance > 0)
      .map((m) => m.symbol);
    recommendations.push(
      `URGENT: Repay Venus borrows (${borrowTokens.join(", ")}) or add collateral to improve health factor from ${venusData.healthFactor.toFixed(2)}`
    );
  } else if (breakdown.liquidationProximity.score >= 10) {
    recommendations.push(
      `Monitor Venus health factor (${venusData.healthFactor.toFixed(2)}). Consider partial repayment.`
    );
  }

  if (breakdown.impermanentLoss.score >= 18) {
    const highILPositions = (lpData || []).filter(
      (p) => p.impermanentLoss > 3
    );
    for (const pos of highILPositions) {
      recommendations.push(
        `Consider withdrawing LP position #${pos.positionId} (${pos.token0Symbol}/${pos.token1Symbol}) — IL at ${pos.impermanentLoss.toFixed(2)}%`
      );
    }
  }

  if (breakdown.concentrationRisk.score >= 15) {
    recommendations.push(
      `Diversify holdings: ${walletData.maxConcentrationToken} is ${walletData.maxConcentration.toFixed(1)}% of portfolio`
    );
  }

  if (breakdown.volatilityExposure.score >= 10) {
    recommendations.push(
      "High market volatility detected. Consider hedging with stablecoins."
    );
  }

  if (breakdown.liquidityRisk.score >= 6) {
    recommendations.push(
      "Some holdings have low market liquidity. Exiting large positions may cause slippage."
    );
  }

  if (recommendations.length === 0) {
    recommendations.push("Portfolio looks healthy. No immediate action needed.");
  }

  return recommendations;
}

/**
 * Calculate the unified risk score (0-100).
 * @param {Object} venusData - Venus Protocol positions
 * @param {Array} lpData - PancakeSwap V3 LP positions
 * @param {Object} walletData - Wallet token balances
 * @returns {Object} Risk score with breakdown
 */
function calculateRiskScore(venusData, lpData, walletData) {
  const breakdown = {
    liquidationProximity: scoreLiquidationProximity(
      venusData.healthFactor || 999
    ),
    impermanentLoss: scoreImpermanentLoss(lpData),
    concentrationRisk: scoreConcentrationRisk(walletData),
    volatilityExposure: scoreVolatilityExposure(walletData),
    liquidityRisk: scoreLiquidityRisk(walletData),
  };

  const totalScore =
    breakdown.liquidationProximity.score +
    breakdown.impermanentLoss.score +
    breakdown.concentrationRisk.score +
    breakdown.volatilityExposure.score +
    breakdown.liquidityRisk.score;

  let level;
  if (totalScore <= 15) level = "SAFE";
  else if (totalScore <= 35) level = "MODERATE";
  else if (totalScore <= 60) level = "ELEVATED";
  else level = "CRITICAL";

  const recommendations = generateRecommendations(
    breakdown,
    venusData,
    lpData,
    walletData
  );

  return {
    totalScore,
    maxScore: 100,
    level,
    breakdown: {
      liquidationProximity: {
        score: breakdown.liquidationProximity.score,
        maxScore: 30,
        detail: breakdown.liquidationProximity.detail,
      },
      impermanentLoss: {
        score: breakdown.impermanentLoss.score,
        maxScore: 25,
        detail: breakdown.impermanentLoss.detail,
      },
      concentrationRisk: {
        score: breakdown.concentrationRisk.score,
        maxScore: 20,
        detail: breakdown.concentrationRisk.detail,
      },
      volatilityExposure: {
        score: breakdown.volatilityExposure.score,
        maxScore: 15,
        detail: breakdown.volatilityExposure.detail,
      },
      liquidityRisk: {
        score: breakdown.liquidityRisk.score,
        maxScore: 10,
        detail: breakdown.liquidityRisk.detail,
      },
    },
    recommendations,
  };
}

module.exports = {
  calculateRiskScore,
  scoreLiquidationProximity,
  scoreImpermanentLoss,
  scoreConcentrationRisk,
  scoreVolatilityExposure,
  scoreLiquidityRisk,
};
