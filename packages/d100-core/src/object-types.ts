// Core, serializable types the runtime understands

export type ID = string & { __brand: "ID" };
export type PlayerID = string & { __brand: "PlayerID" };

export type GameStatus = "waiting" | "in_progress" | "finished";
export type PhaseID = string;

// ---------- UI Layout (metadata for renderers) ----------
export type Anchor =
  | "center" | "left" | "right" | "top" | "bottom"
  | "top-left" | "top-right" | "bottom-left" | "bottom-right";

export interface UILayout {
  anchor: Anchor;
  order?: number;
  width?: number;
  height?: number;
  offset?: { x?: number; y?: number };
  gridArea?: string;
}

// ---------- Players ----------
export interface Player {
  id: PlayerID;
  seat: number;
  name?: string;
  health?: number;
  victoryPoints?: number;
  attrs?: Record<string, unknown>;   // use for stacks/banks etc.
}

// ---------- Pieces & Cards ----------
export interface SkinRef { svgId?: string; cssClass?: string; }

export interface Piece {
  id: ID;
  kind: string;               // developer-defined
  owner?: PlayerID | null;
  shape?: "square";
  skin?: SkinRef;
  attrs?: Record<string, unknown>;
}

export interface Card extends Piece {
  cardName: string;
  cardType: string;           // developer-defined card type
}

// ---------- Zones ----------
export type ZoneKind = "board" | "stack" | "hand" | "bag" | "discard" | "pool" | "area";

export interface ZoneRule {
  allowKinds?: string[];
  maxItems?: number | null;
  visibility?: "public" | "owner" | "none";
}

export interface ZoneBase {
  id: ID;
  name: string;
  kind: ZoneKind;
  owner?: PlayerID | null;
  rule?: ZoneRule;
  ui?: UILayout;
  /** Freeform metadata the renderer/dev tools can read.  */
  attrs?: Record<string, unknown>; // <-- added
}

export interface BoardZone extends ZoneBase {
  kind: "board";
  rows: number;
  cols: number;
  cells: Array<ID | undefined>;
  skin?: SkinRef;
}

export interface StackZone extends ZoneBase {
  kind: "stack" | "hand" | "bag" | "discard" | "pool" | "area";
  order: ID[];
}

export type Zone = BoardZone | StackZone;

// ---------- Decks ----------
export interface Deck {
  id: ID;
  name: string;
  owner?: PlayerID | null;
  piles: Record<string, ID[]>;
}

// ---------- Phases ----------
export interface Phase {
  id: PhaseID;
  onEnter?: (state: GameState) => GameState;
  onLeave?: (state: GameState) => GameState;
}

// ---------- DICE ----------
export interface DieFace {
  value?: number | string;
  weight?: number;
  skin?: SkinRef;
  attrs?: Record<string, unknown>;
}

export interface Die {
  id: ID;
  name: string;
  kind: string;     // e.g., "D6", "D20"
  sides: number;
  faces?: DieFace[];
  owner?: PlayerID | null;
  skin?: SkinRef;
  attrs?: Record<string, unknown>;
}

// ---------- Context/State ----------
export interface GameContext {
  players: PlayerID[];
  currentPlayer: PlayerID;
  phase: PhaseID;
  turn: number;
  seed: number;
  winner?: PlayerID | "draw";
}

export interface GameState {
  ctx: GameContext;
  players: Record<PlayerID, Player>;
  pieces: Record<ID, Piece>;
  zones: Record<ID, Zone>;
  decks: Record<ID, Deck>;
  dice: Record<ID, Die>;
  log?: Array<{ t: string; atTurn: number; data?: any }>;
}

// ---------- Settings ----------
export interface PlayerSlots { min: number; max: number; default: number; }

export interface PieceTemplate {
  kind: string;
  perPlayer?: number;
  extras?: number;
  attrs?: Record<string, unknown>;
  skin?: SkinRef;
  asCard?: { name: string; type: string; skin?: SkinRef };
}

export interface DiceTemplate {
  kind: string;
  sides: number;
  count: number;
  faces?: DieFace[];
  skin?: SkinRef;
  owner?: PlayerID | null;
  attrs?: Record<string, unknown>;
}

export interface Settings {
  id: string;
  name?: string;
  players: PlayerSlots;
  allowSpectators?: boolean;
  hiddenInfo?: boolean;
  setupSeed?: number | string;
  pieces?: PieceTemplate[];
  dice?: DiceTemplate[];
}

/* ---------------------- NEW: Controls metadata ---------------------- */

export type ControlInput =
  | { type: "none" }
  | { type: "number"; min: number; max: number; step?: number; default?: number }
  | { type: "select"; options: Array<{ label: string; value: any }>; default?: any };

export interface Control {
  /** Stable id for UI keys (e.g., "poker:bet", "c4:drop-3"). */
  id: string;
  /** Button label shown in the UI. Keep short. */
  label: string;
  /** The move name to invoke from GameDefinition.moves */
  move: string;
  /** Optional static args sent to the move (UI may further add user-provided fields). */
  args?: Record<string, any>;
  /** Optional input description so a generic UI can render a slider/select. */
  input?: ControlInput;
  /** If disabled, show reason as tooltip. */
  disabled?: boolean;
  disabledReason?: string;
  /** Optional grouping (e.g., "betting", "utility"). */
  group?: string;
}
