export default function ScoreBadge({ score }: { score: number | string | null | undefined }) {
  if (score === null || score === undefined) return <span className="text-muted">—</span>
  const n = Math.round(Number(score))
  return (
    <span className="inline-block whitespace-nowrap rounded-md bg-accent-soft px-2 py-0.5 text-sm font-semibold text-accent-dark">
      {n}<span className="text-xs font-normal text-muted"> /100</span>
    </span>
  )
}
