export default function ComingSoon({ title, step }: { title: string; step: number }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <div className="card mt-6 text-sm text-muted">
        Cette page sera développée à l'étape {step} du projet.
      </div>
    </div>
  )
}
