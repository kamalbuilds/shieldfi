/**
 * ShieldFi Decision Engine
 * AI-powered (Claude) or rule-based decision engine for protection actions.
 */

const config = require("../config");

// Action types matching the ShieldLog contract enum
const ActionType = {
  VENUS_REPAY: 0,
  LP_WITHDRAW: 1,
  EMERGENCY_EXIT: 2,
  REBALANCE: 3,
  ALERT_ONLY: 4,
};

// Rule types matching the ShieldRules contract enum
const RuleType = {
  VENUS_HEALTH_FACTOR: 0,
  IL_THRESHOLD: 1,
  PORTFOLIO_DROP: 2,
  CONCENTRATION_LIMIT: 3,
  CUSTOM: 4,
};

/**
 * Use Claude AI to evaluate the risk situation and decide on actions.
 * @param {Object} riskScore - Risk score from riskScorer
 * @param {Object} positions - All position data
 * @returns {Promise<Object|null>} Decision or null if AI unavailable
 */
async function aiEvaluate(riskScore, positions) {
  if (!config.openrouterApiKey) {
    return null;
  }

  try {
    const OpenAI = require("openai");
    const client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: config.openrouterApiKey,
    });

    const prompt = `You are ShieldFi, an autonomous DeFi risk management AI agent on BNB Chain.

Analyze the following portfolio risk data and decide what protective action to take.

RISK SCORE: ${riskScore.totalScore}/100 (${riskScore.level})

RISK BREAKDOWN:
- Liquidation Proximity: ${riskScore.breakdown.liquidationProximity.score}/30 — ${riskScore.breakdown.liquidationProximity.detail}
- Impermanent Loss: ${riskScore.breakdown.impermanentLoss.score}/25 — ${riskScore.breakdown.impermanentLoss.detail}
- Concentration Risk: ${riskScore.breakdown.concentrationRisk.score}/20 — ${riskScore.breakdown.concentrationRisk.detail}
- Volatility Exposure: ${riskScore.breakdown.volatilityExposure.score}/15 — ${riskScore.breakdown.volatilityExposure.detail}
- Liquidity Risk: ${riskScore.breakdown.liquidityRisk.score}/10 — ${riskScore.breakdown.liquidityRisk.detail}

VENUS POSITIONS:
${JSON.stringify(positions.venus, null, 2)}

LP POSITIONS:
${JSON.stringify(positions.lp, null, 2)}

WALLET:
${JSON.stringify(positions.wallet, null, 2)}

Respond with a JSON object:
{
  "shouldAct": true/false,
  "actionType": "VENUS_REPAY" | "LP_WITHDRAW" | "EMERGENCY_EXIT" | "REBALANCE" | "ALERT_ONLY",
  "urgency": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "reasoning": "1-2 sentences explaining your decision",
  "params": {
    "tokenAddress": "address if applicable",
    "amount": "amount if applicable",
    "positionId": "LP position ID if applicable"
  }
}

ONLY respond with the JSON object, nothing else.`;

    const message = await client.chat.completions.create({
      model: config.openrouterModel,
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText = message.choices[0]?.message?.content || "";

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const decision = JSON.parse(jsonMatch[0]);
      return {
        actionType: ActionType[decision.actionType] ?? ActionType.ALERT_ONLY,
        actionName: decision.actionType || "ALERT_ONLY",
        urgency: decision.urgency || "LOW",
        reasoning: decision.reasoning || "AI evaluation completed",
        shouldAct: decision.shouldAct || false,
        params: decision.params || {},
        source: "AI",
      };
    }

    return null;
  } catch (err) {
    console.error("[DecisionEngine] AI evaluation error:", err.message);
    return null;
  }
}

/**
 * Rule-based decision engine (fallback when AI is unavailable).
 * @param {Object} riskScore - Risk score from riskScorer
 * @param {Object} positions - All position data
 * @param {Array} rules - User-configured rules
 * @returns {Object} Decision
 */
