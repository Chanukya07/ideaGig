import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ApiError,
  REQUEST_TIMEOUT_MS,
  deleteSaved,
  errorMessage,
  generateIdeas,
  listSaved,
  regenerateIdea,
  saveIdea,
} from "@/lib/api";

import { makeIdea, threeIdeas } from "./fixtures";

const fetchMock = vi.fn<typeof fetch>();

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function lastCall(): { url: string; init: RequestInit; headers: Record<string, string> } {
  const [url, init] = fetchMock.mock.calls.at(-1)!;
  return {
    url: String(url),
    init: init ?? {},
    headers: (init?.headers ?? {}) as Record<string, string>,
  };
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  window.localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("api client", () => {
  it("posts the generate request as JSON", async () => {
    fetchMock.mockResolvedValue(json({ ideas: threeIdeas }));
    const input = {
      skills: ["Python"],
      time_available: "weekend",
      interest: "tools",
      experience: "beginner",
    } as const;

    await expect(generateIdeas({ ...input, skills: ["Python"] })).resolves.toEqual({
      ideas: threeIdeas,
    });

    const { url, init, headers } = lastCall();
    expect(url).toBe("http://localhost:8000/api/ideas/generate");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual(input);
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["X-Client-Id"]).toBeUndefined();
  });

  it("sends the whole idea when regenerating and encodes the id in the path", async () => {
    const idea = makeIdea({ id: "a/b" });
    fetchMock.mockResolvedValue(json(makeIdea({ id: "new" })));

    await regenerateIdea(idea, "swap_stack");

    const { url, init } = lastCall();
    expect(url).toBe("http://localhost:8000/api/ideas/regenerate/a%2Fb");
    expect(JSON.parse(String(init.body))).toEqual({ mode: "swap_stack", idea });
  });

  it("sends one stable client id on every saved-ideas call", async () => {
    fetchMock.mockImplementation(async () => json([]));
    await listSaved();
    const first = lastCall().headers["X-Client-Id"];
    await saveIdea(makeIdea());
    const second = lastCall().headers["X-Client-Id"];
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(deleteSaved(7)).resolves.toBeUndefined();
    const third = lastCall();

    expect(first).toMatch(/^[A-Za-z0-9_-]{16,64}$/);
    expect(second).toBe(first);
    expect(third.headers["X-Client-Id"]).toBe(first);
    expect(third.url).toBe("http://localhost:8000/api/saved/7");
    expect(third.init.method).toBe("DELETE");
    expect(window.localStorage.getItem("ideagig:client-id")).toBe(first);
  });

  it("surfaces the server's detail message", async () => {
    fetchMock.mockResolvedValue(json({ detail: "The idea generator is busy right now." }, 429));

    const error = await listSaved().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(429);
    expect(errorMessage(error)).toBe("The idea generator is busy right now.");
  });

  it("uses a plain message when validation details are not a string", async () => {
    fetchMock.mockResolvedValue(json({ detail: [{ loc: ["body", "skills"], msg: "bad" }] }, 422));

    await expect(listSaved()).rejects.toThrow("Some of those answers were not accepted");
  });

  it("uses a generic message when the error body is not JSON", async () => {
    fetchMock.mockResolvedValue(new Response("<html>Bad gateway</html>", { status: 502 }));

    await expect(listSaved()).rejects.toThrow("Something went wrong. Please try again.");
  });

  it("reports a network failure", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    const error = await listSaved().catch((caught: unknown) => caught);

    expect((error as ApiError).status).toBe(0);
    expect(errorMessage(error)).toContain("Can't reach the server");
  });

  it("gives up after the timeout", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    );

    const pending = listSaved().catch((caught: unknown) => caught);
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);

    expect(errorMessage(await pending)).toBe("That took too long. Please try again.");
  });

  it("falls back to a generic message for unknown errors", () => {
    expect(errorMessage(new Error("boom"))).toBe("Something went wrong. Please try again.");
  });
});
