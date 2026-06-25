import type { FSM, FSMState } from './fsm.js';

export type LTLFormulaType =
  | 'true' | 'false' | 'atom' | 'not' | 'and' | 'or'
  | 'implies' | 'next' | 'globally' | 'finally' | 'until' | 'release';

export interface LTLFormula {
  type: LTLFormulaType;
  atom?: string;
  left?: LTLFormula;
  right?: LTLFormula;
}

export interface BuchiAutomaton {
  states: number;
  initState: number;
  edges: Array<{ from: number; to: number; label: string }>;
  accepting: Set<number>;
}

export interface LTLModelCheckResult {
  holds: boolean;
  counterexample: string[] | null;
  trace: Array<{
    state: string; label: string;
    satisfiedProps: string[]; violatedProps: string[];
  }>;
  verifiedStates: number;
  violatingStates: number;
  buchiIntersectionSize: number;
  timeMs: number;
}

const TOKEN_TYPES = ['true', 'false'] as const;
const UNARY_OPS = ['!', '~', 'G', 'F', 'X'] as const;
const BINARY_OPS = ['U', 'R', '&&', '||', '->', '=>', '&', '|'] as const;

export function parseLTL(input: string): LTLFormula {
  const tokens = tokenize(input);
  let pos = 0;

  function peek(): string { return pos < tokens.length ? tokens[pos] : '\0'; }

  function consume(): string { return tokens[pos++]; }

  function parseAtom(): LTLFormula {
    const tok = peek();
    if (tok === '(') { consume(); const e = parseImplies(); consume(); return e; }
    if (tok === 'true') { consume(); return { type: 'true' }; }
    if (tok === 'false') { consume(); return { type: 'false' }; }
    if ((UNARY_OPS as readonly string[]).includes(tok)) {
      consume();
      return { type: mapOp(tok), left: parseAtom() } as LTLFormula;
    }
    if (tok && /^[A-Za-z_]\w*$/.test(tok)) {
      consume();
      return { type: 'atom', atom: tok };
    }
    if (tok === '!' || tok === '~') {
      consume();
      return { type: 'not', left: parseAtom() };
    }
    throw new Error(`Unexpected token '${tok}' at position ${pos}`);
  }

  function parseUntil(): LTLFormula {
    let left = parseAtom();
    while (peek() === 'U' || peek() === 'R') {
      const op = consume();
      const right = parseAtom();
      left = { type: op === 'U' ? 'until' : 'release', left, right };
    }
    return left;
  }

  function parseAnd(): LTLFormula {
    let left = parseUntil();
    while (peek() === '&' || peek() === '&&') {
      consume();
      left = { type: 'and', left, right: parseUntil() };
    }
    return left;
  }

  function parseOr(): LTLFormula {
    let left = parseAnd();
    while (peek() === '|' || peek() === '||') {
      consume();
      left = { type: 'or', left, right: parseAnd() };
    }
    return left;
  }

  function parseImplies(): LTLFormula {
    let left = parseOr();
    if (peek() === '->' || peek() === '=>') {
      consume();
      return { type: 'implies', left, right: parseImplies() };
    }
    return left;
  }

  const result = parseImplies();
  return result;
}

function mapOp(tok: string): LTLFormulaType {
  switch (tok) {
    case 'G': return 'globally';
    case 'F': return 'finally';
    case 'X': return 'next';
    case 'U': return 'until';
    case 'R': return 'release';
    case '!': case '~': return 'not';
    default: return 'atom';
  }
}

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < input.length) {
    if (/\s/.test(input[i])) { i++; continue; }
    const rest = input.slice(i);
    const word = /^[A-Za-z_]\w*/.exec(rest);
    if (word) { tokens.push(word[0]); i += word[0].length; continue; }
    const sym = /^(=>|->|&&|\|\||[()!~&|])/.exec(rest);
    if (sym) { tokens.push(sym[0]); i += sym[0].length; continue; }
    const unary = /^[GFXUR]/.exec(rest);
    if (unary) { tokens.push(unary[0]); i += unary[0].length; continue; }
    i++;
  }
  return tokens;
}

