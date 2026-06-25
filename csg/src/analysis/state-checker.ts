import type { CSGGraph } from '../types.js';
import { buildFSMFromGraph, analyzeFSM } from './fsm.js';
import type { FSM, FSMReport } from './fsm.js';
import { parseLTL, modelCheck, verifyTemporalProperty } from './ltl.js';
import type { LTLFormula, LTLModelCheckResult } from './ltl.js';

export interface StateCheckResult {
  fsm: FSM;
  fsmReport: FSMReport;
  temporalChecks: Array<{
    property: string;
    result: LTLModelCheckResult;
  }>;
  overallSecure: boolean;
  vulnerabilities: string[];
}

export class StateSpaceChecker {
  private fsms: Map<string, FSM> = new Map();

  buildFromGraph(graph: CSGGraph, name: string): FSM {
    const fsm = buildFSMFromGraph(graph, name);
    this.fsms.set(name, fsm);
    return fsm;
  }

  analyzeFSM(fsm: FSM): FSMReport {
    return analyzeFSM(fsm);
  }

  checkProperty(fsm: FSM, ltlFormula: string): LTLModelCheckResult {
    return verifyTemporalProperty(fsm, ltlFormula);
  }

  checkProperties(
    fsm: FSM,
    properties: string[]
  ): Array<{ property: string; result: LTLModelCheckResult }> {
    return properties.map(property => ({
      property,
      result: this.checkProperty(fsm, property),
    }));
  }

  fullCheck(fsm: FSM, additionalProperties: string[] = []): StateCheckResult {
    const report = this.analyzeFSM(fsm);
    const vulnerabilities: string[] = [];

    if (report.unreachableStates.length > 0) {
      vulnerabilities.push(`Unreachable states detected: ${report.unreachableStates.length} state(s) cannot be reached from initial state`);
    }

    if (report.deadlockStates.length > 0) {
      vulnerabilities.push(`Deadlock states detected: ${report.deadlockStates.length} state(s) have no outgoing transitions and are not accepting`);
    }

    if (report.raceConditions.length > 0) {
      vulnerabilities.push(`Race conditions detected: ${report.raceConditions.length} ambiguous transition(s) between states`);
    }

    const defaultProperties = [
      'G(AuthCheck -> F(Validate))',
      'G(RequestInput -> F(AuthCheck))',
      'G(DBQuery -> F(Authorize))',
      'G(Write -> F(Authorize))',
      'G(Delete -> F(Authorize))',
      'F(Accept)',
    ];

    const allProperties = [...new Set([...defaultProperties, ...additionalProperties])];
    const temporalChecks = this.checkProperties(fsm, allProperties);

    for (const check of temporalChecks) {
      if (!check.result.holds) {
        vulnerabilities.push(`Temporal property violation: ${check.property} — ${check.result.violatingStates} state(s) violated`);
      }
    }

    const overallSecure = vulnerabilities.length === 0;

    return { fsm, fsmReport: report, temporalChecks, overallSecure, vulnerabilities };
  }

  getFSM(name: string): FSM | undefined {
    return this.fsms.get(name);
  }

  listFSMs(): string[] {
    return Array.from(this.fsms.keys());
  }
}

export { buildFSMFromGraph, analyzeFSM } from './fsm.js';
export { parseLTL, modelCheck, verifyTemporalProperty, formatLTL } from './ltl.js';
