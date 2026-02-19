# ShieldFi

> **Every DeFi agent is a sword. ShieldFi is your shield.**

![Built for Good Vibes Only](https://img.shields.io/badge/Built%20for-Good%20Vibes%20Only%3A%20OpenClaw%20Edition-blueviolet?style=for-the-badge)
![BNB Chain](https://img.shields.io/badge/BNB%20Chain-F0B90B?style=for-the-badge&logo=binance&logoColor=black)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)
![AI Powered](https://img.shields.io/badge/Powered%20by-Claude%20AI-orange?style=for-the-badge)

---

## The Problem

DeFi users lose **millions of dollars every week** to three silent killers:

| Threat | Description | Avg Loss |
|--------|-------------|----------|
| **Liquidations** | Venus positions drop below health factor 1.0 while users sleep | $50K–$500K per event |
| **Impermanent Loss** | PancakeSwap V3 LP positions drift outside range unnoticed | 10–40% of principal |
| **Portfolio Crashes** | No automated stop-loss across multi-protocol exposure | Total wipeout |

There is **no autonomous protection layer** in the current DeFi ecosystem. Users rely on manual monitoring, Telegram alerts that arrive too late, or trusting centralized apps with custody of their keys.

**ShieldFi solves this.**

---

## The Solution

ShieldFi is an **autonomous AI agent** built on Claude that monitors your DeFi positions across Venus Protocol and PancakeSwap V3 on BNB Chain and **automatically executes protective actions** before you get liquidated, drained by IL, or wiped out.

It does not alert you and wait. It **acts**.

---

## Mainnet deployed

SHIELD_LOG_ADDRESS=0x25e6801467fE08217D98C056Ffa8368334756bB3
SHIELD_RULES_ADDRESS=0x4cdC20f69a539169789702821cDafb93BC5f6F54
SHIELD_VAULT_ADDRESS=0x6338768158dD0fA9cE4f3687A6385FB31162A55F

## Architecture

```
+------------------------------------------------------------------+
|                        USER INTERFACE                            |
|              (Connect wallet, set rules, view shield log)        |
+----------------------------------+-------------------------------+
                                   |
                    +-----------------------------------+
                    |     ShieldFi AI Agent             |
                    |(Claude claude-sonnet-4-6 + Tools) |
                    +----+----------+--------+----------+
                         |          |        |
          +--------------+    +-----+    +---+----------+
          |                   |          |              |
  +-------+------+   +---------+---+  +--+-----------+  |
  | Venus Monitor |  | PancakeSwap |  | Risk Scorer  |  |
  | - Health Fac  |  | V3 Monitor  |  | - Composite  |  |
  | - Borrow Rate |  | - IL Calc   |  |   Score 0-100|  |
  | - Collateral  |  | - In/Out    |  | - Thresholds |  |
  +-------+------+   |   Range     |  +--+-----------+  |
          |          +---------+---+     |              |
          |                    |         |              |
          +--------------------+---------+              |
                               |                        |
                    +----------+---------+              |
                    |  Protection Engine |              |
                    | - VENUS_REPAY      |              |
                    | - LP_WITHDRAW      |              |
                    | - EMERGENCY_EXIT   |              |
                    | - REBALANCE        |              |
                    +----------+---------+              |
                               |                        |
          +--------------------+---+-------------------++
          |                        |                      |
  +-------+-------+    +-----------+--+    +--------------+
  |  ShieldVault  |    |  ShieldRules |    |   ShieldLog  |
  | (BNB / ERC20) |    | (User Config)|    | (Audit Trail)|
  |  Smart Contract    | Smart Contract    | Smart Contract|
  +---------------+    +--------------+    +--------------+
          |                                        |
  +-------+----------------------------------------+------+
  |                   BNB CHAIN (BSC)                     |
  |   Venus Protocol          PancakeSwap V3              |
  |   Comptroller + vTokens   Factory + Router + PM       |
  +-------------------------------------------------------+
```

---

## How It Works

### User Flow (Step by Step)

**Step 1 — Connect & Configure**
- User connects their wallet to the ShieldFi frontend
- Deposits BNB or ERC20 tokens into `ShieldVault` (the protection reserve)
- Creates protection rules via `ShieldRules`:
  - "Alert me if Venus health factor drops below 1.2"
  - "Auto-exit LP position if IL exceeds 5%"
  - "Emergency exit if portfolio drops 20% in 1 hour"

**Step 2 — Agent Monitors (Every 30 seconds)**
- The ShieldFi AI agent polls Venus Protocol for the user's:
  - Collateral value across all vToken markets
  - Outstanding borrow balance
  - Current health factor
- The agent reads PancakeSwap V3 NonfungiblePositionManager for:
  - Active LP position tick ranges
  - Current pool price vs position range
  - Accumulated fees and liquidity depth

**Step 3 — Risk Scoring**
- The agent feeds raw protocol data into the composite risk model
- Produces a unified risk score (0–10000 basis points = 0–100%)
- Compares against user-defined thresholds in `ShieldRules`

**Step 4 — Protection Decision (Claude AI)**
- If risk score exceeds threshold, the agent invokes Claude with:
  - Current position data
  - Risk score breakdown
  - Available protection actions
  - User's rule configuration
- Claude reasons through the situation and selects the optimal action

**Step 5 — Execution**
- For `VENUS_REPAY`: Agent calls `ShieldVault.executeProtection()` which swaps the user's deposited collateral via PancakeSwap V3 and repays the Venus borrow position
- For `LP_WITHDRAW`: Agent calls PancakeSwap V3 Position Manager to remove liquidity from the out-of-range position
- For `EMERGENCY_EXIT`: Agent executes a full unwind across all positions

**Step 6 — Immutable Audit Log**
- Every protective action is recorded permanently on-chain via `ShieldLog.logAction()`
- Includes: action type, risk score before/after, amount protected, hash of AI reasoning
- Users can audit exactly what the agent did and why at any time

---

## Key Features

- **Autonomous Protection** — The agent acts without requiring user confirmation when `autoExecute = true`
- **On-Chain Rules** — Protection thresholds are stored on BNB Chain in `ShieldRules`, not in a centralized database
- **Immutable Audit Trail** — Every action permanently logged in `ShieldLog` with AI reasoning hash
- **Non-Custodial Vault** — Users retain ownership of funds in `ShieldVault`; the agent can only execute approved swap routes
- **Multi-Protocol Coverage** — Simultaneously monitors Venus Protocol (lending) and PancakeSwap V3 (LP)
- **Composite Risk Score** — A single unified 0–100 score aggregating health factor, IL exposure, and portfolio concentration
- **PancakeSwap V3 Swaps** — Protective swaps execute at best price through the PancakeSwap V3 SwapRouter
- **Configurable Thresholds** — Per-user, per-rule thresholds in basis points (100 = 1%)
- **Claude AI Reasoning** — Every protection decision is reasoned by Claude claude-sonnet-4-6 with full context

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **AI Agent** | Claude claude-sonnet-4-6 (Anthropic) | Protection decision reasoning |
| **Backend** | Node.js + Express | Agent runtime, API server |
| **Blockchain Client** | ethers.js v6 | BSC RPC interaction |
| **Smart Contracts** | Solidity 0.8.24 | ShieldLog, ShieldRules, ShieldVault |
| **Contract Framework** | Hardhat v3 + OpenZeppelin v5 | Development, testing, deployment |
| **DEX Integration** | PancakeSwap V3 | Protective swaps, LP monitoring |
| **Lending Integration** | Venus Protocol | Health factor monitoring, borrow data |
| **Network** | BNB Chain (BSC) Mainnet | Execution layer |
| **Testing** | Chai + Hardhat | 20+ unit tests across all contracts |

---

## Quick Start

### Prerequisites
- Node.js 18+
- A BNB Chain wallet with BNB for gas
- Anthropic API key

### 1. Clone and Install

```bash
git clone https://github.com/yourorg/shieldfi
cd shieldfi

# Root (contracts)
bun install

# Backend
cd backend
bun install
cd ..
```

### 2. Configure Environment

```bash
# Root .env (for contract deployment)
cp .env.example .env
```

Edit `.env`:
```env
PRIVATE_KEY=your_wallet_private_key
BSCSCAN_API_KEY=your_bscscan_api_key
SHIELD_AGENT_ADDRESS=your_agent_wallet_address
BSC_RPC_URL=https://bsc-dataseed.binance.org/
```

```bash
# Backend .env
cp backend/.env.example backend/.env
```

Edit `backend/.env`:
```env
PRIVATE_KEY=your_agent_wallet_private_key
ANTHROPIC_API_KEY=your_anthropic_api_key
BSC_RPC_URL=https://bsc-dataseed.binance.org/
SHIELD_LOG_ADDRESS=0x...
SHIELD_RULES_ADDRESS=0x...
SHIELD_VAULT_ADDRESS=0x...
PORT=4022
```

### 3. Run Tests

```bash
npx hardhat test
```

Expected output:
```
  ShieldFi
    ShieldLog
      20 passing
    ShieldRules
      ...
    ShieldVault
      ...
```

### 4. Deploy Smart Contracts

```bash
# Deploy to BSC Testnet first
npx hardhat run scripts/deploy.js --network bscTestnet

# Deploy to BSC Mainnet
npx hardhat run scripts/deploy.js --network bscMainnet
```

Addresses are saved to `deployed-addresses.json`. Copy them to your backend `.env`.

### 5. Run the Backend Agent

```bash
cd backend
node src/index.js
```

The agent will start monitoring at `http://localhost:4022`.

### 6. Run the Frontend

```bash
cd frontend
bun install
bun run dev
```

Open `http://localhost:3000`.

---

## Smart Contract Addresses

### BSC Mainnet (Production)

| Contract | Address |
|----------|---------|
| ShieldLog | `TBD — run deploy script` |
| ShieldRules | `TBD — run deploy script` |
| ShieldVault | `TBD — run deploy script` |

> See `bsc.address` for the address template file and `deployed-addresses.json` after deployment.

### BSC Testnet (Staging)

| Contract | Address |
|----------|---------|
| ShieldLog | `TBD — run deploy script --network bscTestnet` |
| ShieldRules | `TBD — run deploy script --network bscTestnet` |
| ShieldVault | `TBD — run deploy script --network bscTestnet` |

---

## Venus Protocol Integration

Venus Protocol is monitored via its Comptroller and vToken contracts.

| Contract | BSC Mainnet Address |
|----------|-------------------|
| Comptroller | `0xfD36E2c2a6789Db23113685031d7F16329158384` |
| Oracle | `0xd8B6dA2bfEC71D684D3E2a2FC9492dDad5C3787F` |
| vBNB | `0xA07c5b74C9B40447a954e1466938b865b6BBea36` |
| vUSDT | `0xfD5840Cd36d94D7229439859C0112a4185BC0255` |
| vBUSD | `0x95c78222B3D6e262dCeD22886E1D4A6f52e70008` |
| vUSDC | `0xecA88125a5ADbe82614ffC12D0DB554E2e2867C8` |
| vETH | `0xf508fCD89b8bd15579dc79A6827cB4686A3592c8` |
| vBTC | `0x882C173bC7Ff3b7786CA16dfeD3DFFfb9Ee7847B` |
| vDAI | `0x334b3eCB4DCa3593BCCC3c7EBD1A1C1d1780FBF1` |

**Key functions monitored:**
- `Comptroller.getAccountLiquidity(user)` — returns shortfall (liquidation trigger)
- `vToken.borrowBalanceCurrent(user)` — real-time borrow balance
- `vToken.balanceOfUnderlying(user)` — underlying collateral value
- `Oracle.getUnderlyingPrice(vToken)` — USD price feed

---

## PancakeSwap V3 Integration

| Contract | BSC Mainnet Address |
|----------|-------------------|
| V3 Factory | `0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865` |
| V3 SwapRouter | `0x13f4EA83D0bd40E75C8222255bc855a974568Dd4` |
| V3 NonfungiblePositionManager | `0x46A15B0b27311cedF172AB29E4f4766fbE7F4364` |

**IL monitoring approach:**
- Fetch position tick range `[tickLower, tickUpper]` from NonfungiblePositionManager
- Read current pool `slot0()` for live `sqrtPriceX96`
- Convert to human price and compare to initial entry price
- Calculate IL using standard formula: `IL = 2*sqrt(P_ratio) / (1 + P_ratio) - 1`

**Protective swap execution:**
- `ShieldVault.executeProtection()` calls PancakeSwap V3 `exactInputSingle`
- Default fee tier: 2500 (0.25%)
- Swap proceeds credited back to user's vault balance

---

## Risk Scoring Methodology

ShieldFi computes a composite risk score (0–10000 basis points) across three dimensions:

### 1. Venus Health Factor Risk (0–4000 weight)

```
VenusRisk = max(0, 4000 * (1.5 - healthFactor) / 0.5)
```

- healthFactor >= 1.5 → VenusRisk = 0
- healthFactor = 1.0 → VenusRisk = 4000 (maximum, liquidation imminent)

### 2. Impermanent Loss Risk (0–3000 weight)

```
IL_ratio = currentPrice / entryPrice
IL_pct   = 2 * sqrt(IL_ratio) / (1 + IL_ratio) - 1
ILRisk   = min(3000, abs(IL_pct) * 30000)
```

- IL of 0% → ILRisk = 0
- IL of 10% → ILRisk = 3000 (capped)

### 3. Portfolio Concentration Risk (0–3000 weight)

```
ConcentrationRisk = min(3000, (maxPositionPct - 0.33) * 6000)
```

- Evenly distributed (33% each) → ConcentrationRisk = 0
- Single asset at 83%+ → ConcentrationRisk = 3000

### Composite Score

```
RiskScore = VenusRisk + ILRisk + ConcentrationRisk
```

A score above 7000 (70%) triggers emergency action evaluation by the Claude AI agent.

---

## API Endpoints

The backend exposes a REST API at `http://localhost:4022`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Agent health check |
| `GET` | `/api/risk/:address` | Get composite risk score for a wallet |
| `GET` | `/api/venus/:address` | Get Venus positions for a wallet |
| `GET` | `/api/pancake/:address` | Get PancakeSwap V3 LP positions |
| `GET` | `/api/shield-log/:address` | Get on-chain shield action history |
| `POST` | `/api/analyze` | Trigger an AI risk analysis |
| `POST` | `/api/protect` | Manually trigger a protection action |
| `GET` | `/api/rules/:address` | Get active rules for a wallet |

### Example: Risk Score Response

```json
{
  "address": "0xUserAddress",
  "riskScore": 6800,
  "breakdown": {
    "venusRisk": 3200,
    "ilRisk": 2100,
    "concentrationRisk": 1500
  },
  "healthFactor": "1.18",
  "recommendation": "REBALANCE",
  "timestamp": 1737123456
}
```

---

## Project Structure

```
shieldfi/
├── contracts/
│   ├── ShieldLog.sol          # Immutable on-chain audit trail of AI actions
│   ├── ShieldRules.sol        # User-defined protection rules stored on-chain
│   ├── ShieldVault.sol        # Non-custodial vault with PancakeSwap V3 execution
│   └── MockERC20.sol          # Test token for unit tests
│
├── scripts/
│   └── deploy.js              # Hardhat deployment script (saves to deployed-addresses.json)
│
├── test/
│   └── ShieldFi.test.js       # 20+ unit tests for all three contracts
│
├── backend/
│   ├── package.json
│   └── src/
│       ├── config.js          # All protocol addresses, RPC config, thresholds
│       ├── agent/             # Claude AI agent logic
│       ├── blockchain/
│       │   └── abis/          # Venus + PancakeSwap V3 ABIs
│       │       ├── venusComptroller.json
│       │       ├── venusOracle.json
│       │       ├── vToken.json
│       │       ├── pancakeV3Factory.json
│       │       ├── pancakeV3Pool.json
│       │       └── pancakeV3PositionManager.json
│       ├── protocols/         # Protocol-specific data fetchers
│       └── protection/        # Protection action executors
│
├── docs/
│   ├── TECHNICAL.md           # Deep technical documentation
│   └── AI_BUILD_LOG.md        # AI-assisted build log (hackathon bonus)
│
├── bsc.address                # Contract address template
├── deployed-addresses.json    # Generated after deployment
├── hardhat.config.js          # Hardhat config (BSC mainnet + testnet)
├── package.json
└── README.md
```

---

## License

MIT License — see [LICENSE](./LICENSE)

---

*Built for Good Vibes Only: OpenClaw Edition*
