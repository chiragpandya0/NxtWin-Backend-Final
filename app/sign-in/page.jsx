"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DarkVeil from "../components/DarkVeil";
import { signIn } from "../utils/auth";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await signIn({ email, password });
      router.push("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-black p-6">
      <div className="absolute inset-0 z-0">
        <DarkVeil hueShift={44} speed={2.8} scanlineFrequency={0.5} scanlineIntensity={0.8} warpAmount={1} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_40%,rgba(0,0,0,0.75)_100%)]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md shadow-2xl p-8 space-y-5">
          <div>
            <h1 className="text-xl font-semibold text-white">Sign in</h1>
            <p className="mt-1 text-sm text-gray-400">Trade with virtual funds. No real money involved.</p>
          </div>
          <Field id="email" label="Email" type="email" value={email} onChange={setEmail} setError={setError} autoFocus />
          <Field id="password" label="Password" type="password" value={password} onChange={setPassword} setError={setError} />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={busy} className="w-full h-11 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-500 transition-colors disabled:opacity-60">
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <p className="text-sm text-gray-400 text-center">
            New here? <Link href="/sign-up" className="text-emerald-400 hover:underline">Create an account</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

function Field({ id, label, type, value, onChange, setError, ...rest }) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm text-gray-300">{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => { onChange(e.target.value); setError(""); }}
        required
        className="w-full h-11 rounded-lg border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-emerald-500/40"
        {...rest}
      />
    </div>
  );
}