export function formatLTL(formula: LTLFormula): string {
  switch (formula.type) {
    case 'true': return 'true';
    case 'false': return 'false';
    case 'atom': return formula.atom!;
    case 'not': return `!(${formatLTL(formula.left!)})`;
    case 'and': return `(${formatLTL(formula.left!)} && ${formatLTL(formula.right!)})`;
    case 'or': return `(${formatLTL(formula.left!)} || ${formatLTL(formula.right!)})`;
    case 'implies': return `(${formatLTL(formula.left!)} => ${formatLTL(formula.right!)})`;
    case 'next': return `X(${formatLTL(formula.left!)})`;
    case 'globally': return `G(${formatLTL(formula.left!)})`;
    case 'finally': return `F(${formatLTL(formula.left!)})`;
    case 'until': return `(${formatLTL(formula.left!)} U ${formatLTL(formula.right!)})`;
    case 'release': return `(${formatLTL(formula.left!)} R ${formatLTL(formula.right!)})`;
  }
}

export function negateLTL(formula: LTLFormula): LTLFormula {
  return { type: 'not', left: formula };
}

function extractAtoms(formula: LTLFormula): Set<string> {
  const atoms = new Set<string>();
  function walk(f: LTLFormula): void {
    if (f.type === 'atom' && f.atom) atoms.add(f.atom);
    if (f.left) walk(f.left);
    if (f.right) walk(f.right);
  }
  walk(formula);
  return atoms;
}

function toNegationNormalForm(f: LTLFormula): LTLFormula {
  switch (f.type) {
    case 'true': case 'false': case 'atom': return f;
    case 'not': {
      const inner = f.left!;
      switch (inner.type) {
        case 'not': return toNegationNormalForm(inner.left!);
        case 'true': return { type: 'false' };
        case 'false': return { type: 'true' };
        case 'and': return { type: 'or', left: toNegationNormalForm({ type: 'not', left: inner.left }), right: toNegationNormalForm({ type: 'not', left: inner.right }) };
        case 'or': return { type: 'and', left: toNegationNormalForm({ type: 'not', left: inner.left }), right: toNegationNormalForm({ type: 'not', left: inner.right }) };
        case 'implies': return { type: 'and', left: toNegationNormalForm(inner.left!), right: toNegationNormalForm({ type: 'not', left: inner.right }) };
        case 'globally': return { type: 'finally', left: toNegationNormalForm({ type: 'not', left: inner.left }) };
        case 'finally': return { type: 'globally', left: toNegationNormalForm({ type: 'not', left: inner.left }) };
        case 'next': return { type: 'next', left: toNegationNormalForm({ type: 'not', left: inner.left }) };
        case 'until': return { type: 'release', left: toNegationNormalForm({ type: 'not', left: inner.left }), right: toNegationNormalForm({ type: 'not', left: inner.right }) };
        case 'release': return { type: 'until', left: toNegationNormalForm({ type: 'not', left: inner.left }), right: toNegationNormalForm({ type: 'not', left: inner.right }) };
        default: return f;
      }
    }
    case 'and': return { type: 'and', left: toNegationNormalForm(f.left!), right: toNegationNormalForm(f.right!) };
    case 'or': return { type: 'or', left: toNegationNormalForm(f.left!), right: toNegationNormalForm(f.right!) };
    case 'implies': return { type: 'or', left: toNegationNormalForm({ type: 'not', left: f.left }), right: toNegationNormalForm(f.right!) };
    case 'globally': return { type: 'globally', left: toNegationNormalForm(f.left!) };
    case 'finally': return { type: 'finally', left: toNegationNormalForm(f.left!) };
    case 'next': return { type: 'next', left: toNegationNormalForm(f.left!) };
    case 'until': return { type: 'until', left: toNegationNormalForm(f.left!), right: toNegationNormalForm(f.right!) };
    case 'release': return { type: 'release', left: toNegationNormalForm(f.left!), right: toNegationNormalForm(f.right!) };
  }
}

