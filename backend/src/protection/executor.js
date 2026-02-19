/**
 * ShieldFi Protection Executor
 * Executes protective actions on BSC: repay Venus borrows, withdraw LP,
 * emergency swap, and log actions to ShieldLog contract.
 */

const { ethers } = require("ethers");
const { getSigner } = require("../blockchain/provider");
const {
  getVTokenContractWithSigner,
  getPositionManagerWithSigner,
  getRouterWithSigner,
  getERC20ContractWithSigner,
  getShieldLogWithSigner,
  getShieldVaultWithSigner,
} = require("../blockchain/contracts");
const config = require("../config");

/**
 * Repay a Venus Protocol borrow.
 * @param {string} vTokenAddress - The vToken address to repay
 * @param {string} amount - Amount to repay (in underlying token units)
 * @returns {Promise<Object>} Transaction result
 */
async function executeVenusRepay(vTokenAddress, amount) {
  const signer = getSigner();
  if (!signer) {
    return { success: false, error: "No signer available (PRIVATE_KEY not set)" };
  }

  try {
    const vToken = getVTokenContractWithSigner(vTokenAddress);
    if (!vToken) {
      return { success: false, error: "Could not create vToken contract" };
    }

    const isVBNB =
      vTokenAddress.toLowerCase() ===
      config.vTokens.vBNB.toLowerCase();

    let tx;
    if (isVBNB) {
      // vBNB repayBorrow is payable with no args
      tx = await vToken.repayBorrow({
        value: ethers.parseEther(amount),
        gasLimit: 300000,
      });
    } else {
      // ERC20 vToken: first approve the underlying, then repay
      // Get underlying token address
      const vTokenRead = require("../blockchain/contracts").getVTokenContract(
        vTokenAddress
      );
      const underlyingAddress = await vTokenRead.underlying();

      // Approve spending
      const underlyingToken = getERC20ContractWithSigner(underlyingAddress);
      const approveAmount = ethers.parseEther(amount);

      const approveTx = await underlyingToken.approve(
        vTokenAddress,
        approveAmount,
        { gasLimit: 100000 }
      );
      await approveTx.wait();

      // Repay
      tx = await vToken.repayBorrow(approveAmount, { gasLimit: 300000 });
    }

    const receipt = await tx.wait();

    return {
      success: true,
      txHash: receipt.hash,
      action: "VENUS_REPAY",
      vTokenAddress,
      amount,
      gasUsed: receipt.gasUsed.toString(),
    };
  } catch (err) {
    console.error("[Executor] Venus repay error:", err.message);
    return { success: false, error: err.message, action: "VENUS_REPAY" };
  }
}

/**
 * Withdraw (decrease) liquidity from a PancakeSwap V3 LP position.
 * @param {string} positionId - NFT token ID
 * @param {string} liquidity - Amount of liquidity to remove
 * @returns {Promise<Object>} Transaction result
 */
async function executeLPWithdraw(positionId, liquidity) {
  const signer = getSigner();
  if (!signer) {
    return { success: false, error: "No signer available (PRIVATE_KEY not set)" };
  }

  try {
    const positionManager = getPositionManagerWithSigner();
    if (!positionManager) {
      return { success: false, error: "Could not create position manager" };
    }

    const deadline = Math.floor(Date.now() / 1000) + 600; // 10 minutes

    // Step 1: Decrease liquidity
    const decreaseTx = await positionManager.decreaseLiquidity(
      {
        tokenId: positionId,
        liquidity: liquidity,
        amount0Min: 0, // Accept any slippage (agent can enforce off-chain)
        amount1Min: 0,
        deadline: deadline,
      },
      { gasLimit: 500000 }
    );
    const decreaseReceipt = await decreaseTx.wait();

    // Step 2: Collect the tokens
    const MAX_UINT128 = (2n ** 128n - 1n).toString();
    const signerAddress = await signer.getAddress();

    const collectTx = await positionManager.collect(
      {
        tokenId: positionId,
        recipient: signerAddress,
        amount0Max: MAX_UINT128,
        amount1Max: MAX_UINT128,
      },
      { gasLimit: 300000 }
    );
    const collectReceipt = await collectTx.wait();

    return {
      success: true,
      txHash: decreaseReceipt.hash,
      collectTxHash: collectReceipt.hash,
      action: "LP_WITHDRAW",
      positionId,
      liquidity,
      gasUsed: (
        BigInt(decreaseReceipt.gasUsed) + BigInt(collectReceipt.gasUsed)
      ).toString(),
    };
  } catch (err) {
    console.error("[Executor] LP withdraw error:", err.message);
    return { success: false, error: err.message, action: "LP_WITHDRAW" };
  }
}

/**
 * Execute an emergency swap via PancakeSwap V3 router.
 * @param {string} tokenIn - Token to sell
 * @param {string} tokenOut - Token to buy (usually stablecoin)
 * @param {string} amountIn - Amount of tokenIn to swap
 * @returns {Promise<Object>} Transaction result
 */
