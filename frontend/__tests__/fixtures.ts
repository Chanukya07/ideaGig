import type { Idea } from "@/lib/types";

export function makeIdea(overrides: Partial<Idea> = {}): Idea {
  return {
    id: "idea-1",
    title: "Commit Message Coach",
    pitch: "A CLI that scores your commit messages and suggests clearer rewrites.",
    problem_solved: "Vague commit messages make a project history unreadable.",
    target_users: "Students preparing GitHub profiles.",
    difficulty: "easy",
    estimated_hours: 12,
    stack: ["Python", "Typer"],
    scope_in: ["Score a message", "Suggest a rewrite", "Git hook installer"],
    scope_out: ["Web dashboard", "Team analytics"],
    milestones: [
      { title: "Parse commits", description: "Read the last 20 commits." },
      { title: "Score messages", description: "Apply rule-based scoring." },
      { title: "Suggest rewrites", description: "Show a diff for each rewrite." },
      { title: "Ship the hook", description: "Install as a commit-msg hook." },
    ],
    portfolio_tip: "Record a short terminal GIF for the README.",
    ...overrides,
  };
}

export const threeIdeas: Idea[] = [
  makeIdea(),
  makeIdea({ id: "idea-2", title: "Lecture Notes Search", difficulty: "medium", estimated_hours: 14 }),
  makeIdea({ id: "idea-3", title: "Laundry Wait Predictor", difficulty: "hard", estimated_hours: 30 }),
];
