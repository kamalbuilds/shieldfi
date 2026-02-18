import type {
  PositionScan,
  RiskScore,
  Rule,
  CreateRuleInput,
  ProtectionAction,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4022';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Transform backend scan response to frontend PositionScan shape */
function transformScanResponse(raw: any): PositionScan {
  const riskScore: RiskScore = {
    total: raw.riskScore?.totalScore ?? 0,
    level: raw.riskScore?.level ?? 'SAFE',
    breakdown: {
      liquidationProximity: raw.riskScore?.breakdown?.liquidationProximity?.score ?? 0,
      impermanentLoss: raw.riskScore?.breakdown?.impermanentLoss?.score ?? 0,
      concentrationRisk: raw.riskScore?.breakdown?.concentrationRisk?.score ?? 0,
      volatilityExposure: raw.riskScore?.breakdown?.volatilityExposure?.score ?? 0,
      liquidityRisk: raw.riskScore?.breakdown?.liquidityRisk?.score ?? 0,
    },
    recommendations: raw.riskScore?.recommendations ?? [],
  };

  // Transform venus markets into supplies/borrows
  const markets = raw.venus?.markets ?? [];
  const supplies = markets
    .filter((m: any) => m.supplyBalance > 0)
    .map((m: any) => ({
      symbol: m.symbol,
      vTokenAddress: m.vTokenAddress,
      balance: String(m.supplyBalance),
      valueUSD: m.supplyUSD || 0,
      apy: m.supplyAPY || 0,
    }));
  const borrows = markets
    .filter((m: any) => m.borrowBalance > 0)
    .map((m: any) => ({
      symbol: m.symbol,
      vTokenAddress: m.vTokenAddress,
      balance: String(m.borrowBalance),
      valueUSD: m.borrowUSD || 0,
      apy: m.borrowAPY || 0,
    }));

  return {
    venus: {
      healthFactor: raw.venus?.healthFactor ?? 999,
      totalSupplyUSD: raw.venus?.totalSupplyUSD ?? 0,
      totalBorrowUSD: raw.venus?.totalBorrowUSD ?? 0,
      liquidationRisk: raw.venus?.liquidationRisk ?? 'NONE',
      supplies,
      borrows,
    },
    pancakeswap: raw.lpPositions ?? [],
    wallet: (raw.wallet?.tokens ?? []).map((t: any) => ({
      symbol: t.symbol,
      address: t.token,
      balance: String(t.balance),
      valueUSD: t.valueUSD || 0,
    })),
    riskScore,
    scannedAt: raw.timestamp ?? new Date().toISOString(),
  };
}

function transformRiskScore(raw: any): RiskScore {
  return {
    total: raw.totalScore ?? 0,
    level: raw.level ?? 'SAFE',
    breakdown: {
      liquidationProximity: raw.breakdown?.liquidationProximity?.score ?? 0,
      impermanentLoss: raw.breakdown?.impermanentLoss?.score ?? 0,
      concentrationRisk: raw.breakdown?.concentrationRisk?.score ?? 0,
      volatilityExposure: raw.breakdown?.volatilityExposure?.score ?? 0,
      liquidityRisk: raw.breakdown?.liquidityRisk?.score ?? 0,
    },
    recommendations: raw.recommendations ?? [],
  };
}

/* eslint-enable @typescript-eslint/no-explicit-any */

export async function scanPositions(address: string): Promise<PositionScan> {
  const raw = await request<unknown>('/api/scan', {
    method: 'POST',
    body: JSON.stringify({ address }),
  });
  return transformScanResponse(raw);
}

export async function getRiskScore(address: string): Promise<RiskScore> {
  const raw = await request<unknown>(`/api/risk/${address}`);
  return transformRiskScore(raw);
}

export async function createRule(rule: CreateRuleInput): Promise<Rule> {
  return request<Rule>('/api/rules', {
    method: 'POST',
    body: JSON.stringify(rule),
  });
}

export async function getUserRules(address: string): Promise<Rule[]> {
  const data = await request<{ rules: Rule[] }>(`/api/rules/${address}`);
  return data.rules;
}

export async function toggleRule(ruleId: number): Promise<void> {
  await request<void>(`/api/rules/${ruleId}/toggle`, { method: 'PUT' });
}

export async function deleteRule(ruleId: number): Promise<void> {
  await request<void>(`/api/rules/${ruleId}`, { method: 'DELETE' });
}

export async function getProtectionHistory(address: string): Promise<ProtectionAction[]> {
  const data = await request<{ actions: ProtectionAction[] }>(`/api/actions/${address}`);
  return data.actions;
}

export async function startMonitoring(address: string): Promise<void> {
  await request<void>('/api/monitor/start', {
    method: 'POST',
    body: JSON.stringify({ address }),
  });
}

export async function stopMonitoring(address: string): Promise<void> {
  await request<void>('/api/monitor/stop', {
    method: 'POST',
    body: JSON.stringify({ address }),
  });
}
