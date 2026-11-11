"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import { errorMessage, generateIdeas } from "@/lib/api";
import { setIdeas } from "@/lib/session";
import {
  MAX_SKILLS,
  MAX_SKILL_LENGTH,
  SUGGESTED_SKILLS,
  type Experience,
  type Interest,
  type TimeAvailable,
} from "@/lib/types";

import { Button } from "./Button";
import { useMotionPresets } from "./motion";
import { ResultsSkeleton } from "./Skeleton";

interface Option<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

const TIME_OPTIONS: Option<TimeAvailable>[] = [
  { value: "weekend", label: "A weekend", hint: "About 8–16 hours" },
  { value: "two_weeks", label: "Two weeks", hint: "About 20–40 hours" },
  { value: "one_month", label: "One month", hint: "About 40–80 hours" },
];

const INTEREST_OPTIONS: Option<Interest>[] = [
  { value: "ai", label: "AI" },
  { value: "web", label: "Web" },
  { value: "data", label: "Data" },
  { value: "games", label: "Games" },
  { value: "tools", label: "Tools" },
];

const EXPERIENCE_OPTIONS: Option<Experience>[] = [
  { value: "beginner", label: "Beginner", hint: "Done tutorials" },
  { value: "intermediate", label: "Intermediate", hint: "Built small projects" },
  { value: "advanced", label: "Advanced", hint: "Shipped real apps" },
];

const sameSkill = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

