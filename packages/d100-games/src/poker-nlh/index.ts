// packages/d100-games/src/poker-nlh.ts
import {
  GameState,
  PlayerID,
  BoardZone,
  StackZone,
  Zone,
  Card,
  Control,
  ID,
  Deck,
  Settings,
} from "../../../d100-core/src/object-types";
import {
  GameDefinition,
  createMatch as baseCreate,
} from "../../../d100-core/src/runtime";
import { GameBox } from "../../../d100-core/src/objects";
import { pokerLayout } from "./layout";

/* ---------- IDs ---------- */
const Z_COMMUNITY = "zone:poker:community" as ID;
const Z_POT       = "zone:poker:pot" as ID;
const D_MAIN      = "deck:poker:main" as ID;

/* ---------- Cards ---------- */
const SUITS = ["♠", "♥", "♦", "♣"] as const;
const RANKS = ["A","K","Q","J","T","9","8","7","6","5","4","3","2"] as const;

function make52Cards(): { pieces: Record<ID, Card>, order: ID[] } {
  const pieces: Record<ID, Card> = {};
  const order: ID[] = [];
  let idx = 0;
  for (const r of RANKS) {
    for (const s of SUITS) {
      const id = (`card:${r}${s}:${idx++}`) as ID;
      const short = `${r}${s}`;
      pieces[id] = {
        id,
        kind: "playing-card",
        owner: null,
        shape: "square",
        cardName: short,
        cardType: "standard",
        attrs: { short },
      };
      order.push(id);
    }
  }
  return { pieces, order };
}

/* ---------- Betting context (kept in ctx.attrs) ---------- */
type BettingCtx = {
  street: "preflop" | "flop" | "turn" | "river" | "showdown";
  currentBet: number;                  // highest committed this street
  minRaise: number;
  committed: Record<PlayerID, number>; // per-player committed this street
  folded: Record<PlayerID, boolean>;
  smallBlind: number;
  bigBlind: number;
};
function getB(s: GameState): BettingCtx {
  const b = ((s.ctx as any).attrs?.betting ?? {}) as BettingCtx;
  return {
    street: b.street ?? "preflop",
    currentBet: b.currentBet ?? 0,
    minRaise: Math.max(1, b.minRaise ?? (b.bigBlind ?? 1)),
    committed: b.committed ?? Object.fromEntries(s.ctx.players.map(p => [p, 0] as const)),
    folded: b.folded ?? {},
    smallBlind: b.smallBlind ?? 0.5,
    bigBlind: b.bigBlind ?? 1,
  };
}
function setB(s: GameState, next: BettingCtx): GameState {
  return { ...s, ctx: { ...s.ctx, ...(s.ctx as any), attrs: { ...(s.ctx as any).attrs, betting: next } } as any };
}
function stackOf(s: GameState, pid: PlayerID): number {
  return (s.players[pid].attrs?.stack as number) ?? 0;
}
function setStack(s: GameState, pid: PlayerID, newStack: number) {
  s.players[pid] = { ...s.players[pid], attrs: { ...(s.players[pid].attrs ?? {}), stack: newStack } };
}
function toCallOf(s: GameState, pid: PlayerID): number {
  const b = getB(s);
  const c = b.committed[pid] ?? 0;
  return Math.max(0, b.currentBet - c);
}
function isFolded(s: GameState, pid: PlayerID) {
  return !!getB(s).folded[pid];
}

/* ---------- Zones helpers ---------- */
function ensureCommunity(s: GameState): BoardZone {
  let z = s.zones[Z_COMMUNITY] as BoardZone | undefined;
  if (!z) {
    z = {
      id: Z_COMMUNITY,
      name: "Community",
      kind: "board",
      rows: 1,
      cols: 5,
      cells: Array(5).fill(undefined),
    };
    s.zones[Z_COMMUNITY] = z;
  }
  return z;
}
function ensurePot(s: GameState): StackZone {
  let z = s.zones[Z_POT] as StackZone | undefined;
  if (!z) {
    z = {
      id: Z_POT,
      name: "Pot",
      kind: "stack",
      order: [],
    };
    // represent pot as a single piece with attrs.amount
    const potPiece = ("piece:poker:pot") as ID;
    s.pieces[potPiece] = {
      id: potPiece,
      kind: "pot",
      owner: null,
      shape: "square",
      attrs: { amount: 0 },
    };
    z.order = [potPiece];
    s.zones[Z_POT] = z;
  }
  return z;
}
function handZoneId(pid: PlayerID) { return (`zone:poker:hand:${pid}`) as ID; }
function ensureHand(s: GameState, pid: PlayerID): StackZone {
  const hid = handZoneId(pid);
  let z = s.zones[hid] as StackZone | undefined;
  if (!z) {
    z = { id: hid, name: `Hand:${pid}`, kind: "hand", owner: pid, order: [] };
    s.zones[hid] = z;
  }
  return z;
}
function deckMain(s: GameState): Deck {
  let d = s.decks[D_MAIN];
  if (!d) {
    const { pieces, order } = make52Cards();
    Object.assign(s.pieces, pieces);
    d = { id: D_MAIN, name: "Main", piles: { draw: order, discard: [] } };
    s.decks[D_MAIN] = d;
  }
  return d;
}
function drawCard(s: GameState): ID | undefined {
  const d = deckMain(s);
  const id = d.piles.draw.pop();
  return id;
}

