"use client";

import { useEffect, useState } from "react";
import { api, getToken, setToken } from "./api";

const EVENT = "gaffr-auth-change";
let cached = null;

const emit = () => window.dispatchEvent(new Event(EVENT));

// Shape kept compatible with the fields the app read before (id, fullName, firstName, ...).
const toUser = (u) =>
  u && {
    id: u.id,
    fullName: u.name,
    firstName: u.name?.split(" ")[0] || u.name,
    username: u.name,
    email: u.email,
    role: u.role,
    isAdmin: u.role === "admin",
    balancePence: u.balancePence,
  };

export async function signUp({ email, password, name, dob }) {
  const { token, user } = await api.signup({ email, password, name, dob });
  setToken(token);
  cached = user;
  emit();
  return toUser(user);
}

export async function signIn({ email, password }) {
  const { token, user } = await api.login({ email, password });
  setToken(token);
  cached = user;
  emit();
  return toUser(user);
}

export function signOut() {
  setToken(null);
  cached = null;
  emit();
}

// Re-read the profile (e.g. after a balance change).
export async function refreshUser() {
  if (!getToken()) return null;
  try {
    const { user } = await api.me();
    cached = user;
    emit();
    return toUser(user);
  } catch (e) {
    if (e.status === 401) signOut();
    return null;
  }
}

export function useUser() {
  const [state, setState] = useState({ user: null, isLoaded: false });

  useEffect(() => {
    let alive = true;
    const sync = () => alive && setState({ user: toUser(cached), isLoaded: true });
    const load = async () => {
      if (!getToken()) {
        cached = null;
        return sync();
      }
      if (!cached) {
        try {
          cached = (await api.me()).user;
        } catch (e) {
          if (e.status === 401) setToken(null);
          cached = null;
        }
      }
      sync();
    };
    load();
    window.addEventListener(EVENT, sync);
    return () => {
      alive = false;
      window.removeEventListener(EVENT, sync);
    };
  }, []);

  return {
    user: state.user,
    isLoaded: state.isLoaded,
    isSignedIn: !!state.user,
    isAdmin: !!state.user?.isAdmin,
  };
}
