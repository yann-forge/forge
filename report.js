'use strict';
/* Signalements d'erreurs du moteur.
   Chaque signalement contient le texte de l'idée tel qu'il a été saisi (texte initial, précisions, réponses),
   ce que l'app a produit et ce qui était attendu. Il se convertit directement en scénario de test (tests/feedback.js). */

const LS_REPORTS = 'forge3.reports.v1';
const LS_REPO = 'forge3.repo';
const REPORT_CATS = [
  ['dom', 'Domaine ou thème'], ['due', 'Échéance, dates'], ['smart', 'Critères SMART'],
  ['res', 'Ressources, budget, personnes'], ['act', 'Actions repérées'], ['plan', 'Étapes du plan'],
  ['risk', 'Risques'], ['hyp', 'Hypothèses, questions'], ['autre', 'Autre']
];
let reports = [];
try { reports = JSON.parse(localStorage.getItem(LS_REPORTS) || '[]'); } catch {}

function hasCol() { return typeof col !== 'undefined' && col; }
function saveReports() {
  try { localStorage.setItem(LS_REPORTS, JSON.stringify(reports)); } catch {}
  if (hasCol()) queueWrite('reports', () => col.doc('reports').set({ list: JSON.parse(JSON.stringify(reports)) }));
  updateReportCount();
}
/* Appelé par la version artefact quand le document « reports » arrive du stockage distant */
function mergeRemoteReports(v) {
  const known = new Set(reports.map(r => r.id));
  (v && Array.isArray(v.list) ? v.list : []).forEach(r => { if (r && r.id && !known.has(r.id)) reports.push(r); });
  reports.sort((a, b) => a.created - b.created);
  try { localStorage.setItem(LS_REPORTS, JSON.stringify(reports)); } catch {}
  updateReportCount();
}
function updateReportCount() { const el = $('#rep-count'); if (el) el.textContent = reports.length ? reports.length + ' en attente' : 'aucun'; }

/* Dépôt GitHub : déduit de l'adresse (pseudo.github.io/forge) ou saisi dans les réglages */
function repoOf() {
  const saved = (localStorage.getItem(LS_REPO) || '').trim();
  if (saved) return saved;
  const h = location.hostname, m = h.match(/^([a-z0-9-]+)\.github\.io$/i);
  if (m) { const p = location.pathname.split('/').filter(Boolean)[0]; return m[1] + '/' + (p || m[1] + '.github.io'); }
  return '';
}

/* Étapes au format du banc d'essai : raw puis précisions et réponses dans l'ordre de saisie */
function stepsOf(idea) {
  return [{ kind: 'raw', text: idea.raw }, ...(idea.complements || []).map(c => ({ kind: c.letter ? 'ans:' + c.letter : 'prec', text: c.text }))];
}
function snapshotOf(idea) {
  const s = idea.structure || {}, a = idea.analyse || {};
  const sm = {}; Object.entries(s.smart || {}).forEach(([k, v]) => { sm[k] = v && v.etat; });
  return {
    moteur: s.engine === 'local' ? 'local' : (s.engine || 'claude'),
    titre: s.titre, domaine: s.domaine, nature: s.nature, echeance: s.echeance_date || null, smart: sm,
    ressources: A(s.ressources), actions: A(s.actions_citees),
    plan: A(a.plan).map(p => p.etape), risques: A(a.risques).map(r => r.risque), hypotheses: A(a.hypotheses).map(h => h.texte)
  };
}
const fmtSnap = sn => [
  `Titre : ${sn.titre || '—'} · domaine : ${sn.domaine || '—'} · nature : ${sn.nature || '—'} · échéance : ${sn.echeance || 'aucune'}`,
  'SMART : ' + Object.entries(sn.smart).map(([k, v]) => k + ' ' + v).join(', '),
  'Ressources : ' + (sn.ressources.join(' | ') || '∅'), 'Actions : ' + (sn.actions.join(' | ') || '∅'),
  'Plan : ' + (sn.plan.join(' | ') || '∅'), 'Risques : ' + (sn.risques.join(' | ') || '∅'), 'Hypothèses : ' + (sn.hypotheses.join(' | ') || '∅')
].join('\n');

