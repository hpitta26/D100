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
  anchor: Anchor;           // where to place on the table/canvas
  order?: number;           // z-index hint (larger = above)
  width?: number;           // optional size hints (renderer decides units)
  height?: number;
  offset?: { x?: number; y?: number }; // fine tune placement
  gridArea?: string;        // optional named CSS grid area
}

// ---------- Players ----------
export interface Player {
  id: PlayerID;
  seat: number;              // turn order number
  name?: string;
  health?: number;
  victoryPoints?: number;
  attrs?: Record<string, unknown>;
}

// ---------- Pieces & Cards ----------
export interface SkinRef { svgId?: string; cssClass?: string; }

export interface Piece {
  id: ID;
  kind: string;              // developer-defined (e.g., "meeple", "cube", "markX")
  owner?: PlayerID | null;   // null for neutral
  shape?: "square";          // future: "hex", "circle"
  skin?: SkinRef;
  attrs?: Record<string, unknown>;
}

export interface Card extends Piece {
  cardName: string;
  cardType: string;          // developer-defined card type
}

// ---------- Zones ----------
export type ZoneKind = "board" | "stack" | "hand" | "bag" | "discard" | "pool" | "area";

export interface ZoneRule {
  allowKinds?: string[];     // which piece/card kinds may enter
  maxItems?: number | null;  // capacity
  visibility?: "public" | "owner" | "none";
}

export interface ZoneBase {
  id: ID;
  name: string;
  kind: ZoneKind;
  owner?: PlayerID | null;   // hands typically have owners
  rule?: ZoneRule;
  ui?: UILayout;             // presentational only
}

export interface BoardZone extends ZoneBase {
  kind: "board";
  rows: number;
  cols: number;
  // cell i -> piece id
  cells: Array<ID | undefined>;
  skin?: SkinRef;
}

export interface StackZone extends ZoneBase {
  kind: "stack" | "hand" | "bag" | "discard" | "pool" | "area";
  order: ID[];               // top is end
}

export type Zone = BoardZone | StackZone;

// ---------- Decks ----------
export interface Deck {
  id: ID;
  name: string;
  owner?: PlayerID | null;
  piles: Record<string, ID[]>; // e.g. draw/discard/revealed/etc
}

// ---------- Phases ----------
export interface Phase {
  id: PhaseID;
  onEnter?: (state: GameState) => GameState;
  onLeave?: (state: GameState) => GameState;
}

// ---------- DICE ----------
export interface DieFace {
  value?: number | string;      // what this face means (e.g., 1..6, "wood", "robber")
  weight?: number;              // default 1; supports weighted dice
  skin?: SkinRef;               // optional skin per face
  attrs?: Record<string, unknown>;
}

export interface Die {
  id: ID;
  name: string;
  kind: string;                 // e.g., "D6", "D20", "ResourceDie"
  sides: number;                // number of faces
  faces?: DieFace[];            // optional explicit faces (length may equal sides)
  owner?: PlayerID | null;      // usually null
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
  pieces: Record<ID, Piece>;     // includes Card (via discriminated props)
  zones: Record<ID, Zone>;
  decks: Record<ID, Deck>;
  dice: Record<ID, Die>;         // <-- NEW: dice pool
  log?: Array<{ t: string; atTurn: number; data?: any }>;
}

// ---------- Settings ----------
export interface PlayerSlots { min: number; max: number; default: number; }

export interface PieceTemplate {
  kind: string;
  perPlayer?: number;         // create per player
  extras?: number;            // neutral/global extra pieces
  attrs?: Record<string, unknown>;
  skin?: SkinRef;
  asCard?: { name: string; type: string; skin?: SkinRef }; // build Cards instead
}

export interface DiceTemplate {
  kind: string;               // e.g., "D6", "D20", "ResourceDie"
  sides: number;
  count: number;              // how many dice of this kind in the box
  faces?: DieFace[];          // optional icons/labels/weights
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
  dice?: DiceTemplate[];      // <-- NEW
}
