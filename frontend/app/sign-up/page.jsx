"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DarkVeil from "../components/DarkVeil";
import { signUp } from "../utils/auth";

export default function SignUpPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", dob: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); setError(""); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await signUp(form);
      router.push("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const input = "w-full h-11 rounded-lg border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-emerald-500/40";

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-black p-6">
      <div className="absolute inset-0 z-0">
        <DarkVeil hueShift={44} speed={2.8} scanlineFrequency={0.5} scanlineIntensity={0.8} warpAmount={1} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_40%,rgba(0,0,0,0.75)_100%)]" />
      </div>
      <div className="relative z-10 w-full max-w-md">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md shadow-2xl p-8 space-y-4">
          <div>
            <h1 className="text-xl font-semibold text-white">Create your account</h1>
            <p className="mt-1 text-sm text-gray-400">Free to play with £1,000 virtual funds. You must be 18 or over.</p>
          </div>
          <div className="space-y-1"><label className="text-sm text-gray-300">Name</label><input className={input} value={form.name} onChange={set("name")} required maxLength={60} /></div>
          <div className="space-y-1"><label className="text-sm text-gray-300">Email</label><input className={input} type="email" value={form.email} onChange={set("email")} required /></div>
          <div className="space-y-1"><label className="text-sm text-gray-300">Password (8+ characters)</label><input className={input} type="password" value={form.password} onChange={set("password")} required minLength={8} /></div>
          <div className="space-y-1"><label className="text-sm text-gray-300">Date of birth</label><input className={input} type="date" value={form.dob} onChange={set("dob")} required /></div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={busy} className="w-full h-11 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-500 transition-colors disabled:opacity-60">
            {busy ? "Creating…" : "Create account"}
          </button>
          <p className="text-sm text-gray-400 text-center">Already registered? <Link href="/sign-in" className="text-emerald-400 hover:underline">Sign in</Link></p>
        </form>
      </div>
    </div>
  );
}
