const { ethers } = require("ethers");
const config = require("../config");

// BSC Mainnet provider
const provider = new ethers.JsonRpcProvider(config.bscRpcUrl, {
  name: "bsc",
  chainId: 56,
});

/**
 * Get a wallet signer for transaction signing.
 * Returns null if no private key is configured.
 */
function getSigner() {
  if (!config.privateKey) {
    console.warn("[Provider] No PRIVATE_KEY configured; read-only mode.");
    return null;
  }
  return new ethers.Wallet(config.privateKey, provider);
}

/**
 * Get the BNB balance (native) for an address.
 * @param {string} address
 * @returns {Promise<string>} Balance in ether units
 */
async function getBnbBalance(address) {
  const balance = await provider.getBalance(address);
  return ethers.formatEther(balance);
}

/**
 * Get the current block number.
 * @returns {Promise<number>}
 */
async function getBlockNumber() {
  return await provider.getBlockNumber();
}

/**
 * Wait for a transaction to be mined.
 * @param {string} txHash
 * @returns {Promise<import("ethers").TransactionReceipt>}
 */
async function waitForTx(txHash) {
  return await provider.waitForTransaction(txHash, 1, 60000);
}

/**
 * Check if provider is connected by fetching the network.
 * @returns {Promise<boolean>}
 */
async function isConnected() {
  try {
    const network = await provider.getNetwork();
    return network.chainId === 56n;
  } catch {
    return false;
  }
}

module.exports = {
  provider,
  getSigner,
  getBnbBalance,
  getBlockNumber,
  waitForTx,
  isConnected,
};
