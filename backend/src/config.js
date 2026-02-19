require("dotenv").config();

const config = {
  // Server
  port: process.env.PORT || 4022,

  // BSC RPC
  bscRpcUrl: process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org/",

  // Wallet
  privateKey: process.env.PRIVATE_KEY || "",

  // API Keys
  bscscanApiKey: process.env.BSCSCAN_API_KEY || "",
  openrouterApiKey: process.env.OPENROUTER_API_KEY || "",
  openrouterModel: process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4",

  // Deployed ShieldFi contracts
  shieldLogAddress: process.env.SHIELD_LOG_ADDRESS || "",
  shieldRulesAddress: process.env.SHIELD_RULES_ADDRESS || "",
  shieldVaultAddress: process.env.SHIELD_VAULT_ADDRESS || "",

  // ---- BSC Mainnet Protocol Addresses ----

  // Venus Protocol
  venusComptroller: "0xfD36E2c2a6789Db23113685031d7F16329158384",
  venusOracle: "0xd8B6dA2bfEC71D684D3E2a2FC9492dDad5C3787F",

  // Venus vToken addresses
  vTokens: {
    vBNB: "0xA07c5b74C9B40447a954e1466938b865b6BBea36",
    vUSDT: "0xfD5840Cd36d94D7229439859C0112a4185BC0255",
    vBUSD: "0x95c78222B3D6e262dCeD22886E1D4A6f52e70008",
    vUSDC: "0xecA88125a5ADbe82614ffC12D0DB554E2e2867C8",
    vETH: "0xf508fCD89b8bd15579dc79A6827cB4686A3592c8",
    vBTC: "0x882C173bC7Ff3b7786CA16dfeD3DFFfb9Ee7847B",
    vDAI: "0x334b3eCB4DCa3593BCCC3c7EBD1A1C1d1780FBF1",
  },

  // Token name mapping for vTokens
  vTokenNames: {
    "0xA07c5b74C9B40447a954e1466938b865b6BBea36": "vBNB",
    "0xfD5840Cd36d94D7229439859C0112a4185BC0255": "vUSDT",
    "0x95c78222B3D6e262dCeD22886E1D4A6f52e70008": "vBUSD",
    "0xecA88125a5ADbe82614ffC12D0DB554E2e2867C8": "vUSDC",
    "0xf508fCD89b8bd15579dc79A6827cB4686A3592c8": "vETH",
    "0x882C173bC7Ff3b7786CA16dfeD3DFFfb9Ee7847B": "vBTC",
    "0x334b3eCB4DCa3593BCCC3c7EBD1A1C1d1780FBF1": "vDAI",
  },

  // Underlying token addresses
  tokens: {
    WBNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    USDT: "0x55d398326f99059fF775485246999027B3197955",
    USDC: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    BUSD: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
    ETH: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8",
    BTCB: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
    DAI: "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3",
  },

  // PancakeSwap V3
  pancakeswapV3Factory: "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865",
  pancakeswapV3Router: "0x13f4EA83D0bd40E75C8222255bc855a974568Dd4",
  pancakeswapV3PositionManager: "0x46A15B0b27311cedF172AB29E4f4766fbE7F4364",

  // Token symbol lookup (address -> symbol)
  tokenSymbols: {
    "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c": "WBNB",
    "0x55d398326f99059fF775485246999027B3197955": "USDT",
    "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d": "USDC",
    "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56": "BUSD",
    "0x2170Ed0880ac9A755fd29B2688956BD959F933F8": "ETH",
    "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c": "BTCB",
    "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3": "DAI",
  },

  // Stablecoin addresses for classification
  stablecoins: [
    "0x55d398326f99059fF775485246999027B3197955", // USDT
    "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", // USDC
    "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", // BUSD
    "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3", // DAI
  ],

  // Blocks per year on BSC (3 sec blocks)
  blocksPerYear: 10512000,

  // Monitoring defaults
  defaultMonitorInterval: 30000, // 30 seconds
};

module.exports = config;
