/**
 * A small, safe arithmetic evaluator for the calculator tool.
 *
 * The obvious implementation — `new Function('return ' + expr)` or `eval` — is
 * a code-injection hole and would also let a formula reach into globals. This
 * instead tokenises, converts to RPN with the shunting-yard algorithm, and
 * evaluates the RPN. Nothing but numbers, the listed operators, and the listed
 * functions/constants can run. It is deliberately dependency-free: a full math
 * library (mathjs is ~150 kB) is far more than a button-grid calculator needs,
 * and this app keeps its footprint small.
 *
 * Supports: + - * / % ^, unary minus, parentheses, the constants π and e, and
 * the functions sin cos tan asin acos atan sqrt cbrt ln log exp abs. Trig is in
 * radians, matching a scientific calculator's default and what the tutor's
 * physics expects.
 */

type Tok =
  | { t: 'num'; v: number }
  | { t: 'op'; v: string }
  | { t: 'fn'; v: string }
  | { t: 'paren'; v: '(' | ')' };

const FUNCS: Record<string, (x: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sqrt: Math.sqrt,
  cbrt: Math.cbrt,
  ln: Math.log,
  log: Math.log10,
  exp: Math.exp,
  abs: Math.abs,
};

const CONSTS: Record<string, number> = { pi: Math.PI, π: Math.PI, e: Math.E };

// Right-associative only for exponentiation; everything else left.
const PREC: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2, '^': 3 };
const RIGHT = new Set(['^']);

function tokenize(src: string): Tok[] {
  const s = src.replace(/×/g, '*').replace(/÷/g, '/').replace(/√/g, 'sqrt').replace(/−/g, '-');
  const toks: Tok[] = [];
  let i = 0;

  const prev = () => toks[toks.length - 1];
  const afterValue = () => {
    const p = prev();
    return !!p && (p.t === 'num' || (p.t === 'paren' && p.v === ')'));
  };

  while (i < s.length) {
    const c = s[i];

    if (c === ' ') {
      i += 1;
      continue;
    }

    if ((c >= '0' && c <= '9') || c === '.') {
      let j = i + 1;
      while (j < s.length && /[0-9.]/.test(s[j])) j += 1;
      // Scientific notation: 1e3, 2.5e-4
      if (s[j] === 'e' && /[0-9+\-]/.test(s[j + 1] ?? '')) {
        j += 1;
        if (s[j] === '+' || s[j] === '-') j += 1;
        while (j < s.length && /[0-9]/.test(s[j])) j += 1;
      }
      const num = Number(s.slice(i, j));
      if (!Number.isFinite(num)) throw new Error('bad number');
      toks.push({ t: 'num', v: num });
      i = j;
      continue;
    }

    if (/[a-zπ]/i.test(c)) {
      let j = i + 1;
      while (j < s.length && /[a-z]/i.test(s[j])) j += 1;
      const name = s.slice(i, j).toLowerCase();
      if (name in FUNCS) {
        // Implicit multiplication: 2sin(x) -> 2*sin(x)
        if (afterValue()) toks.push({ t: 'op', v: '*' });
        toks.push({ t: 'fn', v: name });
      } else if (name in CONSTS || name === 'π') {
        if (afterValue()) toks.push({ t: 'op', v: '*' });
        toks.push({ t: 'num', v: CONSTS[name] ?? Math.PI });
      } else {
        throw new Error(`unknown name "${name}"`);
      }
      i = j;
      continue;
    }

    if (c === '(') {
      if (afterValue()) toks.push({ t: 'op', v: '*' }); // 2(3) -> 2*3
      toks.push({ t: 'paren', v: '(' });
      i += 1;
      continue;
    }
    if (c === ')') {
      toks.push({ t: 'paren', v: ')' });
      i += 1;
      continue;
    }

    if (c in PREC) {
      toks.push({ t: 'op', v: c });
      i += 1;
      continue;
    }

    throw new Error(`unexpected "${c}"`);
  }

  return toks;
}

