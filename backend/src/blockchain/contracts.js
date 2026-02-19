const { ethers } = require("ethers");
const { provider, getSigner } = require("./provider");
const config = require("../config");

// ABIs
const venusComptrollerABI = require("./abis/venusComptroller.json");
const vTokenABI = require("./abis/vToken.json");
const venusOracleABI = require("./abis/venusOracle.json");
const positionManagerABI = require("./abis/pancakeV3PositionManager.json");
const factoryABI = require("./abis/pancakeV3Factory.json");
const poolABI = require("./abis/pancakeV3Pool.json");
const routerABI = require("./abis/pancakeV3Router.json");
const erc20ABI = require("./abis/erc20.json");
const shieldLogABI = require("./abis/shieldLog.json");
const shieldRulesABI = require("./abis/shieldRules.json");
const shieldVaultABI = require("./abis/shieldVault.json");

// ---- Venus Protocol Contracts ----

const venusComptroller = new ethers.Contract(
  config.venusComptroller,
  venusComptrollerABI,
  provider
);

const venusOracle = new ethers.Contract(
  config.venusOracle,
  venusOracleABI,
  provider
);

/**
 * Get a vToken contract instance (read-only).
 * @param {string} vTokenAddress
 * @returns {ethers.Contract}
 */
function getVTokenContract(vTokenAddress) {
  return new ethers.Contract(vTokenAddress, vTokenABI, provider);
}

/**
 * Get a vToken contract instance with signer for write operations.
 * @param {string} vTokenAddress
 * @returns {ethers.Contract|null}
 */
function getVTokenContractWithSigner(vTokenAddress) {
  const signer = getSigner();
  if (!signer) return null;
  return new ethers.Contract(vTokenAddress, vTokenABI, signer);
}

// ---- PancakeSwap V3 Contracts ----

const pancakePositionManager = new ethers.Contract(
  config.pancakeswapV3PositionManager,
  positionManagerABI,
  provider
);

const pancakeFactory = new ethers.Contract(
  config.pancakeswapV3Factory,
  factoryABI,
  provider
);

/**
 * Get a PancakeSwap V3 pool contract instance.
 * @param {string} poolAddress
 * @returns {ethers.Contract}
 */
function getPoolContract(poolAddress) {
  return new ethers.Contract(poolAddress, poolABI, provider);
}

/**
 * Get a PancakeSwap V3 router contract with signer.
 * @returns {ethers.Contract|null}
 */
function getRouterWithSigner() {
  const signer = getSigner();
  if (!signer) return null;
  return new ethers.Contract(config.pancakeswapV3Router, routerABI, signer);
}

/**
 * Get PancakeSwap V3 position manager with signer.
 * @returns {ethers.Contract|null}
 */
function getPositionManagerWithSigner() {
  const signer = getSigner();
  if (!signer) return null;
  return new ethers.Contract(
    config.pancakeswapV3PositionManager,
    positionManagerABI,
    signer
  );
}

// ---- ERC20 ----

/**
 * Get an ERC20 contract instance.
 * @param {string} tokenAddress
 * @returns {ethers.Contract}
 */
function getERC20Contract(tokenAddress) {
  return new ethers.Contract(tokenAddress, erc20ABI, provider);
}

/**
 * Get an ERC20 contract instance with signer.
 * @param {string} tokenAddress
 * @returns {ethers.Contract|null}
 */
function getERC20ContractWithSigner(tokenAddress) {
  const signer = getSigner();
  if (!signer) return null;
  return new ethers.Contract(tokenAddress, erc20ABI, signer);
}

// ---- ShieldFi Contracts ----

/**
 * Get the ShieldLog contract (read-only).
 * Returns null if address not configured.
 */
function getShieldLogContract() {
  if (!config.shieldLogAddress) return null;
  return new ethers.Contract(config.shieldLogAddress, shieldLogABI, provider);
}

/**
 * Get the ShieldLog contract with signer.
 */
function getShieldLogWithSigner() {
  if (!config.shieldLogAddress) return null;
  const signer = getSigner();
  if (!signer) return null;
  return new ethers.Contract(config.shieldLogAddress, shieldLogABI, signer);
}

/**
 * Get the ShieldRules contract (read-only).
 */
function getShieldRulesContract() {
  if (!config.shieldRulesAddress) return null;
  return new ethers.Contract(
    config.shieldRulesAddress,
    shieldRulesABI,
    provider
  );
}

/**
 * Get the ShieldRules contract with signer.
 */
function getShieldRulesWithSigner() {
  if (!config.shieldRulesAddress) return null;
  const signer = getSigner();
  if (!signer) return null;
  return new ethers.Contract(config.shieldRulesAddress, shieldRulesABI, signer);
}

/**
 * Get the ShieldVault contract (read-only).
 */
function getShieldVaultContract() {
  if (!config.shieldVaultAddress) return null;
  return new ethers.Contract(
    config.shieldVaultAddress,
    shieldVaultABI,
    provider
  );
}

/**
 * Get the ShieldVault contract with signer.
 */
function getShieldVaultWithSigner() {
  if (!config.shieldVaultAddress) return null;
  const signer = getSigner();
  if (!signer) return null;
  return new ethers.Contract(config.shieldVaultAddress, shieldVaultABI, signer);
}

module.exports = {
  // Venus
  venusComptroller,
  venusOracle,
  getVTokenContract,
  getVTokenContractWithSigner,

  // PancakeSwap V3
  pancakePositionManager,
  pancakeFactory,
  getPoolContract,
  getRouterWithSigner,
  getPositionManagerWithSigner,

  // ERC20
  getERC20Contract,
  getERC20ContractWithSigner,

  // ShieldFi
  getShieldLogContract,
  getShieldLogWithSigner,
  getShieldRulesContract,
  getShieldRulesWithSigner,
  getShieldVaultContract,
  getShieldVaultWithSigner,
};
