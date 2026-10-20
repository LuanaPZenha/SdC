type Token =
  | { kind: "num"; value: number }
  | { kind: "id"; value: string }
  | { kind: "op"; value: "+" | "-" | "*" | "/" }
  | { kind: "lp" }
  | { kind: "rp" }
  | { kind: "comma" };

const FUNCTIONS: Record<string, number> = {
  exp: 1,
  abs: 1,
  sqrt: 1,
  round: 1,
  min: 2,
  max: 2,
  clamp: 3,
};

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  while (index < input.length) {
    const char = input[index];
    if (char === " " || char === "\n" || char === "\t" || char === "\r") {
      index += 1;
      continue;
    }
    if (char === "(") {
      tokens.push({ kind: "lp" });
      index += 1;
      continue;
    }
    if (char === ")") {
      tokens.push({ kind: "rp" });
      index += 1;
      continue;
    }
    if (char === ",") {
      tokens.push({ kind: "comma" });
      index += 1;
      continue;
    }
    if (char === "+" || char === "-" || char === "*" || char === "/") {
      tokens.push({ kind: "op", value: char });
      index += 1;
      continue;
    }
    if ((char >= "0" && char <= "9") || char === ".") {
      let end = index + 1;
      while (end < input.length && /[0-9.]/.test(input[end] ?? "")) end += 1;
      const value = Number(input.slice(index, end));
      if (Number.isNaN(value)) throw new Error("Número inválido na fórmula.");
      tokens.push({ kind: "num", value });
      index = end;
      continue;
    }
    if (/[A-Za-z_]/.test(char ?? "")) {
      let end = index + 1;
      while (end < input.length && /[A-Za-z0-9_]/.test(input[end] ?? "")) end += 1;
      tokens.push({ kind: "id", value: input.slice(index, end) });
      index = end;
      continue;
    }
    throw new Error(`Caractere inválido na fórmula: ${char}`);
  }
  return tokens;
}

class Parser {
  private index = 0;

  constructor(
    private readonly tokens: Token[],
    private readonly vars: Record<string, number>,
  ) {}

  parse(): number {
    const value = this.parseExpression();
    if (this.peek()) throw new Error("A fórmula tem um trecho sobrando.");
    if (!Number.isFinite(value)) throw new Error("A fórmula não produziu um número finito.");
    return value;
  }

  private peek(): Token | undefined {
    return this.tokens[this.index];
  }

  private eat(): Token {
    const token = this.tokens[this.index];
    if (!token) throw new Error("Fórmula incompleta.");
    this.index += 1;
    return token;
  }

  private parseExpression(): number {
    let value = this.parseTerm();
    while (this.peek()?.kind === "op" && (this.peek() as { value: string }).value.match(/[+-]/)) {
      const op = (this.eat() as { value: "+" | "-" }).value;
      const right = this.parseTerm();
      value = op === "+" ? value + right : value - right;
    }
    return value;
  }

  private parseTerm(): number {
    let value = this.parseFactor();
    while (this.peek()?.kind === "op" && (this.peek() as { value: string }).value.match(/[*\/]/)) {
      const op = (this.eat() as { value: "*" | "/" }).value;
      const right = this.parseFactor();
      if (op === "/" && right === 0) throw new Error("Divisão por zero na fórmula.");
      value = op === "*" ? value * right : value / right;
    }
    return value;
  }

  private parseFactor(): number {
    const token = this.peek();
    if (token?.kind === "op" && (token.value === "-" || token.value === "+")) {
      this.eat();
      const value = this.parseFactor();
      return token.value === "-" ? -value : value;
    }
    if (token?.kind === "num") {
      this.eat();
      return token.value;
    }
    if (token?.kind === "id") {
      this.eat();
      if (this.peek()?.kind === "lp") return this.parseCall(token.value);
      if (!(token.value in this.vars)) throw new Error(`Variável desconhecida: ${token.value}`);
      return this.vars[token.value] ?? 0;
    }
    if (token?.kind === "lp") {
      this.eat();
      const value = this.parseExpression();
      const close = this.eat();
      if (close.kind !== "rp") throw new Error("Falta fechar parêntese.");
      return value;
    }
    throw new Error("Trecho inválido na fórmula.");
  }

  private parseCall(name: string): number {
    const arity = FUNCTIONS[name];
    if (!arity) throw new Error(`Função não permitida: ${name}`);
    if (this.eat().kind !== "lp") throw new Error("Falta abrir parêntese da função.");
    const args: number[] = [];
    if (this.peek()?.kind !== "rp") {
      args.push(this.parseExpression());
      while (this.peek()?.kind === "comma") {
        this.eat();
        args.push(this.parseExpression());
      }
    }
    if (this.eat().kind !== "rp") throw new Error("Falta fechar a função.");
    if (args.length !== arity) throw new Error(`${name} espera ${arity} argumento(s).`);
    return applyFunction(name, args);
  }
}

function applyFunction(name: string, args: number[]): number {
  const [a = 0, b = 0, c = 0] = args;
  if (name === "exp") return Math.exp(a);
  if (name === "abs") return Math.abs(a);
  if (name === "sqrt") {
    if (a < 0) throw new Error("Raiz de número negativo.");
    return Math.sqrt(a);
  }
  if (name === "round") return Math.round(a);
  if (name === "min") return Math.min(a, b);
  if (name === "max") return Math.max(a, b);
  return Math.min(Math.max(a, b), c);
}

export function evalFormula(expression: string, vars: Record<string, number>): number {
  const parser = new Parser(tokenize(expression), vars);
  return parser.parse();
}

export const FORMULA_SAMPLE: Record<string, number> = {
  infectedShare: 0.01,
  beta: 0.36,
  factor: 1,
  imported: 0.002,
  susceptible: 20000,
  force: 0.02,
  treated: 40,
  untreated: 8,
  baseLethality: 0.01,
  lethalityShift: 0,
  overloadLethality: 0.07,
  parallelBeds: 24,
  apatiaBeds: 80,
  baseIncome: 3.8,
  quarantineWeight: 0.5,
  quarantine: 0.4,
  incomeExtra: 0,
  researchBase: 0.25,
  researchDaily: 1.4,
  capacity: 160,
  days: 12,
  research: 30,
  dead: 4,
  winBonus: 0,
  scorePerDay: 15,
  scorePerResearch: 2,
  scorePerDeath: 0.02,
};
