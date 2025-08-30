import { GameDefinition, createMatch as _createMatch } from "../../d100-core/src/runtime";
import { GameBox, BoardObj } from "../../d100-core/src/objects";
import { placeOnBoard, boardCells } from "../../d100-core/src/ops";
import { GameState, Settings, ID, BoardZone, PlayerID } from "../../d100-core/src/object-types";

/** Board size */
const ROWS = 6;
const COLS = 7;

/** Settings & Box */
const settings: Settings = {
  id: "connect4",
  players: { min: 2, max: 2, default: 2 },
  hiddenInfo: false,
  pieces: [{ kind: "disc", perPlayer: 21 }],
};

const BOARD = new BoardObj("Connect4", ROWS, COLS)
  .withRule({ allowKinds: ["disc"] })
  .at("center");

const box = new GameBox(settings).addBoard(BOARD);

/** Helpers */
function lowestOpenRow(board: BoardZone, col: number): number | null {
  for (let r = ROWS - 1; r >= 0; r--) {
    const idx = r * COLS + col;
    if (!board.cells[idx]) return r;
  }
  return null;
}

function getUnusedDiscId(state: GameState, owner: PlayerID): ID | null {
  const used = new Set<ID>();
  for (const z of Object.values(state.zones)) {
    if (z.kind === "board") {
      for (const p of (z as BoardZone).cells) if (p) used.add(p);
    }
  }
  for (const [id, piece] of Object.entries(state.pieces)) {
    if (piece.kind === "disc" && piece.owner === owner && !used.has(id as ID)) return id as ID;
  }
  return null;
}

function ownerAt(state: GameState, board: BoardZone, r: number, c: number): PlayerID | null {
  const idx = r * COLS + c;
  const pid = board.cells[idx];
  if (!pid) return null;
  return (state.pieces[pid].owner ?? null) as PlayerID | null;
}

function has4(state: GameState, board: BoardZone): PlayerID | null {
  // directions: right, down, diag-down-right, diag-up-right
  const dirs = [[0,1],[1,0],[1,1],[-1,1]];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const start = ownerAt(state, board, r, c);
      if (!start) continue;
      for (const [dr, dc] of dirs) {
        let ok = true;
        for (let k = 1; k < 4; k++) {
          const rr = r + dr * k, cc = c + dc * k;
          if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) { ok = false; break; }
          if (ownerAt(state, board, rr, cc) !== start) { ok = false; break; }
        }
        if (ok) return start;
      }
    }
  }
  return null;
}

/** Game definition */
export const Connect4: GameDefinition = {
  settings,
  box,
  phases: [{ id: "play" }],
  moves: {
    drop: {
      name: "drop",
      validate(s: GameState, a: { col: number }) {
        const col = a?.col ?? -1;
        if (col < 0 || col >= COLS) return "Column out of bounds";
        const board = s.zones[BOARD.id] as BoardZone;
        if (lowestOpenRow(board, col) === null) return "Column is full";
        return null;
      },
      apply(s: GameState, a: { col: number }) {
        const board = s.zones[BOARD.id] as BoardZone;
        const row = lowestOpenRow(board, a.col);
        if (row === null) throw new Error("Full column");
        const me = s.ctx.currentPlayer;
        const id = getUnusedDiscId(s, me);
        if (!id) throw new Error("No disc available");
        return placeOnBoard(s, id, BOARD.id, row * COLS + a.col);
      },
    },
  },
  isTerminal(s) {
    const b = s.zones[BOARD.id] as BoardZone;
    if (has4(s, b)) return true;
    return boardCells(s, BOARD.id).every(Boolean);
  },
  getWinner(s) {
    const b = s.zones[BOARD.id] as BoardZone;
    const p = has4(s, b);
    if (p) return p;
    return "draw";
  },
};

export function createMatch(players: string[], seed?: number | string) {
  return _createMatch(Connect4, players, seed);
}
