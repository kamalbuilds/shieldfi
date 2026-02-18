export interface PositionScan {
  venus: VenusPositions;
  pancakeswap: LPPosition[];
  wallet: TokenBalance[];
  riskScore: RiskScore;
  scannedAt: string;
}

export interface VenusPositions {
  healthFactor: number;
  totalSupplyUSD: number;
  totalBorrowUSD: number;
  liquidationRisk: string;
  supplies: VenusMarket[];
  borrows: VenusMarket[];
}

export interface VenusMarket {
  symbol: string;
  vTokenAddress: string;
  balance: string;
  valueUSD: number;
  apy: number;
}

export interface LPPosition {
  positionId: number;
  token0: string;
  token1: string;
  token0Symbol: string;
  token1Symbol: string;
  fee: number;
  liquidity: string;
  valueUSD: number;
  feesEarned: number;
  impermanentLoss: number;
  tickLower: number;
  tickUpper: number;
  inRange: boolean;
}

export interface TokenBalance {
  symbol: string;
  address: string;
  balance: string;
  valueUSD: number;
}

export interface RiskScore {
  total: number;
  level: 'SAFE' | 'MODERATE' | 'ELEVATED' | 'CRITICAL';
  breakdown: {
    liquidationProximity: number;
    impermanentLoss: number;
    concentrationRisk: number;
    volatilityExposure: number;
    liquidityRisk: number;
  };
  recommendations: string[];
}

export interface Rule {
  id: number;
  ruleType: 'VENUS_HEALTH_FACTOR' | 'IL_THRESHOLD' | 'PORTFOLIO_DROP' | 'CONCENTRATION_LIMIT';
  threshold: number;
  autoExecute: boolean;
  active: boolean;
  description: string;
  triggerCount: number;
  lastTriggeredAt: number;
}

export type CreateRuleInput = Omit<Rule, 'id' | 'triggerCount' | 'lastTriggeredAt'>;

export interface ProtectionAction {
  actionType: 'VENUS_REPAY' | 'LP_WITHDRAW' | 'EMERGENCY_EXIT' | 'REBALANCE';
  riskScoreBefore: number;
  riskScoreAfter: number;
  amountProtected: number;
  reasoning: string;
  txHash: string;
  tokenInvolved: string;
  timestamp: number;
}
