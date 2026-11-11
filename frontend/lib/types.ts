// Mirrors backend/app/schemas.py. Keep the two files in step.

export const SUGGESTED_SKILLS = [
  "Python",
  "JavaScript",
  "TypeScript",
  "React",
  "SQL",
  "Data analysis",
  "Machine learning",
  "Design",
  "Node.js",
  "Java",
  "C++",
] as const;

export const MAX_SKILLS = 10;
export const MAX_SKILL_LENGTH = 40;

export type TimeAvailable = "weekend" | "two_weeks" | "one_month";
export type Interest = "ai" | "web" | "data" | "games" | "tools";
export type Experience = "beginner" | "intermediate" | "advanced";
export type Difficulty = "easy" | "medium" | "hard";
export type RegenerateMode = "harder" | "easier" | "swap_stack";

export interface GenerateRequest {
  skills: string[];
  time_available: TimeAvailable;
  interest: Interest;
  experience: Experience;
}

export interface Milestone {
  title: string;
  description: string;
}

export interface Idea {
  id: string;
  title: string;
  pitch: string;
  problem_solved: string;
  target_users: string;
  difficulty: Difficulty;
  estimated_hours: number;
  stack: string[];
  scope_in: string[];
  scope_out: string[];
  milestones: Milestone[];
  portfolio_tip: string;
}

export interface IdeaResponse {
  ideas: Idea[];
}

export interface RegenerateRequest {
  mode: RegenerateMode;
  idea: Idea;
}

export interface SavedIdea {
  id: number;
  idea: Idea;
  created_at: string;
}
