// Pulsing placeholders. The pulse is opacity-only, so it is safe for reduced motion.

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-control bg-sunken ${className}`} />;
}

function IdeaCardSkeleton() {
  return (
    <div className="rounded-card border border-line bg-surface p-5 shadow-card sm:p-7">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="mt-3 h-7 w-3/4" />
      <Skeleton className="mt-3 h-4 w-full" />
      <Skeleton className="mt-2 h-4 w-2/3" />
      <div className="mt-6 flex gap-2">
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-7 w-16 rounded-full" />
      </div>
    </div>
  );
}

export function ResultsSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-5">
      <p className="font-display text-lg font-bold text-ink">{label}</p>
      <IdeaCardSkeleton />
      <IdeaCardSkeleton />
      <IdeaCardSkeleton />
    </div>
  );
}
