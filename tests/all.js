/* Lance les cinq contrôles d'un coup : cohérence + quatre jeux de scénarios. Code de sortie 1 au moindre échec.
   Usage : node tests/all.js   (ajouter -v pour le détail des échecs) */
const { spawnSync } = require('child_process'), path = require('path');
const v = process.argv.includes('-v');
const runs = [['Cohérence', 'check.js', null], ['Développement', 'bench.js', './scenarios.js'], ['Contrôle', 'bench.js', './holdout.js'],
  ['Aveugle', 'bench.js', './blind.js'], ['Signalements', 'bench.js', './feedback.js'], ['Reformulations', 'bench.js', './reformulations.js'], ['Ex-aveugle n°2', 'bench.js', './blind2.js'], ['Coûts', 'bench.js', './couts.js'], ['Aveugle n°3', 'bench.js', './blind3.js', 'mesure']];
let failed = 0;
for (const [name, file, set, mode] of runs) {
  const r = spawnSync(process.execPath, [path.join(__dirname, file), ...(set ? [mode ? '' : '--strict', v ? '' : '-q'].filter(Boolean) : [])],
    { env: Object.assign({}, process.env, set ? { SET: set } : {}), encoding: 'utf8' });
  const out = r.stdout || '', tot = (out.match(/TOTAL : .*/) || ['Tout est cohérent'])[0];
  const ok = r.status === 0; if (!ok) failed++;
  console.log(`${mode ? '·' : ok ? '✓' : '✗'} ${name.padEnd(14)} ${set ? tot : (ok ? 'ok' : 'échec')}${mode ? '  (mesure seule, non bloquant)' : ''}`);
  if ((!ok && !mode) || v) console.log(out.split('\n').filter(l => /✗|…|À traiter/.test(l)).map(l => '    ' + l.trim()).join('\n'));
}
console.log(failed ? `\n${failed} contrôle(s) en échec : ne pas publier.` : '\nTout passe : publication possible.');
process.exit(failed ? 1 : 0);
