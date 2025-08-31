import { GameState, GameStatus, PlayerID, Phase, Control } from "./object-types";
import { Settings } from "./object-types";
import { GameBox } from "./objects";
import { seedFromString } from "./util-seed";

/* ---------- Moves/Phases ---------- */
export interface MoveDef<Args = any> {
  name: string;
  input?: (a: any) => any;             // optional runtime validator
  validate?: (s: GameState, a: Args) => string | null;
  apply: (s: GameState, a: Args) => GameState;
}

export interface PhaseDef extends Phase {}

/* ---------- Game Definition ---------- */
export interface GameDefinition {
  settings: Settings;                  // seats, pieces per player, extras, etc.
  box: GameBox;                        // the “what’s in the box”
  phases?: PhaseDef[];
  moves: Record<string, MoveDef<any>>;
  isTerminal?: (s: GameState) => boolean;
  getWinner?: (s: GameState) => GameState["ctx"]["winner"];
  setup?: (s: GameState) => GameState; // optional post-build setup (deal/shuffle/place)

  /** NEW: optional hook to compute valid, contextual controls for a player. */
  controls?: (s: GameState, forPlayer: PlayerID) => Control[];
}

/* ---------- Helpers ---------- */
export function deriveStatus(s: GameState, def: GameDefinition): GameStatus {
  if (def.isTerminal?.(s)) return "finished";
  if (s.ctx.turn === 0) return "waiting";
  return "in_progress";
}

export function createMatch(def: GameDefinition, players: string[], seed?: number | string): GameState {
  const useSeed = seedFromString(seed ?? def.settings.setupSeed ?? 1);
  let state = def.box.buildState(players as any, useSeed);
  if (def.setup) state = def.setup(state);
  // enter first phase if provided
  const first = def.phases?.[0];
  if (first?.onEnter) state = first.onEnter({ ...state, ctx: { ...state.ctx, phase: first.id } });
  else state.ctx.phase = first?.id ?? "play";
  return state;
}

/** Apply a named move. Validates and rotates the active player unless the game ends. */
export function applyMove(def: GameDefinition, state: GameState, name: string, args: any): GameState {
  const mv = def.moves[name];
  if (!mv) throw new Error(`Unknown move: ${name}`);
  if (mv.input) mv.input(args);
  const msg = mv.validate?.(state, args);
  if (msg) throw new Error(msg);

  let next = mv.apply(state, args);

  const done = def.isTerminal?.(next) ?? false;
  if (!done) {
    // advance turn + keep phase
    const { players, currentPlayer, turn } = next.ctx;
    const i = players.indexOf(currentPlayer);
    next = {
      ...next,
      ctx: { ...next.ctx, currentPlayer: players[(i + 1) % players.length], turn: turn + 1 },
    };
  } else if (def.getWinner) {
    next = { ...next, ctx: { ...next.ctx, winner: def.getWinner(next) } };
  }

  return next;
}

/** Explicitly end the current player's turn without performing a move. */
export function endTurn(state: GameState, def: GameDefinition): GameState {
  const { players, currentPlayer, turn } = state.ctx;
  const i = players.indexOf(currentPlayer);
  return {
    ...state,
    ctx: { ...state.ctx, currentPlayer: players[(i + 1) % players.length], turn: turn + 1 },
  };
}

/** NEW: ask the game for dynamic, valid controls for a given player. */
export function getControls(def: GameDefinition, s: GameState, forPlayer: PlayerID): Control[] {
  return def.controls ? def.controls(s, forPlayer) : [];
}
