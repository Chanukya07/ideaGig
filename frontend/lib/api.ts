import type {
  GenerateRequest,
  Idea,
  IdeaResponse,
  RegenerateMode,
  RegenerateRequest,
  SavedIdea,
} from "./types";

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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    });
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
  }
  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response));
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function post<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: "POST", body: JSON.stringify(body) });
}

export function generateIdeas(input: GenerateRequest): Promise<IdeaResponse> {
  return post<IdeaResponse>("/api/ideas/generate", input);
}

export function regenerateIdea(idea: Idea, mode: RegenerateMode): Promise<Idea> {
  const body: RegenerateRequest = { mode, idea };
  return post<Idea>(`/api/ideas/regenerate/${encodeURIComponent(idea.id)}`, body);
}

export function saveIdea(idea: Idea): Promise<SavedIdea> {
  return post<SavedIdea>("/api/saved", idea);
}

export function listSaved(): Promise<SavedIdea[]> {
  return request<SavedIdea[]>("/api/saved");
}

export function deleteSaved(id: number): Promise<void> {
  return request<void>(`/api/saved/${id}`, { method: "DELETE" });
}

export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : "Something went wrong. Please try again.";
}