function openReport(idea) {
  if (!idea.structure) { toast('Structure l’idée avant de signaler une erreur'); return; }
  setTimeout(() => openReportSheet(idea), 300); /* laisse le menu ⋮ finir de se fermer */
}
function openReportSheet(idea) {
  const sheet = $('#sheet');
  $('#sheet-body').innerHTML = `
    <h3 class="sheet-title">Signaler une erreur</h3>
    <p class="muted small">Coche ce qui est faux. Le signalement sert à corriger le moteur : il devient un cas de test.</p>
    <div class="chips2 rep-cats">${REPORT_CATS.map(([k, l]) => `<button class="chip2" data-k="${k}">${l}</button>`).join('')}</div>
    <label class="field">Ce qui ne va pas<textarea id="rep-wrong" rows="2" placeholder="Ex. : le risque « fluide frigorigène » n'a rien à voir"></textarea></label>
    <label class="field">Ce que tu attendais<textarea id="rep-expected" rows="2" placeholder="Ex. : domaine Musique, échéance 14 février, une étape « réserver la salle »"></textarea></label>
    <label class="field">Texte transmis (modifiable : retire les noms ou détails privés)<textarea id="rep-text" rows="4">${esc(stepsOf(idea).map(s => s.text).join('\n'))}</textarea></label>
    <p class="muted small">Une ligne par saisie : la première est le texte initial, les suivantes les précisions et réponses.</p>
    <button class="btn primary" id="rep-save">Enregistrer le signalement</button>`;
  const picked = new Set();
  sheet.querySelectorAll('.rep-cats .chip2').forEach(b => b.onclick = () => {
    picked.has(b.dataset.k) ? picked.delete(b.dataset.k) : picked.add(b.dataset.k); b.classList.toggle('on'); vibrate(10);
  });
  const close = () => { sheet.classList.remove('open'); setTimeout(() => (sheet.hidden = true), 250); };
  sheet.onclick = e => { if (e.target === sheet) close(); };
  $('#rep-save').onclick = () => {
    const wrong = $('#rep-wrong').value.trim(), expected = $('#rep-expected').value.trim();
    if (!picked.size && !wrong && !expected) { toast('Coche au moins une case ou décris l’erreur'); return; }
    const orig = stepsOf(idea), lines = $('#rep-text').value.split('\n').map(t => t.trim()).filter(Boolean);
    const steps = lines.map((t, i) => ({ kind: orig[i] ? orig[i].kind : 'prec', text: t }));
    if (!steps.length || steps[0].kind !== 'raw') steps.unshift({ kind: 'raw', text: idea.raw });
    const r = {
      id: 'R-' + Date.now().toString(36).toUpperCase(), created: Date.now(), date: new Date().toISOString().slice(0, 10),
      app: APP_VERSION, moteur: (window.ForgeEngine && ForgeEngine.version) || '?', theme: (U(idea).themes || [])[0] || (idea.structure.categorie || ''),
      categories: [...picked], faux: wrong, attendu: expected, steps, obtenu: snapshotOf(idea)
    };
    reports.push(r); saveReports(); close();
    offerSend(r);
  };
  sheet.hidden = false; requestAnimationFrame(() => sheet.classList.add('open'));
}

