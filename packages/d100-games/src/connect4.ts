// packages/d100-games/src/connect4.ts
import {
    GameState,
    PlayerID,
    BoardZone,
    Control,
    ID,
    Settings,
  } from "../../d100-core/src/object-types";
  import {
    GameDefinition,
    createMatch as baseCreate,
  } from "../../d100-core/src/runtime";
  import { GameBox } from "../../d100-core/src/objects";
  
  const ROWS = 6;
  const COLS = 7;
  const Z_BOARD = "zone:c4:board" as ID;
  
  function initBoard(): BoardZone {
    return {
      id: Z_BOARD,
      name: "Board",
      kind: "board",
      rows: ROWS,
      cols: COLS,
      cells: Array(ROWS * COLS).fill(undefined),
      // Let generic UI click columns -> move("drop", { col })
      attrs: { onCellClick: { move: "drop", argKey: "col", useColumn: true } },
    };
  }
  
  function cellIndex(row: number, col: number) {
    return row * COLS + col;
  }
  
  function topOccupied(b: BoardZone, col: number): boolean {
    const idx = cellIndex(0, col);
    return !!b.cells[idx];
  }
  
  function findDropRow(b: BoardZone, col: number): number | null {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (!b.cells[cellIndex(r, col)]) return r;
    }
    return null;
  }
  
  function winnerC4(s: GameState, b: BoardZone): PlayerID | null {
    const dirs = [
      [0,1],   // right
      [1,0],   // down
      [1,1],   // down-right
      [1,-1],  // down-left
    ];
    const inside = (r: number, c: number) => r >= 0 && r < ROWS && c >= 0 && c < COLS;
  
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const id0 = b.cells[cellIndex(r, c)];
        if (!id0) continue;
        const owner = s.pieces[id0].owner;
        for (const [dr, dc] of dirs) {
          let k = 1;
          while (k < 4) {
            const rr = r + dr * k;
            const cc = c + dc * k;
            if (!inside(rr, cc)) break;
            const idk = b.cells[cellIndex(rr, cc)];
            if (!idk || s.pieces[idk].owner !== owner) break;
            k++;
          }
          if (k >= 4 && owner) return owner;
        }
      }
    }
    return null;
  }
  
  function isFull(b: BoardZone): boolean {
    return b.cells.every(Boolean);
  }
  
  const settings: Settings = {
    id: "connect4",
    name: "Connect-4",
    players: { min: 2, max: 2, default: 2 },
    allowSpectators: true,
    hiddenInfo: false,
  };
  
  const box = new GameBox(settings);
  
  export const Connect4: GameDefinition = {
    settings,
    box,
  
    setup(s) {
      s.zones[Z_BOARD] = initBoard();
      s.ctx.phase = "play";
      return s;
    },
  
    phases: [{ id: "play" }],
  
    moves: {
      drop: {
        name: "drop",
        validate(s, a: { col: number }) {
          const b = s.zones[Z_BOARD] as BoardZone;
          if (!b) return "No board.";
          const { col } = a ?? {};
          if (typeof col !== "number" || col < 0 || col >= COLS) return "Invalid column.";
          if (topOccupied(b, col)) return "Column full.";
          return null;
        },
        apply(s, a: { col: number }) {
          const b = s.zones[Z_BOARD] as BoardZone;
          const row = findDropRow(b, a.col)!;
          const pid = s.ctx.currentPlayer;
          const pieceId = (`piece:c4:${s.ctx.turn}:${row}:${a.col}`) as ID;
          s.pieces[pieceId] = {
            id: pieceId,
            kind: "disc",
            owner: pid,
            shape: "square",
            attrs: {},
          };
          const next = b.cells.slice();
          next[cellIndex(row, a.col)] = pieceId;
          s.zones[Z_BOARD] = { ...b, cells: next };
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
    },
  
    isTerminal(s) {
      const b = s.zones[Z_BOARD] as BoardZone;
      if (!b) return false;
      const w = winnerC4(s, b);
      if (w) return true;
      if (isFull(b)) return true;
      return false;
    },
  
    getWinner(s) {
      const b = s.zones[Z_BOARD] as BoardZone;
      const w = winnerC4(s, b);
      return w ?? "draw";
    },
  
    controls(s, pid) {
      const b = s.zones[Z_BOARD] as BoardZone | undefined;
      if (!b) return [];
      const over = Connect4.isTerminal!(s);
      const isTurn = s.ctx.currentPlayer === pid;
      const full = Array.from({ length: COLS }, (_, c) => topOccupied(b, c));
  
      const buttons: Control[] = [];
      for (let c = 0; c < COLS; c++) {
        buttons.push({
          id: `c4:drop-${c}`,
          label: `Drop ${c + 1}`,
          move: "drop",
          args: { col: c },
          input: { type: "none" },
          disabled: over || !isTurn || full[c],
          disabledReason: over ? "Game over" : !isTurn ? "Not your turn" : full[c] ? "Column full" : undefined,
          group: "primary",
        });
      }
      buttons.push({
        id: "c4:restart",
        label: "Restart",
        move: "restart",
        input: { type: "none" },
        group: "utility",
      });
      return buttons;
    },
  };
  
  export function createMatch(players: string[]) {
    return baseCreate(Connect4, players);
  }
  