export function ltlToBuchi(f: LTLFormula): BuchiAutomaton {
  const nnf = toNegationNormalForm(f);
  const subformulas = collectSubformulas(nnf);
  const atoms = extractAtoms(nnf);

  const states = subformulas.map((_, i) => i);
  const initState = subformulas.findIndex(s => formulaEqual(s, nnf));
  const edges: Array<{ from: number; to: number; label: string }> = [];
  const accepting = new Set<number>();

  for (let i = 0; i < subformulas.length; i++) {
    const sf = subformulas[i];
    const isGFinal = sf.type === 'finally';
    const isGGlobal = sf.type === 'globally';
    const isGUntil = sf.type === 'until';

    for (let j = 0; j < subformulas.length; j++) {
      const sf2 = subformulas[j];
      let label = 'true';

      if (sf.type === 'atom' && sf.atom) {
        label = sf.atom;
      } else if (sf.type === 'globally') {
        const innerIdx = subformulas.findIndex(s => formulaEqual(s, sf.left!));
        const nextIdx = subformulas.findIndex(s => formulaEqual(s, { type: 'next', left: sf }));
        if (innerIdx >= 0 && j === innerIdx) label = 'true';
        else if (nextIdx >= 0 && j === nextIdx) label = 'true';
        else continue;
      } else if (sf.type === 'finally') {
        const innerIdx = subformulas.findIndex(s => formulaEqual(s, sf.left!));
        const nextIdx = subformulas.findIndex(s => formulaEqual(s, { type: 'next', left: sf }));
        if (innerIdx >= 0 && j === innerIdx) label = 'true';
        else if (nextIdx >= 0 && j === nextIdx) label = 'true';
        else continue;
      } else if (sf.type === 'until') {
        const rightIdx = subformulas.findIndex(s => formulaEqual(s, sf.right!));
        const leftIdx = subformulas.findIndex(s => formulaEqual(s, sf.left!));
        const nextIdx = subformulas.findIndex(s => formulaEqual(s, { type: 'next', left: sf }));
        if (rightIdx >= 0 && j === rightIdx) label = 'true';
        else if (leftIdx >= 0 && nextIdx >= 0 && j === nextIdx) label = 'true';
        else continue;
      } else if (sf.type === 'next') {
        const innerIdx = subformulas.findIndex(s => formulaEqual(s, sf.left!));
        if (innerIdx >= 0 && j === innerIdx) label = 'true';
        else continue;
      } else {
        if (i === j) label = 'true';
        else continue;
      }

      if (i === j && sf.type === 'globally') accepting.add(i);
      edges.push({ from: i, to: j, label });
    }
  }

  if (edges.length === 0) {
    edges.push({ from: initState, to: initState, label: 'true' });
    accepting.add(initState);
  }

  return { states: states.length, initState, edges, accepting };
}

function collectSubformulas(f: LTLFormula): LTLFormula[] {
  const set = new Set<string>();
  const result: LTLFormula[] = [];

  function walk(formula: LTLFormula): void {
    const key = formatLTL(formula);
    if (set.has(key)) return;
    set.add(key);
    result.push(formula);
    if (formula.left) walk(formula.left);
    if (formula.right) walk(formula.right);
  }

  walk(f);
  return result;
}

function formulaEqual(a: LTLFormula, b: LTLFormula): boolean {
  return formatLTL(a) === formatLTL(b);
}

function matchesProposition(state: FSMState, atom: string): boolean {
  if (state.propositions.has(atom)) return true;
  for (const p of state.propositions) {
    if (p.toLowerCase().includes(atom.toLowerCase())) return true;
  }
  return false;
}

