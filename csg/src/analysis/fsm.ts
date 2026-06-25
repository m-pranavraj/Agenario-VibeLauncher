import type { CSGGraph, CFGBlock, NodeId } from '../types.js';

export type AtomicProposition = string;

export interface FSMState {
  id: string;
  label: string;
  cfgBlockId: NodeId | null;
  type: CFGBlock['type'] | 'initial' | 'error';
  propositions: Set<AtomicProposition>;
}

export interface FSMEvent {
  fromState: string;
  toState: string;
  label: string;
  guard: string | null;
}

export interface FSM {
  name: string;
  states: Map<string, FSMState>;
  initialState: string;
  acceptingStates: Set<string>;
  events: FSMEvent[];
  propositions: Set<AtomicProposition>;
}

export interface FSMReport {
  unreachableStates: string[];
  deadlockStates: string[];
  raceConditions: Array<{ state1: string; state2: string; commonEvent: string }>;
  stateCount: number;
  transitionCount: number;
}

export function buildFSMFromGraph(
  graph: CSGGraph,
  name: string
): FSM {
  const states = new Map<string, FSMState>();
  const events: FSMEvent[] = [];
  const allPropositions = new Set<AtomicProposition>();

  const initState: FSMState = {
    id: `${name}_init`,
    label: 'Initial',
    cfgBlockId: null,
    type: 'initial',
    propositions: new Set(['init']),
  };
  allPropositions.add('init');
  states.set(initState.id, initState);

  let stateCounter = 0;

  const fnEntryStates = new Map<NodeId, string>();

  for (const [fnId, fnCFG] of graph.cfg.functionCFGs) {
    for (const blockId of [fnCFG.entry, ...fnCFG.blocks]) {
      const block = graph.cfg.blocks.get(blockId);
      if (!block) continue;

      if (!states.has(block.id)) {
        const props = new Set<AtomicProposition>();
        props.add(`state:${block.type}`);
        extractPropositionsFromBlock(block, props, allPropositions);

        const state: FSMState = {
          id: block.id,
          label: block.label || block.type,
          cfgBlockId: block.id,
          type: block.type,
          propositions: props,
        };
        states.set(block.id, state);
      }

      if (block.id === fnCFG.entry) {
        fnEntryStates.set(fnId, block.id);
      }
    }
  }

  for (const [, block] of graph.cfg.blocks) {
    for (const succId of block.successors) {
      if (states.has(block.id) && states.has(succId)) {
        events.push({
          fromState: block.id,
          toState: succId,
          label: `${block.type}->${graph.cfg.blocks.get(succId)?.type || '?'}`,
          guard: block.condition,
        });
      }
    }
  }

  if (fnEntryStates.size > 0) {
    const firstEntry = fnEntryStates.values().next().value!;
    events.push({
      fromState: initState.id,
      toState: firstEntry,
      label: 'start',
      guard: null,
    });
  }

  const acceptingStates = new Set<string>();
  if (graph.cfg.exitBlock) {
    const exitState = states.get(graph.cfg.exitBlock);
    if (exitState) acceptingStates.add(exitState.id);
  }
  for (const [, block] of graph.cfg.blocks) {
    if (block.type === 'exit' || block.type === 'throw') {
      acceptingStates.add(block.id);
    }
  }

  return {
    name,
    states,
    initialState: initState.id,
    acceptingStates,
    events,
    propositions: allPropositions,
  };
}

function extractPropositionsFromBlock(
  block: CFGBlock,
  props: Set<AtomicProposition>,
  globalProps: Set<AtomicProposition>
): void {
  const label = block.label.toLowerCase();
  const apiCalls = [
    'authorize', 'authenticate', 'login', 'token', 'session',
    'query', 'find', 'findone', 'findby', 'findbyid',
    'save', 'create', 'update', 'delete', 'remove',
    'fetch', 'get', 'post', 'put', 'patch',
    'verify', 'validate', 'sanitize', 'escape',
    'read', 'write', 'send', 'json', 'redirect',
    'hash', 'encrypt', 'decrypt', 'sign',
  ];

  for (const api of apiCalls) {
    if (label.includes(api)) {
      const prop = api.charAt(0).toUpperCase() + api.slice(1);
      props.add(prop);
      globalProps.add(prop);
    }
  }

  if (block.condition) {
    const cond = block.condition.toLowerCase();
    if (cond.includes('role') || cond.includes('admin') || cond.includes('user')) {
      props.add('AuthCheck');
      globalProps.add('AuthCheck');
    }
    if (cond.includes('id') || cond.includes('param') || cond.includes('body')) {
      props.add('RequestInput');
      globalProps.add('RequestInput');
    }
  }
}

export function analyzeFSM(fsm: FSM): FSMReport {
  const reachable = new Set<string>();
  const queue = [fsm.initialState];
  reachable.add(fsm.initialState);

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const ev of fsm.events) {
      if (ev.fromState === current && !reachable.has(ev.toState)) {
        reachable.add(ev.toState);
        queue.push(ev.toState);
      }
    }
  }

  const unreachableStates: string[] = [];
  const deadlockStates: string[] = [];

  for (const [id, state] of fsm.states) {
    if (!reachable.has(id)) {
      unreachableStates.push(id);
      continue;
    }
    const outTransitions = fsm.events.filter(e => e.fromState === id);
    if (outTransitions.length === 0 && !fsm.acceptingStates.has(id)) {
      deadlockStates.push(id);
    }
  }

  const transitionMap = new Map<string, Set<string>>();
  for (const ev of fsm.events) {
    const key = `${ev.fromState}->${ev.toState}`;
    if (!transitionMap.has(ev.label)) {
      transitionMap.set(ev.label, new Set());
    }
    transitionMap.get(ev.label)!.add(key);
  }

  const raceConditions: FSMReport['raceConditions'] = [];
  const fromTargets = new Map<string, Map<string, string[]>>();
  for (const ev of fsm.events) {
    if (!fromTargets.has(ev.fromState)) fromTargets.set(ev.fromState, new Map());
    const targets = fromTargets.get(ev.fromState)!;
    if (!targets.has(ev.toState)) targets.set(ev.toState, []);
    targets.get(ev.toState)!.push(ev.label);
  }

  for (const [, targets] of fromTargets) {
    for (const [, labels] of targets) {
      if (labels.length > 1) {
        for (let i = 0; i < labels.length; i++) {
          for (let j = i + 1; j < labels.length; j++) {
            raceConditions.push({
              state1: labels[i],
              state2: labels[j],
              commonEvent: 'concurrent_transition',
            });
          }
        }
      }
    }
  }

  return {
    unreachableStates,
    deadlockStates,
    raceConditions,
    stateCount: fsm.states.size,
    transitionCount: fsm.events.length,
  };
}

export function computeReachabilityGraph(fsm: FSM): Map<string, Set<string>> {
  const reachGraph = new Map<string, Set<string>>();
  for (const [id] of fsm.states) {
    const reachable = new Set<string>();
    const visited = new Set<string>();
    const queue = [id];
    visited.add(id);
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const ev of fsm.events) {
        if (ev.fromState === current && !visited.has(ev.toState)) {
          visited.add(ev.toState);
          reachable.add(ev.toState);
          queue.push(ev.toState);
        }
      }
    }
    reachGraph.set(id, reachable);
  }
  return reachGraph;
}
