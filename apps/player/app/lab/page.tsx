"use client";

import { useMemo, useState } from "react";

// Adjust these imports to your monorepo aliases/paths
import * as TTT from "../../../../packages/d100-games/src/tictactoe";
import * as C4 from "../../../../packages/d100-games/src/connect4";
import * as POKER from "../../../../packages/d100-games/src/poker-nlh";

import type { GameDefinition } from "../../../../packages/d100-core/src/runtime";
import { applyMove, endTurn } from "../../../../packages/d100-core/src/runtime";
import type {
  GameState,
  BoardZone,
  StackZone,
  Zone,
  Card,
  Piece,
  Die,
  Anchor,
} from "../../../../packages/d100-core/src/object-types";

/* ---------------------- Game selector ---------------------- */

type GameKey = "tictactoe" | "connect4" | "poker";
const games: Record<
  GameKey,
  { createMatch: (players: string[]) => GameState; def: GameDefinition }
> = {
  tictactoe: { createMatch: TTT.createMatch, def: (TTT as any).TicTacToe },
  connect4: { createMatch: C4.createMatch, def: (C4 as any).Connect4 },
  poker: { createMatch: POKER.createMatch, def: (POKER as any).PokerNLH },
};

/* -------------------------- Page --------------------------- */

export default function LabPage() {
  const [gameKey, setGameKey] = useState<GameKey>("tictactoe");
  const [state, setState] = useState<GameState | null>(null);
  const [def, setDef] = useState<GameDefinition | null>(null);

  const onCreate = () => {
    const g = games[gameKey];
    const seats =
      gameKey === "poker" ? ["p1", "p2", "p3", "p4"] : ["p1", "p2"];
    const s = g.createMatch(seats);
    setState(s);
    setDef(g.def);
  };

  const doMove = (name: string, args?: any) => {
    if (!state || !def) return;
    try {
      const next = applyMove(def, state, name, args ?? {});
      setState(next);
    } catch (e) {
      // silent no-op in lab if move isn't defined/invalid
      // console.warn(e);
    }
  };

  const nextPlayer = () => {
    if (state && def) setState(endTurn(state, def));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 text-zinc-900 dark:from-zinc-950 dark:to-zinc-900 dark:text-zinc-100">
      {/* Top bar */}
      <nav className="flex items-center justify-between border-b border-black/5 bg-white/60 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-zinc-900/60">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-zinc-900 px-2 py-1 text-white dark:bg-white dark:text-zinc-900">
            Lab
          </span>
          <select
            className="rounded-lg border border-black/10 bg-white/70 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-zinc-900/70"
            value={gameKey}
            onChange={(e) => setGameKey(e.target.value as GameKey)}
          >
            <option value="tictactoe">Tic-Tac-Toe</option>
            <option value="connect4">Connect-4</option>
            <option value="poker">NLH Poker</option>
          </select>
          <button
            onClick={onCreate}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:opacity-95"
          >
            Create Match
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={nextPlayer}
            disabled={!state || !def}
            className="rounded-lg px-3 py-1.5 text-sm hover:bg-zinc-100 disabled:opacity-50 dark:hover:bg-zinc-800"
          >
            Next Player →
          </button>
        </div>
      </nav>

      {/* Main: left sidebar inspector + right board */}
      <main className="grid grid-cols-[320px_1fr] gap-4 p-4">
        {/* Sidebar Inspector */}
        <aside className="rounded-2xl border border-black/5 bg-white/70 p-4 shadow dark:border-white/10 dark:bg-zinc-900/70">
          <h2 className="mb-2 text-sm font-semibold">Inspector</h2>
          {!state ? (
            <p className="text-sm text-zinc-500">Create a match to begin.</p>
          ) : (
            <div className="space-y-3">
              <KV label="Phase" value={state.ctx.phase} />
              <KV label="Turn" value={String(state.ctx.turn)} />
              <KV label="Current" value={state.ctx.currentPlayer} />
              <KV label="Players" value={state.ctx.players.join(", ")} />
              <KV
                label="Winner"
                value={state.ctx.winner ? String(state.ctx.winner) : "—"}
              />
              <div className="h-px bg-black/10 dark:bg-white/10" />
              <h3 className="text-xs font-semibold uppercase tracking-wide opacity-70">
                Zones
              </h3>
              <div className="max-h-[50vh] overflow-auto rounded-lg bg-black/5 p-3 text-xs dark:bg-white/10">
                <pre className="whitespace-pre-wrap leading-relaxed">
                  {JSON.stringify(
                    Object.values(state.zones).map((z) => ({
                      id: z.id,
                      name: z.name,
                      kind: z.kind,
                      owner: (z as any).owner ?? null,
                      ui: (z as any).ui ?? null,
                    })),
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          )}
        </aside>

        {/* Generic Board/Zone/Dice surface */}
        <section className="rounded-2xl border border-black/5 bg-white/70 p-4 shadow dark:border-white/10 dark:bg-zinc-900/70">
          {!state || !def ? (
            <p className="text-sm text-zinc-500">—</p>
          ) : (
            <GenericSurface state={state} def={def} onMove={doMove} />
          )}
        </section>
      </main>
    </div>
  );
}

/* -------------------- Generic surface --------------------- */

function GenericSurface({
  state,
  def,
  onMove,
}: {
  state: GameState;
  def: GameDefinition;
  onMove: (m: string, a?: any) => void;
}) {
  // group zones by anchor so we can lay them out consistently
  const zonesByAnchor = useMemo(() => {
    const groups = new Map<Anchor, Zone[]>();
    const zones = Object.values(state.zones);
    for (const z of zones) {
      const a = (z as any).ui?.anchor ?? ("center" as Anchor);
      if (!groups.has(a)) groups.set(a, []);
      groups.get(a)!.push(z);
    }
    // sort per anchor by ui.order
    for (const [a, arr] of groups) {
      arr.sort(
        (z1, z2) =>
          (((z1 as any).ui?.order ?? 0) as number) -
          (((z2 as any).ui?.order ?? 0) as number)
      );
      groups.set(a, arr);
    }
    return groups;
  }, [state.zones]);

  // 3x3 anchor grid (top/center/bottom × left/center/right)
  const areas = [
    '"tl tc tr"',
    '"cl cc cr"',
    '"bl bc br"',
  ].join(" ");

  const renderAnchor = (a: Anchor, area: string) => {
    const zones = zonesByAnchor.get(a) ?? [];
    if (!zones.length) return null;
    return (
      <div
        key={a}
        style={{ gridArea: area }}
        className="flex flex-wrap items-start gap-3"
      >
        {zones.map((z) => (
          <ZoneView key={z.id} z={z} state={state} onMove={onMove} />
        ))}
      </div>
    );
  };

  return (
    <div
      className="grid h-full w-full"
      style={{
        gridTemplateAreas: areas,
        gridTemplateColumns: "1fr 1fr 1fr",
        gridTemplateRows: "auto 1fr auto",
        gap: "0.75rem",
      }}
    >
      {renderAnchor("top-left", "tl")}
      {renderAnchor("top", "tc")}
      {renderAnchor("top-right", "tr")}
      {renderAnchor("left", "cl")}
      {renderAnchor("center", "cc")}
      {renderAnchor("right", "cr")}
      {renderAnchor("bottom-left", "bl")}
      {renderAnchor("bottom", "bc")}
      {renderAnchor("bottom-right", "br")}

      {/* Dice tray (global). If you later want to “zone” dice, you can
         add a Zone of kind "area" named "Dice" and omit this. */}
      {Object.keys(state.dice || {}).length > 0 && (
        <div className="pointer-events-auto fixed bottom-6 right-6 flex flex-wrap gap-2 rounded-xl border border-black/10 bg-white/80 p-3 shadow-lg backdrop-blur dark:border-white/10 dark:bg-zinc-900/80">
          {Object.values(state.dice).map((d) => (
            <DieView key={d.id} die={d} onMove={onMove} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ----------------------- Zone views ----------------------- */

function ZoneView({
  z,
  state,
  onMove,
}: {
  z: Zone;
  state: GameState;
  onMove: (m: string, a?: any) => void;
}) {
  const base =
    "rounded-xl border border-black/10 bg-white/70 p-3 shadow-sm dark:border-white/10 dark:bg-zinc-900/70";
  if (z.kind === "board") {
    const b = z as BoardZone;
    return (
      <div className={base}>
        <div className="mb-2 text-xs font-semibold opacity-70">{b.name}</div>
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${b.cols}, 64px)`,
            gridAutoRows: "64px",
            gap: "0.5rem",
          }}
        >
          {Array.from({ length: b.rows * b.cols }).map((_, idx) => {
            const pid = b.cells[idx];
            const pc: Piece | Card | undefined = pid
              ? (state.pieces[pid] as any)
              : undefined;
            return (
              <button
                key={idx}
                onClick={() =>
                  tryMove(onMove, state, ["tapCell", "place", "drop"], {
                    zoneId: b.id,
                    index: idx,
                  })
                }
                className="grid place-items-center rounded-lg bg-white text-sm shadow hover:bg-zinc-50 dark:bg-zinc-800"
              >
                {pc ? pieceBadge(pc, state) : "·"}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // stacks / hands / bags / discard / pool / area
  const s = z as StackZone;
  const items = s.order || [];
  return (
    <div className={base}>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold opacity-70">
          {z.name}
          {("owner" in z && z.owner) ? (
            <span className="ml-2 rounded bg-black/10 px-1.5 py-0.5 text-[10px] opacity-70 dark:bg-white/10">
              {(z as any).owner}
            </span>
          ) : null}
        </div>
        <button
          onClick={() => tryMove(onMove, state, ["tapZone"], { zoneId: z.id })}
          className="rounded-lg px-2 py-1 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          tap
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {items.length === 0 ? (
          <div className="text-xs opacity-60">— empty —</div>
        ) : (
          items.map((pid) => {
            const pc = state.pieces[pid] as Piece | Card;
            return (
              <button
                key={pid}
                onClick={() =>
                  tryMove(onMove, state, ["tapPiece"], {
                    pieceId: pid,
                    zoneId: z.id,
                  })
                }
                className="grid h-16 w-12 place-items-center rounded-lg border border-black/10 bg-white text-xs shadow-sm hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-800"
                title={pc.kind}
              >
                {pieceBadge(pc, state)}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

/* --------------------- Dice view (pool) ------------------- */

function DieView({
  die,
  onMove,
}: {
  die: Die;
  onMove: (m: string, a?: any) => void;
}) {
  const label =
    (die.attrs as any)?.faceLabel ??
    (die.attrs as any)?.last ??
    `${die.sides}`;
  return (
    <button
      onClick={() => tryMove(onMove, null, ["tapDie", "rollDice", "roll"], { dieId: die.id })}
      className="grid h-12 w-12 place-items-center rounded-lg border border-black/10 bg-white text-sm shadow hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-800"
      title={`${die.kind} (${die.sides})`}
    >
      {String(label)}
    </button>
  );
}

/* ----------------------- Helpers -------------------------- */

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="opacity-60">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function pieceBadge(pc: Piece | Card, state: GameState) {
  // Card: show short like "Ah", piece: owner initial or kind initial
  if ((pc as Card).cardName) {
    const short = (pc.attrs as any)?.short;
    return short ?? (pc as Card).cardName ?? "🂠";
  }
  const owner = pc.owner;
  if (owner) {
    const idx = state.ctx.players.indexOf(owner);
    return idx >= 0 ? `P${idx + 1}` : "●";
  }
  return pc.kind?.[0]?.toUpperCase() ?? "●";
}

/** Attempt to call the first defined move in `names`.
 * If `def` isn’t available here (we don’t pass it), we simply try the move name;
 * the runtime will throw if unknown — we silence that in the caller. */
function tryMove(
  onMove: (m: string, a?: any) => void,
  _state: GameState | null,
  names: string[],
  payload: any
) {
  for (const n of names) {
    try {
      onMove(n, payload);
      return;
    } catch {
      // keep trying other generic names
    }
  }
}
