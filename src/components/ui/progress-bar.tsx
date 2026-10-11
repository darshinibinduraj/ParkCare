export function ProgressBar({ current, total }: { current: number; total: number }) {
  const width = Math.max(8, Math.round((current / total) * 100));
  return (
    <div className="grid gap-2">
      <p className="font-bold">
        Question {current} of {total}
      </p>
      <div
        className="h-4 overflow-hidden rounded-full border-2 border-line bg-chip"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
        aria-label={`Question ${current} of ${total}`}
        aria-valuetext={`Question ${current} of ${total}`}
      >
        <div className="h-full bg-primary" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
