"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "nxtwin_user";
const EVENT = "nxtwin-auth-change";

export const ADMIN_ID = process.env.NEXT_PUBLIC_ADMIN_ID || "user_admin";

const slugify = (name) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const read = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// Shape mirrors the fields the app previously read from Clerk's user object
const toUser = (stored) =>
  stored && {
    id: stored.id,
    fullName: stored.name,
    firstName: stored.name,
    username: stored.name,
    primaryEmailAddress: { emailAddress: stored.email },
  };

export function signIn(name) {
  const slug = slugify(name);
  if (!slug) throw new Error("Enter a username");
  const stored = {
    id: `user_${slug}`,
    name: name.trim(),
    email: `${slug}@nxtwin.local`,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  window.dispatchEvent(new Event(EVENT));
  return toUser(stored);
}

export function signOut() {
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(EVENT));
}

export function useUser() {
  const [state, setState] = useState({ user: null, isLoaded: false });

  useEffect(() => {
    const sync = () => setState({ user: toUser(read()), isLoaded: true });
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return {
    user: state.user,
    isLoaded: state.isLoaded,
    isSignedIn: !!state.user,
  };
}
