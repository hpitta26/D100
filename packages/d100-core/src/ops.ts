import {
  GameState,
  BoardZone,
  StackZone,
  Zone,
  ZoneRule,
  Deck,
  ID,
  Die,
  DieFace,
} from "./object-types";
import { seedFromString } from "./util-seed";

/* =========================
 * Basic Zone/Board Queries
 * ========================= */

export function zone(state: GameState, id: ID): Zone {
  const z = state.zones[id];
  if (!z) throw new Error(`Zone not found: ${id}`);
  return z;
}

export function boardCells(state: GameState, boardId: ID): Array<ID | undefined> {
  const z = zone(state, boardId);
  if (z.kind !== "board") throw new Error("Not a board zone");
  return (z as BoardZone).cells;
}

export function pile(state: GameState, deckId: ID, pileName: string): ID[] {
  const d = state.decks[deckId];
  if (!d) throw new Error(`Deck not found: ${deckId}`);
  d.piles[pileName] ??= [];
  return d.piles[pileName] as ID[];
}

/* =========================
 * Board Mutations
 * ========================= */

export function placeOnBoard(
  state: GameState,
  pieceId: ID,
  boardId: ID,
  index: number
): GameState {
  const z = zone(state, boardId) as BoardZone;
  if (z.kind !== "board") throw new Error("Not a board zone");
  if (index < 0 || index >= z.rows * z.cols) throw new Error("Board index out of bounds");
  if (z.cells[index]) throw new Error("Cell occupied");

  const cells = z.cells.slice();
  cells[index] = pieceId;
  const z2: BoardZone = { ...z, cells };
  return { ...state, zones: { ...state.zones, [z.id]: z2 } };
}

export function clearCell(state: GameState, boardId: ID, index: number): GameState {
  const z = zone(state, boardId) as BoardZone;
  if (z.kind !== "board") throw new Error("Not a board zone");
  if (index < 0 || index >= z.rows * z.cols) throw new Error("Board index out of bounds");

  const cells = z.cells.slice();
  cells[index] = undefined;
  const z2: BoardZone = { ...z, cells };
  return { ...state, zones: { ...state.zones, [z.id]: z2 } };
}

export function moveOnBoard(
  state: GameState,
  boardId: ID,
  from: number,
  to: number
): GameState {
  const z = zone(state, boardId) as BoardZone;
  if (z.kind !== "board") throw new Error("Not a board zone");
  if (from < 0 || from >= z.rows * z.cols || to < 0 || to >= z.rows * z.cols) {
    throw new Error("Board index out of bounds");
  }
  if (!z.cells[from]) throw new Error("No piece at source");
  if (z.cells[to]) throw new Error("Target cell occupied");

  const cells = z.cells.slice();
  cells[to] = cells[from];
  cells[from] = undefined;
  const z2: BoardZone = { ...z, cells };
  return { ...state, zones: { ...state.zones, [z.id]: z2 } };
}

/* =========================
 * Stack/Hand/Area Mutations
 * ========================= */

function assertKindAllows(rule: ZoneRule | undefined, kind: string) {
  if (!rule?.allowKinds) return;
  if (!rule.allowKinds.includes(kind)) throw new Error(`Kind "${kind}" not allowed in zone`);
}
function assertCapacity(rule: ZoneRule | undefined, current: number) {
  if (rule?.maxItems == null) return;
  if (current >= rule.maxItems) throw new Error("Zone is full");
}

export function pushToZone(state: GameState, zoneId: ID, pieceId: ID): GameState {
  const z = zone(state, zoneId);
  if (z.kind === "board") throw new Error("Use board helpers for board zones");
  const stack = z as StackZone;

  const piece = state.pieces[pieceId];
  if (!piece) throw new Error(`Piece not found: ${pieceId}`);

  assertKindAllows(stack.rule, piece.kind);
  assertCapacity(stack.rule, stack.order.length);

  const order = stack.order.slice();
  order.push(pieceId);
  const z2: StackZone = { ...stack, order };
  return { ...state, zones: { ...state.zones, [z.id]: z2 } };
}

export function popFromZone(state: GameState, zoneId: ID): [GameState, ID | undefined] {
  const z = zone(state, zoneId);
  if (z.kind === "board") throw new Error("Use board helpers for board zones");
  const stack = z as StackZone;

  const order = stack.order.slice();
  const id = order.pop();
  const z2: StackZone = { ...stack, order };
  return [{ ...state, zones: { ...state.zones, [z.id]: z2 } }, id];
}

/* =========================
 * Deck Mutations
 * ========================= */

export function popFromPile(
  state: GameState,
  deckId: ID,
  pileName: string
): [GameState, ID | undefined] {
  const d = state.decks[deckId];
  if (!d) throw new Error(`Deck not found: ${deckId}`);

  const arr = (d.piles[pileName] ?? (d.piles[pileName] = [])) as ID[];
  const id = arr.pop();
  const d2: Deck = { ...d, piles: { ...d.piles, [pileName]: arr } };
  return [{ ...state, decks: { ...state.decks, [deckId]: d2 } }, id];
}

export function pushToPile(
  state: GameState,
  deckId: ID,
  pileName: string,
  pieceId: ID
): GameState {
  const d = state.decks[deckId];
  if (!d) throw new Error(`Deck not found: ${deckId}`);

  const arr = ((d.piles[pileName] ?? (d.piles[pileName] = [])) as ID[]).slice();
  arr.push(pieceId);
  const d2: Deck = { ...d, piles: { ...d.piles, [pileName]: arr } };
  return { ...state, decks: { ...state.decks, [deckId]: d2 } };
}

