/* Convertit des signalements Forge en squelettes de scénarios.
   Entrées acceptées : fichier exporté depuis Réglages (.json) ou texte d'un ticket GitHub contenant <!-- forge-report ... -->.
   Usage : node tests/import-reports.js feedback/forge-signalements-2026-12-01.json > /tmp/squelettes.js
   Les attentes (expect) restent à écrire à partir des champs « faux » et « attendu » : c'est le travail de revue. */
const fs = require('fs');
const files = process.argv.slice(2);
if (!files.length) { console.error('Usage : node tests/import-reports.js <fichier.json|ticket.md> …'); process.exit(1); }
const out = [];
for (const f of files) {
  const txt = fs.readFileSync(f, 'utf8');
  let list = [];
  const m = txt.match(/<!-- forge-report\s*([\s\S]*?)-->/);
  try { const d = JSON.parse(m ? m[1] : txt); list = Array.isArray(d) ? d : d.reports || []; }
  catch (e) { console.error('Illisible : ' + f); continue; }
  for (const r of list) out.push({
    id: 'FB-' + r.id.replace(/^R-/, ''), source: r.id, today: r.date, theme: r.theme || '', level: 'signalement',
    note: { faux: r.categories.join(', ') + (r.faux ? ' — ' + r.faux : ''), attendu: r.attendu, obtenu: r.obtenu },
    steps: r.steps.map(s => ({ kind: s.kind, text: s.text, expect: {} }))
  });
}
console.log(JSON.stringify(out, null, 2));
