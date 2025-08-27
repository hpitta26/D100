"use client";

import { useEffect, useMemo, useState } from "react";
import { FaDiceD20, FaUserCircle } from "react-icons/fa";

/** ---------- Types ---------- */
type GameStatus = "waiting" | "in_progress" | "finished";

type CardProps = {
  title: string;
  right?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
};

type PillProps = { children: React.ReactNode; className?: string };
type IconDotProps = { online: boolean };

type LobbyRow = {
  id: string;
  game: string;
  players: number;
  capacity: number;
  status: GameStatus; // ← status added & typed
  password?: boolean;
};
type LobbyTableProps = { rows: LobbyRow[]; spectate?: boolean };

type SelectProps = {
  label: string;
  children: React.ReactNode;
  value?: string | number;
  onChange?: (v: string) => void;
};
type CheckboxProps = {
  id: string;
  label: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (v: boolean) => void;
};

/** ---------- Mock Data ---------- */
const mockLeaderboard = [
  { id: 1, name: "Alex", wins: 42 },
  { id: 2, name: "Sam", wins: 37 },
  { id: 3, name: "Kai", wins: 28 },
  { id: 4, name: "Mina", wins: 23 },
  { id: 5, name: "Jules", wins: 19 },
];

const mockYourLobbies: LobbyRow[] = [
  { id: "A1", game: "Catan", players: 3, capacity: 4, status: "waiting",     password: false },
  { id: "B2", game: "Chess", players: 1, capacity: 2, status: "waiting",     password: false },
  { id: "C3", game: "Terraforming Mars", players: 4, capacity: 5, status: "in_progress", password: true },
];

const mockSpectate: LobbyRow[] = [
  { id: "S1", game: "Ticket to Ride", players: 5, capacity: 5, status: "in_progress", password: false },
  { id: "S2", game: "Azul",            players: 3, capacity: 4, status: "in_progress", password: false },
  { id: "S3", game: "Carcassonne",     players: 2, capacity: 5, status: "finished",    password: false },
];

const mockFriends = [
  { id: "u1", name: "Alex", online: true },
  { id: "u2", name: "Sam", online: true },
  { id: "u3", name: "Mina", online: false },
  { id: "u4", name: "Jules", online: true },
  { id: "u5", name: "Kai", online: false },
  { id: "u6", name: "Rin", online: true },
];

// pretend we track this somewhere server-side
const mockTotalGamesPlayed = 127;

/** ---------- Small UI helpers ---------- */
function Card({ title, right, className = "", children }: CardProps) {
  return (
    <section
      className={`flex h-full flex-col rounded-2xl border border-black/5 bg-white/70 p-4 shadow-[0_4px_24px_rgba(0,0,0,0.06)] backdrop-blur dark:border-white/10 dark:bg-zinc-900/70 ${className}`}
    >
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-800 dark:text-zinc-100">{title}</h2>
        {right}
      </header>
      <div className="min-h-0 flex-1 overflow-auto pr-1">{children}</div>
    </section>
  );
}

function Pill({ children, className = "" }: PillProps) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

function StatPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-xl border border-black/10 bg-white/70 px-3 py-1.5 text-xs text-zinc-700 shadow-sm dark:border-white/10 dark:bg-zinc-900/70 dark:text-zinc-200">
      {children}
    </span>
  );
}

function IconDot({ online }: IconDotProps) {
  return (
    <span
      aria-label={online ? "online" : "offline"}
      className={`inline-block h-1.5 w-1.5 rounded-full ${online ? "bg-emerald-500" : "bg-zinc-400"}`}
    />
  );
}

function statusLabel(s: GameStatus) {
  return s === "in_progress" ? "In progress" : s === "waiting" ? "Waiting" : "Finished";
}

function StatusPill({ status }: { status: GameStatus }) {
  const base = "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium";
  if (status === "waiting")
    return <span className={`${base} bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200`}>{statusLabel(status)}</span>;
  if (status === "in_progress")
    return <span className={`${base} bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200`}>{statusLabel(status)}</span>;
  return <span className={`${base} bg-zinc-200 text-zinc-700 dark:bg-zinc-700/50 dark:text-zinc-200`}>{statusLabel(status)}</span>;
}

