import { useDashboard } from '../../hooks/useDashboard'
import { fmtPct, pct } from '../../lib/dashboardTypes'
import { StatCard } from '../../components/dashboard/Kpis'
import { ChartCard, MonthlyChart, OfferChart, ScoreChart } from '../../components/dashboard/Charts'

export default function Statistics() {
  const { data: d, isLoading, error } = useDashboard()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Statistiques globales</h1>
        <p className="mt-1 text-sm text-muted">Analyse détaillée par offre, par période et par score.</p>
      </div>

      {isLoading && <p className="text-sm text-muted">Chargement…</p>}
      {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">Impossible de charger les statistiques.</p>}

      {d && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Offres ouvertes" value={d.open_offers} />
            <StatCard label="Score moyen des candidats" value={d.avg_score === null ? '—' : `${d.avg_score.toLocaleString('fr-FR')} / 100`}
              hint="Aide à la décision, jamais éliminatoire" />
            <StatCard label="Taux de refus" value={fmtPct(pct(d.rejected, d.hires + d.rejected))} hint="Refusées ÷ décisions finales" />
          </div>

          <ChartCard title="Résultats par offre" hint="Candidatures, présélections et recrutements">
            <OfferChart d={d} />
          </ChartCard>

          {d.by_offer.length > 0 && (
            <section className="card overflow-x-auto p-0">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b border-line bg-beige-50 text-xs uppercase text-muted">
                  <tr>
                    <th className="px-4 py-3">Offre</th>
                    <th className="px-4 py-3">Candidatures</th>
                    <th className="px-4 py-3">Présélectionnées</th>
                    <th className="px-4 py-3">Taux de présélection</th>
                    <th className="px-4 py-3">Recrutements</th>
                  </tr>
                </thead>
                <tbody>
                  {d.by_offer.map((o) => (
                    <tr key={o.offer_id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3 font-medium">{o.title}</td>
                      <td className="px-4 py-3">{o.applications}</td>
                      <td className="px-4 py-3">{o.preselected}</td>
                      <td className="px-4 py-3">{fmtPct(pct(o.preselected, o.applications))}</td>
                      <td className="px-4 py-3">{o.hires}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            <ChartCard title="Candidatures par mois" hint="6 derniers mois">
              <MonthlyChart d={d} />
            </ChartCard>
            <ChartCard title="Distribution des scores" hint="Nombre de candidats par tranche de score">
              <ScoreChart d={d} />
            </ChartCard>
          </div>

          <details className="card text-sm">
            <summary className="cursor-pointer font-semibold">Méthode de calcul des indicateurs</summary>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-muted">
              <li><strong className="text-ink">Candidatures en cours</strong> : candidatures qui ne sont ni acceptées ni refusées.</li>
              <li><strong className="text-ink">Présélectionnés</strong> : candidatures passées au moins une fois par « Présélectionnée », « Entretien programmé » ou « Acceptée ».</li>
              <li><strong className="text-ink">Taux de présélection</strong> : présélectionnés ÷ candidatures totales.</li>
              <li><strong className="text-ink">Conversion entretien → recrutement</strong> : candidats acceptés ayant passé un entretien ÷ candidats ayant eu un entretien non annulé.</li>
              <li><strong className="text-ink">Durée moyenne du processus</strong> : moyenne des jours entre le dépôt et la décision finale, sur les dossiers décidés.</li>
              <li><strong className="text-ink">Délai de traitement initial</strong> : moyenne du temps entre le dépôt et la première action du recruteur (sortie du statut « Reçue »).</li>
              <li><strong className="text-ink">Taux d'acceptation</strong> : acceptées ÷ (acceptées + refusées).</li>
            </ul>
          </details>
        </>
      )}
    </div>
  )
}
