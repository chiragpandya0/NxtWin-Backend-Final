// Same-origin by default: nginx (production) or next.config.mjs rewrites (dev) forward /api and
// /socket.io to the backend. Set NEXT_PUBLIC_API_URL only to point at a different host.
export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

const TOKEN_KEY = "gaffr_token";

export const getToken = () => {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token) => {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {}
};

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// JSON request with the bearer token attached when signed in.
export async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = auth ? getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {}
  if (!res.ok) {
    throw new ApiError(
      data?.details?.join?.(", ") || data?.error || `HTTP ${res.status}`,
      res.status,
      data?.code
    );
  }
  return data;
}

// Shape a market for the existing list/home cards.
export const toCard = (m) => ({
  id: m.id,
  question: m.title,
  category: m.stat.replace(/_/g, " "),
  optionA: "Yes",
  optionB: "No",
  yesPrice: m.yesPrice,
  volume: (m.volumePence || 0) / 100,
  deadline: new Date(m.kickoff).toLocaleString(),
  kickoff: m.kickoff,
  gameweek: m.gameweek,
  image: null,
  status: m.status === "open" ? "active" : m.status,
  resolution: m.resolution,
});

export const api = {
  signup: (b) => request("/api/auth/signup", { method: "POST", body: b, auth: false }),
  login: (b) => request("/api/auth/login", { method: "POST", body: b, auth: false }),
  me: () => request("/api/auth/me"),
  markets: (qs = "") => request(`/api/markets${qs}`, { auth: false }),
  market: (id) => request(`/api/markets/${id}`, { auth: false }),
  history: (id) => request(`/api/markets/${id}/history`, { auth: false }),
  leaderboard: (gw) => request(`/api/leaderboard${gw ? `?gameweek=${gw}` : ""}`, { auth: false }),
  quote: (b) => request("/api/trade/quote", { method: "POST", body: b }),
  trade: (b) => request("/api/trade/execute", { method: "POST", body: b }),
  accaQuote: (b) => request("/api/accas/quote", { method: "POST", body: b }),
  accaPlace: (b) => request("/api/accas", { method: "POST", body: b }),
  accaSell: (id) => request(`/api/accas/${id}/sell`, { method: "POST" }),
  portfolio: () => request("/api/portfolio"),
  ledger: () => request("/api/ledger"),
  topUp: () => request("/api/wallet/top-up", { method: "POST" }),
  admin: {
    get: (p) => request(`/api/admin${p}`),
    post: (p, body = {}) => request(`/api/admin${p}`, { method: "POST", body }),
    put: (p, body) => request(`/api/admin${p}`, { method: "PUT", body }),
  },
};
