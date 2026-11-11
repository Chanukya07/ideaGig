import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ResultsPage from "@/app/results/page";
import { regenerateIdea, saveIdea } from "@/lib/api";
import { setIdeas } from "@/lib/session";

import { makeIdea, threeIdeas } from "./fixtures";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  regenerateIdea: vi.fn(),
  saveIdea: vi.fn(),
}));

const regenerateIdeaMock = vi.mocked(regenerateIdea);
const saveIdeaMock = vi.mocked(saveIdea);

beforeEach(() => {
  regenerateIdeaMock.mockReset();
  saveIdeaMock.mockReset();
  setIdeas(null);
});

describe("ResultsPage", () => {
  it("renders three cards with title, pitch, difficulty, hours, and stack", () => {
    setIdeas(threeIdeas);
    render(<ResultsPage />);

    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(3);

    const first = within(cards[0]!);
    expect(first.getByRole("heading", { name: "Commit Message Coach" })).toBeInTheDocument();
    expect(first.getByText(/scores your commit messages/)).toBeInTheDocument();
    expect(first.getByText("Easy")).toBeInTheDocument();
    expect(first.getByText("12")).toBeInTheDocument();
    expect(first.getByText("Typer")).toBeInTheDocument();
    for (const name of ["Make harder", "Make easier", "Swap stack", "Save"]) {
      expect(first.getByRole("button", { name })).toBeInTheDocument();
    }
    expect(within(cards[2]!).getByText("Hard")).toBeInTheDocument();
  });

  it("expands and collapses the milestones", async () => {
    const user = userEvent.setup();
    setIdeas(threeIdeas);
    render(<ResultsPage />);
    const card = within(screen.getAllByRole("article")[0]!);
    const toggle = card.getByRole("button", { name: /Milestones/ });

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(card.queryByText("Parse commits")).not.toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(card.getByText("Parse commits")).toBeInTheDocument();

    await user.click(toggle);
    expect(card.queryByText("Parse commits")).not.toBeInTheDocument();
  });

  it("replaces a card with the regenerated idea", async () => {
    const user = userEvent.setup();
    const harder = makeIdea({ id: "idea-9", title: "Commit Coach with Fine-Tuning", difficulty: "hard" });
    regenerateIdeaMock.mockResolvedValue(harder);
    setIdeas(threeIdeas);
    render(<ResultsPage />);

    await user.click(
      within(screen.getAllByRole("article")[0]!).getByRole("button", { name: "Make harder" }),
    );

    expect(await screen.findByRole("heading", { name: harder.title })).toBeInTheDocument();
    expect(regenerateIdeaMock).toHaveBeenCalledWith(threeIdeas[0], "harder");
    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(screen.queryByRole("heading", { name: "Commit Message Coach" })).not.toBeInTheDocument();
  });

  it("saves an idea and marks it as saved", async () => {
    const user = userEvent.setup();
    saveIdeaMock.mockResolvedValue({ id: 1, idea: threeIdeas[1]!, created_at: "2026-11-11T10:00:00Z" });
    setIdeas(threeIdeas);
    render(<ResultsPage />);
    const card = within(screen.getAllByRole("article")[1]!);

    await user.click(card.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(card.getByRole("button", { name: "Saved" })).toBeInTheDocument());
    expect(saveIdeaMock).toHaveBeenCalledWith(threeIdeas[1]);
  });

  it("shows an empty state when there are no ideas", () => {
    render(<ResultsPage />);

    expect(screen.getByRole("heading", { name: "No ideas here yet" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start with your skills" })).toHaveAttribute("href", "/");
  });
});