export function transferFromDeckToZone(
  state: GameState,
  deckId: ID,
  pileName: string,
  zoneId: ID
): GameState {
  const [s1, cardId] = popFromPile(state, deckId, pileName);
  if (!cardId) return s1;
  return pushToZone(s1, zoneId, cardId);
}

export function shufflePile(
  state: GameState,
  deckId: ID,
  pileName: string,
  seed?: number
): GameState {
  const d = state.decks[deckId];
  if (!d) throw new Error(`Deck not found: ${deckId}`);

  const arr = ((d.piles[pileName] ?? (d.piles[pileName] = [])) as ID[]).slice();

  // xorshift32 PRNG for deterministic shuffle
  let s = (seed ?? state.ctx.seed) >>> 0;
  const rnd = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 2 ** 32;
  };

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  const d2: Deck = { ...d, piles: { ...d.piles, [pileName]: arr } };
  return { ...state, decks: { ...state.decks, [deckId]: d2 } };
}

/* =========================
 * Piece Attribute Helpers
 * ========================= */

export function setPieceAttr<T = unknown>(
  state: GameState,
  pieceId: ID,
  key: string,
  value: T
): GameState {
  const pc = state.pieces[pieceId];
  if (!pc) throw new Error(`Piece not found: ${pieceId}`);
  const attrs = { ...(pc.attrs ?? {}), [key]: value };
  return { ...state, pieces: { ...state.pieces, [pieceId]: { ...pc, attrs } } };
}

export function incPieceAttr(
  state: GameState,
  pieceId: ID,
  key: string,
  delta: number
): GameState {
  const pc = state.pieces[pieceId];
  if (!pc) throw new Error(`Piece not found: ${pieceId}`);
  const current = Number((pc.attrs ?? {})[key] ?? 0);
  const attrs = { ...(pc.attrs ?? {}), [key]: current + delta };
  return { ...state, pieces: { ...state.pieces, [pieceId]: { ...pc, attrs } } };
}

/* =========================
 * Dice (Deterministic)
 * ========================= */

export interface RollResult {
  value: number | string; // resolved face value
  faceIndex: number;      // 0-based index
  dieKind?: string;
  dieId?: ID;
}

/** PRNG derived from ctx.seed + log length (+ salt) for determinism */
function makeRng(state: GameState, salt = "dice"): () => number {
  const seed = seedFromString(`${state.ctx.seed}|${state.log?.length ?? 0}|${salt}`);
  let s = seed >>> 0;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 2 ** 32;
  };
}

function rollOne(rnd: () => number, spec: { sides: number; faces?: DieFace[] }): RollResult {
  const faces = spec.faces && spec.faces.length > 0 ? spec.faces : undefined;

  if (!faces) {
    const roll = 1 + Math.floor(rnd() * spec.sides);
    return { value: roll, faceIndex: roll - 1 };
  }

  const weights = faces.map((f) => f.weight ?? 1);
  const total = weights.reduce((a, b) => a + b, 0);
  let t = rnd() * total;
  let idx = 0;
  while (idx < faces.length) {
    t -= weights[idx];
    if (t <= 0) break;
    idx++;
  }
  idx = Math.min(idx, faces.length - 1);
  const face = faces[idx];
  const val = face.value ?? idx + 1;
  return { value: val, faceIndex: idx };
}

/** Roll by *kind* (e.g., "D6", "D20", "ResourceDie") */
export function rollDiceByKind(
  state: GameState,
  kind: string,
  count: number,
  salt?: string
): [GameState, RollResult[]] {
  if (count <= 0) return [state, []];

  const one = Object.values(state.dice).find((d) => d.kind === kind);
  const inferSides = () => {
    const m = /^D(\d+)$/i.exec(kind);
    return m ? Math.max(1, parseInt(m[1], 10)) : 6;
    // fallback to 6 if unknown
  };

  const spec = { sides: one?.sides ?? inferSides(), faces: one?.faces ?? undefined };

  const rnd = makeRng(state, salt ?? `dice:${kind}`);
  const results: RollResult[] = [];
  for (let i = 0; i < count; i++) results.push(rollOne(rnd, spec));

  const entry = { t: "dice", atTurn: state.ctx.turn, data: { kind, count, results } };
  const log = (state.log ?? []).concat(entry);
  const next = { ...state, log };

  return [next, results];
}

/** Roll by explicit die ID */
export function rollDiceById(
  state: GameState,
  dieId: ID,
  count: number,
  salt?: string
): [GameState, RollResult[]] {
  const die = state.dice[dieId];
  if (!die) throw new Error(`Die not found: ${dieId}`);
  if (count <= 0) return [state, []];

  const rnd = makeRng(state, salt ?? `dice:${dieId}`);
  const results: RollResult[] = [];
  for (let i = 0; i < count; i++) {
    const r = rollOne(rnd, { sides: die.sides, faces: die.faces });
    results.push({ ...r, dieKind: die.kind, dieId });
  }

  const entry = { t: "dice", atTurn: state.ctx.turn, data: { dieId, kind: die.kind, count, results } };
  const log = (state.log ?? []).concat(entry);
  const next = { ...state, log };

  return [next, results];
}