/** ---------- Main Page ---------- */
export default function LandingPage() {
  const [tab, setTab] = useState<"your" | "spectate">("your");
  const [friendQuery, setFriendQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // modal form
  const [newGame, setNewGame] = useState("Catan");
  const [newPlayers, setNewPlayers] = useState("4");
  const [passworded, setPassworded] = useState(false);
  const [spectators, setSpectators] = useState(true);

  const filteredFriends = useMemo(() => {
    const q = friendQuery.toLowerCase();
    return mockFriends.filter((f) => f.name.toLowerCase().includes(q));
  }, [friendQuery]);

  const onlineCount = useMemo(() => mockFriends.filter((f) => f.online).length, []);
  const totalGamesPlayed = mockTotalGamesPlayed;

  // basic escape key handler for modal
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShowCreateModal(false);
    }
    if (showCreateModal) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showCreateModal]);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-gradient-to-b from-zinc-50 to-zinc-100 text-zinc-900 dark:from-zinc-950 dark:to-zinc-900 dark:text-zinc-100">
      {/* Navbar */}
      <nav className="flex h-14 items-center justify-between gap-4 border-b border-black/5 bg-white/60 px-4 backdrop-blur dark:border-white/10 dark:bg-zinc-900/60">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
            <FaDiceD20 className="h-5.5 w-5.5" aria-label="D20 logo" />
          </div>
          <span className="text-lg font-semibold tracking-wide">D100</span>
          <span className="hidden text-sm text-zinc-500 sm:inline">• Play with friends</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-lg px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer" aria-label="Docs">
            Lab
          </button>
          <button className="rounded-lg px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer" aria-label="Docs">
            Docs
          </button>
          <div className="ml-2 flex items-center gap-2 rounded-full bg-zinc-100 p-1.5 text-sm dark:bg-zinc-800 cursor-pointer" aria-label="User menu">
            <FaUserCircle className="h-6 w-6 text-zinc-600 dark:text-zinc-300" aria-label="User avatar" />
          </div>
        </div>
      </nav>

      {/* Content Area */}
      <main className="flex h-[calc(100vh-56px-40px)] w-full gap-3 p-3 pb-2">
        {/* Left: Leaderboard */}
        <div className="flex w-[22%] min-w-[260px] flex-col">
          <Card
            title="Leaderboard"
            right={<Pill className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">All-time</Pill>}
          >
            <ol className="space-y-2">
              {mockLeaderboard.map((p, idx) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-xl border border-black/5 bg-white/60 px-3 py-2 text-sm shadow-sm dark:border-white/10 dark:bg-zinc-900/60"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-zinc-200 text-xs font-bold dark:bg-zinc-700">
                      {idx + 1}
                    </span>
                    <div className="font-medium">{p.name}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Pill className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                      {p.wins} wins
                    </Pill>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        {/* Middle: Lobbies */}
        <div className="flex min-w-[420px] flex-1 flex-col">
          <Card
            title="Lobbies"
            right={
              <div className="inline-flex rounded-xl bg-zinc-100 p-1 text-sm dark:bg-zinc-800" role="tablist" aria-label="Lobby tabs">
                <button
                  role="tab"
                  aria-selected={tab === "your"}
                  onClick={() => setTab("your")}
                  className={`rounded-lg px-3 py-1.5 ${tab === "your" ? "bg-white shadow-sm dark:bg-zinc-900" : "opacity-70 hover:opacity-100"}`}
                >
                  Your Games
                </button>
                <button
                  role="tab"
                  aria-selected={tab === "spectate"}
                  onClick={() => setTab("spectate")}
                  className={`rounded-lg px-3 py-1.5 ${tab === "spectate" ? "bg-white shadow-sm dark:bg-zinc-900" : "opacity-70 hover:opacity-100"}`}
                >
                  Spectate
                </button>
              </div>
            }
          >
            <LobbyTable rows={tab === "your" ? mockYourLobbies : mockSpectate} spectate={tab === "spectate"} />
          </Card>
        </div>

        {/* Right: Friends + Create Game (in-card) */}
        <div className="flex w-[26%] min-w-[300px] flex-col">
          <Card
            title="Friends"
            right={<Pill className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">{mockFriends.filter(f => f.online).length} online</Pill>}
            className="mb-3"
          >
            <RightFriends friendQuery={friendQuery} setFriendQuery={setFriendQuery} filteredFriends={filteredFriends} />
          </Card>

          {/* Create a Game section with stats above a tall button */}
          <Card title="New Game" className="h-[38%]">
            <div className="flex h-full flex-col">
              {/* spacer; form is in modal */}
              <div className="flex-1" />

              {/* Stats row */}
              <div className="mb-2 flex items-center justify-between">
                <StatPill>
                  <span className="ml-1 text-base font-semibold">{onlineCount}</span>
                  <span className="ml-2 text-base opacity-70">online</span>
                </StatPill>
                <StatPill>
                  <span className="ml-1 text-base font-semibold">{totalGamesPlayed}</span>
                  <span className="ml-2 text-base opacity-70">total games</span>
                </StatPill>
              </div>

              {/* Big, tall button */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-auto inline-flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-600 px-4 text-xl font-semibold text-white shadow-lg hover:opacity-95 cursor-pointer"
                aria-haspopup="dialog"
                aria-controls="create-game-modal"
              >
                Create Lobby
              </button>
            </div>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="flex h-10 items-center justify-between border-t border-black/5 bg-white/60 px-4 text-xs text-zinc-500 backdrop-blur dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-400">
        <span>© {new Date().getFullYear()} D100 — Play with friends</span>
        <span className="hidden sm:inline">
          Made by{' '}
          <a 
            href="https://github.com/hpitta26" 
            target="_blank" 
            rel="noopener noreferrer"
            className="underline"
          >
            Henrique
          </a>
        </span>
      </footer>

      {/* Modal */}
      {showCreateModal && (
        <Modal onClose={() => setShowCreateModal(false)} title="Create a Game" id="create-game-modal">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Select label="Game" value={newGame} onChange={(v) => setNewGame(v)}>
              <option value="Catan">Catan</option>
              <option value="Chess">Chess</option>
              <option value="Azul">Azul</option>
              <option value="Carcassonne">Carcassonne</option>
            </Select>
            <Select label="Players" value={newPlayers} onChange={(v) => setNewPlayers(v)}>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
            </Select>
            <Checkbox id="pw" label="Password protected" checked={passworded} onChange={setPassworded} />
            <Checkbox id="spec" label="Allow spectators" checked={spectators} onChange={setSpectators} />
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setShowCreateModal(false)}
              className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                // TODO: call API to create the lobby
                // e.g., trpc.match.create.mutate({ gameId: newGame, seats: Number(newPlayers), passworded, spectators })
                setShowCreateModal(false);
              }}
              className="rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
            >
              Create Lobby
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/** ---------- Subcomponents ---------- */
function RightFriends({
  friendQuery,
  setFriendQuery,
  filteredFriends,
}: {
  friendQuery: string;
  setFriendQuery: (v: string) => void;
  filteredFriends: { id: string; name: string; online: boolean }[];
}) {
  return (
    <>
      <div className="mb-3 flex items-center gap-2">
        <div className="flex-1">
          <label htmlFor="friend-search" className="sr-only">
            Search friends
          </label>
          <input
            id="friend-search"
            value={friendQuery}
            onChange={(e) => setFriendQuery(e.target.value)}
            placeholder="Search friends…"
            className="w-full rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm outline-none ring-0 placeholder:text-zinc-400 focus:border-indigo-400 dark:border-white/10 dark:bg-zinc-900/70"
          />
        </div>
        <button
          className="rounded-xl border border-black/5 bg-white/60 px-3 py-2 text-sm shadow-sm hover:bg-white dark:border-white/10 dark:bg-zinc-900/60 dark:hover:bg-zinc-900"
          aria-label="Add friend"
        >
          ＋
        </button>
      </div>

      <ul className="space-y-2">
        {filteredFriends.map((f) => (
          <li
            key={f.id}
            className="flex items-center justify-between rounded-xl border border-black/5 bg-white/60 px-3 py-2 text-sm shadow-sm dark:border-white/10 dark:bg-zinc-900/60"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-8 w-8 select-none place-items-center rounded-full bg-gradient-to-tr from-indigo-400 to-cyan-400 font-semibold text-white">
                {f.name[0]}
              </span>
              <div>
                <div className="font-medium">{f.name}</div>
                <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                  <IconDot online={f.online} /> {f.online ? "Online" : "Offline"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="rounded-lg bg-zinc-100 px-2.5 py-1.5 text-xs hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700">
                Invite
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function LobbyTable({ rows, spectate }: LobbyTableProps) {
  return (
    <div className="min-h-0 overflow-auto">
      <table className="w-full table-fixed border-separate border-spacing-y-2 text-sm">
        <thead className="sticky top-0 z-10">
          <tr>
            <th className="rounded-l-lg bg-zinc-100 px-3 py-2 text-left font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              Lobby
            </th>
            <th className="bg-zinc-100 px-3 py-2 text-left font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              Game
            </th>
            <th className="bg-zinc-100 px-3 py-2 text-left font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              Players
            </th>
            <th className="bg-zinc-100 pl-1 py-2 text-left font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              Status
            </th>
            <th className="rounded-r-lg bg-zinc-100 px-3 py-2 text-right font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="rounded-l-xl border border-black/5 bg-white/60 px-3 py-2 dark:border-white/10 dark:bg-zinc-900/60">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-md bg-zinc-200 text-xs font-semibold dark:bg-zinc-700">
                    {r.id}
                  </span>
                  <span className="font-medium">Table {r.id}</span>
                  {r.password && <Pill className="bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">🔒</Pill>}
                </div>
              </td>
              <td className="border-y border-black/5 bg-white/60 px-3 py-2 dark:border-white/10 dark:bg-zinc-900/60">{r.game}</td>
              <td className="border-y border-black/5 bg-white/60 px-3 py-2 dark:border-white/10 dark:bg-zinc-900/60">
                {r.players}/{r.capacity}
              </td>
              <td className="border-y border-black/5 bg-white/60 px-3 py-2 dark:border-white/10 dark:bg-zinc-900/60">
                <StatusPill status={r.status} />
              </td>
              <td className="text-xs rounded-r-xl border border-black/5 bg-white/60 px-3 py-2 text-right dark:border-white/10 dark:bg-zinc-900/60">
                {spectate ? (
                  <button className="rounded-lg bg-zinc-100 px-3 py-1.5 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700">
                    Watch
                  </button>
                ) : (
                  <div className="flex justify-end gap-2">
                    <button className="rounded-lg bg-zinc-100 px-3 py-1.5 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700">
                      Join
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Select({ label, children, value, onChange }: SelectProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
      <select
        value={value as any}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-white/10 dark:bg-zinc-900/70"
      >
        {children}
      </select>
    </label>
  );
}

function Checkbox({ id, label, defaultChecked, checked, onChange }: CheckboxProps) {
  return (
    <label htmlFor={id} className="inline-flex cursor-pointer items-center gap-2 text-sm">
      <input
        id={id}
        type="checkbox"
        defaultChecked={defaultChecked}
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        className="h-4 w-4 rounded border-black/20 text-indigo-600 focus:ring-indigo-500 dark:border-white/20"
      />
      <span>{label}</span>
    </label>
  );
}

/** ---------- Modal ---------- */
function Modal({
  children,
  onClose,
  title,
  id,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  id: string;
}) {
  return (
    <div role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} id={id} className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* overlay */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      {/* panel */}
      <div className="relative z-10 w-full max-w-lg rounded-t-2xl border border-black/10 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-zinc-900 sm:rounded-2xl">
        <header className="mb-3 flex items-center justify-between">
          <h3 id={`${id}-title`} className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {title}
          </h3>
          <button onClick={onClose} aria-label="Close" className="rounded-lg px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            ✕
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
