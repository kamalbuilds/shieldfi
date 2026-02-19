/**
 * ShieldFi Backend — Express API Server
 * Autonomous AI agent for DeFi risk management on BNB Chain.
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");

const config = require("./config");
const { isConnected, getBnbBalance } = require("./blockchain/provider");
const {
  getShieldRulesContract,
  getShieldRulesWithSigner,
} = require("./blockchain/contracts");

const agent = require("./agent/core");
const monitor = require("./protection/monitor");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ---- Utility ----

function isValidAddress(address) {
  try {
    ethers.getAddress(address);
    return true;
  } catch {
    return false;
  }
}

// ---- Routes ----

/**
 * GET /api/health
 * Health check endpoint.
 */
app.get("/api/health", async (req, res) => {
  try {
    const connected = await isConnected();
    res.json({
      status: "ok",
      service: "ShieldFi Agent Backend",
      timestamp: new Date().toISOString(),
      bscConnected: connected,
      activeMonitors: monitor.getActiveMonitors().length,
      hasPrivateKey: !!config.privateKey,
      hasOpenRouterKey: !!config.openrouterApiKey,
      hasBscscanKey: !!config.bscscanApiKey,
      shieldContracts: {
        log: config.shieldLogAddress || "not configured",
        rules: config.shieldRulesAddress || "not configured",
        vault: config.shieldVaultAddress || "not configured",
      },
    });
  } catch (err) {
    res.status(500).json({ status: "error", error: err.message });
  }
});

/**
 * POST /api/scan
 * Scan a wallet's full DeFi positions (Venus + PancakeSwap + Wallet).
 * Body: { address: "0x..." }
 */
