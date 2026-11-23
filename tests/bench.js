/* Banc d'essai : rejoue chaque scénario étape par étape comme l'app (texte + précisions + réponses) */
const path = process.env.ENGINE || require('path').join(__dirname, '..', 'engine.js');
delete require.cache[require.resolve(path)];
const E = require(path);
const SC = require(process.env.SET || './scenarios.js');
const CATS = ['Musique', 'Association', 'Achat de matériel', 'Événement', 'Action culturelle', 'Business', 'Fabrication', 'Formation', 'Personnel', 'Autre'];
const TODAY = '2026-11-21';
const f = s => E.fold(String(s || ''));
const LET = { S: 'specifique', M: 'mesurable', A: 'atteignable', R: 'pertinent', T: 'temporel' };
const verbose = process.argv.includes('-v'), only = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7);

let total = 0, pass = 0; const fails = [], todo = []; let todoT = 0, todoP = 0; const perSc = [];
for (const sc of SC) {
  if (only && sc.id !== only) continue;
  let raw = '', comps = []; let scT = 0, scP = 0;
  sc.steps.forEach((st, si) => {
    if (st.kind === 'raw') raw = st.text; else comps.push({ text: st.text, letter: st.kind.startsWith('ans:') ? st.kind.slice(4) : null });
    const text = [raw, ...comps.map(c => c.text)].map(t => t.trim().replace(/[.!?]*$/, '.')).join(' ');
    const day = sc.today || TODAY;
    const s = E.structure(text, { cats: CATS, today: day });
    const a = E.eprouver(text, s, { today: day });
    const answered = new Set(comps.filter(c => c.letter).map(c => c.letter));
    const ex = st.expect || {};
    const chk = (name, ok, got) => {
      if (sc.todo) { todoT++; if (ok) todoP++; else todo.push(`${sc.id} étape ${si + 1} · ${name} → obtenu : ${got}`); return; }
      total++; scT++; if (ok) { pass++; scP++; } else fails.push(`${sc.id} étape ${si + 1} · ${name} → obtenu : ${got}`);
    };
    const has = (arr, frag) => String(frag).split('|').some(fr => arr.some(x => f(x).includes(f(fr)))); /* « a|b » = l'un ou l'autre */
    if (ex.dom) chk('domaine ' + ex.dom, ex.dom.split('|').some(d => f(s.domaine).includes(f(d))), s.domaine);
    if (ex.nat) chk('nature ' + ex.nat, ex.nat.split('|').includes(s.nature), s.nature);
    for (const L of 'SMART') if (ex[L]) {
      const e = s.smart[LET[L]]; const want = ex[L]; let et = e.etat;
      const ok = want === '!absent' ? et !== 'absent' : want === '!ok' ? et !== 'ok' : want === 'ok*' ? (et === 'ok' || answered.has(LET[L])) : et === want;
      chk(`${L} = ${want}`, ok, et + (e.extrait ? ' « ' + e.extrait + ' »' : ''));
    }
    if (ex.cost) { const c = s.couts; for (const k of ['deja', 'reste', 'total', 'budget', 'n']) if (k in ex.cost) { const got = c ? (k === 'n' ? c.pieces.length : c[k]) : undefined; chk(`coût.${k} = ${ex.cost[k]}`, c && (ex.cost[k] === null ? got == null : Math.abs((got || 0) - ex.cost[k]) < 0.01), c ? got : 'pas de bloc coûts'); } }
    if (ex.noCost) chk('pas de bloc coûts', !s.couts, s.couts ? JSON.stringify(s.couts) : '');
    if ('due' in ex) chk('échéance ' + ex.due, (s.echeance_date || null) === ex.due, s.echeance_date || 'aucune');
    if (ex.title) chk('titre contient « ' + ex.title + ' »', f(s.titre).includes(f(ex.title)), s.titre);
    const lists = { res: s.ressources, act: s.actions_citees, plan: a.plan.map(p => p.etape), risk: a.risques.map(r => r.risque), hyp: a.hypotheses.map(h => h.texte), dep: a.dependances, crit: a.criteres_reussite, force: a.forces, faib: a.faiblesses, opp: a.opportunites };
    for (const [k, arr] of Object.entries(lists)) for (const frag of (ex[k] || [])) chk(`${k} ∋ « ${frag} »`, has(arr, frag), arr.join(' | ') || '∅');
    if (ex.noTitle) chk('titre sans « ' + ex.noTitle + ' »', !f(s.titre).includes(f(ex.noTitle)), s.titre);
    for (const [k, src] of [['noRisk', 'risk'], ['noPlan', 'plan'], ['noRes', 'res'], ['noAct', 'act'], ['noCrit', 'crit'], ['noFaib', 'faib'], ['noHyp', 'hyp']]) for (const frag of (ex[k] || [])) chk(`${src} ∌ « ${frag} »`, !has(lists[src], frag), lists[src].join(' | '));
    if (verbose) {
      console.log(`\n--- ${sc.id} étape ${si + 1} (${st.kind}) : ${s.titre} | ${s.domaine} | ${s.nature} | éch. ${s.echeance_date}`);
      for (const L of 'SMART') { const e = s.smart[LET[L]]; console.log(`   ${L} ${e.etat.padEnd(7)} ${e.extrait}${e.manque ? '  → ' + e.manque : ''}`); }
      console.log('   res:', s.ressources.join(' | ')); console.log('   act:', s.actions_citees.join(' | '));
      console.log('   plan:', a.plan.map(p => `[${p.source}] ${p.etape}`).join(' / '));
      console.log('   risques:', a.risques.map(r => r.risque).join(' / '));
      console.log('   hyp:', a.hypotheses.map(h => h.texte).join(' / '), '| dep:', a.dependances.join(' / '));
      console.log('   forces:', a.forces.join(' / '), '| faibl:', a.faiblesses.join(' / '), '| opp:', a.opportunites.join(' / '));
      console.log('   crit:', a.criteres_reussite.join(' / '), '| verdict:', a.faisabilite, '—', a.point_bloquant);
    }
  });
  if (!sc.todo) perSc.push([sc.id, sc.level, scP, scT]);
}
console.log('\nRésultat par scénario :');
for (const [id, lv, p, t] of perSc) console.log(`  ${id.padEnd(7)} ${lv.padEnd(8)} ${String(p).padStart(2)}/${t}  ${Math.round(100 * p / t)} %`);
console.log(`\nTOTAL : ${pass}/${total} = ${total ? Math.round(1000 * pass / total) / 10 : 100} %`);
if (todoT) { console.log(`\nÀ traiter (scénarios todo, non comptés) : ${todoP}/${todoT} attentes déjà satisfaites`); todo.forEach(x => console.log('  … ' + x)); }
if (!process.argv.includes('-q')) { console.log('\nÉchecs :'); fails.forEach(x => console.log('  ✗ ' + x)); }
if (process.argv.includes('--strict') && fails.length) process.exit(1);