function evaluateFormula(f: LTLFormula, state: FSMState, fsm: FSM, visited: Set<string> = new Set(), depth = 0): boolean {
  if (depth > 50) return false;

  switch (f.type) {
    case 'true': return true;
    case 'false': return false;
    case 'atom': return matchesProposition(state, f.atom!);
    case 'not': return !evaluateFormula(f.left!, state, fsm, visited, depth + 1);
    case 'and': return evaluateFormula(f.left!, state, fsm, visited, depth + 1) && evaluateFormula(f.right!, state, fsm, visited, depth + 1);
    case 'or': return evaluateFormula(f.left!, state, fsm, visited, depth + 1) || evaluateFormula(f.right!, state, fsm, visited, depth + 1);
    case 'implies': return !evaluateFormula(f.left!, state, fsm, visited, depth + 1) || evaluateFormula(f.right!, state, fsm, visited, depth + 1);

    case 'next': {
      for (const ev of fsm.events) {
        if (ev.fromState === state.id) {
          const nextState = fsm.states.get(ev.toState);
          if (nextState) return evaluateFormula(f.left!, nextState, fsm, visited, depth + 1);
        }
      }
      return false;
    }

    case 'globally': {
      const localVisited = new Set<string>();
      const queue = [state.id];
      localVisited.add(state.id);
      while (queue.length > 0) {
        const curId = queue.shift()!;
        const cur = fsm.states.get(curId);
        if (!cur) continue;
        if (!evaluateFormula(f.left!, cur, fsm, visited, depth + 1)) return false;
        for (const ev of fsm.events) {
          if (ev.fromState === curId && !localVisited.has(ev.toState)) {
            localVisited.add(ev.toState);
            queue.push(ev.toState);
          }
        }
      }
      return true;
    }

    case 'finally': {
      const localVisited = new Set<string>();
      const queue = [state.id];
      localVisited.add(state.id);
      while (queue.length > 0) {
        const curId = queue.shift()!;
        const cur = fsm.states.get(curId);
        if (!cur) continue;
        if (evaluateFormula(f.left!, cur, fsm, visited, depth + 1)) return true;
        for (const ev of fsm.events) {
          if (ev.fromState === curId && !localVisited.has(ev.toState)) {
            localVisited.add(ev.toState);
            queue.push(ev.toState);
          }
        }
      }
      return false;
    }

    case 'until': {
      const localVisited = new Set<string>();
      const queue: Array<{ id: string; d: number }> = [{ id: state.id, d: 0 }];
      localVisited.add(state.id);
      while (queue.length > 0) {
        const { id: curId, d } = queue.shift()!;
        const cur = fsm.states.get(curId);
        if (!cur) continue;
        if (evaluateFormula(f.right!, cur, fsm, visited, depth + 1)) return true;
        if (!evaluateFormula(f.left!, cur, fsm, visited, depth + 1)) return false;
        if (d > 100) return false;
        for (const ev of fsm.events) {
          if (ev.fromState === curId && !localVisited.has(ev.toState)) {
            localVisited.add(ev.toState);
            queue.push({ id: ev.toState, d: d + 1 });
          }
        }
      }
      return false;
    }

    case 'release': {
      const localVisited = new Set<string>();
      const queue: Array<{ id: string; d: number }> = [{ id: state.id, d: 0 }];
      localVisited.add(state.id);
      while (queue.length > 0) {
        const { id: curId, d } = queue.shift()!;
        const cur = fsm.states.get(curId);
        if (!cur) continue;
        if (evaluateFormula(f.right!, cur, fsm, visited, depth + 1)) continue;
        if (!evaluateFormula(f.left!, cur, fsm, visited, depth + 1)) return false;
        if (d > 100) return false;
        for (const ev of fsm.events) {
          if (ev.fromState === curId && !localVisited.has(ev.toState)) {
            localVisited.add(ev.toState);
            queue.push({ id: ev.toState, d: d + 1 });
          }
        }
      }
      return true;
    }
  }
  return false;
}

export function modelCheck(fsm: FSM, formula: LTLFormula): LTLModelCheckResult {
  const startTime = Date.now();
  const trace: LTLModelCheckResult['trace'] = [];
  let verifiedStates = 0;
  let violatingStates = 0;

  const buchi = ltlToBuchi(formula);

  for (const [stateId, state] of fsm.states) {
    const result = evaluateFormula(formula, state, fsm);
    if (result) {
      verifiedStates++;
      trace.push({ state: stateId, label: state.label, satisfiedProps: [formatLTL(formula)], violatedProps: [] });
    } else {
      violatingStates++;
      trace.push({ state: stateId, label: state.label, satisfiedProps: [], violatedProps: [formatLTL(formula)] });
    }
  }

  return {
    holds: violatingStates === 0,
    counterexample: violatingStates > 0 ? [`${violatingStates} state(s) violate the property`] : null,
    trace,
    verifiedStates,
    violatingStates,
    buchiIntersectionSize: buchi.states,
    timeMs: Date.now() - startTime,
  };
}

export function verifyTemporalProperty(fsm: FSM, ltlString: string): LTLModelCheckResult {
  const formula = parseLTL(ltlString);
  return modelCheck(fsm, formula);
}

export { extractAtoms, toNegationNormalForm };
