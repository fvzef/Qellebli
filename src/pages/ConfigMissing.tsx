export default function ConfigMissing() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-beige-100 p-4">
      <div className="card max-w-lg space-y-3">
        <h1 className="text-xl font-semibold">Configuration Supabase manquante</h1>
        <p className="text-sm text-muted">
          Copiez <code className="rounded bg-beige-100 px-1">.env.example</code> en <code className="rounded bg-beige-100 px-1">.env</code>,
          renseignez <code className="rounded bg-beige-100 px-1">VITE_SUPABASE_URL</code> et <code className="rounded bg-beige-100 px-1">VITE_SUPABASE_ANON_KEY</code>,
          puis relancez <code className="rounded bg-beige-100 px-1">npm run dev</code>.
        </p>
      </div>
    </div>
  )
}
