export default function ScoreBar({ label, weight, score }: { label: string; weight?: number; score: number }) {
  const n = Math.round(score)
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span>{label}{weight !== undefined && <span className="ml-1 text-xs text-muted">({weight} %)</span>}</span>
        <span className="font-medium">{n}/100</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-beige-200">
        <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, Math.max(0, n))}%` }} />
      </div>
    </div>
  )
}