app.post("/api/scan", async (req, res) => {
  try {
    const { address } = req.body;

    if (!address || !isValidAddress(address)) {
      return res.status(400).json({ error: "Invalid or missing address" });
    }

    console.log(`[API] Full scan requested for ${address}`);
    const result = await agent.fullScan(address);
    res.json(result);
  } catch (err) {
    console.error("[API] Scan error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/risk/:address
 * Get current risk score for an address.
 */
app.get("/api/risk/:address", async (req, res) => {
  try {
    const { address } = req.params;

    if (!isValidAddress(address)) {
      return res.status(400).json({ error: "Invalid address" });
    }

    console.log(`[API] Risk score requested for ${address}`);
    const riskScore = await agent.getRiskScore(address);
    res.json(riskScore);
  } catch (err) {
    console.error("[API] Risk score error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/rules
 * Create a protection rule.
 * Body: { address, ruleType, threshold, autoExecute, description }
 *
 * ruleType: 0=VENUS_HEALTH_FACTOR, 1=IL_THRESHOLD, 2=PORTFOLIO_DROP,
 *           3=CONCENTRATION_LIMIT, 4=CUSTOM
 * threshold: in basis points (e.g. 150 = 1.50 for health factor)
 */
app.post("/api/rules", async (req, res) => {
  try {
    const { address, ruleType, threshold, autoExecute, description } = req.body;

    if (!address || !isValidAddress(address)) {
      return res.status(400).json({ error: "Invalid or missing address" });
    }

    if (ruleType === undefined || threshold === undefined) {
      return res
        .status(400)
        .json({ error: "ruleType and threshold are required" });
    }

    // Try on-chain first
    const rulesContract = getShieldRulesWithSigner();
    if (rulesContract) {
      const tx = await rulesContract.createRule(
        ruleType,
        threshold,
        autoExecute || false,
        description || "",
        { gasLimit: 300000 }
      );
      const receipt = await tx.wait();

      // Parse event to get ruleId
      const event = receipt.logs.find((log) => {
        try {
          const parsed = rulesContract.interface.parseLog(log);
          return parsed && parsed.name === "RuleCreated";
        } catch {
          return false;
        }
      });

      let ruleId = null;
      if (event) {
        const parsed = rulesContract.interface.parseLog(event);
        ruleId = parsed.args.ruleId.toString();
      }

      return res.json({
        success: true,
        ruleId,
        txHash: receipt.hash,
        onChain: true,
      });
    }

    // Fallback: store in memory for this session
    // (In production, this would go to a database)
    if (!global._shieldRules) global._shieldRules = {};
    if (!global._shieldRules[address.toLowerCase()])
      global._shieldRules[address.toLowerCase()] = [];

    const ruleId = `local_${Date.now()}`;
    const rule = {
      id: ruleId,
      user: address,
      ruleType: Number(ruleType),
      threshold: Number(threshold),
      autoExecute: autoExecute || false,
      active: true,
      description: description || "",
      createdAt: new Date().toISOString(),
      lastTriggeredAt: null,
      triggerCount: 0,
    };

    global._shieldRules[address.toLowerCase()].push(rule);

    res.json({
      success: true,
      ruleId,
      onChain: false,
      rule,
    });
  } catch (err) {
    console.error("[API] Create rule error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/rules/:address
 * Get user's protection rules.
 */
app.get("/api/rules/:address", async (req, res) => {
  try {
    const { address } = req.params;

    if (!isValidAddress(address)) {
      return res.status(400).json({ error: "Invalid address" });
    }

    // Try on-chain
    const rulesContract = getShieldRulesContract();
    if (rulesContract) {
      try {
        const onChainRules = await rulesContract.getUserRules(address);
        const rules = onChainRules.map((r, idx) => ({
          id: idx,
          user: r.user,
          ruleType: Number(r.ruleType),
          threshold: Number(r.threshold),
          autoExecute: r.autoExecute,
          active: r.active,
          description: r.description,
          createdAt: new Date(Number(r.createdAt) * 1000).toISOString(),
          lastTriggeredAt: Number(r.lastTriggeredAt)
            ? new Date(Number(r.lastTriggeredAt) * 1000).toISOString()
            : null,
          triggerCount: Number(r.triggerCount),
          onChain: true,
        }));

        return res.json({ rules, source: "onchain" });
      } catch {
        // Fall through to local
      }
    }

    // Fallback to local
    const localRules =
      (global._shieldRules && global._shieldRules[address.toLowerCase()]) ||
      [];
    res.json({ rules: localRules, source: "local" });
  } catch (err) {
    console.error("[API] Get rules error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/rules/:ruleId/toggle
 * Toggle a rule active/inactive.
 */
app.put("/api/rules/:ruleId/toggle", async (req, res) => {
  try {
    const { ruleId } = req.params;

    // Try on-chain
    const rulesContract = getShieldRulesWithSigner();
    if (rulesContract && !ruleId.startsWith("local_")) {
      const tx = await rulesContract.toggleRule(ruleId, { gasLimit: 100000 });
      const receipt = await tx.wait();
      return res.json({
        success: true,
        txHash: receipt.hash,
        onChain: true,
      });
    }

    // Toggle local rule
    if (global._shieldRules) {
      for (const addr of Object.keys(global._shieldRules)) {
        const rule = global._shieldRules[addr].find((r) => r.id === ruleId);
        if (rule) {
          rule.active = !rule.active;
          return res.json({ success: true, rule, onChain: false });
        }
      }
    }

    res.status(404).json({ error: "Rule not found" });
  } catch (err) {
    console.error("[API] Toggle rule error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/rules/:ruleId
 * Delete a protection rule.
 */
app.delete("/api/rules/:ruleId", async (req, res) => {
  try {
    const { ruleId } = req.params;

    // Try on-chain
    const rulesContract = getShieldRulesWithSigner();
    if (rulesContract && !ruleId.startsWith("local_")) {
      const tx = await rulesContract.deleteRule(ruleId, { gasLimit: 100000 });
      const receipt = await tx.wait();
      return res.json({
        success: true,
        txHash: receipt.hash,
        onChain: true,
      });
    }

    // Delete local rule
    if (global._shieldRules) {
      for (const addr of Object.keys(global._shieldRules)) {
        const idx = global._shieldRules[addr].findIndex((r) => r.id === ruleId);
        if (idx !== -1) {
          global._shieldRules[addr].splice(idx, 1);
          return res.json({ success: true, onChain: false });
        }
      }
    }

    res.status(404).json({ error: "Rule not found" });
  } catch (err) {
    console.error("[API] Delete rule error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/actions/:address
 * Get protection action history for an address.
 */
app.get("/api/actions/:address", async (req, res) => {
  try {
    const { address } = req.params;

    if (!isValidAddress(address)) {
      return res.status(400).json({ error: "Invalid address" });
    }

    const actions = await agent.getActionHistory(address);
    const stats = await agent.getUserStats(address);

    res.json({ actions, stats });
  } catch (err) {
    console.error("[API] Actions error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/monitor/start
 * Start monitoring an address.
 * Body: { address, intervalMs? }
 */
app.post("/api/monitor/start", async (req, res) => {
  try {
    const { address, intervalMs } = req.body;

    if (!address || !isValidAddress(address)) {
      return res.status(400).json({ error: "Invalid or missing address" });
    }

    // Get user's rules
    let rules = [];
    if (global._shieldRules && global._shieldRules[address.toLowerCase()]) {
      rules = global._shieldRules[address.toLowerCase()].filter(
        (r) => r.active
      );
    }

    const result = monitor.startMonitoring(address, intervalMs, rules);
    res.json(result);
  } catch (err) {
    console.error("[API] Monitor start error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/monitor/stop
 * Stop monitoring an address.
 * Body: { address }
 */
app.post("/api/monitor/stop", async (req, res) => {
  try {
    const { address } = req.body;

    if (!address || !isValidAddress(address)) {
      return res.status(400).json({ error: "Invalid or missing address" });
    }

    const result = monitor.stopMonitoring(address);
    res.json(result);
  } catch (err) {
    console.error("[API] Monitor stop error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/monitor/status
 * Get all active monitors.
 */
app.get("/api/monitor/status", (req, res) => {
  const monitors = monitor.getActiveMonitors();
  res.json({ activeMonitors: monitors, count: monitors.length });
});

/**
 * POST /api/evaluate
 * Run the decision engine for an address without executing.
 * Body: { address }
 */
app.post("/api/evaluate", async (req, res) => {
  try {
    const { address } = req.body;

    if (!address || !isValidAddress(address)) {
      return res.status(400).json({ error: "Invalid or missing address" });
    }

    console.log(`[API] Evaluation requested for ${address}`);
    const result = await agent.evaluateProtection(address);
    res.json(result);
  } catch (err) {
    console.error("[API] Evaluate error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/balance/:address
 * Get native BNB balance.
 */
app.get("/api/balance/:address", async (req, res) => {
  try {
    const { address } = req.params;
    if (!isValidAddress(address)) {
      return res.status(400).json({ error: "Invalid address" });
    }
    const balance = await getBnbBalance(address);
    res.json({ address, bnbBalance: balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Monitor event logging ----
monitor.on("scanComplete", (result) => {
  console.log(
    `[Event] Scan complete: ${result.address} — Score: ${result.riskScore?.totalScore || "N/A"} (${result.riskScore?.level || "N/A"})`
  );
});

monitor.on("criticalRisk", (data) => {
  console.warn(
    `[ALERT] CRITICAL RISK for ${data.address}: Score ${data.riskScore.totalScore}/100`
  );
});

monitor.on("elevatedRisk", (data) => {
  console.warn(
    `[ALERT] Elevated risk for ${data.address}: Score ${data.riskScore.totalScore}/100`
  );
});

monitor.on("actionExecuted", (data) => {
  console.log(
    `[Event] Action executed for ${data.address}: ${data.decision.actionName}`
  );
});

monitor.on("scanError", (data) => {
  console.error(`[Event] Scan error for ${data.address}: ${data.error}`);
});

// ---- Start Server ----
const PORT = config.port;

app.listen(PORT, () => {
  console.log(`
  ========================================
   ShieldFi Agent Backend
   Running on http://localhost:${PORT}
  ========================================
   BSC RPC:       ${config.bscRpcUrl}
   Private Key:   ${config.privateKey ? "configured" : "NOT SET"}
   OpenRouter:    ${config.openrouterApiKey ? config.openrouterModel : "NOT SET"}
   BSCScan API:   ${config.bscscanApiKey ? "configured" : "NOT SET"}
   Shield Log:    ${config.shieldLogAddress || "NOT SET"}
   Shield Rules:  ${config.shieldRulesAddress || "NOT SET"}
   Shield Vault:  ${config.shieldVaultAddress || "NOT SET"}
  ========================================
  `);
});

module.exports = app;
