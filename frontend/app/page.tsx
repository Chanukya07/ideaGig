import { IdeaForm } from "@/components/IdeaForm";

const STEPS = [
  { title: "Say what you know", text: "Skills, time, interest, and experience." },
  { title: "Get three scoped ideas", text: "Each with a stack, a difficulty, and a clear cut line." },
  { title: "Follow the milestones", text: "Four to six steps that each end in something that runs." },
];

export default function HomePage() {
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
      <section className="lg:sticky lg:top-10 lg:self-start">
        <p className="font-display text-sm font-bold text-accent-strong">For students</p>
        <h1 className="mt-3 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-ink sm:text-5xl">
          Pick a portfolio project you can actually finish.
        </h1>
        <p className="mt-5 max-w-md text-lg text-ink-soft">
          Most side projects die from scope, not skill. Tell us what you have to work with and get
          three ideas sized to fit.
        </p>
        <ol className="mt-9 hidden max-w-md space-y-5 lg:block">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span
                aria-hidden="true"
                className="font-display text-sm font-extrabold tabular-nums text-accent-strong"
              >
                0{index + 1}
              </span>
              <div className="-mt-0.5">
                <p className="font-semibold text-ink">{step.title}</p>
                <p className="text-sm text-ink-soft">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <IdeaForm />
    </div>
  );
}