/** Shunting-yard: infix tokens -> RPN, resolving unary minus to a `u-` op. */
function toRpn(toks: Tok[]): Tok[] {
  const out: Tok[] = [];
  const ops: Tok[] = [];

  const isValueBefore = (idx: number): boolean => {
    const p = toks[idx - 1];
    return !!p && (p.t === 'num' || (p.t === 'paren' && p.v === ')'));
  };

  for (let i = 0; i < toks.length; i++) {
    const tok = toks[i];

    if (tok.t === 'num') {
      out.push(tok);
    } else if (tok.t === 'fn') {
      ops.push(tok);
    } else if (tok.t === 'op') {
      // Unary minus/plus: at the start or after another operator or '('.
      if ((tok.v === '-' || tok.v === '+') && !isValueBefore(i)) {
        if (tok.v === '-') ops.push({ t: 'op', v: 'u-' });
        continue;
      }
      const prec = PREC[tok.v];
      while (ops.length) {
        const top = ops[ops.length - 1];
        if (top.t === 'fn') {
          out.push(ops.pop()!);
          continue;
        }
        if (top.t === 'op' && top.v !== 'u-') {
          const tp = PREC[top.v];
          if (tp > prec || (tp === prec && !RIGHT.has(tok.v))) {
            out.push(ops.pop()!);
            continue;
          }
        }
        if (top.t === 'op' && top.v === 'u-') {
          // Unary binds tighter than binary ops.
          out.push(ops.pop()!);
          continue;
        }
        break;
      }
      ops.push(tok);
    } else if (tok.v === '(') {
      ops.push(tok);
    } else {
      // ')': pop until matching '('
      let matched = false;
      while (ops.length) {
        const top = ops.pop()!;
        if (top.t === 'paren' && top.v === '(') {
          matched = true;
          break;
        }
        out.push(top);
      }
      if (!matched) throw new Error('mismatched )');
      if (ops.length && ops[ops.length - 1].t === 'fn') out.push(ops.pop()!);
    }
  }

  while (ops.length) {
    const top = ops.pop()!;
    if (top.t === 'paren') throw new Error('mismatched (');
    out.push(top);
  }
  return out;
}

function evalRpn(rpn: Tok[]): number {
  const st: number[] = [];
  for (const tok of rpn) {
    if (tok.t === 'num') {
      st.push(tok.v);
    } else if (tok.t === 'fn') {
      const x = st.pop();
      if (x === undefined) throw new Error('missing argument');
      st.push(FUNCS[tok.v](x));
    } else if (tok.t === 'op' && tok.v === 'u-') {
      const x = st.pop();
      if (x === undefined) throw new Error('missing operand');
      st.push(-x);
    } else if (tok.t === 'op') {
      const b = st.pop();
      const a = st.pop();
      if (a === undefined || b === undefined) throw new Error('missing operand');
      switch (tok.v) {
        case '+': st.push(a + b); break;
        case '-': st.push(a - b); break;
        case '*': st.push(a * b); break;
        case '/': st.push(a / b); break;
        case '%': st.push(a % b); break;
        case '^': st.push(a ** b); break;
        default: throw new Error(`bad op ${tok.v}`);
      }
    }
  }
  if (st.length !== 1) throw new Error('incomplete expression');
  return st[0];
}

export interface CalcResult {
  value: number | null;
  /** Display-ready string, e.g. "3.1416" — null when the input is incomplete. */
  text: string | null;
  error: boolean;
}

/** Trim floating-point noise (0.1+0.2) without lying about real precision. */
function format(n: number): string {
  if (!Number.isFinite(n)) return n > 0 ? '∞' : n < 0 ? '-∞' : 'NaN';
  if (Number.isInteger(n)) return String(n);
  const rounded = Number(n.toPrecision(12));
  return String(rounded);
}

/**
 * Evaluate an expression. Never throws: a partial or malformed expression
 * (which is normal while the user is still typing) returns `{value:null}` so
 * the caller can simply show nothing rather than an error.
 */
export function evaluate(expr: string): CalcResult {
  const trimmed = expr.trim();
  if (!trimmed) return { value: null, text: null, error: false };
  try {
    const value = evalRpn(toRpn(tokenize(trimmed)));
    if (Number.isNaN(value)) return { value: null, text: null, error: true };
    return { value, text: format(value), error: false };
  } catch {
    return { value: null, text: null, error: false };
  }
}