/* ---------- Streets dealing ---------- */
function dealToHands(s: GameState) {
  // 2 cards each
  for (let r = 0; r < 2; r++) {
    for (const pid of s.ctx.players) {
      const hand = ensureHand(s, pid);
      const cid = drawCard(s);
      if (!cid) continue;
      s.pieces[cid].owner = pid;
      hand.order = [...hand.order, cid];
      s.zones[hand.id] = { ...hand };
    }
  }
}
function dealFlop(s: GameState) {
  const board = ensureCommunity(s);
  // burn 1
  drawCard(s);
  // 3 to community
  for (let i = 0; i < 3; i++) {
    const cid = drawCard(s);
    if (!cid) continue;
    s.pieces[cid].owner = null;
    const next = board.cells.slice();
    next[i] = cid;
    s.zones[board.id] = { ...board, cells: next };
  }
}
function dealTurnOrRiver(s: GameState, cellIndex: number) {
  const board = ensureCommunity(s);
  // burn
  drawCard(s);
  const cid = drawCard(s);
  if (!cid) return;
  s.pieces[cid].owner = null;
  const next = board.cells.slice();
  next[cellIndex] = cid;
  s.zones[board.id] = { ...board, cells: next };
}

/* ---------- Controls derivation ---------- */
function bettingControls(s: GameState, pid: PlayerID): Control[] {
  if (isFolded(s, pid)) return [];
  if (s.ctx.currentPlayer !== pid) return [];

  const b = getB(s);
  const stack = stackOf(s, pid);
  const toCall = toCallOf(s, pid);

  const res: Control[] = [];

  if (toCall > 0) {
    res.push({ id: "poker:fold", label: "Fold", move: "fold", input: { type: "none" }, group: "betting" });
  }

  if (toCall === 0) {
    res.push({ id: "poker:check", label: "Check", move: "check", input: { type: "none" }, group: "betting" });
  } else {
    res.push({
      id: "poker:call",
      label: `Call ${toCall}`,
      move: "call",
      args: { amount: Math.min(toCall, stack) },
      input: { type: "none" },
      disabled: stack <= 0,
      disabledReason: stack <= 0 ? "No chips" : undefined,
      group: "betting",
    });
  }

  const canRaise = stack > toCall;
  if (toCall === 0) {
    const minBet = Math.min(stack, b.bigBlind);
    const maxBet = stack;
    res.push({
      id: "poker:bet",
      label: "Bet",
      move: "bet",
      input: { type: "number", min: minBet, max: maxBet, step: b.bigBlind, default: Math.min(3 * b.bigBlind, maxBet) },
      disabled: maxBet <= 0,
      disabledReason: maxBet <= 0 ? "No chips" : undefined,
      group: "betting",
    });
  } else if (canRaise) {
    const committed = b.committed[pid] ?? 0;
    const minRaiseTo = Math.max(b.currentBet + b.minRaise, committed + toCall + b.minRaise);
    const maxRaiseTo = committed + stack; // all-in
    res.push({
      id: "poker:raise",
      label: "Raise",
      move: "raise",
      input: {
        type: "number",
        min: Math.min(minRaiseTo, maxRaiseTo),
        max: maxRaiseTo,
        step: b.bigBlind,
        default: Math.min(minRaiseTo + 2 * b.bigBlind, maxRaiseTo),
      },
      group: "betting",
    });
  }

  // utility
  res.push({ id: "poker:nextPhase", label: "Next Phase", move: "nextPhase", input: { type: "none" }, group: "utility" });

  return res;
}

/* ---------- Game Definition ---------- */
const settings: Settings = {
  id: "poker-nlh",
  name: "No-Limit Hold'em (Dev)",
  players: { min: 2, max: 8, default: 4 },
  allowSpectators: true,
  hiddenInfo: true,
};

const box = new GameBox(settings);

