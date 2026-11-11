// An anonymous id for this browser. The backend scopes saved ideas to it, so
// each browser has its own list without accounts. It is not a login: clearing
// site data, or using another browser, starts a new empty list.

const STORAGE_KEY = "ideagig:client-id";
const VALID = /^[A-Za-z0-9_-]{16,64}$/;

let memoryId: string | null = null;

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function getClientId(): string {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && VALID.test(stored)) return stored;
    const id = createId();
    window.localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    // Storage blocked (private mode): keep one id for the life of the page.
    memoryId ??= createId();
    return memoryId;
  }
}
