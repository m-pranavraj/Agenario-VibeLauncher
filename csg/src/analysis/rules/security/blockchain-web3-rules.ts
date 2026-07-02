import { BaseRule } from '../engine/base-rule.js';
import type { RuleContext, RuleMeta } from '../engine/types.js';
import { findFunctionCalls, findStringLiterals } from '../engine/ast-utils.js';

export class HardcodedPrivateKeyRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-BC-001', name: 'Hardcoded Blockchain Private Key', description: 'Detects hardcoded blockchain private keys', category: 'security-crypto', severity: 'critical', cwe: 'CWE-312', techniqueNumber: 199, pillar: 1, tags: ['blockchain', 'private-key', 'crypto'] };
  async execute(ctx: RuleContext): Promise<void> {
    const keys = findStringLiterals(ctx.parsed, s => /0x[a-fA-F0-9]{64}/.test(s) || /^[a-fA-F0-9]{64}$/.test(s.trim()));
    for (const s of keys) {
      if (s.value.length >= 64 && s.value.length <= 66) {
        this.emit(ctx, { title: 'Hardcoded blockchain private key found', message: `Potential private key "${s.value.slice(0, 10)}..." found in source code`, file: s.file, line: s.line, confidence: 95, remediation: 'Store private keys in hardware security module (HSM) or encrypted environment variables' });
      }
    }
  }
}

export class UnvalidatedWeb3CallRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-BC-002', name: 'Unvalidated External Web3 Call', description: 'Detects external contract calls without return value checks', category: 'security-injection', severity: 'high', cwe: 'CWE-252', techniqueNumber: 200, pillar: 1, tags: ['web3', 'blockchain', 'solidity'] };
  async execute(ctx: RuleContext): Promise<void> {
    const calls = findFunctionCalls(ctx.parsed, c => c.fullName.includes('call') && (c.fullName.includes('contract') || c.fullName.includes('method') || c.fullName.includes('eth')));
    const hasCheck = findStringLiterals(ctx.parsed, s => /require|revert|assert|safeCall|call.*check|success/i.test(s));
    if (calls.length > 2 && hasCheck.length === 0) {
      this.emit(ctx, { title: 'External contract calls without return value validation', message: 'External blockchain calls made without checking return values — silent failures can cause state mismatch', file: '', line: 1, confidence: 80, remediation: 'Always validate return values of external contract calls with require() or revert patterns' });
    }
  }
}

export class ReentrancyRiskRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-BC-003', name: 'Reentrancy Vulnerability Pattern', description: 'Detects state-after-call patterns vulnerable to reentrancy', category: 'security-injection', severity: 'critical', cwe: 'CWE-122', techniqueNumber: 201, pillar: 1, tags: ['reentrancy', 'blockchain', 'solidity'] };
  async execute(ctx: RuleContext): Promise<void> {
    const calls = findFunctionCalls(ctx.parsed, c => c.fullName.includes('transfer') || c.fullName.includes('send') || c.fullName.includes('call.value'));
    const stateChanges = findStringLiterals(ctx.parsed, s => /balance\s*=|balances\[|totalSupply\s*=|_mint|_burn/i.test(s));
    if (calls.length > 0 && stateChanges.length > 0) {
      this.emit(ctx, { title: 'Potential reentrancy — state changes after external call', message: 'State changes found after external calls — reentrancy attacks can drain contract', file: '', line: 1, confidence: 75, remediation: 'Apply checks-effects-interactions pattern: update state before making external calls, or use reentrancy guard' });
    }
  }
}

export class UncheckedTokenApprovalRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-BC-004', name: 'Unbounded Token Approval', description: 'Detects unlimited ERC20 token approvals', category: 'security-networking', severity: 'high', cwe: 'CWE-284', techniqueNumber: 202, pillar: 1, tags: ['erc20', 'approval', 'defi'] };
  async execute(ctx: RuleContext): Promise<void> {
    const approvals = findStringLiterals(ctx.parsed, s => /approve|increaseAllowance|setApproval/i.test(s));
    const maxUint = findStringLiterals(ctx.parsed, s => /type\(uint256\)\.max|MAX_UINT|2\^256|0x[fF]{64}/i.test(s));
    if (approvals.length > 0 && maxUint.length > 0) {
      this.emit(ctx, { title: 'Unbounded token approval detected', message: 'Token approval set to max uint256 — counterparty can spend all tokens, including future deposits', file: '', line: 1, confidence: 85, remediation: 'Use limited approvals (spend-specific amounts) or approve-then-call patterns' });
    }
  }
}

export class FrontRunningRiskRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-BC-005', name: 'Front-Running Vulnerable Transaction', description: 'Detects order-dependent transactions vulnerable to front-running', category: 'security-networking', severity: 'medium', cwe: 'CWE-362', techniqueNumber: 203, pillar: 1, tags: ['frontrun', 'mev', 'blockchain'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasCommitReveal = findStringLiterals(ctx.parsed, s => /commit|reveal|hash.*lock|timelock|delayed/i.test(s));
    const hasOrderOps = findStringLiterals(ctx.parsed, s => /buy|sell|swap|trade|order|market|limit/i.test(s));
    if (hasOrderOps.length > 3 && hasCommitReveal.length === 0) {
      this.emit(ctx, { title: 'Transactions vulnerable to front-running', message: 'Order/trade operations detected without commit-reveal scheme — MEV bots can front-run transactions', file: '', line: 1, confidence: 65, remediation: 'Implement commit-reveal scheme or use submarine sends to prevent front-running' });
    }
  }
}

export class FlashLoanAttackSurfaceRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-BC-006', name: 'Flash Loan Attack Surface', description: 'Detects patterns susceptible to flash loan attacks', category: 'security-injection', severity: 'high', cwe: 'CWE-682', techniqueNumber: 204, pillar: 1, tags: ['flashloan', 'defi', 'oracle'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasOracle = findStringLiterals(ctx.parsed, s => /price|oracle|getReserve|getAmount|swap|pair/i.test(s));
    const hasTWAP = findStringLiterals(ctx.parsed, s => /twap|timeWeighted|movingAverage|median/i.test(s));
    if (hasOracle.length > 2 && hasTWAP.length === 0) {
      this.emit(ctx, { title: 'Potential flash loan attack surface — no TWAP oracle', message: 'Price/oracle data used without time-weighted average — flash loans can manipulate spot prices', file: '', line: 1, confidence: 72, remediation: 'Use TWAP oracles (e.g., Chainlink) instead of spot price from single DEX pool' });
    }
  }
}

export class WeakRandomnessRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-BC-007', name: 'Weak On-Chain Randomness', description: 'Detects insecure randomness from block.timestamp/blockhash', category: 'security-crypto', severity: 'high', cwe: 'CWE-338', techniqueNumber: 205, pillar: 1, tags: ['randomness', 'blockchain', 'vrf'] };
  async execute(ctx: RuleContext): Promise<void> {
    const weakRandom = findStringLiterals(ctx.parsed, s => /block\.timestamp|block\.number|blockhash|now|keccak.*now/i.test(s));
    const hasVRF = findStringLiterals(ctx.parsed, s => /chainlink.*VRF|vrfCoordinator|randomness/i.test(s) && s.includes('Request'));
    if (weakRandom.length > 0 && hasVRF.length === 0) {
      this.emit(ctx, { title: 'Weak on-chain randomness source', message: 'Using block.timestamp/blockhash for randomness — miners can manipulate these values', file: '', line: 1, confidence: 90, remediation: 'Use Chainlink VRF or commit-reveal scheme for unbiased randomness' });
    }
  }
}

export class MissingAccessControlRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-BC-008', name: 'Missing Access Control in Contract', description: 'Detects Solidity functions without access control modifiers', category: 'security-networking', severity: 'critical', cwe: 'CWE-284', techniqueNumber: 206, pillar: 1, tags: ['access-control', 'solidity', 'ownable'] };
  async execute(ctx: RuleContext): Promise<void> {
    const hasOwnable = findStringLiterals(ctx.parsed, s => /onlyOwner|Ownable|AccessControl|onlyRole/i.test(s));
    const publicFuncs = findStringLiterals(ctx.parsed, s => /function\s+\w+\s*\(.*\)\s*public/i.test(s));
    if (publicFuncs.length > 2 && hasOwnable.length === 0) {
      this.emit(ctx, { title: 'Public functions without access control', message: `${publicFuncs.length} public functions detected without onlyOwner or role-based access control`, file: '', line: 1, confidence: 80, remediation: 'Inherit from OpenZeppelin Ownable or AccessControl and add modifiers to sensitive functions' });
    }
  }
}

export class DelegateCallRiskRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-BC-009', name: 'Unsafe delegatecall Usage', description: 'Detects delegatecall to untrusted contract addresses', category: 'security-injection', severity: 'critical', cwe: 'CWE-829', techniqueNumber: 207, pillar: 1, tags: ['delegatecall', 'proxy', 'solidity'] };
  async execute(ctx: RuleContext): Promise<void> {
    const calls = findFunctionCalls(ctx.parsed, c => c.fullName.includes('delegatecall') || c.fullName.includes('delegateCall'));
    const hasValidation = findStringLiterals(ctx.parsed, s => /require.*implementation|onlyProxy|upgradeTo|proxyAdmin/i.test(s));
    if (calls.length > 0 && hasValidation.length === 0) {
      this.emit(ctx, { title: 'Unsafe delegatecall without address validation', message: 'delegatecall detected to contract addresses without validation — can lead to complete contract takeover', file: '', line: 1, confidence: 92, remediation: 'Always validate delegatecall target addresses against a trusted registry and use onlyProxy modifiers' });
    }
  }
}

export class PhishingDetectionRule extends BaseRule {
  meta: RuleMeta = { id: 'SEC-BC-010', name: 'Potential Phishing/DApp Clone Detection', description: 'Detects patterns matching phishing dApps', category: 'security-networking', severity: 'high', cwe: 'CWE-506', techniqueNumber: 208, pillar: 1, tags: ['phishing', 'dapp', 'scam'] };
  async execute(ctx: RuleContext): Promise<void> {
    const suspiciousPatterns = findStringLiterals(ctx.parsed, s => /seed.*phrase|private.*key.*export|mnemonic|connect.*wallet.*sign/i.test(s));
    const hasAuth = findStringLiterals(ctx.parsed, s => /signIn|login|authenticate|oauth/i.test(s));
    if (suspiciousPatterns.length > 0 && hasAuth.length === 0) {
      this.emit(ctx, { title: 'Suspicious pattern — wallet seed phrase or private key export', message: 'Code references seed phrases or private key export without legitimate authentication flow — potential phishing dApp', file: '', line: 1, confidence: 88, remediation: 'Remove seed phrase/key requests. Legitimate dApps never ask for private keys' });
    }
  }
}
