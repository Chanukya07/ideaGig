import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SavedPage from "@/app/saved/page";
import { ApiError, deleteSaved, listSaved, saveIdea } from "@/lib/api";
import type { SavedIdea } from "@/lib/types";

import { makeIdea } from "./fixtures";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  listSaved: vi.fn(),
  deleteSaved: vi.fn(),
  saveIdea: vi.fn(),
}));

const listSavedMock = vi.mocked(listSaved);
const deleteSavedMock = vi.mocked(deleteSaved);
const saveIdeaMock = vi.mocked(saveIdea);

const records: SavedIdea[] = [
  { id: 2, idea: makeIdea({ id: "b", title: "Lecture Notes Search" }), created_at: "2026-11-11T12:00:00Z" },
  { id: 1, idea: makeIdea({ id: "a", title: "Commit Message Coach" }), created_at: "2026-11-10T12:00:00Z" },
];

beforeEach(() => {
  listSavedMock.mockReset();
  deleteSavedMock.mockReset();
  saveIdeaMock.mockReset();
});

describe("SavedPage", () => {
  it("lists saved ideas with their saved date", async () => {
    listSavedMock.mockResolvedValue(records);
    render(<SavedPage />);

    expect(screen.getByText("Loading saved ideas…")).toBeInTheDocument();
    const cards = await screen.findAllByRole("article");
    expect(cards).toHaveLength(2);
    expect(within(cards[0]!).getByRole("heading", { name: "Lecture Notes Search" })).toBeInTheDocument();
    expect(within(cards[0]!).getByText("Saved Nov 11, 2026")).toBeInTheDocument();
    expect(screen.getByText(/2 saved ideas/)).toBeInTheDocument();
  });

  it("shows an empty state with a way forward", async () => {
    listSavedMock.mockResolvedValue([]);
    render(<SavedPage />);

    expect(await screen.findByText(/Nothing saved yet/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Generate ideas" })).toHaveAttribute("href", "/");
  });

  it("deletes an idea and can undo it", async () => {
    const user = userEvent.setup();
    listSavedMock.mockResolvedValue(records);
    deleteSavedMock.mockResolvedValue(undefined);
    saveIdeaMock.mockResolvedValue({ ...records[1]!, id: 3 });
    render(<SavedPage />);

    await user.click(await screen.findByRole("button", { name: "Delete Commit Message Coach" }));

    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(1));
    expect(deleteSavedMock).toHaveBeenCalledWith(1);
    expect(screen.getByText("Deleted “Commit Message Coach”.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Undo" }));

    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(2));
    expect(saveIdeaMock).toHaveBeenCalledWith(records[1]!.idea);
    expect(screen.queryByRole("button", { name: "Undo" })).not.toBeInTheDocument();
  });

  it("keeps the card and explains when delete fails", async () => {
    const user = userEvent.setup();
    listSavedMock.mockResolvedValue(records);
    deleteSavedMock.mockRejectedValue(new ApiError(0, "Can't reach the server."));
    render(<SavedPage />);

    await user.click(await screen.findByRole("button", { name: "Delete Lecture Notes Search" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Can't reach the server.");
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("offers a retry when the list fails to load", async () => {
    const user = userEvent.setup();
    listSavedMock.mockRejectedValueOnce(new ApiError(0, "Can't reach the server."));
    listSavedMock.mockResolvedValueOnce(records);
    render(<SavedPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Can't reach the server.");
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findAllByRole("article")).toHaveLength(2);
  });
});
