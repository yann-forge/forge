/* Photographie complète des sorties du moteur, étape par étape, sur tous les jeux de scénarios.
   node tests/snapshot.js                          → écrit tests/baseline/moteur-<version>.json
   node tests/snapshot.js --compare=<fichier.json> → liste champ par champ ce qui a changé depuis cette photo
   Sert à vérifier une refonte : tout écart doit s'expliquer (amélioration voulue), sinon c'est une régression. */
const fs = require('fs'), path = require('path');
const E = require(path.join(__dirname, '..', 'engine.js'));
const CATS = ['Musique', 'Association', 'Achat de matériel', 'Événement', 'Action culturelle', 'Business', 'Fabrication', 'Formation', 'Personnel', 'Autre'];
const SETS = ['scenarios', 'holdout', 'blind', 'blind2', 'blind3', 'couts', 'feedback', 'reformulations'];
const out = {};
for (const set of SETS) for (const sc of require('./' + set + '.js')) {
  let raw = '', comps = [];
  sc.steps.forEach((st, si) => {
    if (st.kind === 'raw') raw = st.text; else comps.push(st.text);
    const text = [raw, ...comps].map(t => t.trim().replace(/[.!?]*$/, '.')).join(' ');
    const day = sc.today || '2026-11-21';
    const s = E.structure(text, { cats: CATS, today: day }), a = E.eprouver(text, s, { today: day });
    const sm = {}; for (const [k, v] of Object.entries(s.smart)) sm[k] = v.etat + ' · ' + v.extrait;
    out[`${set}/${sc.id}/${si + 1}`] = {
      titre: s.titre, domaine: s.domaine, domaine2: s.domaine2 || '', nature: s.nature, echeance: s.echeance_date || '', smart: sm,
      ressources: s.ressources, actions: s.actions_citees, contraintes: s.contraintes, flous: s.mots_flous, questions: s.questions_auteur,
      plan: a.plan.map(p => p.source + ' · ' + p.etape), risques: a.risques.map(r => r.risque), hypotheses: a.hypotheses.map(h => h.texte),
      dependances: a.dependances, forces: a.forces, faiblesses: a.faiblesses, opportunites: a.opportunites,
      couts: s.couts ? JSON.stringify(s.couts) : '', criteres: a.criteres_reussite, test: a.test, faisabilite: a.faisabilite, bloquant: a.point_bloquant
    };
  });
}
const cmp = (process.argv.find(x => x.startsWith('--compare=')) || '').slice(10);
if (!cmp) {
  const file = path.join(__dirname, 'baseline', 'moteur-' + E.version + '.json');
  fs.writeFileSync(file, JSON.stringify({ version: E.version, date: new Date().toISOString().slice(0, 10), cases: out }, null, 1));
  console.log(`Photo écrite : ${path.relative(process.cwd(), file)} (${Object.keys(out).length} étapes)`);
} else {
  const old = JSON.parse(fs.readFileSync(cmp, 'utf8')).cases; let n = 0, cases = 0;
  const show = v => Array.isArray(v) ? v.join(' | ') : typeof v === 'object' ? JSON.stringify(v) : String(v);
  for (const k of Object.keys(out)) {
    if (!old[k]) { console.log(`+ ${k} (nouveau)`); continue; }
    const diffs = [];
    for (const fld of Object.keys(out[k])) if ((fld in old[k]) && JSON.stringify(out[k][fld]) !== JSON.stringify(old[k][fld])) {
      if (fld === 'smart') { for (const l of Object.keys(out[k].smart)) if (out[k].smart[l] !== old[k].smart[l]) diffs.push(`  smart.${l}\n     avant : ${old[k].smart[l]}\n     après : ${out[k].smart[l]}`); }
      else diffs.push(`  ${fld}\n     avant : ${show(old[k][fld])}\n     après : ${show(out[k][fld])}`);
    }
    if (diffs.length) { cases++; n += diffs.length; console.log(`\n≠ ${k}\n${diffs.join('\n')}`); }
  }
  console.log(`\n${n} champ(s) modifié(s) dans ${cases} étape(s) sur ${Object.keys(out).length}`);
}
