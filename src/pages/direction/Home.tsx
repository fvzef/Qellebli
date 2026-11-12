import { useAuth } from '../../context/AuthContext'
import { useDashboard } from '../../hooks/useDashboard'
import { KpiGrid, PerformanceGrid } from '../../components/dashboard/Kpis'
import { ChartCard, FunnelChart, StatusDonut } from '../../components/dashboard/Charts'

export default function DirectionHome() {
  const { profile } = useAuth()
  const { data: d, isLoading, error } = useDashboard()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Bonjour {profile?.full_name || ''}</h1>
        <p className="mt-1 text-sm text-muted">Vue d'ensemble du recrutement. Les données personnelles des candidats ne sont pas accessibles à la Direction.</p>
      </div>

      {isLoading && <p className="text-sm text-muted">Chargement des indicateurs…</p>}
      {error && (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          Impossible de charger les indicateurs. Vérifiez que le script SQL 005 a été exécuté.
        </p>
      )}

      {d && (
        <>
          <section className="space-y-3">
            <h2 className="font-semibold">Indicateurs de recrutement</h2>
            <KpiGrid d={d} />
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold">Performance du processus</h2>
            <PerformanceGrid d={d} />
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <ChartCard title="Entonnoir de recrutement" hint="De la candidature à l'acceptation">
              <FunnelChart d={d} />
            </ChartCard>
            <ChartCard title="Répartition par statut" hint="Situation actuelle des candidatures">
              <StatusDonut d={d} />
            </ChartCard>
          </div>
        </>
      )}
    </div>
  )
}
