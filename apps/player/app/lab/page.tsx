"use client";

import { useMemo, useState } from "react";

// --- Adjust these imports to your alias if needed ---
import * as TTT from "../../../../packages/d100-games/src/tictactoe";
import * as C4 from "../../../../packages/d100-games/src/connect4";
import * as POKER from "../../../../packages/d100-games/src/poker-nlh";

import { GameDefinition, applyMove, endTurn } from "../../../../packages/d100-core/src/runtime";
import { GameState, BoardZone, StackZone, Card } from "../../../../packages/d100-core/src/object-types";

type GameKey = "tictactoe" | "connect4" | "poker";

export default function LabPage() {
  const [gameKey, setGameKey] = useState<GameKey>("tictactoe");
  const [state, setState] = useState<GameState | null>(null);
  const [def, setDef] = useState<GameDefinition | null>(null);

  const isPoker = gameKey === "poker";

  const create = () => {
    if (gameKey === "tictactoe") {
      const s = TTT.createMatch(["p1","p2"]);
      setState(s); setDef(TTT.TicTacToe as any);
    } else if (gameKey === "connect4") {
      const s = C4.createMatch(["p1","p2"]);
      setState(s); setDef(C4.Connect4 as any);
    } else {
      const s = POKER.createMatch(["p1","p2","p3","p4"]);
      setState(s); setDef(POKER.PokerNLH as any);
    }
  };

  const apply = (move: string, args?: any) => {
    if (!def || !state) return;
    const next = applyMove(def, state, move, args ?? {});
    setState(next);
  };

  const rotate = () => {
    if (!def || !state) return;
    setState(endTurn(state, def));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 text-zinc-900 dark:from-zinc-950 dark:to-zinc-900 dark:text-zinc-100">
      <nav className="flex items-center justify-between border-b border-black/5 bg-white/60 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-zinc-900/60">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-zinc-900 px-2 py-1 text-white dark:bg-white dark:text-zinc-900">Lab</span>
          <select
            className="rounded-lg border border-black/10 bg-white/70 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-zinc-900/70"
            value={gameKey}
            onChange={(e) => setGameKey(e.target.value as GameKey)}
          >
            <option value="tictactoe">Tic-Tac-Toe</option>
            <option value="connect4">Connect-4</option>
            <option value="poker">NLH Poker (dev)</option>
          </select>
          <button onClick={create} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:opacity-95">
            Create Match
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => state && setState({ ...state, ctx: { ...state.ctx, turn: state.ctx.turn + 1 } })}
            className="rounded-lg px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Bump Turn#
          </button>
          <button onClick={rotate} className="rounded-lg px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800">
            Next Player →
          </button>
        </div>
      </nav>

      <main className="mx-auto grid max-w-6xl grid-cols-3 gap-4 p-4">
        {/* Left: Inspector */}
        <section className="col-span-1 rounded-2xl border border-black/5 bg-white/70 p-4 shadow dark:border-white/10 dark:bg-zinc-900/70">
          <h2 className="mb-2 text-sm font-semibold">Inspector</h2>
          {!state ? (
            <p className="text-sm text-zinc-500">Create a match to begin.</p>
          ) : (
            <pre className="max-h-[60vh] overflow-auto rounded-lg bg-black/5 p-3 text-xs dark:bg-white/10">
{JSON.stringify({
  phase: state.ctx.phase,
  turn: state.ctx.turn,
  currentPlayer: state.ctx.currentPlayer,
  winner: state.ctx.winner ?? null,
}, null, 2)}
            </pre>
          )}
        </section>

        {/* Middle: Primary board(s) */}
        <section className="col-span-1 rounded-2xl border border-black/5 bg-white/70 p-4 shadow dark:border-white/10 dark:bg-zinc-900/70">
          <h2 className="mb-2 text-sm font-semibold">Board</h2>
          {!state ? (
            <p className="text-sm text-zinc-500">—</p>
          ) : (
            <BoardView gameKey={gameKey} state={state} onMove={apply} />
          )}
        </section>

        {/* Right: Controls */}
        <section className="col-span-1 rounded-2xl border border-black/5 bg-white/70 p-4 shadow dark:border-white/10 dark:bg-zinc-900/70">
          <h2 className="mb-2 text-sm font-semibold">Controls</h2>
          {!state ? (
            <p className="text-sm text-zinc-500">—</p>
          ) : isPoker ? (
            <PokerControls state={state} onMove={apply} />
          ) : (
            <p className="text-sm text-zinc-500">Play on the board.</p>
          )}
        </section>
      </main>
    </div>
  );
}

/* ====== RENDERERS ====== */

