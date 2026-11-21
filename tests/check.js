/* Contrôles de cohérence avant publication : syntaxe, version, fichiers du cache hors ligne. */
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const root = path.join(__dirname, '..'), read = f => fs.readFileSync(path.join(root, f), 'utf8');
let bad = 0; const ko = m => { console.log('✗ ' + m); bad++; }, ok = m => console.log('✓ ' + m);
for (const f of ['engine.js', 'app.js', 'report.js', 'sw.js']) {
  try { execFileSync(process.execPath, ['--check', path.join(root, f)]); ok('syntaxe ' + f); } catch { ko('syntaxe ' + f); }
}
const v = (read('app.js').match(/const APP_VERSION = '([^']+)'/) || [])[1];
const c = (read('sw.js').match(/const CACHE = 'forge3-([^']+)'/) || [])[1];
v && v === c ? ok('version ' + v + ' identique dans app.js et sw.js') : ko(`version app.js (${v}) ≠ cache sw.js (${c})`);
const assets = JSON.parse((read('sw.js').match(/const ASSETS = (\[[\s\S]*?\]);/) || [])[1].replace(/'/g, '"'));
for (const a of assets) if (a !== './' && !fs.existsSync(path.join(root, a))) ko('fichier du cache absent : ' + a);
const html = read('index.html');
for (const s of ['engine.js', 'app.js', 'report.js']) html.includes(`src="${s}"`) ? ok('index.html charge ' + s) : ko('index.html ne charge pas ' + s);
if (bad) { console.log(`\n${bad} problème(s)`); process.exit(1); } else console.log('\nTout est cohérent');
