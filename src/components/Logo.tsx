export default function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">Q</div>
      <span className="text-lg font-semibold tracking-wide text-ink">QELLEBLI</span>
    </div>
  )
}
