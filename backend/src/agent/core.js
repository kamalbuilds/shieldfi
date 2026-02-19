/**
 * ShieldFi Agent Orchestrator
 * Coordinates all sub-systems: position reading, risk scoring,
 * decision engine, and protection execution.
 */

const { getVenusPositions } = require("../protocols/venus");
const { getLPPositions } = require("../protocols/pancakeswap");
const { getTokenBalances } = require("../protocols/wallet");
const { calculateRiskScore } = require("./riskScorer");
const { evaluateAndDecide } = require("./decisionEngine");
const { executeDecision } = require("../protection/executor");
const monitor = require("../protection/monitor");
const {
  getShieldRulesContract,
  getShieldLogContract,
} = require("../blockchain/contracts");

/**
 * Perform a full scan of a user's DeFi positions.
 * @param {string} userAddress
 * @returns {Promise<Object>} Complete scan result
 */
async function fullScan(userAddress) {
  const startTime = Date.now();

  // Fetch all position data in parallel
  const [venusData, lpPositions, walletData] = await Promise.all([
    getVenusPositions(userAddress),
    getLPPositions(userAddress),
    getTokenBalances(userAddress),
  ]);

  // Calculate risk score
  const riskScore = calculateRiskScore(venusData, lpPositions, walletData);

  // Total portfolio value
  const venusNetUSD = venusData.totalSupplyUSD - venusData.totalBorrowUSD;
  const walletUSD = walletData.totalValueUSD;
  const totalPortfolioUSD = venusNetUSD + walletUSD;

  const scanDuration = Date.now() - startTime;

  return {
    address: userAddress,
    timestamp: new Date().toISOString(),
    scanDurationMs: scanDuration,
    portfolio: {
      totalValueUSD: parseFloat(totalPortfolioUSD.toFixed(2)),
      venusNetUSD: parseFloat(venusNetUSD.toFixed(2)),
      walletUSD: parseFloat(walletUSD.toFixed(2)),
    },
    venus: venusData,
    lpPositions,
    wallet: walletData,
    riskScore,
  };
}

/**
 * Get the current risk score for a user (from latest scan or fresh).
 * @param {string} userAddress
 * @returns {Promise<Object>}
 */
async function getRiskScore(userAddress) {
  // Check if monitor has a recent scan
  const latestScan = monitor.getLatestScan(userAddress);
  if (latestScan && latestScan.riskScore) {
    const age = Date.now() - new Date(latestScan.timestamp).getTime();
    if (age < 60000) {
      // Less than 60 seconds old
      return {
        ...latestScan.riskScore,
        cached: true,
        cacheAge: age,
      };
    }
  }

  // Fresh scan
  const scan = await fullScan(userAddress);
  return {
    ...scan.riskScore,
    cached: false,
  };
}

/**
 * Evaluate and decide on protection actions for a user.
 * @param {string} userAddress
 * @param {Array} rules - User-defined rules (or fetch from contract)
 * @returns {Promise<Object>}
 */
async function evaluateProtection(userAddress, rules = []) {
  // Get full scan
  const scan = await fullScan(userAddress);

  // Try to fetch on-chain rules if none provided
  let activeRules = rules;
  if (activeRules.length === 0) {
    try {
      const rulesContract = getShieldRulesContract();
      if (rulesContract) {
        const onChainRules = await rulesContract.getActiveRules(userAddress);
        activeRules = onChainRules.map((r, idx) => ({
          id: idx,
          ruleType: Number(r.ruleType),
          threshold: Number(r.threshold),
          autoExecute: r.autoExecute,
          active: r.active,
          description: r.description,
        }));
      }
    } catch (err) {
      console.warn("[Agent] Could not fetch on-chain rules:", err.message);
    }
  }

  // Run decision engine
  const positions = {
    venus: scan.venus,
    lp: scan.lpPositions,
    wallet: scan.wallet,
  };

  const decision = await evaluateAndDecide(scan.riskScore, positions, activeRules);

  return {
    scan,
    decision,
    rules: activeRules,
  };
}

/**
 * Get protection action history from ShieldLog contract.
 * @param {string} userAddress
 * @returns {Promise<Array>}
 */
async function getActionHistory(userAddress) {
  try {
    const logContract = getShieldLogContract();
    if (!logContract) {
      // Return from monitor's in-memory history
      const scanHistory = monitor.getScanHistory(userAddress);
      return scanHistory
        .filter((s) => s.executionResult && s.executionResult.executed)
        .map((s) => ({
          timestamp: s.timestamp,
          actionType: s.decision.actionName,
          reasoning: s.decision.reasoning,
          result: s.executionResult.result,
        }));
    }

    const actions = await logContract.getUserActions(userAddress);
    const actionTypeNames = [
      "VENUS_REPAY",
      "LP_WITHDRAW",
      "EMERGENCY_EXIT",
      "REBALANCE",
      "ALERT_ONLY",
    ];

    return actions.map((a) => ({
      user: a.user,
      actionType: actionTypeNames[Number(a.actionType)] || "UNKNOWN",
      riskScoreBefore: Number(a.riskScoreBefore) / 100,
      riskScoreAfter: Number(a.riskScoreAfter) / 100,
      amountProtected: Number(a.amountProtected) / 1e18,
      reasoningHash: a.reasoningHash,
      tokenInvolved: a.tokenInvolved,
      timestamp: new Date(Number(a.timestamp) * 1000).toISOString(),
    }));
  } catch (err) {
    console.error("[Agent] Error fetching action history:", err.message);
    return [];
  }
}

/**
 * Get user stats from ShieldLog contract.
 * @param {string} userAddress
 * @returns {Promise<Object>}
 */
async function getUserStats(userAddress) {
  try {
    const logContract = getShieldLogContract();
    if (!logContract) {
      return { actionCount: 0, totalAmountProtected: 0, avgRiskReduction: 0 };
    }

    const [actionCount, totalProtected, avgReduction] =
      await logContract.getUserStats(userAddress);

    return {
      actionCount: Number(actionCount),
      totalAmountProtected: Number(totalProtected) / 1e18,
      avgRiskReduction: Number(avgReduction) / 100,
    };
  } catch (err) {
    console.error("[Agent] Error fetching user stats:", err.message);
    return { actionCount: 0, totalAmountProtected: 0, avgRiskReduction: 0 };
  }
}

module.exports = {
  fullScan,
  getRiskScore,
  evaluateProtection,
  getActionHistory,
  getUserStats,
};
