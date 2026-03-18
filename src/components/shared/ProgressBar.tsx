export function ProgressBar({ progress, className = '' }: { progress: number; className?: string }) {
  return (
    <div className={`h-0.5 w-full rounded-full bg-control overflow-hidden ${className}`}>
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
        style={{ width: `${Math.round(Math.max(0, Math.min(1, progress)) * 100)}%` }}
      />
    </div>
  );
}