function RadioGroup<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  columns,
}: {
  legend: string;
  name: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  columns: string;
}) {
  return (
    <fieldset>
      <legend className="font-display text-base font-bold text-ink">{legend}</legend>
      <div className={`mt-3 grid gap-2 ${columns}`}>
        {options.map((option) => (
          <label
            key={option.value}
            className="group flex min-h-11 cursor-pointer items-center gap-2.5 rounded-control border border-line bg-surface px-3 py-2 transition-colors hover:border-ink-soft has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className="flex size-4 shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink-soft bg-surface group-has-[:checked]:border-accent"
            >
              <span className="size-2 rounded-full bg-accent opacity-0 group-has-[:checked]:opacity-100" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink">{option.label}</span>
              {option.hint && <span className="block text-xs text-ink-soft">{option.hint}</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function IdeaForm() {
  const router = useRouter();
  const m = useMotionPresets();
  const skillsHintId = useId();
  const skillsErrorId = useId();
  const customInputId = useId();
  const firstChipRef = useRef<HTMLButtonElement>(null);

  const [skills, setSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState("");
  const [timeAvailable, setTimeAvailable] = useState<TimeAvailable>("two_weeks");
  const [interest, setInterest] = useState<Interest>("web");
  const [experience, setExperience] = useState<Experience>("beginner");
  const [skillsError, setSkillsError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const customSkills = skills.filter(
    (skill) => !SUGGESTED_SKILLS.some((suggested) => sameSkill(suggested, skill)),
  );
  const atLimit = skills.length >= MAX_SKILLS;
  const limitMessage = `You can pick up to ${MAX_SKILLS} skills. Remove one to add another.`;

  function addSkill(skill: string) {
    if (skills.some((existing) => sameSkill(existing, skill))) return;
    if (atLimit) {
      setSkillsError(limitMessage);
      return;
    }
    setSkills([...skills, skill]);
    setSkillsError(null);
  }

  function removeSkill(skill: string) {
    setSkills(skills.filter((existing) => !sameSkill(existing, skill)));
    setSkillsError(null);
  }

  function toggleSkill(skill: string) {
    if (skills.some((existing) => sameSkill(existing, skill))) removeSkill(skill);
    else addSkill(skill);
  }

  function addCustomSkill() {
    const name = customSkill.trim().replace(/\s+/g, " ");
    if (!name) return;
    // Typing a suggested skill selects that chip instead of creating a twin.
    const suggested = SUGGESTED_SKILLS.find((skill) => sameSkill(skill, name));
    addSkill(suggested ?? name);
    if (!atLimit) setCustomSkill("");
  }

  function handleCustomKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault(); // Enter adds the skill; it must not submit the form.
      addCustomSkill();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    if (skills.length === 0) {
      setSkillsError("Pick at least one skill so the ideas match what you know.");
      firstChipRef.current?.focus();
      return;
    }
    setSubmitError(null);
    setLoading(true);
    try {
      const response = await generateIdeas({
        skills,
        time_available: timeAvailable,
        interest,
        experience,
      });
      setIdeas(response.ideas);
      router.push("/results"); // Keep the skeleton up until the results page takes over.
    } catch (error) {
      setSubmitError(errorMessage(error));
      setLoading(false);
    }
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {loading ? (
        <motion.div key="loading" variants={m.fade} initial="hidden" animate="show" exit="exit">
          <ResultsSkeleton label="Drafting three ideas for you…" />
        </motion.div>
      ) : (
        <motion.div key="form" variants={m.fade} initial={false} animate="show" exit="exit">
          <motion.form
            noValidate
            onSubmit={handleSubmit}
            variants={m.stagger}
            initial="hidden"
            animate="show"
            aria-label="Project preferences"
            className="space-y-8 rounded-card border border-line bg-surface p-5 shadow-card sm:p-8"
          >
            <motion.fieldset
              variants={m.fadeUp}
              aria-describedby={`${skillsHintId}${skillsError ? ` ${skillsErrorId}` : ""}`}
            >
              <legend className="font-display text-base font-bold text-ink">
                What can you already use?
              </legend>
              <p id={skillsHintId} className="mt-1 text-sm text-ink-soft">
                Pick up to {MAX_SKILLS}.{" "}
                <span aria-live="polite">
                  {skills.length} of {MAX_SKILLS} selected.
                </span>
              </p>

              <ul className="mt-3 flex flex-wrap gap-2">
                {SUGGESTED_SKILLS.map((skill, index) => {
                  const selected = skills.includes(skill);
                  return (
                    <li key={skill}>
                      <motion.button
                        ref={index === 0 ? firstChipRef : undefined}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggleSkill(skill)}
                        whileTap={m.tap}
                        className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors ${
                          selected
                            ? "border-accent bg-accent-soft text-accent-strong"
                            : "border-line bg-surface text-ink hover:border-ink-soft"
                        }`}
                      >
                        {selected && (
                          <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5">
                            <path
                              d="M3 8.5l3.2 3L13 4.8"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                        {skill}
                      </motion.button>
                    </li>
                  );
                })}
                <AnimatePresence initial={false}>
                  {customSkills.map((skill) => (
                    <motion.li
                      key={skill.toLowerCase()}
                      layout="position"
                      variants={m.chip}
                      initial="hidden"
                      animate="show"
                      exit="exit"
                    >
                      {/* Custom text is rendered as a text node, so React escapes it. */}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        aria-label={`Remove ${skill}`}
                        className="inline-flex min-h-10 max-w-full items-center gap-1.5 rounded-full border border-accent bg-accent-soft px-3.5 text-sm font-medium text-accent-strong"
                      >
                        <span className="break-all">{skill}</span>
                        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5 shrink-0">
                          <path
                            d="M4 4l8 8M12 4l-8 8"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>

              <div className="mt-4">
                <label htmlFor={customInputId} className="text-sm font-semibold text-ink">
                  Something else?
                </label>
                <div className="mt-1.5 flex gap-2">
                  <input
                    id={customInputId}
                    type="text"
                    value={customSkill}
                    onChange={(event) => setCustomSkill(event.target.value)}
                    onKeyDown={handleCustomKeyDown}
                    maxLength={MAX_SKILL_LENGTH}
                    placeholder="e.g. Rust, Figma, Docker"
                    autoComplete="off"
                    className="min-h-11 w-full min-w-0 rounded-control border border-line bg-surface px-3.5 text-[0.95rem] text-ink placeholder:text-ink-soft/70 hover:border-ink-soft"
                  />
                  <Button onClick={addCustomSkill} className="shrink-0">
                    Add skill
                  </Button>
                </div>
              </div>

              {skillsError && (
                <p id={skillsErrorId} role="alert" className="mt-3 text-sm font-medium text-danger">
                  {skillsError}
                </p>
              )}
            </motion.fieldset>

            <motion.div variants={m.fadeUp}>
              <RadioGroup
                legend="How much time do you have?"
                name="time_available"
                options={TIME_OPTIONS}
                value={timeAvailable}
                onChange={setTimeAvailable}
                columns="sm:grid-cols-3"
              />
            </motion.div>

            <motion.div variants={m.fadeUp}>
              <RadioGroup
                legend="What do you want to build?"
                name="interest"
                options={INTEREST_OPTIONS}
                value={interest}
                onChange={setInterest}
                columns="grid-cols-3 sm:grid-cols-5"
              />
            </motion.div>

            <motion.div variants={m.fadeUp}>
              <RadioGroup
                legend="How experienced are you?"
                name="experience"
                options={EXPERIENCE_OPTIONS}
                value={experience}
                onChange={setExperience}
                columns="sm:grid-cols-3"
              />
            </motion.div>

            <motion.div variants={m.fadeUp} className="border-t border-line pt-6">
              {submitError && (
                <p
                  role="alert"
                  className="mb-4 rounded-control bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger"
                >
                  {submitError}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                <Button type="submit" variant="primary" className="min-h-12 px-6 text-base">
                  Generate ideas
                </Button>
                <p className="text-sm text-ink-soft">Usually takes a few seconds.</p>
              </div>
            </motion.div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