function ruleBasedEvaluate(riskScore, positions, rules) {
  const activeRules = (rules || []).filter((r) => r.active);

  // Check each rule type
  for (const rule of activeRules) {
    const ruleType =
      typeof rule.ruleType === "number"
        ? rule.ruleType
        : RuleType[rule.ruleType] ?? -1;
    const threshold = Number(rule.threshold);

    switch (ruleType) {
      case RuleType.VENUS_HEALTH_FACTOR: {
        const healthFactor = positions.venus?.healthFactor || 999;
        // Threshold in basis points: 150 = 1.50 health factor
        const hfThreshold = threshold / 100;
        if (healthFactor < hfThreshold && healthFactor < 999) {
          const borrowMarket = (positions.venus?.markets || []).find(
            (m) => m.borrowBalance > 0
          );
          return {
            actionType: ActionType.VENUS_REPAY,
            actionName: "VENUS_REPAY",
            urgency: healthFactor < 1.1 ? "CRITICAL" : "HIGH",
            reasoning: `Venus health factor (${healthFactor.toFixed(2)}) is below threshold (${hfThreshold.toFixed(2)}). Initiating repayment to avoid liquidation.`,
            shouldAct: rule.autoExecute || false,
            params: {
              tokenAddress: borrowMarket?.vTokenAddress || "",
              amount: borrowMarket
                ? (borrowMarket.borrowBalance * 0.25).toString()
                : "0", // Repay 25% of borrows
            },
            ruleId: rule.id,
            source: "RULE",
          };
        }
        break;
      }

      case RuleType.IL_THRESHOLD: {
        const lpPositions = positions.lp || [];
        // Threshold in basis points: 500 = 5%
        const ilThreshold = threshold / 100;
        const highILPosition = lpPositions.find(
          (p) => p.impermanentLoss > ilThreshold
        );
        if (highILPosition) {
          return {
            actionType: ActionType.LP_WITHDRAW,
            actionName: "LP_WITHDRAW",
            urgency: highILPosition.impermanentLoss > 10 ? "CRITICAL" : "HIGH",
            reasoning: `LP position #${highILPosition.positionId} (${highILPosition.token0Symbol}/${highILPosition.token1Symbol}) has IL of ${highILPosition.impermanentLoss.toFixed(2)}% exceeding threshold of ${ilThreshold.toFixed(2)}%.`,
            shouldAct: rule.autoExecute || false,
            params: {
              positionId: highILPosition.positionId,
              liquidity: highILPosition.liquidity,
            },
            ruleId: rule.id,
            source: "RULE",
          };
        }
        break;
      }

      case RuleType.PORTFOLIO_DROP: {
        // Check if overall risk score is high enough to warrant emergency exit
        // Threshold in basis points: 7000 = 70 risk score
        const scoreThreshold = threshold / 100;
        if (riskScore.totalScore >= scoreThreshold) {
          return {
            actionType: ActionType.EMERGENCY_EXIT,
            actionName: "EMERGENCY_EXIT",
            urgency: "CRITICAL",
            reasoning: `Risk score (${riskScore.totalScore}) exceeds emergency threshold (${scoreThreshold}). Initiating emergency exit to stablecoins.`,
            shouldAct: rule.autoExecute || false,
            params: {},
            ruleId: rule.id,
            source: "RULE",
          };
        }
        break;
      }

      case RuleType.CONCENTRATION_LIMIT: {
        const maxConcentration = positions.wallet?.maxConcentration || 0;
        // Threshold in basis points: 5000 = 50%
        const concThreshold = threshold / 100;
        if (maxConcentration > concThreshold) {
          return {
            actionType: ActionType.REBALANCE,
            actionName: "REBALANCE",
            urgency: maxConcentration > 80 ? "HIGH" : "MEDIUM",
            reasoning: `Portfolio concentration (${maxConcentration.toFixed(1)}% in ${positions.wallet.maxConcentrationToken}) exceeds limit (${concThreshold}%). Recommend rebalancing.`,
            shouldAct: rule.autoExecute || false,
            params: {
              tokenAddress:
                positions.wallet?.tokens?.[0]?.token || "",
            },
            ruleId: rule.id,
            source: "RULE",
          };
        }
        break;
      }
    }
  }

  // Default rule-based checks (even without user rules)
  const healthFactor = positions.venus?.healthFactor || 999;

  if (healthFactor < 1.1 && healthFactor < 999) {
    const borrowMarket = (positions.venus?.markets || []).find(
      (m) => m.borrowBalance > 0
    );
    return {
      actionType: ActionType.VENUS_REPAY,
      actionName: "VENUS_REPAY",
      urgency: "CRITICAL",
      reasoning: `Venus health factor is critically low at ${healthFactor.toFixed(2)}. Immediate repayment recommended.`,
      shouldAct: false,
      params: {
        tokenAddress: borrowMarket?.vTokenAddress || "",
        amount: borrowMarket
          ? (borrowMarket.borrowBalance * 0.5).toString()
          : "0",
      },
      source: "DEFAULT",
    };
  }

  if (riskScore.totalScore >= 60) {
    return {
      actionType: ActionType.ALERT_ONLY,
      actionName: "ALERT_ONLY",
      urgency: "HIGH",
      reasoning: `Risk score is elevated at ${riskScore.totalScore}/100. Multiple risk factors contributing. Review recommended.`,
      shouldAct: false,
      params: {},
      source: "DEFAULT",
    };
  }

  // No action needed
  return {
    actionType: ActionType.ALERT_ONLY,
    actionName: "ALERT_ONLY",
    urgency: "LOW",
    reasoning: `Portfolio is within acceptable risk parameters. Risk score: ${riskScore.totalScore}/100.`,
    shouldAct: false,
    params: {},
    source: "DEFAULT",
  };
}

/**
 * Main decision function: tries AI first, falls back to rules.
 * @param {Object} riskScore - Calculated risk score
 * @param {Object} positions - All position data { venus, lp, wallet }
 * @param {Array} rules - User protection rules
 * @returns {Promise<Object>} Decision object
 */
async function evaluateAndDecide(riskScore, positions, rules = []) {
  // Try AI evaluation first if risk is elevated
  if (riskScore.totalScore >= 25 && config.openrouterApiKey) {
    const aiDecision = await aiEvaluate(riskScore, positions);
    if (aiDecision) {
      console.log("[DecisionEngine] AI decision:", aiDecision.actionName);
      return aiDecision;
    }
  }

  // Fall back to rule-based evaluation
  const decision = ruleBasedEvaluate(riskScore, positions, rules);
  console.log("[DecisionEngine] Rule-based decision:", decision.actionName);
  return decision;
}

module.exports = {
  evaluateAndDecide,
  aiEvaluate,
  ruleBasedEvaluate,
  ActionType,
  RuleType,
};
