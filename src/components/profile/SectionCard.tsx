import type { ReactNode } from 'react'

export default function SectionCard({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="card">
      <h2 className="text-base font-semibold">{title}</h2>
      {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

export function ErrorBox({ message }: { message: string | null }) {
  if (!message) return null
  return <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{message}</p>
}
