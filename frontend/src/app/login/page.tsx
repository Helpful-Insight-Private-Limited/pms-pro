"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BarChart3, CheckCircle2, FolderKanban, LockKeyhole, LogIn, Mail, ShieldCheck } from "lucide-react";
import { api, saveSession } from "@/lib/api";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("ChangeMeStrong123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await api.auth.login({ email, password });
      saveSession(data);
      router.push(searchParams.get("next") || "/dashboard");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen grid-cols-1 bg-[#f4f7fb] text-[#111827] lg:grid-cols-[1fr_500px]">
      <section className="hidden bg-[#111827] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-md bg-[#f4c430] text-xl font-black text-[#111827]">P</div>
            <div>
              <div className="text-sm font-semibold uppercase text-[#f4c430]">Project OS</div>
              <div className="text-xl font-semibold">PMS Workspace</div>
            </div>
          </div>
          <h1 className="mt-10 max-w-3xl text-5xl font-semibold leading-tight">Plan, ship, audit, and report software delivery from one controlled workspace.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/65">Built for admins, project managers, team leaders, and developers with role-aware dashboards, costing, activity logs, and team operations.</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Projects", icon: FolderKanban },
            { label: "Reports", icon: BarChart3 },
            { label: "Security", icon: ShieldCheck }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-md border border-white/10 bg-white/5 p-4">
                <Icon className="h-5 w-5 text-[#f4c430]" />
                <div className="mt-3 text-sm font-semibold">{item.label}</div>
              </div>
            );
          })}
        </div>
      </section>
      <section className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm rounded-md border border-[#d7dde8] bg-white p-6 shadow-sm">
          <div className="mb-6">
            <div className="inline-flex h-8 items-center gap-2 rounded-md bg-[#fff5cc] px-2 text-xs font-semibold text-[#7a5a00]">
              <CheckCircle2 className="h-4 w-4" />
              Secure workspace
            </div>
            <div className="mt-4 text-2xl font-semibold">Sign in</div>
            <div className="mt-1 text-sm text-[#667085]">Use your PMS account credentials.</div>
          </div>
          <label className="mb-4 block">
            <span className="mb-2 block text-sm font-medium">Email</span>
            <span className="flex h-11 items-center gap-2 rounded-md border border-[#d7dde8] px-3 focus-within:border-[#2563eb]">
              <Mail className="h-4 w-4 text-[#667085]" />
              <input className="w-full outline-none" value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
            </span>
          </label>
          <label className="mb-4 block">
            <span className="mb-2 block text-sm font-medium">Password</span>
            <span className="flex h-11 items-center gap-2 rounded-md border border-[#d7dde8] px-3 focus-within:border-[#2563eb]">
              <LockKeyhole className="h-4 w-4 text-[#667085]" />
              <input className="w-full outline-none" value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
            </span>
          </label>
          {error ? <div className="mb-4 rounded-md border border-[#f3b4b4] bg-[#fff1f1] p-3 text-sm text-[#b42318]">{error}</div> : null}
          <button disabled={loading} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#2563eb] px-4 text-sm font-semibold text-white disabled:opacity-60">
            <LogIn className="h-4 w-4" />
            {loading ? "Signing in..." : "Sign in"}
          </button>
          <div className="mt-4 rounded-md bg-[#f4f7fb] p-3 text-xs text-[#667085]">Default seed: admin@example.com / ChangeMeStrong123</div>
        </form>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#f4f7fb]" />}>
      <LoginForm />
    </Suspense>
  );
}
