import { GameDefinition, createMatch as _createMatch, setPhase, endTurn } from "../../d100-core/src/runtime";
import { GameBox, BoardObj, ZoneObj, DeckObj, CardObj, PieceObj } from "../../d100-core/src/objects";
import {
  GameState, Settings, ID, BoardZone, PlayerID, StackZone
} from "../../d100-core/src/object-types";
import {
  popFromPile, pushToPile, shufflePile, transferFromDeckToZone,
  placeOnBoard, incPieceAttr, pushToZone
} from "../../d100-core/src/ops";

/** Settings */
const settings: Settings = {
  id: "poker-nlh",
  players: { min: 2, max: 9, default: 4 },
  hiddenInfo: true,
};

/** Box: deck + community board + pot zone */
const COMMUNITY = new BoardObj("Community", 1, 5)
  .withRule({ allowKinds: ["card"] })
  .at("top");

const POT = new ZoneObj("Pot", "area")
  .withRule({ allowKinds: ["counter"], maxItems: 1 })
  .at("center");

const DECK = new DeckObj("Main");

const box = new GameBox(settings)
  .addBoard(COMMUNITY)
  .addZone(POT)
  .addDeck(DECK);

/** Card helpers */
const RANKS = ["A","K","Q","J","T","9","8","7","6","5","4","3","2"] as const;
const SUITS = ["S","H","D","C"] as const;
function make52(): CardObj[] {
  const cards: CardObj[] = [];
  for (const r of RANKS) for (const s of SUITS) {
    const c = new CardObj(`${r}${s}`, "playing");
    (c as any).attrs = { rank: r, suit: s, short: `${r}${s}` };
    cards.push(c);
  }
  return cards;
}

/** Setup: make cards, shove in deck, create hands + pot counter */
function setup(s: GameState): GameState {
  // add 52 cards to state & push to deck.draw
  let next = { ...s };
  const draw = "draw";

  const cards = make52();
  for (const c of cards) {
    next = { ...next, pieces: { ...next.pieces, [c.id]: c } };
    next = pushToPile(next, DECK.id, draw, c.id);
  }
  next = shufflePile(next, DECK.id, draw);

  // create a pot counter piece
  const potPiece = new PieceObj("counter").withAttrs({ amount: 0 });
  next = { ...next, pieces: { ...next.pieces, [potPiece.id]: potPiece } };
  next = pushToZone(next, POT.id, potPiece.id);

  // create Hand zones for each player (visibility: owner)
  for (const pid of next.ctx.players) {
    const hand = new ZoneObj(`Hand_${pid}`, "hand", pid)
      .withRule({ allowKinds: ["card"], maxItems: 2, visibility: "owner" });
    const hz = hand.build();
    next = { ...next, zones: { ...next.zones, [hz.id]: hz } };
    // stash hand zone id on player attrs
    const P = next.players[pid];
    next.players[pid] = { ...P, attrs: { ...(P.attrs ?? {}), handZoneId: hz.id } };
  }

  // initial phase is preflop
  next = setPhase({ ...PokerNLH, box }, next, "preflop");
  return next;
}

function dealCommunity(next: GameState, count: number): GameState {
  // burn 1
  const [s1, burn] = popFromPile(next, DECK.id, "draw");
  let s = s1;
  if (burn) s = pushToPile(s, DECK.id, "burn", burn);

  // place N cards on next empty community slots
  const board = s.zones[COMMUNITY.id] as BoardZone;
  let idx = board.cells.findIndex((c) => !c);
  if (idx === -1) idx = 0;
  for (let i = 0; i < count; i++) {
    const [s2, cid] = popFromPile(s, DECK.id, "draw");
    if (!cid) return s2;
    s = placeOnBoard(s2, cid, COMMUNITY.id, idx);
    idx++;
  }
  return s;
}

/** Turn/Round hooks */
const turns = {
  onRoundStart(s: GameState): GameState {
    switch (s.ctx.phase) {
      case "preflop": {
        // two hole cards to each player (1 card each pass)
        let n = s;
        for (let pass = 0; pass < 2; pass++) {
          for (const pid of n.ctx.players) {
            const hz = (n.players[pid].attrs as any).handZoneId as ID;
            n = transferFromDeckToZone(n, DECK.id, "draw", hz);
          }
        }
        return n;
      }
      case "flop":  return dealCommunity(s, 3);
      case "turn":  return dealCommunity(s, 1);
      case "river": return dealCommunity(s, 1);
      case "showdown": return s;
      default: return s;
    }
  },
} as const;

/** Moves (dev-oriented betting skeleton) */
export const PokerNLH: GameDefinition = {
  settings,
  box,
  phases: [
    { id: "preflop" },
    { id: "flop" },
    { id: "turn" },
    { id: "river" },
    { id: "showdown" },
  ],
  turns,
  setup,
  moves: {
    // dev: add chips straight to the pot counter
    addPot: {
      name: "addPot",
      validate(_s, a: { amount: number }) {
        if (!a || typeof a.amount !== "number" || a.amount <= 0) return "amount>0";
        return null;
      },
      apply(s, a: { amount: number }) {
        // find pot piece (first in POT zone)
        const z = s.zones[POT.id] as StackZone;
        const potId = z.order[0];
        if (!potId) return s;
        return incPieceAttr(s, potId, "amount", a.amount);
      },
      advance: "auto",
    },

    // dev: move to next phase and auto-deal street
    nextPhase: {
      name: "nextPhase",
      apply(s) {
        const order = ["preflop", "flop", "turn", "river", "showdown"];
        const at = order.indexOf(s.ctx.phase);
        const nextPhase = order[Math.min(at + 1, order.length - 1)];
        let n = setPhase(PokerNLH, s, nextPhase);
        // onRoundStart will run automatically by the hook at the beginning of the next player's turn,
        // but we can proactively run it here for deterministic UX:
        n = turns.onRoundStart?.(n) ?? n;
        return n;
      },
      advance: "none", // you decide seating after phase change
    },

    // dev: mark player folded (no seat skipping logic here)
    fold: {
      name: "fold",
      apply(s) {
        const pid = s.ctx.currentPlayer;
        const P = s.players[pid];
        return { ...s, players: { ...s.players, [pid]: { ...P, attrs: { ...(P.attrs ?? {}), folded: true } } } };
      },
      advance: "auto",
    },

    // dev: no-op check/call for seat rotation demo
    check: { name: "check", apply: (s) => s, advance: "auto" },
  },
  isTerminal(s) {
    // end when we're at showdown and someone clicked nextPhase again (or only one active remains)
    if (s.ctx.phase !== "showdown") return false;
    // demo: never auto-terminate; lab can decide
    return false;
  },
  getWinner(_s) {
    return undefined;
  },
};

export function createMatch(players: string[], seed?: number | string) {
  return _createMatch(PokerNLH, players, seed);
}
