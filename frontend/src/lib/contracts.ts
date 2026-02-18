export const SHIELD_LOG_ADDRESS = (process.env.NEXT_PUBLIC_SHIELD_LOG_ADDRESS ||
  '0x0000000000000000000000000000000000000000') as `0x${string}`;

export const SHIELD_RULES_ADDRESS = (process.env.NEXT_PUBLIC_SHIELD_RULES_ADDRESS ||
  '0x0000000000000000000000000000000000000000') as `0x${string}`;

export const SHIELD_VAULT_ADDRESS = (process.env.NEXT_PUBLIC_SHIELD_VAULT_ADDRESS ||
  '0x0000000000000000000000000000000000000000') as `0x${string}`;

export const SHIELD_LOG_ABI = [
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getUserActions',
    outputs: [
      {
        components: [
          { internalType: 'string', name: 'actionType', type: 'string' },
          { internalType: 'uint256', name: 'riskScoreBefore', type: 'uint256' },
          { internalType: 'uint256', name: 'riskScoreAfter', type: 'uint256' },
          { internalType: 'uint256', name: 'amountProtected', type: 'uint256' },
          { internalType: 'string', name: 'reasoning', type: 'string' },
          { internalType: 'bytes32', name: 'txHash', type: 'bytes32' },
          { internalType: 'address', name: 'tokenInvolved', type: 'address' },
          { internalType: 'uint256', name: 'timestamp', type: 'uint256' },
        ],
        internalType: 'struct ShieldLog.Action[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getUserStats',
    outputs: [
      { internalType: 'uint256', name: 'totalActions', type: 'uint256' },
      { internalType: 'uint256', name: 'totalProtected', type: 'uint256' },
      { internalType: 'uint256', name: 'avgRiskReduction', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const SHIELD_RULES_ABI = [
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getUserRules',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'id', type: 'uint256' },
          { internalType: 'string', name: 'ruleType', type: 'string' },
          { internalType: 'uint256', name: 'threshold', type: 'uint256' },
          { internalType: 'bool', name: 'autoExecute', type: 'bool' },
          { internalType: 'bool', name: 'active', type: 'bool' },
          { internalType: 'string', name: 'description', type: 'string' },
          { internalType: 'uint256', name: 'triggerCount', type: 'uint256' },
          { internalType: 'uint256', name: 'lastTriggeredAt', type: 'uint256' },
        ],
        internalType: 'struct ShieldRules.Rule[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getActiveRules',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'id', type: 'uint256' },
          { internalType: 'string', name: 'ruleType', type: 'string' },
          { internalType: 'uint256', name: 'threshold', type: 'uint256' },
          { internalType: 'bool', name: 'autoExecute', type: 'bool' },
          { internalType: 'bool', name: 'active', type: 'bool' },
          { internalType: 'string', name: 'description', type: 'string' },
          { internalType: 'uint256', name: 'triggerCount', type: 'uint256' },
          { internalType: 'uint256', name: 'lastTriggeredAt', type: 'uint256' },
        ],
        internalType: 'struct ShieldRules.Rule[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
