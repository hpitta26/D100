"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FaDiceD20 } from "react-icons/fa";
import { API_URL } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("test@example.com"); // demo default
  const [password, setPassword] = useState("good_password.123");   // demo default
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // include httpOnly cookie
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Invalid credentials");
      }

      // success: go home
      router.replace("/");
    } catch (err: any) {
      setError(err.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
      <div className="w-full max-w-md rounded-2xl border border-black/5 bg-white/80 p-6 shadow-2xl backdrop-blur dark:border-white/10 dark:bg-zinc-900/70">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
            <FaDiceD20 className="h-5 w-5" aria-label="D20 logo" />
          </div>
          <div>
            <div className="text-base font-semibold">D100</div>
            <div className="text-xs text-zinc-500">Play with friends</div>
          </div>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-zinc-600 dark:text-zinc-300">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 outline-none focus:border-indigo-400 dark:border-white/10 dark:bg-zinc-900/70"
              placeholder="you@example.com"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-zinc-600 dark:text-zinc-300">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 outline-none focus:border-indigo-400 dark:border-white/10 dark:bg-zinc-900/70"
              placeholder="••••••••"
            />
          </label>

          {error && (
            <div className="rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-700 dark:bg-rose-900/40 dark:text-rose-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-600 px-4 py-3 text-sm font-semibold text-white shadow hover:opacity-95 disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-zinc-500">
          Demo user: <code>test@example.com</code> / <code>good_password.123</code>
        </div>
      </div>
    </div>
  );
}
