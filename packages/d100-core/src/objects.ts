import {
  ID,
  PlayerID,
  Player,
  Zone,
  BoardZone,
  ZoneRule,
  Deck,
  Piece,
  Card,
  SkinRef,
  GameState,
  Settings,
  Die,
  DieFace,
  UILayout,
  Anchor,
} from "./object-types";
import { nid } from "./ids";

/** ---------------- Player ---------------- */
export class PlayerObj implements Player {
  id: PlayerID;
  seat: number;
  name?: string;
  health?: number;
  victoryPoints?: number;
  attrs?: Record<string, unknown>;
  constructor(seat: number, name?: string) {
    this.id = (`p_${seat}`) as PlayerID;
    this.seat = seat;
    this.name = name ?? `Player ${seat}`;
  }
  withHealth(h: number) { this.health = h; return this; }
  withVP(vp: number) { this.victoryPoints = vp; return this; }
  withAttrs(attrs: Record<string, unknown>) { this.attrs = attrs; return this; }
}

/** ---------------- Pieces & Cards ---------------- */
export class PieceObj implements Piece {
  id: ID = nid("pc");
  kind: string;
  owner?: PlayerID | null;
  shape?: "square" = "square";
  skin?: SkinRef;
  attrs?: Record<string, unknown>;
  constructor(kind: string, owner?: PlayerID | null) {
    this.kind = kind;
    this.owner = owner ?? null;
  }
  withSkin(s: SkinRef) { this.skin = s; return this; }
  withAttrs(a: Record<string, unknown>) { this.attrs = a; return this; }
}

export class CardObj extends PieceObj implements Card {
  cardName: string;
  cardType: string;
  constructor(cardName: string, cardType: string, owner?: PlayerID | null) {
    super("card", owner);
    this.cardName = cardName;
    this.cardType = cardType;
  }
}

/** ---------------- Zones ---------------- */
export class BoardObj {
  id: ID = nid("board");
  name: string;
  rows: number;
  cols: number;
  skin?: SkinRef;
  rule?: ZoneRule;
  ui?: UILayout;

  constructor(name: string, rows: number, cols: number) {
    this.name = name; this.rows = rows; this.cols = cols;
  }
  withSkin(s: SkinRef) { this.skin = s; return this; }
  withRule(r: ZoneRule) { this.rule = r; return this; }
  at(anchor: Anchor, opts: Omit<UILayout, "anchor"> = {}) { this.ui = { anchor, ...opts }; return this; }
  build(): BoardZone {
    return {
      id: this.id,
      name: this.name,
      kind: "board",
      rows: this.rows,
      cols: this.cols,
      skin: this.skin,
      rule: this.rule,
      ui: this.ui,
      cells: Array(this.rows * this.cols).fill(undefined),
    };
  }
}

export class ZoneObj {
  id: ID = nid("zone");
  name: string;
  kind: Zone["kind"];
  owner?: PlayerID | null;
  rule?: ZoneRule;
  ui?: UILayout;

  constructor(name: string, kind: Zone["kind"], owner?: PlayerID | null) {
    if (kind === "board") throw new Error("Use BoardObj for board zones");
    this.name = name; this.kind = kind; this.owner = owner ?? null;
  }
  withRule(r: ZoneRule) { this.rule = r; return this; }
  at(anchor: Anchor, opts: Omit<UILayout, "anchor"> = {}) { this.ui = { anchor, ...opts }; return this; }
  build(): Zone {
    return {
      id: this.id,
      name: this.name,
      kind: this.kind,
      owner: this.owner ?? null,
      rule: this.rule,
      ui: this.ui,
      order: [],
    } as Zone;
  }
}

/** ---------------- Decks ---------------- */
export class DeckObj {
  id: ID = nid("deck");
  name: string;
  owner?: PlayerID | null;
  piles: Record<string, ID[]> = { draw: [], discard: [] };
  constructor(name: string, owner?: PlayerID | null) {
    this.name = name; this.owner = owner ?? null;
  }
  ensurePile(name: string) { this.piles[name] ??= []; return this; }
  build(): Deck {
    return { id: this.id, name: this.name, owner: this.owner ?? null, piles: this.piles };
  }
}

/** ---------------- Dice ---------------- */
export class DieObj implements Die {
  id: ID = nid("die");
  name: string;
  kind: string;
  sides: number;
  faces?: DieFace[];
  owner?: PlayerID | null;
  skin?: SkinRef;
  attrs?: Record<string, unknown>;

