import { GameDefinition, createMatch as _createMatch } from "../../d100-core/src/runtime";
import { GameBox, BoardObj } from "../../d100-core/src/objects";
import { placeOnBoard, boardCells } from "../../d100-core/src/ops";
import { GameState, Settings, ID, BoardZone, PlayerID } from "../../d100-core/src/object-types";

/** Settings & Box */
const settings: Settings = {
  id: "tictactoe",
  players: { min: 2, max: 2, default: 2 },
  hiddenInfo: false,
  pieces: [
    { kind: "mark", perPlayer: 5 } // five marks per player (unused count is fine)
  ],
};

const BOARD = new BoardObj("TicTacToe", 3, 3)
  .withRule({ allowKinds: ["mark"] })
  .at("center");

const box = new GameBox(settings).addBoard(BOARD);

/** Helpers */
function cellOwner(state: GameState, boardId: ID, idx: number): PlayerID | null {
  const z = state.zones[boardId] as BoardZone;
  const pid = z.cells[idx];
  if (!pid) return null;
  const piece = state.pieces[pid];
  return (piece?.owner ?? null) as PlayerID | null;
}

function winner(state: GameState, boardId: ID): PlayerID | "draw" | undefined {
  const lines = [
    [0,1,2],[3,4,5],[6,7,8], // rows
    [0,3,6],[1,4,7],[2,5,8], // cols
    [0,4,8],[2,4,6],         // diags
  ];
  for (const [a,b,c] of lines) {
    const A = cellOwner(state, boardId, a);
    if (!A) continue;
    if (A === cellOwner(state, boardId, b) && A === cellOwner(state, boardId, c)) return A;
  }
  const full = boardCells(state, boardId).every(Boolean);
  return full ? "draw" : undefined;
}

function getUnusedMarkId(state: GameState, owner: PlayerID): ID | null {
  // any piece with kind "mark" owned by this player that isn’t on a board
  const used = new Set<ID>();
  for (const z of Object.values(state.zones)) {
    if (z.kind === "board") {
      for (const p of (z as BoardZone).cells) if (p) used.add(p);
    } else {
      // ignore stacks for this simple game
    }
  }
  for (const [id, piece] of Object.entries(state.pieces)) {
    if (piece.kind === "mark" && piece.owner === owner && !used.has(id as ID)) return id as ID;
  }
  return null;
}

/** Game definition */
export const TicTacToe: GameDefinition = {
  settings,
  box,
  phases: [{ id: "play" }],
  moves: {
    place: {
      name: "place",
      validate(s: GameState, a: { index: number }) {
        const idx = a?.index ?? -1;
        if (idx < 0 || idx >= 9) return "Index out of bounds";
        const board = s.zones[BOARD.id] as BoardZone;
        if (board.cells[idx]) return "Cell occupied";
        return null;
      },
      apply(s: GameState, a: { index: number }) {
        const me = s.ctx.currentPlayer;
        const id = getUnusedMarkId(s, me);
        if (!id) throw new Error("No mark available");
        return placeOnBoard(s, id, BOARD.id, a.index);
      },
    },
  },
  isTerminal(s) {
    return winner(s, BOARD.id) !== undefined;
  },
  getWinner(s) {
    return winner(s, BOARD.id);
  },
};

export function createMatch(players: string[], seed?: number | string) {
  return _createMatch(TicTacToe, players, seed);
}
