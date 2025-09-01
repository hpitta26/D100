"use client";

import { LuPanelLeftClose, LuPanelLeftOpen } from "react-icons/lu";
import { FaDiceD20 } from "react-icons/fa";
import { IoArrowBackOutline } from "react-icons/io5";

import { useMemo, useState } from "react";
import * as TTT from "../../../../packages/d100-games/src/tictactoe";
import * as C4 from "../../../../packages/d100-games/src/connect4";
import * as POKER from "../../../../packages/d100-games/src/poker-nlh";

import { GameDefinition, applyMove, endTurn, getControls } from "../../../../packages/d100-core/src/runtime";
import { GameState, BoardZone, StackZone, Zone, GameLayoutConfig, LayoutZone, LayoutPosition } from "../../../../packages/d100-core/src/object-types";

type GameKey = "tictactoe" | "connect4" | "poker";

// Helper function to get layout for each game
const getLayoutForGame = (gameKey: GameKey): GameLayoutConfig | undefined => {
  if (gameKey === "tictactoe") return TTT.TicTacToe.layout;
  if (gameKey === "connect4") return C4.Connect4.layout;
  if (gameKey === "poker") return POKER.PokerNLH.layout;
  return undefined;
};

export default function LabPage() {
  const [gameKey, setGameKey] = useState<GameKey>("poker");
  const [state, setState] = useState<GameState | null>(null);
  const [layoutPreview, setLayoutPreview] = useState(false);
  const [def, setDef] = useState<GameDefinition | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

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
    <div className="flex h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 text-zinc-900 dark:from-zinc-950 dark:to-zinc-900 dark:text-zinc-100">
      {/* Collapsed Floating Header */}
      {sidebarCollapsed && (
        <div className="fixed top-0 left-0 z-50 p-4">
          <div className="flex items-center gap-3 rounded-lg bg-white/90 p-3 backdrop-blur dark:bg-zinc-900/90">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
                <FaDiceD20 className="h-5.5 w-5.5" aria-label="D20 logo" />
            </div>
            <span className="text-lg font-semibold tracking-wide">D100 - Lab</span>
            <LuPanelLeftOpen 
              className="w-5 h-5 text-gray-400 dark:text-gray-300 cursor-pointer hover:text-gray-600 dark:hover:text-gray-100" 
              onClick={toggleSidebar}
            />
          </div>
        </div>
      )}

      {/* Left Sidebar: Inspector */}
      {!sidebarCollapsed && (
        <aside className="flex w-80 flex-col border-r border-black/5 bg-white/80 backdrop-blur dark:border-white/10 dark:bg-zinc-900/80">
          {/* Sidebar Header */}
          <div className="border-b border-black/5 p-4 dark:border-white/10">
            <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
                    <FaDiceD20 className="h-5.5 w-5.5" aria-label="D20 logo" />
                </div>
                <span className="text-lg font-semibold tracking-wide">D100 - Lab</span>
                <div className="flex-1"></div>
                <LuPanelLeftClose 
                    className="w-5 h-5 text-gray-400 dark:text-gray-300 cursor-pointer hover:text-gray-600 dark:hover:text-gray-100" 
                    onClick={toggleSidebar}
                />
            </div>
            <div className="mt-3">
              <select
                className="w-full rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-900/70"
                value={gameKey}
                onChange={(e) => setGameKey(e.target.value as GameKey)}
            >
                <option value="poker">NLH Poker (dev)</option>
                <option value="tictactoe">Tic-Tac-Toe</option>
                <option value="connect4">Connect-4</option>
            </select>
          </div>
          <div className="mt-3 flex gap-2">
            <button 
              onClick={create} 
              className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:opacity-95"
            >
              Create Match
            </button>
            <button 
              onClick={rotate} 
              className="flex-1 rounded-lg px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Next →
            </button>
          </div>
          <div className="mt-3">
            {state && (
              <button 
                onClick={() => setLayoutPreview(!layoutPreview)}
                className={`w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  layoutPreview 
                    ? "bg-green-600 text-white" 
                    : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                }`}
              >
                {layoutPreview ? "Game View" : "Layout Preview"}
              </button>
            )}
          </div>
        </div>

        {/* Inspector Content */}
        <div className="flex-1 overflow-hidden p-4">
          <h2 className="mb-3 text-sm font-semibold">Inspector</h2>
          {!state ? (
            <p className="text-sm text-zinc-500">Create a match to begin.</p>
          ) : (
            <pre className="overflow-auto rounded-lg bg-black/5 p-3 text-xs dark:bg-white/10">
{JSON.stringify({
  phase: state.ctx.phase,
  turn: state.ctx.turn,
  currentPlayer: state.ctx.currentPlayer,
  winner: state.ctx.winner ?? null,
}, null, 2)}
            </pre>
          )}
        </div>

        {/* Back to Home Button */}
        <div className="border-t border-black/5 p-4 dark:border-white/10">
          <button 
            onClick={() => window.location.href = '/'}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 px-3 py-2 text-sm font-semibold transition-colors"
          >
            <IoArrowBackOutline className="w-5 h-5" /> Back to Home
          </button>
        </div>
        </aside>
      )}

      {/* Main Content: Table */}
      <main className="flex flex-1 overflow-hidden">

        {/* Table Content */}
        <div className="flex-1 overflow-auto">
          {layoutPreview || !state ? (
            <LayoutPreview layout={getLayoutForGame(gameKey)} gameName={gameKey} />
          ) : (
            <div className="h-full">
              {def?.layout ? (
                <AdvancedLayoutTable 
                  state={state} 
                  onMove={doMove} 
                  layout={def.layout}
                  controls={controls}
                />
              ) : (
                <>
                  <GenericTable state={state} onMove={doMove} />
                  {controls.length > 0 && (
                    <div className="mt-4">
                      <ControlsPanel controls={controls} onMove={doMove} />
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
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
      <div className="flex h-full flex-col">
        {/* Main Board Container - Fixed size and centered */}
        <div className="flex flex-1 items-center justify-center">
          <div className="h-[500px] w-[500px] rounded-2xl border-2 border-black/10 bg-white/50 p-6 shadow-lg backdrop-blur dark:border-white/10 dark:bg-zinc-900/50">
            {boards.length > 0 ? (
              <div className="flex h-full items-center justify-center">
                <BoardZoneView key={boards[0].id} zone={boards[0]} state={state} onMove={onMove} />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-400">
                <div className="text-center">
                  <div className="text-4xl mb-2">🎲</div>
                  <div className="text-sm">No board zones</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Secondary zones and info - Below the main board */}
        {(stacks.length > 0 || (state.dice && Object.keys(state.dice).length > 0)) && (
          <div className="mt-4 flex justify-center">
            <div className="flex max-w-4xl gap-6">
              {/* Non-board zones */}
              {stacks.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wide opacity-70">
                    Other Zones
                  </div>
                  {stacks.map((z) => (
                    <StackZoneView key={z.id} zone={z} state={state} />
                  ))}
                </div>
              )}
        
              {/* Dice */}
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
      <div className="flex flex-col items-center justify-center h-full w-full">
        <div className="mb-4 flex items-center justify-between w-full">
          <div className="text-lg font-semibold">{zone.name}</div>
          <div className="text-sm opacity-70">
            {rows}×{cols}
          </div>
        </div>
  
        <div
          className="grid gap-3 max-w-full max-h-full"
          style={{ 
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            aspectRatio: `${cols} / ${rows}`
          }}
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
                className="grid place-items-center rounded-xl border-2 border-black/20 bg-white/80 text-base font-medium shadow-md hover:bg-zinc-50 hover:border-indigo-300 hover:shadow-lg transition-all duration-200 dark:border-white/20 dark:bg-zinc-800/80 dark:hover:bg-zinc-700"
                style={{ 
                  minHeight: `${Math.min(60, 400 / Math.max(rows, cols))}px`,
                  minWidth: `${Math.min(60, 400 / Math.max(rows, cols))}px`
                }}
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

/* --------------------
 * Layout Preview Component
 * Shows the layout zones and positioning without game content
 * -------------------- */
function LayoutPreview({ 
  layout, 
  gameName 
}: { 
  layout?: GameLayoutConfig; 
  gameName: string; 
}) {
  if (!layout) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-zinc-500">
          <div className="text-4xl mb-4">📐</div>
          <div className="text-lg font-medium mb-2">No Layout Configuration</div>
          <div className="text-sm">This game uses the default layout system</div>
        </div>
      </div>
    );
  }

  const boardSize = layout.board.size === "auto" ? 400 : layout.board.size;
  
  // Default zone sizes (can be overridden by layout.zoneSizes)
  const topHeight = layout.zoneSizes?.["board.top"] || 100;
  const bottomHeight = layout.zoneSizes?.["board.bottom"] || 100;
  const leftWidth = layout.zoneSizes?.["board.left"] || 110;
  const rightWidth = layout.zoneSizes?.["board.right"] || 110;
  const footerHeight = layout.zoneSizes?.["footer"] || 100;
  const rightbarWidth = layout.zoneSizes?.["rightbar"] || 250;
  const cornerSize = 60;

  return (
    <div className="flex h-full flex-col">
      {/* Main content area */}
      <div className="flex flex-1">
        {/* Board layout area */}
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="relative" style={{ 
            width: boardSize + leftWidth + rightWidth, 
            height: boardSize + topHeight + bottomHeight 
          }}>

        {/* Corner zones */}
        <div 
          className="absolute bg-gray-100 border border-gray-300 rounded flex items-center justify-center text-xs"
          style={{ 
            top: 0, 
            left: 0, 
            width: leftWidth, 
            height: topHeight 
          }}
        >
          corner.top-left
        </div>
        <div 
          className="absolute bg-gray-100 border border-gray-300 rounded flex items-center justify-center text-xs"
          style={{ 
            top: 0, 
            left: boardSize + rightWidth, 
            width: rightWidth, 
            height: topHeight 
          }}
        >
          corner.top-right
        </div>
        <div 
          className="absolute bg-gray-100 border border-gray-300 rounded flex items-center justify-center text-xs"
          style={{ 
            top: topHeight + boardSize, 
            left: 0, 
            width: leftWidth, 
            height: bottomHeight 
          }}
        >
          corner.bottom-left
        </div>
        <div 
          className="absolute bg-gray-100 border border-gray-300 rounded flex items-center justify-center text-xs"
          style={{ 
            top: topHeight + boardSize, 
            left: boardSize + rightWidth, 
            width: rightWidth, 
            height: bottomHeight 
          }}
        >
          corner.bottom-right
        </div>

        {/* Board-adjacent zones */}
        <div 
          className="absolute bg-blue-100 border-2 border-blue-300 rounded-lg flex items-center justify-center"
          style={{
            top: 0,
            left: leftWidth,
            width: boardSize,
            height: topHeight,
          }}
        >
          <span className="text-sm font-medium text-blue-700">board.top</span>
        </div>
        
        <div 
          className="absolute bg-orange-100 border-2 border-orange-300 rounded-lg flex items-center justify-center"
          style={{
            top: topHeight + boardSize,
            left: leftWidth,
            width: boardSize,
            height: bottomHeight,
          }}
        >
          <span className="text-sm font-medium text-orange-700">board.bottom</span>
        </div>

        <div 
          className="absolute bg-green-100 border-2 border-green-300 rounded-lg flex items-center justify-center"
          style={{
            left: 0,
            top: topHeight,
            width: leftWidth,
            height: boardSize,
          }}
        >
          <span className="text-sm font-medium text-green-700 transform -rotate-90">board.left</span>
        </div>

        <div 
          className="absolute bg-purple-100 border-2 border-purple-300 rounded-lg flex items-center justify-center"
          style={{
            left: leftWidth + boardSize,
            top: topHeight,
            width: rightWidth,
            height: boardSize,
          }}
        >
          <span className="text-sm font-medium text-purple-700 transform rotate-90">board.right</span>
        </div>

        {/* Center board */}
        <div 
          className="absolute bg-emerald-100 border-4 border-emerald-400 rounded-2xl flex items-center justify-center"
          style={{
            top: topHeight,
            left: leftWidth,
            width: boardSize,
            height: boardSize,
          }}
        >
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-700 mb-2">board.center</div>
            <div className="text-sm text-emerald-600">{boardSize}×{boardSize}px</div>
          </div>
        </div>

        {/* Element indicators */}
        {Object.entries(layout.elements).map(([elementId, element]) => {
          let indicator = null;
          
          if (element.zone === "floating" && element.coordinates) {
            indicator = (
              <div
                key={elementId}
                className="absolute bg-red-200 border border-red-400 rounded px-2 py-1 text-xs font-medium text-red-700"
                style={{
                  top: element.coordinates.y,
                  left: element.coordinates.x,
                  transform: "translate(-50%, -50%)",
                }}
              >
                {elementId}
              </div>
            );
          } else {
            // Show element name in its zone
            const zoneColor = element.zone.includes("board.top") ? "text-blue-800" :
                            element.zone.includes("board.bottom") ? "text-orange-800" :
                            element.zone.includes("board.left") ? "text-green-800" :
                            element.zone.includes("board.right") ? "text-purple-800" :
                            element.zone.includes("corner") ? "text-gray-800" :
                            "text-emerald-800";
            
            indicator = (
              <div key={elementId} className={`text-xs font-medium ${zoneColor} absolute`}>
                {elementId}
              </div>
            );
          }
          
          return indicator;
        })}
          </div>
        </div>

        {/* Right sidebar - Full height */}
        <div className="flex flex-col border-l-4 border-indigo-500 bg-indigo-100" style={{ width: rightbarWidth, minWidth: rightbarWidth }}>
          <div 
            className="border-b-2 border-indigo-400 flex items-center justify-center p-4 bg-indigo-200"
            style={{ minHeight: "120px" }}
          >
            <span className="text-lg font-bold text-indigo-800">rightbar.top</span>
          </div>
          
          <div 
            className="flex-1 border-b-2 border-indigo-400 flex items-center justify-center p-4 bg-indigo-50"
          >
            <span className="text-lg font-bold text-indigo-800 transform rotate-90">rightbar.center</span>
          </div>
          
          <div 
            className="flex items-center justify-center p-4 bg-indigo-200"
            style={{ minHeight: "120px" }}
          >
            <span className="text-lg font-bold text-indigo-800">rightbar.bottom</span>
          </div>
        </div>
      </div>
      
      {/* Full-width footer at bottom of page */}
      <div 
        className="bg-yellow-100 border-t-4 border-yellow-400 flex"
        style={{ height: footerHeight }}
      >
        <div className="flex-1 border-r-2 border-yellow-400 flex items-center justify-center bg-yellow-50">
          <span className="text-lg font-bold text-yellow-800">footer.left</span>
        </div>
        <div className="flex-1 border-r-2 border-yellow-400 flex items-center justify-center bg-yellow-200">
          <span className="text-lg font-bold text-yellow-800">footer.center</span>
        </div>
        <div className="flex-1 flex items-center justify-center bg-yellow-50">
          <span className="text-lg font-bold text-yellow-800">footer.right</span>
        </div>
      </div>
    </div>
  );
}

/* --------------------
 * Advanced Layout Table Component
 * Renders game using the advanced layout system
 * -------------------- */
function AdvancedLayoutTable({
  state,
  onMove,
  layout,
  controls,
}: {
  state: GameState;
  onMove: (move: string, args?: any) => void;
  layout: GameLayoutConfig;
  controls: any[];
}) {
  const zones = Object.values(state.zones) as Zone[];
  const boards = zones.filter((z): z is BoardZone => z.kind === "board");
  
  const boardSize = layout.board.size === "auto" ? 400 : layout.board.size;
  
  // Zone sizes (can be overridden by layout.zoneSizes)
  const topHeight = layout.zoneSizes?.["board.top"] || 100;
  const bottomHeight = layout.zoneSizes?.["board.bottom"] || 100;
  const leftWidth = layout.zoneSizes?.["board.left"] || 110;
  const rightWidth = layout.zoneSizes?.["board.right"] || 110;
  const footerHeight = layout.zoneSizes?.["footer"] || 100;
  const rightbarWidth = layout.zoneSizes?.["rightbar"] || 250;
  const cornerSize = 60;

  // Helper to render elements in a zone
  const renderZoneElements = (zoneName: LayoutZone) => {
    const zoneElements = Object.entries(layout.elements)
      .filter(([_, element]) => element.zone === zoneName)
      .sort(([_, a], [__, b]) => (a.order || 0) - (b.order || 0));

    return zoneElements.map(([elementId, element]) => (
      <div
        key={elementId}
        className="rounded-lg border border-black/10 bg-white/80 p-3 shadow-sm dark:border-white/10 dark:bg-zinc-800/80"
      >
        <div className="text-xs font-medium text-zinc-600 mb-2">{elementId}</div>
        {elementId === "board" && boards[0] && (
          <BoardZoneView zone={boards[0]} state={state} onMove={onMove} />
        )}
        {elementId.startsWith("player-") && (
          <div className="text-center">
            <div className="text-sm font-medium">Player {elementId.split("-")[1]}</div>
            <div className="text-xs text-zinc-500 mt-1">Stack: $1000</div>
          </div>
        )}
        {elementId === "community-cards" && (
          <div className="flex gap-1 justify-center">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="w-8 h-12 bg-zinc-200 rounded border text-xs flex items-center justify-center">
                {i <= 3 ? "🂠" : "?"}
              </div>
            ))}
          </div>
        )}
        {elementId === "pot" && (
          <div className="text-center">
            <div className="text-lg font-bold">$250</div>
            <div className="text-xs text-zinc-500">Pot</div>
          </div>
        )}
        {elementId === "actions" && controls.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {controls.slice(0, 3).map((control, i) => (
              <button
                key={i}
                className="px-2 py-1 bg-indigo-600 text-white text-xs rounded hover:opacity-90"
                onClick={() => onMove(control.move, control.args)}
              >
                {control.label}
              </button>
            ))}
          </div>
        )}
        {elementId === "game-info" && (
          <div className="text-center text-xs">
            <div>Turn: {state.ctx.turn}</div>
            <div>Phase: {state.ctx.phase}</div>
          </div>
        )}
        {elementId === "game-status" && (
          <div className="text-center text-sm">
            <div className="font-medium">Current Player: {state.ctx.currentPlayer}</div>
            <div className="text-xs text-zinc-500">Phase: {state.ctx.phase}</div>
          </div>
        )}
        {elementId === "blind-levels" && (
          <div className="text-center text-sm">
            <div className="font-medium mb-2">Blind Levels</div>
            <div className="text-xs text-zinc-500 space-y-1">
              <div className="font-medium">Current: 10/20</div>
              <div>Next: 15/30</div>
              <div>Time: 8:45</div>
            </div>
          </div>
        )}
      </div>
    ));
  };

    return (
    <div className="flex h-full flex-col">
      {/* Main content area */}
      <div className="flex flex-1">
        {/* Board layout area */}
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="relative" style={{
            width: boardSize + leftWidth + rightWidth, 
            height: boardSize + topHeight + bottomHeight 
          }}>

        {/* Corner zones */}
        <div 
          className="absolute flex items-center justify-center p-2"
          style={{ 
            top: topHeight - cornerSize/2, 
            left: leftWidth - cornerSize/2, 
            width: cornerSize, 
            height: cornerSize 
          }}
        >
          {renderZoneElements("corner.top-left")}
        </div>
        <div 
          className="absolute flex items-center justify-center p-2"
          style={{ 
            top: topHeight - cornerSize/2, 
            left: leftWidth + boardSize - cornerSize/2, 
            width: cornerSize, 
            height: cornerSize 
          }}
        >
          {renderZoneElements("corner.top-right")}
        </div>
        <div 
          className="absolute flex items-center justify-center p-2"
          style={{ 
            top: topHeight + boardSize - cornerSize/2, 
            left: leftWidth - cornerSize/2, 
            width: cornerSize, 
            height: cornerSize 
          }}
        >
          {renderZoneElements("corner.bottom-left")}
        </div>
        <div 
          className="absolute flex items-center justify-center p-2"
          style={{ 
            top: topHeight + boardSize - cornerSize/2, 
            left: leftWidth + boardSize - cornerSize/2, 
            width: cornerSize, 
            height: cornerSize 
          }}
        >
          {renderZoneElements("corner.bottom-right")}
        </div>

        {/* Board-adjacent zones */}
        <div 
          className="absolute flex gap-3 items-center justify-center p-2"
          style={{
            top: 0,
            left: leftWidth,
            width: boardSize,
            height: topHeight,
          }}
        >
          {renderZoneElements("board.top")}
        </div>
        
        <div 
          className="absolute flex gap-3 items-center justify-center p-2"
          style={{
            top: topHeight + boardSize,
            left: leftWidth,
            width: boardSize,
            height: bottomHeight,
          }}
        >
          {renderZoneElements("board.bottom")}
        </div>

        <div 
          className="absolute flex flex-col gap-3 items-center justify-center p-2"
          style={{
            left: 0,
            top: topHeight,
            width: leftWidth,
            height: boardSize,
          }}
        >
          {renderZoneElements("board.left")}
        </div>

        <div 
          className="absolute flex flex-col gap-3 items-center justify-center p-2"
          style={{
            left: leftWidth + boardSize,
            top: topHeight,
            width: rightWidth,
            height: boardSize,
          }}
        >
          {renderZoneElements("board.right")}
        </div>

        {/* Center board */}
        <div 
          className="absolute bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 shadow-lg"
          style={{
            top: topHeight,
            left: leftWidth,
            width: boardSize,
            height: boardSize,
          }}
        >
          {renderZoneElements("board.center")}
        </div>

        {/* Floating elements */}
        {Object.entries(layout.elements)
          .filter(([_, element]) => element.zone === "floating")
          .map(([elementId, element]) => (
            <div
              key={elementId}
              className="absolute"
              style={{
                top: element.coordinates?.y,
                left: element.coordinates?.x,
                transform: "translate(-50%, -50%)",
              }}
            >
              {renderZoneElements("floating")}
            </div>
          ))}
        </div>
        </div>

        {/* Right sidebar - Full height */}
        <div className="flex flex-col border-l border-black/10 dark:border-white/10" style={{ width: rightbarWidth }}>
          <div 
            className="flex items-center justify-center p-4 border-b border-black/5 dark:border-white/5"
            style={{ minHeight: "120px" }}
          >
            {renderZoneElements("rightbar.top")}
          </div>
          
          <div 
            className="flex-1 flex flex-col items-center justify-center p-4 border-b border-black/5 dark:border-white/5"
          >
            {renderZoneElements("rightbar.center")}
          </div>
          
          <div 
            className="flex items-center justify-center p-4"
            style={{ minHeight: "120px" }}
          >
            {renderZoneElements("rightbar.bottom")}
          </div>
        </div>
      </div>
      
      {/* Full-width footer at bottom of page */}
      <div 
        className="bg-white border-t border-black/10 flex dark:bg-zinc-800 dark:border-white/10"
        style={{ height: footerHeight }}
      >
        <div className="flex-1 border-r border-black/10 flex items-center justify-center p-2 dark:border-white/10">
          {renderZoneElements("footer.left")}
        </div>
        <div className="flex-1 border-r border-black/10 flex items-center justify-center p-2 dark:border-white/10">
          {renderZoneElements("footer.center")}
        </div>
        <div className="flex-1 flex items-center justify-center p-2">
          {renderZoneElements("footer.right")}
        </div>
      </div>
    </div>
  );
}

