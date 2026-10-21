"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DarkVeil from "../components/DarkVeil";
import { signIn } from "../utils/auth";

export default function SignInPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    try {
      signIn(name);
      router.push("/");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-black p-6">
      <div className="absolute inset-0 z-0">
        <DarkVeil
          hueShift={44}
          speed={2.8}
          scanlineFrequency={0.5}
          scanlineIntensity={0.8}
          warpAmount={1}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_40%,rgba(0,0,0,0.75)_100%)]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md shadow-2xl p-8 space-y-5"
        >
          <div>
            <h1 className="text-xl font-semibold text-white">Sign in</h1>
            <p className="mt-1 text-sm text-gray-400">
              Choose a username to trade with simulated funds. Signing in again
              with the same username returns to the same account.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="username" className="text-sm text-gray-300">
              Username
            </label>
            <input
              id="username"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              autoFocus
              maxLength={40}
              className="w-full h-11 rounded-lg border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-emerald-500/40"
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full h-11 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-500 transition-colors"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
