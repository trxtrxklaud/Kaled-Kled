/**
 * Tiny shared loading skeletons (no new dependency).
 * Prefer these over raw spinners so lists keep their shape while loading.
 */

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2" role="status" aria-label="loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 rounded-2xl bg-slate-100 animate-pulse" />
      ))}
    </div>
  );
}

export function StatSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4" role="status" aria-label="loading">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-24 rounded-[2rem] bg-slate-100 animate-pulse" />
      ))}
    </div>
  );
}
