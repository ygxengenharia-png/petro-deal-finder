const KEY = "rankingplay:auth:v1";
const USER = "YGX2026";
const PASS = "250803";

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY) === "1";
}

export function login(user: string, pass: string): boolean {
  if (user.trim() === USER && pass === PASS) {
    localStorage.setItem(KEY, "1");
    return true;
  }
  return false;
}

export function logout() {
  localStorage.removeItem(KEY);
}
