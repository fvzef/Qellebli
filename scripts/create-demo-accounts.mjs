// QELLEBLI — création des comptes de démonstration
// Usage (depuis le dossier du projet) :
//   node --env-file=.env scripts/create-demo-accounts.mjs
//
// Les comptes sont créés par l'inscription normale de l'application (clé publique).
// Prérequis Supabase : Authentication > Sign In / Providers > Email :
//   - "Allow new users to sign up" activé
//   - "Confirm email" désactivé
import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY
if (!url || !key) {
  console.error('Fichier .env introuvable ou incomplet (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).')
  console.error('Lancez la commande depuis le dossier "qellebli" : node --env-file=.env scripts/create-demo-accounts.mjs')
  process.exit(1)
}

export const PASSWORD = 'Demo2026!Qellebli'

const ACCOUNTS = [
  ['direction@example.com', 'Karim Bennani', 'Direction'],
  ['rh@example.com', 'Nadia Cherkaoui', 'Responsable RH'],
  ['rh2@example.com', 'Amine Fassi', 'Responsable RH'],
  ['candidat@example.com', 'Yasmine Benali', 'Candidat'],
  ['omar.elidrissi@example.com', 'Omar El Idrissi', 'Candidat'],
  ['salma.tazi@example.com', 'Salma Tazi', 'Candidat'],
  ['mehdi.alaoui@example.com', 'Mehdi Alaoui', 'Candidat'],
  ['imane.chraibi@example.com', 'Imane Chraibi', 'Candidat'],
  ['anas.berrada@example.com', 'Anas Berrada', 'Candidat'],
  ['hajar.lahlou@example.com', 'Hajar Lahlou', 'Candidat'],
  ['youssef.naciri@example.com', 'Youssef Naciri', 'Candidat'],
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let created = 0, existing = 0, failed = 0

for (const [email, fullName, label] of ACCOUNTS) {
  // Un client neuf par compte : aucune session conservée
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await supabase.auth.signUp({
    email, password: PASSWORD, options: { data: { full_name: fullName } },
  })
  if (error) {
    if (/already registered|already been registered/i.test(error.message)) {
      console.log(`= ${email} existe déjà`); existing++
    } else {
      console.log(`✗ ${email} : ${error.message}`); failed++
      if (/signups? (are )?disabled/i.test(error.message)) {
        console.log('  → Activez "Allow new users to sign up" dans Authentication > Sign In / Providers.')
      }
    }
  } else {
    created++
    console.log(`✓ ${email} (${label}) créé`)
    if (!data.session) {
      console.log('  ⚠ Aucune session renvoyée : "Confirm email" semble activé. Désactivez-le puis supprimez ce compte et relancez.')
    }
  }
  await sleep(700)
}

console.log(`\nTerminé : ${created} créé(s), ${existing} déjà existant(s), ${failed} échec(s).`)
if (failed === 0) {
  console.log('Étape suivante : exécutez supabase/migrations/006_seed_demo.sql dans le SQL Editor de Supabase.')
}
process.exit(failed === 0 ? 0 : 1)