  constructor(kind: string, sides: number, name?: string, owner?: PlayerID | null) {
    this.kind = kind;
    this.sides = sides;
    this.name = name ?? kind;
    this.owner = owner ?? null;
  }
  withFaces(f: DieFace[]) { this.faces = f; return this; }
  withSkin(s: SkinRef) { this.skin = s; return this; }
  withAttrs(a: Record<string, unknown>) { this.attrs = a; return this; }
}

/** ---------------- GameBox ---------------- */
export class GameBox {
  settings: Settings;
  players: PlayerObj[] = [];
  boards: BoardObj[] = [];
  zones: ZoneObj[] = [];
  decks: DeckObj[] = [];
  poolPieces: PieceObj[] = []; // neutral/extras
  diceObjs: DieObj[] = [];     // authored dice

  constructor(settings: Settings) { this.settings = settings; }

  addPlayer(p: PlayerObj) { this.players.push(p); return this; }
  addBoard(b: BoardObj) { this.boards.push(b); return this; }
  addZone(z: ZoneObj) { this.zones.push(z); return this; }
  addDeck(d: DeckObj) { this.decks.push(d); return this; }
  addPiece(p: PieceObj) { this.poolPieces.push(p); return this; }
  addDie(d: DieObj) { this.diceObjs.push(d); return this; }

  /** Build a fresh serializable GameState based on the box + player order. */
  buildState(playerOrder: PlayerID[], seed: number): GameState {
    const { min, max } = this.settings.players;
    if (playerOrder.length < min || playerOrder.length > max) {
      throw new Error(`Players must be within [${min}, ${max}]`);
    }

    const players: Record<PlayerID, Player> = {} as any;
    playerOrder.forEach((pid, i) => {
      const preset = this.players[i];
      players[pid] = {
        id: pid,
        seat: i + 1,
        name: preset?.name ?? `Player ${i + 1}`,
        health: preset?.health,
        victoryPoints: preset?.victoryPoints,
        attrs: preset?.attrs,
      };
    });

    const zones: Record<ID, Zone> = {} as any;
    this.boards.forEach((b) => { const z = b.build(); zones[z.id] = z; });
    this.zones.forEach((z0) => { const z = z0.build(); zones[z.id] = z; });

    const decks: Record<ID, Deck> = {} as any;
    this.decks.forEach((d0) => { const d = d0.build(); decks[d.id] = d; });

    const pieces: Record<ID, Piece> = {} as any;
    // extras first
    const tplList = this.settings.pieces ?? [];
    for (const tpl of tplList) {
      const extras = tpl.extras ?? 0;
      for (let i = 0; i < extras; i++) {
        const p = new PieceObj(tpl.kind, null).withAttrs(tpl.attrs ?? {}).withSkin(tpl.skin ?? {});
        pieces[p.id] = p;
      }
    }
    // per-player templates
    for (const tpl of tplList) {
      const per = tpl.perPlayer ?? 0;
      for (let i = 0; i < per; i++) {
        for (const pid of playerOrder) {
          if (tpl.asCard) {
            const c = new CardObj(tpl.asCard.name, tpl.asCard.type, pid).withSkin(tpl.asCard.skin ?? {});
            (c as Piece).kind = tpl.kind;
            pieces[c.id] = c;
          } else {
            const p = new PieceObj(tpl.kind, pid).withAttrs(tpl.attrs ?? {}).withSkin(tpl.skin ?? {});
            pieces[p.id] = p;
          }
        }
      }
    }

    // dice from settings templates
    const dice: Record<ID, Die> = {} as any;
    for (const dt of this.settings.dice ?? []) {
      for (let i = 0; i < dt.count; i++) {
        const d = new DieObj(dt.kind, dt.sides, dt.kind, dt.owner)
          .withFaces(dt.faces ?? [])
          .withSkin(dt.skin ?? {})
          .withAttrs(dt.attrs ?? {});
        dice[d.id] = d;
      }
    }
    // authored dice (if any)
    for (const d0 of this.diceObjs) {
      const d = { ...d0 } as Die;
      dice[d.id] = d;
    }

    return {
      ctx: {
        players: playerOrder,
        currentPlayer: playerOrder[0],
        phase: "setup",
        turn: 0,
        seed,
      },
      players,
      pieces,
      zones,
      decks,
      dice,
      log: [],
    };
  }
}

export default GameBox;