function BoardView({
  gameKey, state, onMove,
}: { gameKey: GameKey; state: GameState; onMove: (m: string, a?: any) => void }) {
  const boards = Object.values(state.zones).filter(z => z.kind === "board") as BoardZone[];

  if (gameKey === "tictactoe" && boards[0]) {
    const b = boards[0];
    return (
      <Grid
        rows={b.rows}
        cols={b.cols}
        cell={(idx) => {
          const pid = b.cells[idx];
          const piece = pid ? state.pieces[pid] : null;
          const owner = piece?.owner;
          return (
            <button
              onClick={() => onMove("place", { index: idx })}
              className="grid h-20 w-20 place-items-center rounded-lg bg-white text-2xl shadow hover:bg-zinc-50 dark:bg-zinc-800"
            >
              {owner ? (state.ctx.players[0] === owner ? "X" : "O") : "·"}
            </button>
          );
        }}
      />
    );
  }

  if (gameKey === "connect4" && boards[0]) {
    const b = boards[0];
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: b.cols }).map((_, col) => (
            <button
              key={col}
              onClick={() => onMove("drop", { col })}
              className="rounded-lg bg-indigo-600 px-2 py-1 text-sm font-semibold text-white hover:opacity-95"
            >
              Drop {col + 1}
            </button>
          ))}
        </div>
        <Grid
          rows={b.rows}
          cols={b.cols}
          cell={(idx) => {
            const pid = b.cells[idx];
            const piece = pid ? state.pieces[pid] : null;
            const owner = piece?.owner;
            const isP1 = owner && state.ctx.players[0] === owner;
            return (
              <div className="grid h-14 w-14 place-items-center rounded-full bg-white text-lg shadow dark:bg-zinc-800">
                {piece ? (isP1 ? "R" : "Y") : "·"}
              </div>
            );
          }}
        />
      </div>
    );
  }

  if (gameKey === "poker") {
    const community = boards.find(b => b.name === "Community");
    const potZone = Object.values(state.zones).find(z => z.name === "Pot") as StackZone | undefined;

    const potId = potZone?.order[0];
    const pot = potId ? Number((state.pieces[potId].attrs as any)?.amount ?? 0) : 0;

    return (
      <div className="space-y-4">
        <div>
          <div className="mb-1 text-xs text-zinc-500">Community</div>
          <div className="flex gap-2">
            {community?.cells.map((pid, i) => {
              const card = pid ? (state.pieces[pid] as Card) : null;
              const short = (card?.attrs as any)?.short ?? "🂠";
              return (
                <div key={i} className="grid h-16 w-12 place-items-center rounded-lg border border-black/10 bg-white text-sm dark:border-white/10 dark:bg-zinc-800">
                  {pid ? short : "—"}
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-sm">
          <span className="rounded-lg bg-zinc-100 px-2 py-1 dark:bg-zinc-800">Pot: {pot}</span>
        </div>

        <div className="mt-4 space-y-2">
          <div className="text-xs text-zinc-500">Hands (shown for lab)</div>
          {state.ctx.players.map(pid => {
            const handZone = Object.values(state.zones).find(z => z.kind === "hand" && z.owner === pid) as StackZone | undefined;
            const cards = handZone?.order ?? [];
            return (
              <div key={pid} className="flex items-center gap-2">
                <div className="w-20 text-xs opacity-70">{pid}</div>
                <div className="flex gap-2">
                  {cards.map(cid => {
                    const card = state.pieces[cid] as Card;
                    const short = (card.attrs as any)?.short ?? "🂠";
                    return (
                      <div key={cid} className="grid h-16 w-12 place-items-center rounded-lg border border-black/10 bg-white text-sm dark:border-white/10 dark:bg-zinc-800">
                        {short}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return <p className="text-sm text-zinc-500">No renderer.</p>;
}

function Grid({
  rows, cols, cell,
}: { rows: number; cols: number; cell: (index: number) => React.ReactNode }) {
  return (
    <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: "0.5rem" }}>
      {Array.from({ length: rows * cols }).map((_, idx) => (
        <div key={idx}>{cell(idx)}</div>
      ))}
    </div>
  );
}

function PokerControls({ state, onMove }: { state: GameState; onMove: (m: string, a?: any) => void }) {
  return (
    <div className="space-y-2">
      <div className="text-xs text-zinc-500">Phase: {state.ctx.phase}</div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => onMove("nextPhase")} className="rounded-lg bg-zinc-100 px-3 py-1.5 text-sm hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700">
          Next Phase
        </button>
        <button onClick={() => onMove("addPot", { amount: 10 })} className="rounded-lg bg-zinc-100 px-3 py-1.5 text-sm hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700">
          +10 to Pot
        </button>
        <button onClick={() => onMove("fold")} className="rounded-lg bg-zinc-100 px-3 py-1.5 text-sm hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700">
          Fold (current)
        </button>
        <button onClick={() => onMove("check")} className="rounded-lg bg-zinc-100 px-3 py-1.5 text-sm hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700">
          Check (current)
        </button>
      </div>
    </div>
  );
}
