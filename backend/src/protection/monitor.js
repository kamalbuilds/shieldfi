/**
 * ShieldFi Continuous Monitor
 * Periodically scans DeFi positions, calculates risk, checks rules,
 * and triggers protective actions when thresholds are breached.
 */

const EventEmitter = require("events");
const { getVenusPositions } = require("../protocols/venus");
const { getLPPositions } = require("../protocols/pancakeswap");
const { getTokenBalances } = require("../protocols/wallet");
const { calculateRiskScore } = require("../agent/riskScorer");
const { evaluateAndDecide } = require("../agent/decisionEngine");
const { executeDecision } = require("./executor");
const config = require("../config");

class ShieldMonitor extends EventEmitter {
  constructor() {
    super();
    this.activeMonitors = new Map(); // address -> intervalId
    this.latestScans = new Map(); // address -> latest scan result
    this.scanHistory = new Map(); // address -> array of scan results
  }

  /**
   * Start monitoring a wallet address.
   * @param {string} userAddress - BSC wallet address
   * @param {number} intervalMs - Scan interval in ms (default 30s)
   * @param {Array} rules - User protection rules
   * @returns {Object} Monitor status
   */
  startMonitoring(userAddress, intervalMs, rules = []) {
    const addr = userAddress.toLowerCase();
    const interval = intervalMs || config.defaultMonitorInterval;

    if (this.activeMonitors.has(addr)) {
      return {
        success: false,
        error: "Already monitoring this address",
        address: userAddress,
      };
    }

    console.log(
      `[Monitor] Starting monitoring for ${userAddress} (interval: ${interval}ms)`
    );

    // Run first scan immediately
    this._runScan(userAddress, rules);

    // Set up recurring scans
    const intervalId = setInterval(() => {
      this._runScan(userAddress, rules);
    }, interval);

    this.activeMonitors.set(addr, {
      intervalId,
      startedAt: new Date().toISOString(),
      interval,
      address: userAddress,
      rules,
    });

    this.emit("monitorStarted", { address: userAddress, interval });

    return {
      success: true,
      address: userAddress,
      interval,
      startedAt: new Date().toISOString(),
    };
  }

  /**
   * Stop monitoring a wallet address.
   * @param {string} userAddress
   * @returns {Object} Status
   */
  stopMonitoring(userAddress) {
    const addr = userAddress.toLowerCase();
    const monitor = this.activeMonitors.get(addr);

    if (!monitor) {
      return {
        success: false,
        error: "Not currently monitoring this address",
      };
    }

    clearInterval(monitor.intervalId);
    this.activeMonitors.delete(addr);

    console.log(`[Monitor] Stopped monitoring for ${userAddress}`);
    this.emit("monitorStopped", { address: userAddress });

    return {
      success: true,
      address: userAddress,
      stoppedAt: new Date().toISOString(),
    };
  }

  /**
   * Get monitoring status for all addresses.
   * @returns {Array}
   */
  getActiveMonitors() {
    const monitors = [];
    for (const [addr, data] of this.activeMonitors.entries()) {
      monitors.push({
        address: data.address,
        startedAt: data.startedAt,
        interval: data.interval,
        latestScan: this.latestScans.get(addr) || null,
      });
    }
    return monitors;
  }

  /**
   * Get latest scan result for an address.
   * @param {string} userAddress
   * @returns {Object|null}
   */
  getLatestScan(userAddress) {
    return this.latestScans.get(userAddress.toLowerCase()) || null;
  }

  /**
   * Get scan history for an address.
   * @param {string} userAddress
   * @param {number} limit
   * @returns {Array}
   */
  getScanHistory(userAddress, limit = 20) {
    const history =
      this.scanHistory.get(userAddress.toLowerCase()) || [];
    return history.slice(-limit);
  }

  /**
   * Execute a single scan cycle for a user.
   * @param {string} userAddress
   * @param {Array} rules
   * @private
   */
  async _runScan(userAddress, rules = []) {
    const addr = userAddress.toLowerCase();
    const scanTimestamp = new Date().toISOString();

    try {
      console.log(`[Monitor] Scanning ${userAddress}...`);

      // 1. Fetch all positions in parallel
      const [venusData, lpData, walletData] = await Promise.all([
        getVenusPositions(userAddress),
        getLPPositions(userAddress),
        getTokenBalances(userAddress),
      ]);

      // 2. Calculate risk score
      const riskScore = calculateRiskScore(venusData, lpData, walletData);

      // 3. Decision engine evaluation
      const positions = {
        venus: venusData,
        lp: lpData,
        wallet: walletData,
      };

      const decision = await evaluateAndDecide(riskScore, positions, rules);

      // 4. Build scan result
      const scanResult = {
        timestamp: scanTimestamp,
        address: userAddress,
        riskScore,
        positions,
        decision,
        executionResult: null,
      };

      // 5. Execute if decision says to act
      if (decision.shouldAct && decision.actionType !== 4) {
        console.log(
          `[Monitor] Executing ${decision.actionName} for ${userAddress}`
        );
        const executionResult = await executeDecision(
          decision,
          riskScore.totalScore
        );
        scanResult.executionResult = executionResult;

        this.emit("actionExecuted", {
          address: userAddress,
          decision,
          executionResult,
        });
      }

      // 6. Store results
      this.latestScans.set(addr, scanResult);

      if (!this.scanHistory.has(addr)) {
        this.scanHistory.set(addr, []);
      }
      const history = this.scanHistory.get(addr);
      history.push(scanResult);
      // Keep only last 100 scans
      if (history.length > 100) {
        history.splice(0, history.length - 100);
      }

      // 7. Emit events
      this.emit("scanComplete", scanResult);

      if (riskScore.level === "CRITICAL") {
        this.emit("criticalRisk", {
          address: userAddress,
          riskScore,
          decision,
        });
      } else if (riskScore.level === "ELEVATED") {
        this.emit("elevatedRisk", {
          address: userAddress,
          riskScore,
          decision,
        });
      }

      console.log(
        `[Monitor] Scan complete for ${userAddress}: score=${riskScore.totalScore} level=${riskScore.level}`
      );
    } catch (err) {
      console.error(`[Monitor] Scan error for ${userAddress}:`, err.message);

      const errorResult = {
        timestamp: scanTimestamp,
        address: userAddress,
        error: err.message,
      };

      this.emit("scanError", errorResult);
    }
  }
}

// Singleton instance
const monitor = new ShieldMonitor();

module.exports = monitor;
