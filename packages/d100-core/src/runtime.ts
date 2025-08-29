import { GameState, GameStatus } from "./object-types";
import { Settings } from "./object-types";
import { GameBox } from "./objects";
import { seedFromString } from "./util-seed";

/** ---------- Moves ---------- */
export interface MoveDef<Args = any> {
  name: string;
  input?: (a: any) => any;                       // optional input sanitizer (e.g., zod.parse)
  validate?: (s: GameState, a: Args) => string | null;
  apply: (s: GameState, a: Args) => GameState;
  /** Control actor rotation after this move. Default "auto". */
  advance?: "auto" | "none";
}

/** ---------- Phases ---------- */
export interface PhaseDef {
  id: string;
  onEnter?: (s: GameState) => GameState;
  onLeave?: (s: GameState) => GameState;
}

/** ---------- Turn/Round System ---------- */
export interface TurnSystem {
  /** Called when a new round begins (e.g., deal community cards). */
  onRoundStart?: (s: GameState) => GameState;
  /** Called when the active player is set (start of *their* turn). */
  onTurnStart?: (s: GameState) => GameState;
  /** Called before a move’s validate/apply. */
  onBeforeAction?: (s: GameState, move: string, args: any) => GameState;
  /** Called after a move’s apply (before any automatic rotation). */
  onAfterAction?: (s: GameState, move: string, args: any) => GameState;
  /** Called when the actor’s turn is ending (right before choosing next player). */
  onTurnEnd?: (s: GameState) => GameState;
  /** Called between players (after turn end, before setting next actor). */
  onBetweenPlayers?: (s: GameState) => GameState;
  /** Return true when a round is complete (to trigger onRoundEnd/onRoundStart). */
  isRoundOver?: (s: GameState) => boolean;
  /** Called when a round finishes. */
  onRoundEnd?: (s: GameState) => GameState;
  /** Custom next-actor policy (e.g., skip folded players). Defaults to seat rotation. */
  nextPlayer?: (s: GameState) => GameState["ctx"]["currentPlayer"];
}

/** ---------- Game Definition ---------- */
export interface GameDefinition {
  settings: Settings;                 // seats, templates, dice, etc.
  box: GameBox;                       // what’s in the box
  phases?: PhaseDef[];
  moves: Record<string, MoveDef<any>>;
  turns?: TurnSystem;                 // generic turn/round hooks
  isTerminal?: (s: GameState) => boolean;
  getWinner?: (s: GameState) => GameState["ctx"]["winner"];
  setup?: (s: GameState) => GameState; // optional post-build setup (deal/shuffle/place)
}

/** ---------- Status helper ---------- */
export function deriveStatus(s: GameState, def: GameDefinition): GameStatus {
  if (def.isTerminal?.(s)) return "finished";
  if (s.ctx.turn === 0) return "waiting";
  return "in_progress";
}

/** ---------- Phase helper ---------- */
export function setPhase(def: GameDefinition, state: GameState, id: string): GameState {
  const current = def.phases?.find((p) => p.id === state.ctx.phase);
  let next = state;
  if (current?.onLeave) next = current.onLeave(next);
  next = { ...next, ctx: { ...next.ctx, phase: id } };
  const target = def.phases?.find((p) => p.id === id);
  if (target?.onEnter) next = target.onEnter(next);
  return next;
}

/** ---------- Turn helper (advances seat and runs onTurnStart) ---------- */
export function endTurn(state: GameState, def?: GameDefinition): GameState {
  const pick =
    def?.turns?.nextPlayer ??
    ((s: GameState) => {
      const { players, currentPlayer } = s.ctx;
      const i = players.indexOf(currentPlayer);
      return players[(i + 1) % players.length];
    });

  const nextPlayer = pick(state);
  let next = {
    ...state,
    ctx: { ...state.ctx, currentPlayer: nextPlayer, turn: state.ctx.turn + 1 },
  };

  if (def?.turns?.onTurnStart) next = def.turns.onTurnStart(next);
  return next;
}

/** ---------- Round bootstrap ---------- */
export function enterFirstRound(def: GameDefinition, s: GameState): GameState {
  return def.turns?.onRoundStart ? def.turns.onRoundStart(s) : s;
}

/** ---------- Match creation ---------- */
export function createMatch(
  def: GameDefinition,
  players: string[],
  seed?: number | string
): GameState {
  const useSeed = seedFromString(seed ?? def.settings.setupSeed ?? 1);
  let state = def.box.buildState(players as any, useSeed);

  if (def.setup) state = def.setup(state);

  // Enter first phase if present; otherwise default to "play"
  const first = def.phases?.[0];
  if (first?.onEnter) state = first.onEnter({ ...state, ctx: { ...state.ctx, phase: first.id } });
  else state = { ...state, ctx: { ...state.ctx, phase: first?.id ?? "play" } };

  // Start the first round + first actor’s turn hooks
  state = enterFirstRound(def, state);
  if (def.turns?.onTurnStart) state = def.turns.onTurnStart(state);

  return state;
}

/** ---------- Apply a move with turn/round orchestration ---------- */
export function applyMove(
  def: GameDefinition,
  state: GameState,
  name: string,
  args: any
): GameState {
  const mv = def.moves[name];
  if (!mv) throw new Error(`Unknown move: ${name}`);

  const input = mv.input ? mv.input(args) : args;

  // Global pre-action hook (useful for timers, upkeep, etc.)
  let s = def.turns?.onBeforeAction ? def.turns.onBeforeAction(state, name, input) : state;

  // Move-level validation
  const msg = mv.validate?.(s, input);
  if (msg) throw new Error(msg);

  // Apply move
  s = mv.apply(s, input);

  // Global post-action hook (e.g., auto-effects)
  s = def.turns?.onAfterAction ? def.turns.onAfterAction(s, name, input) : s;

  // Terminal check
  const finished = def.isTerminal?.(s) ?? false;
  if (finished) {
    if (def.getWinner) s = { ...s, ctx: { ...s.ctx, winner: def.getWinner(s) } };
    return s;
  }

  // If this move wants to control rotation itself, stop here.
  if ((mv.advance ?? "auto") === "none") {
    return s;
  }

  // Automatic turn end + between-players hook
  if (def.turns?.onTurnEnd) s = def.turns.onTurnEnd(s);
  if (def.turns?.onBetweenPlayers) s = def.turns.onBetweenPlayers(s);

  // Round boundary?
  const roundOver = def.turns?.isRoundOver?.(s) ?? false;
  if (roundOver) {
    if (def.turns?.onRoundEnd) s = def.turns.onRoundEnd(s);
    if (def.turns?.onRoundStart) s = def.turns.onRoundStart(s);
  }

  // Advance to next actor and trigger onTurnStart
  s = endTurn(s, def);
  return s;
}