async function executeEmergencySwap(tokenIn, tokenOut, amountIn) {
  const signer = getSigner();
  if (!signer) {
    return { success: false, error: "No signer available (PRIVATE_KEY not set)" };
  }

  try {
    const router = getRouterWithSigner();
    if (!router) {
      return { success: false, error: "Could not create router contract" };
    }

    const signerAddress = await signer.getAddress();
    const amountInWei = ethers.parseEther(amountIn);

    // Approve the router to spend tokenIn
    const tokenContract = getERC20ContractWithSigner(tokenIn);
    const approveTx = await tokenContract.approve(
      config.pancakeswapV3Router,
      amountInWei,
      { gasLimit: 100000 }
    );
    await approveTx.wait();

    // Execute swap
    const tx = await router.exactInputSingle(
      {
        tokenIn,
        tokenOut,
        fee: 2500, // 0.25% fee tier
        recipient: signerAddress,
        amountIn: amountInWei,
        amountOutMinimum: 0, // Emergency swap accepts any output
        sqrtPriceLimitX96: 0,
      },
      { gasLimit: 500000 }
    );
    const receipt = await tx.wait();

    return {
      success: true,
      txHash: receipt.hash,
      action: "EMERGENCY_SWAP",
      tokenIn,
      tokenOut,
      amountIn,
      gasUsed: receipt.gasUsed.toString(),
    };
  } catch (err) {
    console.error("[Executor] Emergency swap error:", err.message);
    return { success: false, error: err.message, action: "EMERGENCY_SWAP" };
  }
}

/**
 * Execute a protective swap via the ShieldVault contract.
 * @param {string} userAddress
 * @param {string} tokenIn
 * @param {string} tokenOut
 * @param {string} amountIn
 * @returns {Promise<Object>}
 */
async function executeVaultProtection(userAddress, tokenIn, tokenOut, amountIn) {
  try {
    const vault = getShieldVaultWithSigner();
    if (!vault) {
      return {
        success: false,
        error: "ShieldVault contract not configured or no signer",
      };
    }

    const tx = await vault.executeProtection(
      userAddress,
      tokenIn,
      tokenOut,
      ethers.parseEther(amountIn),
      config.pancakeswapV3Router,
      { gasLimit: 600000 }
    );
    const receipt = await tx.wait();

    return {
      success: true,
      txHash: receipt.hash,
      action: "VAULT_PROTECTION",
      userAddress,
      tokenIn,
      tokenOut,
      amountIn,
      gasUsed: receipt.gasUsed.toString(),
    };
  } catch (err) {
    console.error("[Executor] Vault protection error:", err.message);
    return { success: false, error: err.message, action: "VAULT_PROTECTION" };
  }
}

/**
 * Log a protection action to the ShieldLog contract.
 * @param {Object} actionData
 * @returns {Promise<Object>}
 */
async function logProtectionAction(actionData) {
  try {
    const shieldLog = getShieldLogWithSigner();
    if (!shieldLog) {
      console.warn(
        "[Executor] ShieldLog not configured; skipping on-chain log."
      );
      return { success: false, error: "ShieldLog not configured" };
    }

    const reasoningHash = ethers.keccak256(
      ethers.toUtf8Bytes(actionData.reasoning || "")
    );

    const tx = await shieldLog.logAction(
      actionData.actionType,
      Math.round((actionData.riskScoreBefore || 0) * 100), // basis points
      Math.round((actionData.riskScoreAfter || 0) * 100),
      ethers.parseEther(String(actionData.amountProtected || "0")),
      reasoningHash,
      actionData.tokenInvolved || ethers.ZeroAddress,
      { gasLimit: 200000 }
    );
    const receipt = await tx.wait();

    return {
      success: true,
      txHash: receipt.hash,
      action: "LOG",
    };
  } catch (err) {
    console.error("[Executor] Log action error:", err.message);
    return { success: false, error: err.message, action: "LOG" };
  }
}

/**
 * Execute a decision from the decision engine.
 * @param {Object} decision - Decision from evaluateAndDecide
 * @param {number} riskScoreBefore - Risk score before action
 * @returns {Promise<Object>} Execution result
 */
async function executeDecision(decision, riskScoreBefore) {
  if (!decision.shouldAct) {
    return {
      executed: false,
      reason: "Decision engine recommends no auto-execution",
      decision,
    };
  }

  let result;

  switch (decision.actionType) {
    case 0: // VENUS_REPAY
      if (decision.params.tokenAddress && decision.params.amount) {
        result = await executeVenusRepay(
          decision.params.tokenAddress,
          decision.params.amount
        );
      } else {
        result = { success: false, error: "Missing token address or amount" };
      }
      break;

    case 1: // LP_WITHDRAW
      if (decision.params.positionId && decision.params.liquidity) {
        result = await executeLPWithdraw(
          decision.params.positionId,
          decision.params.liquidity
        );
      } else {
        result = { success: false, error: "Missing position ID or liquidity" };
      }
      break;

    case 2: // EMERGENCY_EXIT
      // Swap largest non-stable holding to USDT
      result = {
        success: false,
        error:
          "Emergency exit requires manual review. Alert sent.",
      };
      break;

    case 3: // REBALANCE
      result = {
        success: false,
        error: "Rebalance requires manual review. Alert sent.",
      };
      break;

    default:
      result = { executed: false, reason: "Alert-only action" };
  }

  // Log the action on-chain if execution was attempted
  if (result && result.success) {
    await logProtectionAction({
      actionType: decision.actionType,
      riskScoreBefore,
      riskScoreAfter: riskScoreBefore * 0.7, // Estimated reduction
      amountProtected: decision.params.amount || "0",
      reasoning: decision.reasoning,
      tokenInvolved: decision.params.tokenAddress || ethers.ZeroAddress,
    });
  }

  return {
    executed: true,
    result,
    decision,
  };
}

module.exports = {
  executeVenusRepay,
  executeLPWithdraw,
  executeEmergencySwap,
  executeVaultProtection,
  logProtectionAction,
  executeDecision,
};