/* Ticket GitHub pré-rempli : déclenche la correction automatique si le dépôt est configuré */
function issueUrl(list) {
  const repo = repoOf(); if (!repo) return '';
  const one = list.length === 1 ? list[0] : null;
  const title = '[Signalement] ' + (one ? (one.obtenu.titre || one.id) + ' · ' + (one.categories.map(k => (REPORT_CATS.find(c => c[0] === k) || [k, k])[1].toLowerCase()).join(', ') || 'autre') : list.length + ' signalements');
  const human = list.map(r => [
    `### ${r.id} (${r.date}, app ${r.app}, moteur ${r.moteur})`,
    'Faux : ' + (r.categories.map(k => (REPORT_CATS.find(c => c[0] === k) || [k, k])[1]).join(', ') || '—') + (r.faux ? ' — ' + r.faux : ''),
    'Attendu : ' + (r.attendu || '—'), '', 'Saisies :', ...r.steps.map(s => `- (${s.kind}) ${s.text}`), '', 'Obtenu :', '```', fmtSnap(r.obtenu), '```'
  ].join('\n')).join('\n\n');
  let body = human + '\n\n<!-- forge-report\n' + JSON.stringify(list) + '\n-->';
  if (body.length > 6500) body = human.slice(0, 6400) + '\n\n(tronqué : joins le fichier exporté depuis Réglages)';
  return `https://github.com/${repo}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}
async function offerSend(r) {
  const url = issueUrl([r]);
  if (!url) { toast('Signalement enregistré · exporte-le depuis Réglages'); return; }
  if (await ask('Signalement enregistré. L’envoyer maintenant sur GitHub pour correction automatique ? Le texte sera visible sur le dépôt.', 'Envoyer')) {
    window.open(url, '_blank', 'noopener');
    r.sent = Date.now(); saveReports();
  } else toast('Gardé sur l’appareil · Réglages pour l’exporter');
}

async function downloadJson(name, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' });
  if (typeof CL !== 'undefined' && CL) {
    const dl = await CL.use('downloads');
    if (!dl) throw new Error('Téléchargement indisponible');
    try { await dl.save({ filename: name, data: blob }); } catch (e) { if (e && e.code === 'declined') return false; throw e; }
    return true;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return true;
}

function initReports() {
  const rp = $('#set-repo'); if (rp) { rp.value = localStorage.getItem(LS_REPO) || ''; rp.placeholder = repoOf() || 'pseudo/forge'; }
  const v = $('#app-version'); if (v) v.textContent = 'Forge ' + APP_VERSION + ' · moteur ' + ((window.ForgeEngine && ForgeEngine.version) || '?');
  updateReportCount();
  $('#set-repo') && $('#set-repo').addEventListener('change', e => { localStorage.setItem(LS_REPO, e.target.value.trim()); toast('Dépôt enregistré'); });
  $('#btn-rep-export').addEventListener('click', async () => {
    if (!reports.length) { toast('Aucun signalement'); return; }
    try { if (await downloadJson('forge-signalements-' + new Date().toISOString().slice(0, 10) + '.json', { app: 'forge', type: 'signalements', version: 1, reports })) toast(reports.length + ' signalement(s) exporté(s)'); }
    catch { toast('Export impossible dans cette vue'); }
  });
  $('#btn-rep-send').addEventListener('click', () => {
    const pending = reports.filter(r => !r.sent);
    if (!pending.length) { toast('Rien de nouveau à envoyer'); return; }
    const url = issueUrl(pending);
    if (!url) { toast('Renseigne le dépôt GitHub d’abord'); return; }
    window.open(url, '_blank', 'noopener'); pending.forEach(r => (r.sent = Date.now())); saveReports();
  });
  $('#btn-rep-clear').addEventListener('click', async () => {
    if (!reports.length) return;
    if (!(await ask('Effacer les ' + reports.length + ' signalement(s) de cet appareil ?', 'Effacer'))) return;
    reports = []; saveReports(); toast('Signalements effacés');
  });
  /* État du mode hors ligne (version installable uniquement) */
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost') && $('#offline-box')) {
    const show = s => {
      $('#offline-box').hidden = false;
      $('#offline-status').textContent = s.missing.length
        ? `Hors ligne : incomplet, ${s.missing.length} fichier(s) manquant(s) sur ${s.total} (${s.missing.join(', ')}). Touche Réparer avec du réseau.`
        : `Hors ligne : prêt (${s.total}/${s.total} fichiers en cache, ${s.cache}).`;
    };
    navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.forgeStatus) show(e.data.forgeStatus); });
    const askSw = what => navigator.serviceWorker.ready.then(r => r.active && r.active.postMessage({ forge: what }));
    if (!navigator.serviceWorker.controller) { $('#offline-box').hidden = false; $('#offline-status').textContent = 'Hors ligne : pas encore actif. Ferme et rouvre Forge une fois avec du réseau.'; }
    askSw('status');
    $('#btn-offline-repair').addEventListener('click', () => {
      if (!navigator.onLine) { toast('Il faut du réseau pour réparer'); return; }
      $('#offline-status').textContent = 'Téléchargement des fichiers…'; askSw('repair');
    });
  }
  /* Installation sur l'appareil (Chrome, Brave, Edge, Android) */
  if ($('#install-box')) {
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    const box = $('#install-box'), st = $('#install-status'), btn = $('#btn-install');
    let deferred = null;
    if (!standalone) {
      box.hidden = false;
      st.textContent = 'Installation : si aucun bouton n\u2019apparaît, menu du navigateur > « Installer Forge » (Brave : ☰ > Enregistrer et partager > Installer la page en tant qu\u2019application). Si Forge est déjà installée, le navigateur propose plutôt de l\u2019ouvrir.';
    }
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault(); deferred = e; box.hidden = false; btn.hidden = false;
      st.textContent = 'Forge peut s\u2019installer sur cet appareil : elle s\u2019ouvrira dans sa propre fenêtre, même sans réseau.';
      toast('Forge peut s\u2019installer : Réglages > Installer');
    });
    btn.addEventListener('click', async () => {
      if (!deferred) return; deferred.prompt();
      const r = await deferred.userChoice; deferred = null; btn.hidden = true;
      if (r.outcome === 'accepted') st.textContent = 'Forge est installée.';
    });
    window.addEventListener('appinstalled', () => { btn.hidden = true; st.textContent = 'Forge est installée.'; });
  }
  /* Annonce d'une mise à jour reçue */
  try {
    const seen = localStorage.getItem('forge3.version');
    if (seen && seen !== APP_VERSION) setTimeout(() => toast('Forge mise à jour : version ' + APP_VERSION), 900);
    localStorage.setItem('forge3.version', APP_VERSION);
  } catch {}
}

initReports();