export const PokerNLH: GameDefinition = {
  settings,
  box,
  layout: pokerLayout,

  setup(s0) {
    let s = { ...s0 };
    
    // Create core zones & deck first (moved from old buildState)
    ensureCommunity(s);
    ensurePot(s);
    for (const pid of s.ctx.players) ensureHand(s, pid);
    deckMain(s);
    
    // Set initial phase
    s.ctx.phase = "preflop";
    
    // equal stacks: 100 BB each; BB=1, SB=0.5
    const bigBlind = 1;
    const smallBlind = 0.5;
    for (const pid of s.ctx.players) {
      setStack(s, pid, 100 * bigBlind);
    }
    s = setB(s, {
      street: "preflop",
      currentBet: 0,
      minRaise: bigBlind,
      committed: Object.fromEntries(s.ctx.players.map(p => [p, 0] as const)),
      folded: {},
      smallBlind,
      bigBlind,
    });

    // Just deal hole cards at setup for dev flow
    dealToHands(s);
    return s;
  },

  phases: [
    { id: "preflop" },
    { id: "flop" },
    { id: "turn" },
    { id: "river" },
    { id: "showdown" },
  ],

  controls(s, pid) {
    return bettingControls(s, pid);
  },

  moves: {
    nextPhase: {
      name: "nextPhase",
      apply(s) {
        const b = getB(s);
        // reset street commitments on phase change
        b.committed = Object.fromEntries(s.ctx.players.map(p => [p, 0] as const));
        b.currentBet = 0;
        if (b.street === "preflop") {
          b.street = "flop";
          s = setB(s, b);
          dealFlop(s);
          s.ctx.phase = "flop";
          return s;
        }
        if (b.street === "flop") {
          b.street = "turn";
          s = setB(s, b);
          dealTurnOrRiver(s, 3);
          s.ctx.phase = "turn";
          return s;
        }
        if (b.street === "turn") {
          b.street = "river";
          s = setB(s, b);
          dealTurnOrRiver(s, 4);
          s.ctx.phase = "river";
          return s;
        }
        if (b.street === "river") {
          b.street = "showdown";
          s = setB(s, b);
          s.ctx.phase = "showdown";
          return s;
        }
        return s;
      },
    },

    fold: {
      name: "fold",
      apply(s) {
        const b = getB(s);
        b.folded[s.ctx.currentPlayer] = true;
        return setB(s, b);
      },
    },

    check: {
      name: "check",
      validate(s) {
        if (toCallOf(s, s.ctx.currentPlayer) > 0) return "Cannot check facing a bet.";
        return null;
      },
      apply(s) { return s; },
    },

    call: {
      name: "call",
      validate(s, a: { amount: number }) {
        const need = toCallOf(s, s.ctx.currentPlayer);
        if (need <= 0) return "Nothing to call.";
        if (!a || a.amount == null || a.amount <= 0) return "Invalid call amount.";
        return null;
      },
      apply(s, a: { amount: number }) {
        const pid = s.ctx.currentPlayer;
        const b = getB(s);
        const committed = b.committed[pid] ?? 0;
        const stack = stackOf(s, pid);
        const pay = Math.min(a.amount, stack);
        setStack(s, pid, stack - pay);
        b.committed[pid] = committed + pay;

        // Optionally track pot piece
        const potZone = ensurePot(s);
        const potId = potZone.order[0];
        const cur = Number((s.pieces[potId].attrs as any)?.amount ?? 0);
        (s.pieces[potId].attrs as any).amount = cur + pay;

        return setB(s, b);
      },
    },

    bet: {
      name: "bet",
      validate(s, a: { amount: number }) {
        if (toCallOf(s, s.ctx.currentPlayer) !== 0) return "Cannot bet facing action; raise instead.";
        if (!a || a.amount == null || a.amount <= 0) return "Invalid bet amount.";
        return null;
      },
      apply(s, a: { amount: number }) {
        const pid = s.ctx.currentPlayer;
        const b = getB(s);
        const stack = stackOf(s, pid);
        const pay = Math.min(a.amount, stack);
        setStack(s, pid, stack - pay);
        const prev = b.committed[pid] ?? 0;
        b.committed[pid] = prev + pay;
        b.currentBet = Math.max(b.currentBet, b.committed[pid]);
        b.minRaise = Math.max(b.minRaise, b.bigBlind);

        // pot
        const potZone = ensurePot(s);
        const potId = potZone.order[0];
        const cur = Number((s.pieces[potId].attrs as any)?.amount ?? 0);
        (s.pieces[potId].attrs as any).amount = cur + pay;

        return setB(s, b);
      },
    },

    raise: {
      name: "raise",
      validate(s, a: { amount: number }) {
        if (toCallOf(s, s.ctx.currentPlayer) <= 0) return "Nothing to raise.";
        if (!a || a.amount == null || a.amount <= 0) return "Invalid raise-to amount.";
        return null;
      },
      apply(s, a: { amount: number }) {
        const pid = s.ctx.currentPlayer;
        const b = getB(s);
        const stack = stackOf(s, pid);
        const already = b.committed[pid] ?? 0;
        const targetTo = Math.min(a.amount, already + stack);
        const add = Math.max(0, targetTo - already);
        setStack(s, pid, stack - add);
        b.committed[pid] = targetTo;

        // pot
        const potZone = ensurePot(s);
        const potId = potZone.order[0];
        const cur = Number((s.pieces[potId].attrs as any)?.amount ?? 0);
        (s.pieces[potId].attrs as any).amount = cur + add;

        // update current bet & minRaise
        const prevBet = b.currentBet;
        b.currentBet = Math.max(b.currentBet, targetTo);
        b.minRaise = Math.max(b.minRaise, b.currentBet - prevBet);

        return setB(s, b);
      },
    },
  },

  isTerminal(s) {
    // For dev lab: end at showdown
    return s.ctx.phase === "showdown";
  },

  getWinner(s) {
    // Dev stub: no evaluation, mark draw
    return "draw";
  },
};

export function createMatch(players: string[]) {
  // 2–4 players works in the lab
  return baseCreate(PokerNLH, players);
}
