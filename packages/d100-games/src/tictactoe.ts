import {
  GameState,
  PlayerID,
  BoardZone,
  StackZone,
  Zone,
  Card,
  Control,
  ID,
  Settings,
} from "../../d100-core/src/object-types";
import {
  GameDefinition,
  createMatch as baseCreate,
} from "../../d100-core/src/runtime";
import { GameBox } from "../../d100-core/src/objects";

/** Helpers */
const Z_BOARD = "zone:ttt:board" as ID;

function initBoard(): BoardZone {
  return {
    id: Z_BOARD,
    name: "Board",
    kind: "board",
    rows: 3,
    cols: 3,
    cells: Array(9).fill(undefined),
    // Let generic UI map grid clicks → move("place", { index })
    attrs: { onCellClick: { move: "place", argKey: "index" } },
  };
}

function lineWinner(s: GameState, b: BoardZone): PlayerID | null {
  const lines = [
    [0,1,2],[3,4,5],[6,7,8], // rows
    [0,3,6],[1,4,7],[2,5,8], // cols
    [0,4,8],[2,4,6],         // diags
  ];
  for (const L of lines) {
    const [a,bx,c] = L;
    const pa = b.cells[a] ? s.pieces[b.cells[a]!].owner : null;
    if (!pa) continue;
    const pb = b.cells[bx] ? s.pieces[b.cells[bx]!].owner : null;
    const pc = b.cells[c] ? s.pieces[b.cells[c]!].owner : null;
    if (pa && pb === pa && pc === pa) return pa;
  }
  return null;
}

function isFull(b: BoardZone): boolean {
  return b.cells.every(Boolean);
}

const settings: Settings = {
  id: "ttt",
  name: "Tic-Tac-Toe",
  players: { min: 2, max: 2, default: 2 },
  allowSpectators: true,
  hiddenInfo: false,
};

const box = new GameBox(settings);

export const TicTacToe: GameDefinition = {
  settings,
  box,

  setup(s) {
    s.zones[Z_BOARD] = initBoard();
    s.ctx.phase = "play";
    return s;
  },

  phases: [{ id: "play" }],

  moves: {
    place: {
      name: "place",
      validate(s, a: { index: number }) {
        const b = s.zones[Z_BOARD] as BoardZone;
        if (!b) return "No board.";
        const { index } = a ?? {};
        if (typeof index !== "number" || index < 0 || index >= b.cells.length) return "Invalid index.";
        if (b.cells[index]) return "Cell occupied.";
        return null;
      },
      apply(s, a: { index: number }) {
        const b = s.zones[Z_BOARD] as BoardZone;
        const pid = s.ctx.currentPlayer;
        const pieceId = (`piece:ttt:${s.ctx.turn}:${a.index}`) as ID;
        s.pieces[pieceId] = {
          id: pieceId,
          kind: "mark",
          owner: pid,
          shape: "square",
          attrs: {},
        };
        const nextCells = b.cells.slice();
        nextCells[a.index] = pieceId;
        s.zones[Z_BOARD] = { ...b, cells: nextCells };
        return s;
      },
    },

    restart: {
      name: "restart",
      apply(s) {
        s.zones[Z_BOARD] = initBoard();
        s.pieces = {};
        s.ctx.turn = 0;
        s.ctx.currentPlayer = s.ctx.players[0];
        s.ctx.winner = undefined;
        return s;
      },
    },

    pass: {
      name: "pass",
      apply(s) { return s; },
    },
  },

  isTerminal(s) {
    const b = s.zones[Z_BOARD] as BoardZone;
    if (!b) return false;
    if (lineWinner(s, b)) return true;
    if (isFull(b)) return true;
    return false;
  },

  getWinner(s) {
    const b = s.zones[Z_BOARD] as BoardZone;
    const w = lineWinner(s, b);
    return w ?? "draw";
  },

  controls(state, pid) {
    const b = state.zones[Z_BOARD] as BoardZone | undefined;
    const over = TicTacToe.isTerminal!(state);
    const canPlace = !over && state.ctx.currentPlayer === pid;
    const base: Control[] = [];
    if (canPlace) {
      // Board clicks drive "place" via onCellClick, so no primary button needed.
      base.push({ id: "ttt:pass", label: "Pass Turn", move: "pass", input: { type: "none" } });
    }
    base.push({ id: "ttt:restart", label: "Restart", move: "restart", input: { type: "none" } });
    return base;
  },
};

export function createMatch(players: string[]) {
  return baseCreate(TicTacToe, players);
}
