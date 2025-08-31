"use client";

import { useMemo, useState } from "react";
import * as TTT from "../../../../packages/d100-games/src/tictactoe";
import * as C4 from "../../../../packages/d100-games/src/connect4";
import * as POKER from "../../../../packages/d100-games/src/poker-nlh";

import { GameDefinition, applyMove, endTurn, getControls } from "../../../../packages/d100-core/src/runtime";
import { GameState, BoardZone, StackZone, Zone } from "../../../../packages/d100-core/src/object-types";

type GameKey = "tictactoe" | "connect4" | "poker";

export default function LabPage() {
  const [gameKey, setGameKey] = useState<GameKey>("tictactoe");
  const [state, setState] = useState<GameState | null>(null);
  const [def, setDef] = useState<GameDefinition | null>(null);

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

  const doMove = (move: string, args?: any) => {
    if (!def || !state) return;
    const next = applyMove(def, state, move, args ?? {});
    setState(next);
  };

  const rotate = () => {
    if (!def || !state) return;
    setState(endTurn(state, def));
  };

  const controls = useMemo(() => {
    if (!def || !state) return [];
    return getControls(def, state, state.ctx.currentPlayer);
  }, [def, state]);

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
          <button onClick={rotate} className="rounded-lg px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800">
            Next Player →
          </button>
        </div>
      </nav>

      <main className="mx-auto grid max-w-6xl grid-cols-10 gap-4 p-4">
        {/* Left: Inspector (sidebar) */}
        <section className="col-span-3 rounded-2xl border border-black/5 bg-white/70 p-4 shadow dark:border-white/10 dark:bg-zinc-900/70">
          <h2 className="mb-2 text-sm font-semibold">Inspector</h2>
          {!state ? (
            <p className="text-sm text-zinc-500">Create a match to begin.</p>
          ) : (
            <pre className="max-h-[70vh] overflow-auto rounded-lg bg-black/5 p-3 text-xs dark:bg-white/10">
{JSON.stringify({
  phase: state.ctx.phase,
  turn: state.ctx.turn,
  currentPlayer: state.ctx.currentPlayer,
  winner: state.ctx.winner ?? null,
}, null, 2)}
            </pre>
          )}
        </section>

        {/* Right: Board + Controls (game-agnostic) */}
        <section className="col-span-7 rounded-2xl border border-black/5 bg-white/70 p-4 shadow dark:border-white/10 dark:bg-zinc-900/70">
          <h2 className="mb-3 text-sm font-semibold">Table</h2>
          {!state ? (
            <p className="text-sm text-zinc-500">—</p>
          ) : (
            <>
              <GenericTable state={state} onMove={doMove} />
              {controls.length > 0 && (
                <ControlsPanel controls={controls} onMove={doMove} />
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}

/* -------------------- */

/* --------------------
 * Generic, game-agnostic table renderer
 * Renders all zones (boards + stacks/etc.), pieces, and dice info.
 * Expects optional per-zone metadata:
 *   (zone as any).attrs?.onCellClick?: {
 *     move: string;               // move name to call
 *     argKey?: string;            // defaults to 'index'
 *     useColumn?: boolean;        // if true, send { [argKey]: col }
 *     extraArgs?: Record<string,unknown>;
 *   }
 * If that metadata isn't present, it will try a couple of fallbacks:
 *  - TicTacToe:   move 'place' with { index }
 *  - Connect-4:   move 'drop' with { col }
 * -------------------- */

function GenericTable({
    state,
    onMove,
  }: {
    state: GameState;
    onMove: (move: string, args?: any) => void;
  }) {
    const zones = Object.values(state.zones) as Zone[];
  
    const boards = zones.filter((z): z is BoardZone => z.kind === "board");
    const stacks = zones.filter((z): z is StackZone => z.kind !== "board");
  
    return (
      <div className="space-y-6">
        {/* Boards */}
        {boards.length > 0 && (
          <div className="space-y-4">
            {boards.map((b) => (
              <BoardZoneView key={b.id} zone={b} state={state} onMove={onMove} />
            ))}
          </div>
        )}
  
        {/* Non-board zones */}
        {stacks.length > 0 && (
          <div className="space-y-3">
            {stacks.map((z) => (
              <StackZoneView key={z.id} zone={z} state={state} />
            ))}
          </div>
        )}
  
        {/* Dice (if any) */}
        {state.dice && Object.keys(state.dice).length > 0 && (
          <div className="rounded-xl border border-black/10 p-3 text-sm dark:border-white/10">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide opacity-70">
              Dice
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.values(state.dice).map((d) => (
                <div
                  key={d.id}
                  className="rounded-lg border border-black/10 bg-white px-3 py-1.5 dark:border-white/10 dark:bg-zinc-800"
                >
                  {d.name} ({d.kind}, {d.sides}-sided)
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
  
  function BoardZoneView({
    zone,
    state,
    onMove,
  }: {
    zone: BoardZone;
    state: GameState;
    onMove: (move: string, args?: any) => void;
  }) {
    const rows = zone.rows;
    const cols = zone.cols;
    const cellMeta = (zone as any).attrs?.onCellClick as
      | {
          move: string;
          argKey?: string;
          useColumn?: boolean;
          extraArgs?: Record<string, unknown>;
        }
      | undefined;
  
    function clickCell(index: number) {
      // Prefer explicit metadata from the zone
      if (cellMeta?.move) {
        const col = index % cols;
        const payloadKey = cellMeta.argKey ?? "index";
        const payloadValue = cellMeta.useColumn ? col : index;
        onMove(cellMeta.move, {
          [payloadKey]: payloadValue,
          ...(cellMeta.extraArgs ?? {}),
        });
        return;
      }
  
      // Fallbacks for common patterns
      const col = index % cols;
  
      // Connect-4 style
      if (cols === 7 && rows >= 4) {
        onMove("drop", { col });
        return;
      }
      // TicTacToe style
      onMove("place", { index });
    }
  
    return (
      <div className="rounded-xl border border-black/10 p-3 dark:border-white/10">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold">{zone.name}</div>
          <div className="text-xs opacity-70">
            {rows}×{cols}
          </div>
        </div>
  
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: rows * cols }).map((_, idx) => {
            const pid = zone.cells[idx];
            const piece = pid ? state.pieces[pid] : undefined;
  
            // Display priority: Card name > piece.kind > "·"
            const label =
              piece && "cardName" in piece
                ? (piece as any).cardName
                : piece?.kind ?? "·";
  
            return (
              <button
                key={idx}
                onClick={() => clickCell(idx)}
                className="grid h-16 place-items-center rounded-lg border border-black/10 bg-white text-sm shadow-sm hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-800"
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  
  function StackZoneView({
    zone,
    state,
  }: {
    zone: StackZone;
    state: GameState;
  }) {
    const items = zone.order;
  
    return (
      <div className="rounded-xl border border-black/10 p-3 dark:border-white/10">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold">
            {zone.name}
            {zone.owner ? (
              <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">
                {zone.owner}
              </span>
            ) : null}
          </div>
          <div className="text-xs opacity-70">{zone.kind}</div>
        </div>
  
        {items.length === 0 ? (
          <div className="text-xs opacity-60">Empty</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {items.map((id) => {
              const p = state.pieces[id];
              const isCard = (p as any)?.cardName;
              const label = isCard ? (p as any).cardName : p?.kind ?? id;
  
              return (
                <div
                  key={id}
                  className="grid h-16 w-12 place-items-center rounded-lg border border-black/10 bg-white text-xs dark:border-white/10 dark:bg-zinc-800"
                  title={id}
                >
                  {label}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
  
  /* --------------------
   * Controls panel
   * Expects items from getControls(def, state, playerId).
   * Supports:
   *  - kind: 'action' (simple button)
   *  - kind: 'number' (numeric input + submit)
   *  - kind: 'select' (basic dropdown)
   * Each control should specify:
   *   { id, label, move, kind?, enabled?, args?, argKey?, min?, max?, step?, options? }
   * -------------------- */
  
  type ControlItem = {
    id?: string;
    label: string;
    move: string;
    kind?: "action" | "number" | "select";
    enabled?: boolean;
    // default args to send with the move
    args?: Record<string, unknown>;
    // for number/select controls: which key to set in args
    argKey?: string; // defaults to "amount"
    // number config
    min?: number;
    max?: number;
    step?: number;
    placeholder?: string;
    // select config
    options?: Array<{ label: string; value: any; disabled?: boolean }>;
  };
  
  function ControlsPanel({
    controls,
    onMove,
  }: {
    controls: ControlItem[];
    onMove: (move: string, args?: any) => void;
  }) {
    // local input state keyed by control id/label
    const [values, setValues] = useState<Record<string, any>>({});
  
    function keyOf(c: ControlItem) {
      return c.id ?? c.label ?? c.move;
    }
  
    return (
      <div className="mt-4 rounded-xl border border-black/10 p-3 text-sm dark:border-white/10">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide opacity-70">
          Controls
        </div>
  
        <div className="flex flex-wrap gap-2">
          {controls.map((c) => {
            const k = keyOf(c);
            const disabled = c.enabled === false;
  
            if (c.kind === "number") {
              const argKey = c.argKey ?? "amount";
              const v = values[k] ?? "";
  
              return (
                <div key={k} className="flex items-center gap-2">
                  <input
                    type="number"
                    value={v}
                    min={c.min}
                    max={c.max}
                    step={c.step ?? 1}
                    placeholder={c.placeholder}
                    onChange={(e) =>
                      setValues((s) => ({ ...s, [k]: e.target.value }))
                    }
                    className="w-24 rounded-lg border border-black/10 bg-white px-2 py-1 dark:border-white/10 dark:bg-zinc-800"
                  />
                  <button
                    disabled={disabled}
                    onClick={() =>
                      onMove(c.move, {
                        ...(c.args ?? {}),
                        [argKey]:
                          v === "" || v === undefined ? undefined : Number(v),
                      })
                    }
                    className={`rounded-lg px-3 py-1.5 ${
                      disabled
                        ? "cursor-not-allowed opacity-50"
                        : "bg-indigo-600 text-white hover:opacity-95"
                    }`}
                  >
                    {c.label}
                  </button>
                </div>
              );
            }
  
            if (c.kind === "select") {
              const argKey = c.argKey ?? "value";
              const v = values[k] ?? (c.options?.[0]?.value ?? "");
              return (
                <div key={k} className="flex items-center gap-2">
                  <select
                    value={v}
                    onChange={(e) =>
                      setValues((s) => ({ ...s, [k]: e.target.value }))
                    }
                    className="rounded-lg border border-black/10 bg-white px-2 py-1 dark:border-white/10 dark:bg-zinc-800"
                  >
                    {(c.options ?? []).map((opt, i) => (
                      <option key={i} value={opt.value} disabled={opt.disabled}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <button
                    disabled={disabled}
                    onClick={() =>
                      onMove(c.move, { ...(c.args ?? {}), [argKey]: v })
                    }
                    className={`rounded-lg px-3 py-1.5 ${
                      disabled
                        ? "cursor-not-allowed opacity-50"
                        : "bg-indigo-600 text-white hover:opacity-95"
                    }`}
                  >
                    {c.label}
                  </button>
                </div>
              );
            }
  
            // default = simple action button
            return (
              <button
                key={k}
                disabled={disabled}
                onClick={() => onMove(c.move, c.args ?? {})}
                className={`rounded-lg px-3 py-1.5 ${
                  disabled
                    ? "cursor-not-allowed opacity-50"
                    : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  



