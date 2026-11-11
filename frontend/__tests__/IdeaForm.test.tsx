import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IdeaForm } from "@/components/IdeaForm";
import { ApiError, generateIdeas } from "@/lib/api";
import { setIdeas } from "@/lib/session";

import { threeIdeas } from "./fixtures";

const push = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  generateIdeas: vi.fn(),
}));

const generateIdeasMock = vi.mocked(generateIdeas);

beforeEach(() => {
  push.mockReset();
  generateIdeasMock.mockReset();
  setIdeas(null);
});

describe("IdeaForm", () => {
  it("submits the chosen answers, stores the response, and goes to the results page", async () => {
    const user = userEvent.setup();
    generateIdeasMock.mockResolvedValue({ ideas: threeIdeas });
    render(<IdeaForm />);

    await user.click(screen.getByRole("button", { name: "Python" }));
    await user.type(screen.getByLabelText("Something else?"), "Rust{Enter}");
    await user.click(screen.getByRole("radio", { name: /A weekend/ }));
    await user.click(screen.getByRole("radio", { name: "Tools" }));
    await user.click(screen.getByRole("radio", { name: /Intermediate/ }));
    await user.click(screen.getByRole("button", { name: "Generate ideas" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/results"));
    expect(generateIdeasMock).toHaveBeenCalledWith({
      skills: ["Python", "Rust"],
      time_available: "weekend",
      interest: "tools",
      experience: "intermediate",
    });
    expect(JSON.parse(window.sessionStorage.getItem("ideagig:ideas") ?? "null")).toEqual(threeIdeas);
  });

  it("shows a loading skeleton while the request runs", async () => {
    const user = userEvent.setup();
    generateIdeasMock.mockReturnValue(new Promise(() => {}));
    render(<IdeaForm />);

    await user.click(screen.getByRole("button", { name: "SQL" }));
    await user.click(screen.getByRole("button", { name: "Generate ideas" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Drafting three ideas");
    expect(screen.queryByRole("button", { name: "Generate ideas" })).not.toBeInTheDocument();
  });

  it("asks for a skill instead of calling the API when none is picked", async () => {
    const user = userEvent.setup();
    render(<IdeaForm />);

    await user.click(screen.getByRole("button", { name: "Generate ideas" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Pick at least one skill");
    expect(generateIdeasMock).not.toHaveBeenCalled();
  });

  it("adds and removes custom skills, and renders them as plain text", async () => {
    const user = userEvent.setup();
    render(<IdeaForm />);
    const input = screen.getByLabelText("Something else?");

    await user.type(input, "<img src=x onerror=alert(1)>");
    await user.click(screen.getByRole("button", { name: "Add skill" }));

    const chip = screen.getByRole("button", { name: "Remove <img src=x onerror=alert(1)>" });
    expect(chip).toHaveTextContent("<img src=x onerror=alert(1)>");
    expect(document.querySelector("img")).toBeNull();
    expect(screen.getByText("1 of 10 selected.")).toBeInTheDocument();

    await user.click(chip);
    expect(screen.queryByRole("button", { name: /^Remove/ })).not.toBeInTheDocument();
    expect(screen.getByText("0 of 10 selected.")).toBeInTheDocument();
  });

  it("stops at ten skills", async () => {
    const user = userEvent.setup();
    render(<IdeaForm />);

    for (const skill of ["Python", "JavaScript", "TypeScript", "React", "SQL"]) {
      await user.click(screen.getByRole("button", { name: skill }));
    }
    for (const skill of ["Design", "Node.js", "Java", "C++", "Data analysis"]) {
      await user.click(screen.getByRole("button", { name: skill }));
    }
    await user.click(screen.getByRole("button", { name: "Machine learning" }));

    expect(screen.getByRole("alert")).toHaveTextContent("up to 10 skills");
    expect(screen.getByRole("button", { name: "Machine learning" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("brings the form back with the server's message when the request fails", async () => {
    const user = userEvent.setup();
    generateIdeasMock.mockRejectedValue(new ApiError(429, "The idea generator is busy right now."));
    render(<IdeaForm />);

    await user.click(screen.getByRole("button", { name: "Python" }));
    await user.click(screen.getByRole("button", { name: "Generate ideas" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("busy right now");
    expect(screen.getByRole("button", { name: "Python" })).toHaveAttribute("aria-pressed", "true");
    expect(push).not.toHaveBeenCalled();
  });
});
