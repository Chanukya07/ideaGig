import type {
  GenerateRequest,
  Idea,
  IdeaResponse,
  RegenerateMode,
  RegenerateRequest,
  SavedIdea,
} from "./types";

import { getClientId } from "./client-id";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const FALLBACK_MESSAGES: Record<number, string> = {
  422: "Some of those answers were not accepted. Check the form and try again.",
  429: "Too many requests. Wait a minute, then try again.",
};

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null && "detail" in body) {
      const { detail } = body as { detail: unknown };
      if (typeof detail === "string" && detail.trim()) return detail;
    }
  } catch {
    // Not JSON; fall through to the generic message.
  }
  return FALLBACK_MESSAGES[response.status] ?? "Something went wrong. Please try again.";
}

// The backend allows 30 s per LLM call and may make two, so wait a little longer.
export const REQUEST_TIMEOUT_MS = 75_000;

async function request<T>(path: string, init: RequestInit = {}, asClient = false): Promise<T> {
  const headers: Record<string, string> = {};
  if (init.body) headers["Content-Type"] = "application/json";
  // Saved ideas are scoped to this browser by an anonymous id.
  if (asClient) headers["X-Client-Id"] = getClientId();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers, signal: controller.signal });
  } catch {
    throw new ApiError(
      0,
      controller.signal.aborted
        ? "That took too long. Please try again."
        : "Can't reach the server. Check your connection and try again.",
    );
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response));
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function post<T>(path: string, body: unknown, asClient = false): Promise<T> {
  return request<T>(path, { method: "POST", body: JSON.stringify(body) }, asClient);
}

export function generateIdeas(input: GenerateRequest): Promise<IdeaResponse> {
  return post<IdeaResponse>("/api/ideas/generate", input);
}

export function regenerateIdea(idea: Idea, mode: RegenerateMode): Promise<Idea> {
  const body: RegenerateRequest = { mode, idea };
  return post<Idea>(`/api/ideas/regenerate/${encodeURIComponent(idea.id)}`, body);
}

export function saveIdea(idea: Idea): Promise<SavedIdea> {
  return post<SavedIdea>("/api/saved", idea, true);
}

export function listSaved(): Promise<SavedIdea[]> {
  return request<SavedIdea[]>("/api/saved", {}, true);
}

export function deleteSaved(id: number): Promise<void> {
  return request<void>(`/api/saved/${id}`, { method: "DELETE" }, true);
}

export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : "Something went wrong. Please try again.";
}
