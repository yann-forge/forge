'use strict';
/* Forge V3 — capture et structuration d'idées. Tout est stocké localement (localStorage). */

const LS_IDEAS = 'forge3.ideas.v1';
const LS_SETTINGS = 'forge3.settings.v1';
const APP_VERSION = '3.1.1'; /* à incrémenter à chaque mise à jour, avec CACHE dans sw.js */
/* Premier lancement : reprise des idées et réglages d'une version précédente installée sur la même adresse */
try {
  for (const p of ['forge2', 'forge']) {
    if (!localStorage.getItem(LS_IDEAS) && localStorage.getItem(p + '.ideas.v1')) localStorage.setItem(LS_IDEAS, localStorage.getItem(p + '.ideas.v1'));
    if (!localStorage.getItem(LS_SETTINGS) && localStorage.getItem(p + '.settings.v1')) localStorage.setItem(LS_SETTINGS, localStorage.getItem(p + '.settings.v1'));
  }
} catch {}
const OLD_CATS = ['Projet', 'Travail', 'Création', 'Personnel', 'Administratif', 'Autre'];
const DEFAULT_CATS = ['Musique', 'Association', 'Achat de matériel', 'Événement', 'Action culturelle', 'Business', 'Fabrication', 'Formation', 'Personnel', 'Autre'];

const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- Stockage ---------- */
function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); return true; }
  catch { toast('Stockage plein ou indisponible'); return false; }
}
let ideas = load(LS_IDEAS, []);
let settings = Object.assign({ apiKey: '', model: 'claude-sonnet-5-5', categories: DEFAULT_CATS, engine: 'local' }, load(LS_SETTINGS, {}));
if (JSON.stringify(settings.categories) === JSON.stringify(OLD_CATS)) settings.categories = DEFAULT_CATS.slice();
const persist = () => save(LS_IDEAS, ideas);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const persistIdea = () => persist();
const CLAUDE_OK = () => !!(settings.apiKey && navigator.onLine);
const CLAUDE_HINT = 'Via ta clé API, plus fin que l\u2019analyse locale';
const removeIdeaStore = () => persist();
const CAN_ICS = true;

/* Boîte de confirmation intégrée */
function ask(msg, okLabel = 'Confirmer') {
  return new Promise(res => {
    const m = $('#modal'); $('#modal-msg').textContent = msg; $('#modal-ok').textContent = okLabel; m.hidden = false;
    const done = v => { m.hidden = true; $('#modal-ok').onclick = $('#modal-cancel').onclick = null; res(v); };
    $('#modal-ok').onclick = () => done(true); $('#modal-cancel').onclick = () => done(false);
  });
}

/* ---------- Navigation ---------- */
let current = 'capture', openId = null, filterCat = 'Toutes', query = '';
function show(view, id) {
  current = view;
  if (id !== undefined) openId = id;
  for (const v of ['capture', 'list', 'detail', 'settings']) $('#view-' + v).hidden = v !== view;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === view || (view === 'detail' && t.dataset.view === 'list')));
  const sub = view === 'detail' || view === 'settings';
  $('#btn-back').hidden = !sub;
  $('#logo').hidden = sub;
  $('#title').textContent = view === 'settings' ? 'Réglages' : view === 'detail' ? 'Idée' : view === 'list' ? 'Mes idées' : 'Forge';
  if (view === 'list') renderList();
  if (view === 'detail') renderDetail();
  if (view === 'settings') fillSettings();
  window.scrollTo({ top: 0 });
}
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => show(t.dataset.view)));
$('#btn-settings').addEventListener('click', () => show('settings'));
$('#btn-back').addEventListener('click', () => show(current === 'detail' ? 'list' : 'capture'));

/* ---------- Petits effets ---------- */
document.addEventListener('pointerdown', e => {
  const b = e.target.closest('.btn,.mic');
  if (!b) return;
  const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height);
  const s = document.createElement('span');
  s.className = 'ripple';
  Object.assign(s.style, { width: d + 'px', height: d + 'px', left: e.clientX - r.left - d / 2 + 'px', top: e.clientY - r.top - d / 2 + 'px' });
  b.appendChild(s); setTimeout(() => s.remove(), 600);
});
let toastT;
function toast(msg, ms = 2600) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), ms);
}
const vibrate = p => { try { navigator.vibrate && navigator.vibrate(p); } catch {} };

/* ---------- Dictée ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null, recording = false, recTarget = null, baseText = '';

function startDictation(textarea, statusEl, onState) {
  if (!SR) { toast('Dictée non disponible ici : utilise le micro du clavier'); textarea.focus(); return; }
  recTarget = { textarea, statusEl, onState };
  baseText = textarea.value.trim();
  recording = true; onState(true); vibrate(30);
  statusEl.textContent = 'J’écoute… appuie pour arrêter';
  runRecognizer();
}
function runRecognizer() {
  rec = new SR();
  rec.lang = 'fr-FR'; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
  rec.onresult = e => {
    let finalTxt = '', interim = '';
    for (let i = 0; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) finalTxt += t; else interim += t;
    }
    const { textarea } = recTarget;
    const joined = (s) => (baseText ? baseText + ' ' : '') + s.trim();
    if (finalTxt) { baseText = joined(finalTxt); textarea.value = baseText; }
    else textarea.value = joined(interim);
  };
  rec.onerror = e => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { toast('Micro refusé : autorise-le dans les réglages du navigateur'); stopDictation(); }
    else if (e.error === 'network') { toast('Dictée indisponible hors ligne : utilise le micro du clavier'); stopDictation(); }
  };
  rec.onend = () => { if (recording) { try { runRecognizer(); } catch { stopDictation(); } } };
  try { rec.start(); } catch { /* déjà démarré */ }
}
function stopDictation() {
  if (!recTarget) return;
  recording = false;
  try { rec && rec.stop(); } catch {}
  recTarget.textarea.value = baseText || recTarget.textarea.value;
  recTarget.statusEl.textContent = 'Appuie pour dicter une idée';
  recTarget.onState(false); vibrate([20, 40, 20]);
  recTarget = null;
}

const mic = $('#mic');
mic.addEventListener('click', () => {
  if (recording) return stopDictation();
  startDictation($('#capture-text'), $('#mic-status'), on => {
    mic.classList.toggle('rec', on); $('#mic-ring').classList.toggle('rec', on); $('#wave').classList.toggle('on', on);
  });
});

/* ---------- Capture ---------- */
function createIdea(text) {
  const idea = { id: uid(), created: Date.now(), updated: Date.now(), raw: text, complements: [], status: 'brute', structure: null, analyse: null };
  ideas.unshift(idea); persist(); updateCount();
  return idea;
}
function takeCapture() {
  if (recording) stopDictation();
  const ta = $('#capture-text'), text = ta.value.trim();
  if (!text) { toast('Rien à enregistrer'); return null; }
  ta.value = ''; return createIdea(text);
}
$('#btn-save').addEventListener('click', () => { if (takeCapture()) { toast('Idée enregistrée'); vibrate(25); } });
$('#btn-save-struct').addEventListener('click', async () => {
  const idea = takeCapture(); if (!idea) return;
  detailTab = 'fiche'; show('detail', idea.id);
  await runStructure(idea);
});

/* ---------- API Claude ---------- */
const RULES = `Tu es un outil d'analyse au service de l'auteur d'une idée. Règles absolues :
- Tu n'inventes rien. Tu ne proposes aucune idée, fonctionnalité, option ou piste créative nouvelle.
- Tu travailles uniquement à partir de ce que l'auteur a dit. Si une information n'est pas dans le texte, le champ reste vide et tu la signales comme manquante.
- Tu peux reformuler pour clarifier, classer, décomposer en étapes logiques ce qui est déjà visé, et critiquer.
- Style : français, phrases courtes, concrètes, sans jargon ni formules creuses, sans flatterie.
- Le texte est souvent une dictée vocale : corrige silencieusement les erreurs de transcription évidentes.`;

const SM_CRIT = d => ({
  type: 'object', description: d,
  properties: {
    etat: { type: 'string', enum: ['ok', 'partiel', 'absent'] },
    extrait: { type: 'string', description: 'Citation courte des mots de l’auteur qui répondent à ce critère (5 à 15 mots). Vide si rien.' },
    manque: { type: 'string', description: 'Si etat n’est pas ok : la question précise à poser à l’auteur pour remplir ce critère. Vide sinon.' }
  }, required: ['etat', 'extrait', 'manque']
});
const NATURES = ['projet', 'action ponctuelle', 'problème à résoudre', 'amélioration', 'réflexion', 'question'];
const STRUCT_TOOL = cats => ({
  name: 'structurer_idee',
  description: 'Structure une idée brute selon des critères objectifs.',
  input_schema: {
    type: 'object',
    properties: {
      titre: { type: 'string', description: 'Titre factuel, 8 mots maximum' },
      resume: { type: 'string', description: 'Reformulation fidèle en 1 à 2 phrases' },
      categorie: { type: 'string', enum: cats },
      nature: { type: 'string', enum: NATURES },
      mots_cles: { type: 'array', items: { type: 'string' }, description: '3 à 5 mots-clés' },
      smart: {
        type: 'object', description: 'Évaluation SMART de l’objectif, uniquement à partir du texte',
        properties: {
          specifique: SM_CRIT('Spécifique : le résultat visé est-il précis et sans ambiguïté ? Des mots flous (peut-être, genre, un peu) le rendent partiel.'),
          mesurable: SM_CRIT('Mesurable : un chiffre ou un critère permet-il de constater que c’est atteint ?'),
          atteignable: SM_CRIT('Atteignable : les moyens et les personnes nécessaires sont-ils identifiés ?'),
          pertinent: SM_CRIT('Pertinent : la raison d’être et le public sont-ils clairs ?'),
          temporel: SM_CRIT('Temporel : une échéance ou un délai est-il fixé ?')
        }, required: ['specifique', 'mesurable', 'atteignable', 'pertinent', 'temporel']
      },
      echeance_date: { type: 'string', description: 'Date limite au format AAAA-MM-JJ si l’auteur donne une date ou une période (ex. « fin janvier » = dernier jour de ce mois, à venir). Vide sinon.' },
      ressources: { type: 'array', items: { type: 'string' }, description: 'Moyens, outils, budget, personnes mentionnés' },
      contraintes: { type: 'array', items: { type: 'string' }, description: 'Limites mentionnées' },
      actions_citees: { type: 'array', items: { type: 'string' }, description: 'Actions explicitement citées par l’auteur' }
    },
    required: ['titre', 'resume', 'categorie', 'nature', 'mots_cles', 'smart', 'echeance_date', 'ressources', 'contraintes', 'actions_citees']
  }
});

const LEVEL = { type: 'string', enum: ['faible', 'moyenne', 'élevée'] };
const ANALYSE_TOOL = {
  name: 'eprouver_idee',
  description: 'Développe et met à l’épreuve une idée structurée.',
  input_schema: {
    type: 'object',
    properties: {
      hypotheses: {
        type: 'array', description: 'Ce que l’idée tient pour acquis et qu’il faut vérifier avant d’investir (2 à 5)',
        items: { type: 'object', properties: { texte: { type: 'string' }, source: { type: 'string', enum: ['dit', 'deduit'], description: 'dit = formulé par l’auteur ; deduit = implicite dans l’idée' } }, required: ['texte', 'source'] }
      },
      forces: { type: 'array', items: { type: 'string' }, description: 'Atouts internes déjà réunis, cités par l’auteur ou découlant directement de ce qu’il a dit. Liste vide sinon.' },
      opportunites: { type: 'array', items: { type: 'string' }, description: 'Éléments extérieurs favorables mentionnés ou découlant directement du contexte décrit. N’en invente aucun. Liste vide sinon.' },
      faiblesses: { type: 'array', items: { type: 'string' }, description: 'Points faibles internes et angles morts. Ne recopie pas les contraintes déjà listées.' },
      risques: {
        type: 'array', items: {
          type: 'object',
          properties: {
            risque: { type: 'string' }, gravite: LEVEL, probabilite: LEVEL,
            origine: { type: 'string', enum: ['interne', 'externe'], description: 'interne = dépend de l’auteur ou du projet ; externe = vient de l’environnement' },
            signal: { type: 'string', description: 'Indice concret qui montrerait que le risque se réalise' },
            parade: { type: 'string', description: 'Mesure de réduction du risque, sans changer l’idée' }
          }, required: ['risque', 'gravite', 'probabilite', 'origine', 'signal', 'parade']
        }, description: '2 à 6 risques, du plus grave au moins grave'
      },
      dependances: { type: 'array', items: { type: 'string' }, description: 'Ce dont la réussite dépend et que l’auteur ne maîtrise pas seul (personnes, validations)' },
      plan: {
        type: 'array', description: 'Étapes ordonnées pour atteindre l’objectif. Reprends d’abord les actions citées par l’auteur (source dit). Ajoute seulement les étapes indispensables qui découlent directement de l’objectif (source deduit). La première étape doit être faisable sous 48 h. Aucune étape générique (faire le bilan, lister les ressources…). 3 à 7 étapes.',
        items: {
          type: 'object', properties: {
            etape: { type: 'string' }, livrable: { type: 'string', description: 'Ce qui prouve que l’étape est faite' },
            source: { type: 'string', enum: ['dit', 'deduit'] }
          }, required: ['etape', 'livrable', 'source']
        }
      },
      test: { type: 'string', description: 'Moyen le moins coûteux de vérifier l’hypothèse principale avant d’investir' },
      criteres_reussite: { type: 'array', items: { type: 'string' }, description: 'Critères mesurables, déduits de l’objectif' },
      faisabilite: { type: 'string', enum: ['faible', 'moyenne', 'bonne'] },
      point_bloquant: { type: 'string', description: 'Le point qui bloque le plus aujourd’hui, en une phrase' }
    },
    required: ['hypotheses', 'forces', 'opportunites', 'faiblesses', 'risques', 'dependances', 'plan', 'test', 'criteres_reussite', 'faisabilite', 'point_bloquant']
  }
};

async function callClaude(tool, userText) {
  if (!settings.apiKey) { show('settings'); throw new Error('Ajoute ta clé API dans les réglages'); }
  if (!navigator.onLine) throw new Error('Pas de connexion. L’idée est enregistrée, relance plus tard.');
  let res;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': settings.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: settings.model, max_tokens: 4096, system: RULES,
        tools: [tool], tool_choice: { type: 'tool', name: tool.name },
        messages: [{ role: 'user', content: userText }]
      })
    });
  } catch { throw new Error('Connexion à l’API impossible'); }
  if (!res.ok) {
    let msg = '';
    try { msg = (await res.json()).error?.message || ''; } catch {}
    if (res.status === 401) throw new Error('Clé API invalide');
    if (res.status === 429) throw new Error('Trop de requêtes, réessaie dans un instant');
    if (res.status === 529 || res.status >= 500) throw new Error('API surchargée, réessaie dans un instant');
    throw new Error('Erreur API ' + res.status + (msg ? ' : ' + msg : ''));
  }
  const data = await res.json();
  const block = (data.content || []).find(b => b.type === 'tool_use');
  if (!block) throw new Error('Réponse inattendue de l’API');
  return block.input;
}

function ideaText(idea) {
  let t = 'Idée de l\u2019auteur :\n"""\n' + idea.raw + '\n"""';
  const gen = idea.complements.filter(c => !c.letter), ans = SMART_KEYS.map(([k, L, label]) => [label, answerOf(idea, k)]).filter(x => x[1]);
  if (gen.length) t += '\n\nPrécisions ajoutées ensuite par l\u2019auteur :\n' + gen.map(c => '- ' + c.text).join('\n');
  if (ans.length) t += '\n\nRéponses de l\u2019auteur aux questions de cadrage :\n' + ans.map(([l, a]) => `- ${l} : ${a}`).join('\n');
  return t;
}
const today = () => new Date().toISOString().slice(0, 10);

const busy = new Set();
const engineMode = () => settings.engine || 'local';
const localText = idea => [idea.raw, ...idea.complements.map(c => c.text)].map(t => String(t).trim().replace(/[.!?]*$/, '.')).join(' ');
function structureLocal(idea, silent) {
  const cats = settings.categories.length ? settings.categories : DEFAULT_CATS;
  idea.structure = ForgeEngine.structure(localText(idea), { cats, today: today() });
  idea.structuredAt = Date.now();
  if (idea.status === 'brute') idea.status = 'structuree';
  if (idea.analyse && idea.analyse.engine === 'local') { idea.analyse = ForgeEngine.eprouver(localText(idea), idea.structure, { today: today() }); mergeSteps(idea); }
  idea.updated = Date.now(); persistIdea(idea);
  if (!silent) { toast('Idée structurée'); vibrate(30); }
  if (current === 'detail' && openId === idea.id) renderDetail();
}
function analyseLocal(idea) {
  if (!idea.structure) structureLocal(idea, true);
  idea.analyse = ForgeEngine.eprouver(localText(idea), idea.structure, { today: today() });
  mergeSteps(idea); idea.status = 'eprouvee'; idea.updated = Date.now(); persistIdea(idea);
  toast('Analyse terminée'); vibrate(30);
  if (current === 'detail' && openId === idea.id) renderDetail();
}
async function runDeep(idea) { await runStructure(idea, true); if (idea.structure && idea.structure.engine === 'claude') await runAnalyse(idea, true); }
async function runStructure(idea, deep) {
  if (busy.has(idea.id)) return;
  if (!(deep || (engineMode() === 'claude' && CLAUDE_OK()))) { structureLocal(idea); return; }
  busy.add(idea.id); renderDetail();
  try {
    const cats = settings.categories.length ? settings.categories : DEFAULT_CATS;
    const out = await callClaude(STRUCT_TOOL(cats), ideaText(idea) + '\n\nDate du jour : ' + today() + '\nCatégories disponibles : ' + cats.join(', '));
    out.engine = 'claude'; idea.structure = out; idea.structuredAt = Date.now();
    if (idea.status === 'brute') idea.status = 'structuree';
    idea.updated = Date.now();
    persistIdea(idea); toast('Idée structurée'); vibrate(30);
  } catch (e) { toast(e.message, 4000); }
  finally { busy.delete(idea.id); if (current === 'detail' && openId === idea.id) renderDetail(); }
}
async function runAnalyse(idea, deep) {
  if (busy.has(idea.id) || !idea.structure) return;
  if (!(deep || (engineMode() === 'claude' && CLAUDE_OK()))) { analyseLocal(idea); return; }
  busy.add(idea.id); renderDetail();
  try {
    const u = U(idea);
    const ctx = ideaText(idea) + '\n\nStructure validée :\n' + JSON.stringify(idea.structure, null, 1) +
      (u.echeance ? '\n\nÉchéance fixée par l\u2019auteur : ' + u.echeance : '') + '\nDate du jour : ' + today() +
      '\n\nDéveloppe cette idée pour la rendre opérationnelle et mets-la à l\u2019épreuve. Ne change pas l\u2019idée, ne l\u2019enrichis pas : décompose et critique.';
    idea.analyse = await callClaude(ANALYSE_TOOL, ctx); idea.analyse.engine = 'claude';
    mergeSteps(idea);
    idea.status = 'eprouvee'; idea.updated = Date.now();
    persistIdea(idea); toast('Analyse terminée'); vibrate(30);
  } catch (e) { toast(e.message, 4000); }
  finally { busy.delete(idea.id); if (current === 'detail' && openId === idea.id) renderDetail(); }
}

/* ---------- Modèle commun : une seule source par information ---------- */
const A = x => Array.isArray(x) ? x : (x ? [String(x)] : []);
const norm = t => String(t || '').toLowerCase().replace(/\s+/g, ' ').trim();
const LETTER_Q = { specifique: 'Quoi exactement ?', mesurable: 'Combien ? Comment saura-t-on que c\u2019est réussi ?', atteignable: 'Avec quoi et avec qui ?', pertinent: 'Pourquoi, et pour qui ?', temporel: 'Pour quand ?' };
const SRC_LABEL = { dit: 'Toi', deduit: 'Déduit', ajout: 'Ajout', methode: 'Méthode' };
const SRC_HINT = { dit: 'tiré de ton idée', deduit: 'à confirmer', liste: 'liste type' };

function answerOf(idea, k) { const c = [...idea.complements].reverse().find(c => c.letter === k); return c ? c.text : ''; }
function smartState(idea) {
  const s = idea.structure || {}, sm = (s.smart && typeof s.smart === 'object') ? s.smart : smartOf(s, idea.analyse);
  return SMART_KEYS.map(([k, L, label]) => {
    const e = sm[k] || {}, ans = answerOf(idea, k);
    return { k, L, label, etat: ans ? 'ok' : (e.etat || 'absent'), claude: e.etat || 'absent', extrait: e.extrait || e.element || '', manque: e.manque || '', answer: ans };
  });
}
function maturity(idea) {
  const st = smartState(idea), ok = st.filter(x => x.etat === 'ok').length;
  const w = st.reduce((n, x) => n + (x.etat === 'ok' ? 1 : x.etat === 'partiel' ? .5 : 0), 0) / 5;
  return { st, ok, w, label: ok === 5 ? 'Prête' : ok >= 3 ? 'À affiner' : 'À clarifier', hint: ok === 5 ? 'Assez cadrée pour passer à l\u2019action.' : ok >= 3 ? 'Encore quelques points à préciser.' : 'Objectif encore flou : réponds aux questions de l\u2019onglet Développer.' };
}
function U(idea) {
  const s = idea.structure || {}, u = idea.user || {};
  return { type: u.type || s.nature || '', themes: u.themes || (s.categorie ? [s.categorie] : []), echeance: u.echeance !== undefined ? u.echeance : (s.echeance_date || ''), important: u.important, urgent: u.urgent };
}
function setUser(idea, patch) { idea.user = Object.assign({}, idea.user || {}, patch); idea.updated = Date.now(); persistIdea(idea); }
function quadrant(u) {
  if (u.important === undefined && u.urgent === undefined) return null;
  return u.important && u.urgent ? 'Faire maintenant' : u.important ? 'Planifier' : u.urgent ? 'Déléguer ou caler vite' : 'Plus tard';
}
const daysLeft = iso => Math.ceil((new Date(iso + 'T23:59:59') - Date.now()) / 864e5);
const fmtDay = iso => iso ? new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '';
const inDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

function getStatus(idea, key, preset) {
  if (key.startsWith('step|')) { const st = (idea.steps || []).find(s => 'step|' + s.id === key); return st ? (st.done ? 'done' : st.doing ? 'doing' : 'todo') : 'todo'; }
  const p = (idea.points || {})[key]; return (p && p.s) || preset || 'todo';
}
function setStatus(idea, key, s) {
  if (key.startsWith('step|')) { const st = (idea.steps || []).find(x => 'step|' + x.id === key); if (st) { st.done = s === 'done'; st.doing = s === 'doing'; } }
  else { idea.points ||= {}; idea.points[key] = Object.assign({}, idea.points[key] || {}, { s }); }
  idea.updated = Date.now();
}
const hypList = a => A(a && a.hypotheses).map(h => typeof h === 'string' ? { texte: h, source: 'deduit' } : h);
const riskKey = r => 'risk|' + hashTxt(r.risque || r);

function mergeSteps(idea) {
  const a = idea.analyse; if (!a) return;
  const old = idea.steps || [], byText = new Map(old.map(s => [norm(s.text), s]));
  const fresh = [];
  if (a.premier_pas && !A(a.plan).some(p => norm(p.etape || p) === norm(a.premier_pas))) fresh.push({ text: a.premier_pas, source: 'deduit', livrable: '' });
  A(a.plan).forEach(p => fresh.push({ text: typeof p === 'string' ? p : p.etape, livrable: p.livrable || '', source: p.source || 'deduit' }));
  const out = fresh.filter(f => f.text).map(f => {
    const o = byText.get(norm(f.text));
    return o ? Object.assign({}, o, { livrable: f.livrable || o.livrable, source: o.source === 'ajout' ? 'ajout' : f.source }) : { id: uid(), text: f.text, livrable: f.livrable, source: f.source, date: '', done: false };
  });
  const ids = new Set(out.map(s => s.id));
  old.filter(s => s.source === 'ajout' && !ids.has(s.id)).forEach(s => out.push(s));
  idea.steps = out; spreadDates(idea, false);
}
function spreadDates(idea, force) {
  const u = U(idea), todo = (idea.steps || []).filter(s => !s.done && (force || !s.date));
  if (!todo.length) return false;
  const start = new Date(); start.setHours(12, 0, 0, 0);
  let end = u.echeance ? new Date(u.echeance + 'T12:00:00') : null;
  if (!end || end <= start) { if (!force) return false; end = new Date(start.getTime() + 7 * 864e5 * todo.length); }
  const first = Math.min(2 * 864e5, (end - start) / todo.length);
  const span = todo.length > 1 ? (end - start - first) / (todo.length - 1) : 0;
  todo.forEach((s, i) => { s.date = new Date(start.getTime() + first + span * i).toISOString().slice(0, 10); });
  return true;
}
const nextStep = idea => (idea.steps || []).find(s => !s.done);

/* ---------- Liste ---------- */
const STATUS = { brute: 'Brute', structuree: 'Structurée', eprouvee: 'Éprouvée' };
const fmtDate = ts => new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
function updateCount() { $('#count').textContent = ideas.length || ''; }
const matDots = n => '<span class="mdots">' + [1, 2, 3, 4, 5].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('') + '</span>';
function chipsHTML(idea, withStatus) {
  if (!idea.structure) return `<span class="chip2">Brute</span>`;
  const m = maturity(idea), u = U(idea), q = quadrant(u);
  let h = `<span class="chip2 m-${m.ok === 5 ? 'ok' : m.ok >= 3 ? 'mid' : 'low'}">${matDots(m.ok)} ${m.label} · ${m.ok}/5</span>`;
  if (q) h += `<span class="chip2 q">${q}</span>`;
  if (u.echeance) { const d = daysLeft(u.echeance); h += `<span class="chip2 ${d < 0 ? 'late' : d <= 7 ? 'soon' : ''}">Échéance ${fmtDay(u.echeance)}</span>`; }
  if (withStatus && idea.status === 'structuree') h += `<span class="chip2 dim">Non éprouvée</span>`;
  return h;
}

$('#search').addEventListener('input', e => { query = e.target.value.toLowerCase(); renderList(); });
function renderList() {
  const themesOfIdea = i => i.structure ? U(i).themes : ['Non triée'];
  const cats = ['Toutes', ...new Set(ideas.flatMap(i => themesOfIdea(i).length ? themesOfIdea(i) : ['Non triée']))];
  if (!cats.includes(filterCat)) filterCat = 'Toutes';
  $('#filters').innerHTML = cats.map(c => `<button class="chip ${c === filterCat ? 'on' : ''}" data-c="${esc(c)}">${esc(c)}</button>`).join('');
  $('#filters').querySelectorAll('.chip').forEach(b => b.onclick = () => { filterCat = b.dataset.c; renderList(); });
  const list = ideas.filter(i => {
    if (filterCat !== 'Toutes' && !themesOfIdea(i).includes(filterCat)) return false;
    if (!query) return true;
    return (i.raw + ' ' + JSON.stringify(i.structure || '') + ' ' + JSON.stringify(i.steps || '')).toLowerCase().includes(query);
  });
  if (!list.length) {
    $('#list').innerHTML = `<div class="empty"><svg width="64" height="64" viewBox="0 0 24 24"><path fill="#c49be6" d="M9 21h6v-1H9v1zm3-19a7 7 0 0 0-4 12.74V17h8v-2.26A7 7 0 0 0 12 2z"/></svg><div>${ideas.length ? 'Aucun résultat' : 'Aucune idée pour l\u2019instant.<br>Appuie sur le micro pour commencer.'}</div></div>`;
    return;
  }
  $('#list').innerHTML = list.map((i, k) => {
    const s = i.structure, n = nextStep(i);
    return `<div class="card s-${i.status}" data-id="${i.id}" style="animation-delay:${Math.min(k, 10) * 40}ms">
      <h4>${esc(s?.titre || i.raw.slice(0, 60) + (i.raw.length > 60 ? '…' : ''))}</h4>
      <p>${esc(s?.resume || i.raw)}</p>
      <div class="chips2">${chipsHTML(i)}</div>
      ${n ? `<div class="next-line">→ ${esc(n.text)}${n.date ? ` <span>· avant le ${fmtDay(n.date)}</span>` : ''}</div>` : ''}
      <div class="meta"><span>${esc(U(i).themes.join(' · '))}</span><span style="margin-left:auto">${fmtDate(i.created)}</span></div></div>`;
  }).join('');
  $('#list').querySelectorAll('.card').forEach(c => c.onclick = () => { detailTab = 'fiche'; show('detail', c.dataset.id); });
}

/* ---------- Détail ---------- */
let detailTab = 'fiche', editingRaw = false, editingLetter = null;
const ul = arr => (arr = A(arr)).length ? '<ul>' + arr.map(x => `<li>${esc(x)}</li>`).join('') + '</ul>' : '<span class="missing">Rien d\u2019identifié</span>';
const segHTML = (name, opts, cur, cls = '') => `<div class="seg small-seg ${cls}" data-name="${name}">${opts.map(([v, l]) => `<button data-v="${v}" class="${v === cur ? 'on' : ''}">${l}</button>`).join('')}</div>`;
const cta = (txt, id, label) => `<div class="block cta"><p>${txt}</p><button class="btn go" id="${id}">${label}</button></div>`;
const micBtn = id => `<button class="icon-btn mic-sm" id="${id}" aria-label="Dicter"><svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/></svg></button>`;
function bindMic(btnId, taId) {
  const b = document.getElementById(btnId), ta = document.getElementById(taId); if (!b || !ta) return;
  const st = document.createElement('span');
  b.onclick = () => { if (recording) { stopDictation(); return; } startDictation(ta, st, on => b.classList.toggle('rec', on)); };
}

function renderDetail() {
  const idea = ideas.find(i => i.id === openId), box = $('#detail');
  if (!idea) { box.innerHTML = '<div class="empty">Idée introuvable</div>'; return; }
  const s = idea.structure, a = idea.analyse, isBusy = busy.has(idea.id);
  if (a && !idea.steps) mergeSteps(idea);
  let h = `<div class="hero"><div class="hero-top"><h2>${esc(s?.titre || 'Idée brute')}</h2>
      <button class="icon-btn" id="d-menu" aria-label="Actions">⋮</button></div>
    <div class="chips2">${chipsHTML(idea, true)}</div></div>`;

  if (!s) {
    h += saidCard(idea);
    h += isBusy ? `<div class="block"><div class="thinking"><span class="orb"></span>Structuration en cours…</div></div>`
      : cta('L\u2019app va classer l\u2019idée, évaluer son objectif (SMART) et repérer ce qui manque, directement sur l\u2019appareil.', 'd-struct', 'Structurer l\u2019idée');
    box.innerHTML = h; bindDetail(idea); return;
  }
  const tabs = [['fiche', 'Fiche'], ['dev', 'Développer'], ['risques', 'Risques'], ['plan', 'Plan']];
  h += `<div class="tabs4">${tabs.map(([k, l]) => `<button data-t="${k}" class="${detailTab === k ? 'on' : ''}">${l}</button>`).join('')}
    <button data-t="carte" class="tab-map ${detailTab === 'carte' ? 'on' : ''}" aria-label="Carte">◎</button></div>`;
  if (isBusy) h += `<div class="block"><div class="thinking"><span class="orb"></span>Claude travaille sur l\u2019idée…</div></div>`;
  h += `<div class="tab-body" id="tab-body">`;
  if (detailTab === 'fiche') h += ficheTab(idea);
  else if (detailTab === 'dev') h += devTab(idea);
  else if (detailTab === 'risques') h += risquesTab(idea);
  else if (detailTab === 'plan') h += planTab(idea);
  else h += mapSection();
  h += `</div>`;
  box.innerHTML = h;
  bindDetail(idea);
  if (detailTab === 'carte') initMap(idea);
}

function saidCard(idea) {
  const gen = idea.complements.filter(c => !c.letter);
  if (editingRaw) return `<div class="block"><div class="block-head"><h3>Ce que tu as dit</h3></div>
    <textarea id="raw-edit" rows="6">${esc(idea.raw)}</textarea>
    <div class="row" style="margin-top:10px"><button class="btn" id="raw-cancel">Annuler</button><button class="btn primary" id="raw-save">Enregistrer</button></div></div>`;
  return `<div class="block said"><div class="block-head"><h3>Ce que tu as dit</h3><button class="link" id="raw-edit-btn">Modifier</button></div>
    <div class="raw">${esc(idea.raw)}</div>
    ${gen.map(c => `<div class="raw prec">+ ${esc(c.text)}</div>`).join('')}
    <div id="comp-zone" hidden><div class="ans-row"><textarea id="comp-text" rows="2" placeholder="Ajouter une précision…"></textarea>${micBtn('comp-mic')}</div>
      <div class="row" style="margin-top:8px"><button class="btn" id="comp-cancel">Annuler</button><button class="btn primary" id="comp-add">Ajouter</button></div></div>
    <button class="btn ghost" id="comp-open">🎙 Compléter</button></div>`;
}

function ficheTab(idea) {
  const s = idea.structure, m = maturity(idea), u = U(idea), q = quadrant(u);
  const cats = settings.categories.length ? settings.categories : DEFAULT_CATS;
  const allThemes = [...new Set([...cats, ...u.themes])];
  let h = saidCard(idea);
  h += `<div class="block"><div class="block-head"><h3>Synthèse</h3><span class="eng ${s.engine === 'claude' ? 'e-claude' : 'e-local'}">${s.engine === 'claude' ? 'Analyse Claude' : 'Analyse locale'}</span></div><p class="syn">${esc(s.resume)}</p>
    <div class="kw">${s.domaine ? `<span class="dom">${esc(s.domaine)}${s.domaine2 ? ' · ' + esc(s.domaine2) : ''}</span>` : ''}${A(s.mots_cles).map(k => `<span>${esc(k)}</span>`).join('')}</div>
    ${A(s.specs).length ? `<p class="small" style="margin:10px 0 0"><b>Caractéristiques visées :</b> ${A(s.specs).map(esc).join(', ')}</p>` : ''}
    ${A(s.composants).length ? `<p class="small" style="margin:6px 0 0"><b>Composants cités :</b> ${A(s.composants).map(esc).join(', ')}</p>` : ''}
    ${A(s.contraintes).length ? `<p class="small" style="margin:6px 0 0"><b>Contraintes :</b> ${A(s.contraintes).map(esc).join(' · ')}</p>` : ''}</div>`;
  h += `<div class="block"><div class="block-head"><h3>Maturité</h3><span class="small muted">${m.hint}</span></div>
    <div class="mat-score"><b>${m.ok}</b><span>sur 5 critères · ${m.label}</span></div>
    <div class="meter"><span style="width:${Math.round(m.w * 100)}%;background:${stateColor(m.w)}"></span></div>
    <div class="crit-list">${m.st.map(x => `<div class="crit e-${x.etat}" data-goto="dev">
      <span class="crit-ic">${x.etat === 'ok' ? '✓' : x.etat === 'partiel' ? '½' : '!'}</span>
      <div><b>${x.L} · ${x.label}</b><small>${x.answer ? 'Ta réponse : ' + esc(x.answer) : x.extrait ? 'Repéré : ' + esc(x.extrait) : esc(x.manque || 'Non précisé')}</small></div></div>`).join('')}</div></div>`;
  h += `<div class="block"><h3>Classement</h3><div class="form-grid">
    <label>Type</label><select id="u-type">${NATURES.map(n => `<option ${n === u.type ? 'selected' : ''}>${n}</option>`).join('')}</select>
    <label>Thèmes</label><div class="theme-pick">${allThemes.map(t => `<button class="tpill ${u.themes.includes(t) ? 'on' : ''}" data-th="${esc(t)}">${esc(t)}</button>`).join('')}<button class="link" id="u-themes-edit">Modifier</button></div>
    <label>Échéance</label><div class="row-inline"><input type="date" id="u-due" value="${esc(u.echeance)}">${u.echeance ? `<span class="small ${daysLeft(u.echeance) < 0 ? 'txt-red' : 'muted'}">${daysLeft(u.echeance) < 0 ? 'dépassée de ' + (-daysLeft(u.echeance)) + ' j' : 'dans ' + daysLeft(u.echeance) + ' j'}</span>` : ''}</div>
    <label>Priorité</label><div class="row-inline"><button class="tpill ${u.important ? 'on' : ''}" id="u-imp">Important</button><button class="tpill ${u.urgent ? 'on' : ''}" id="u-urg">Urgent</button></div>
  </div><p class="small quad">${q ? `<b>${q}</b> · ${u.important ? 'important' : 'pas important'}, ${u.urgent ? 'urgent' : 'pas urgent'}` : 'Indique si c\u2019est important et/ou urgent pour situer la priorité.'}</p></div>`;
  return h;
}

function devTab(idea) {
  const m = maturity(idea), a = idea.analyse;
  const pending = idea.complements.some(c => c.letter && c.date > (idea.structuredAt || 0));
  let h = `<div class="block"><h3>Questions pour cadrer</h3><p class="small muted" style="margin:0 0 6px">Une question par critère SMART. Ta réponse règle le critère tout de suite.</p>`;
  m.st.forEach(x => {
    const editing = editingLetter === x.k || (!x.answer && x.etat !== 'ok');
    h += `<div class="qrow e-${x.etat}"><div class="q-head"><b>${x.L} · ${x.label}</b><span class="q-q">${LETTER_Q[x.k]}</span><span class="pill-st">${x.etat === 'ok' ? (x.answer ? 'réglé par toi' : 'rempli') : x.etat}</span></div>
      ${x.extrait ? `<span class="found">Repéré : ${esc(x.extrait)}</span>` : ''}
      ${x.answer && editingLetter !== x.k ? `<div class="answer">Ta réponse : ${esc(x.answer)} <button class="link" data-edit="${x.k}">Modifier</button></div>` : ''}
      ${!x.answer && x.etat !== 'ok' && x.manque ? `<div class="ask">${esc(x.manque)}</div>` : ''}
      ${editing ? `<div class="ans-row"><textarea id="ans-${x.k}" rows="1" placeholder="Préciser ou corriger…">${esc(editingLetter === x.k ? x.answer : '')}</textarea>${micBtn('mic-' + x.k)}<button class="btn primary sm" data-save="${x.k}">OK</button></div>`
        : (!x.answer ? `<button class="link" data-edit="${x.k}">Préciser ou corriger</button>` : '')}
    </div>`;
  });
  h += `</div>`;
  if (A(idea.structure.questions_auteur).length) h += `<div class="block"><h3>Tes questions</h3>${ul(idea.structure.questions_auteur)}<p class="small muted" style="margin:8px 0 0">Elles restent ouvertes tant que tu n\u2019y as pas répondu (bouton Compléter de la fiche).</p></div>`;
  if (pending && idea.structure.engine === 'claude') h += cta('Tes réponses sont prises en compte dans le score. Pour que Claude les intègre au reste de l\u2019analyse, relance la structuration.', 'd-restruct', 'Restructurer avec mes réponses');
  h += `<div class="block"><h3>Hypothèses à vérifier</h3>`;
  if (!a) h += `<p class="small muted">Disponibles après l\u2019analyse (onglet Risques ou Plan).</p>`;
  else {
    h += `<p class="small muted" style="margin:0 0 6px">Ce que l\u2019idée tient pour acquis. À vérifier avant d\u2019y mettre du temps ou de l\u2019argent.</p>`;
    hypList(a).forEach(hy => {
      const key = 'hyp|' + hashTxt(hy.texte), st = getStatus(idea, key);
      h += `<div class="hyp st-${st}"><div>${esc(hy.texte)} <span class="src">· ${SRC_HINT[hy.source] || 'à confirmer'}</span></div>
        ${segHTML('hyp', [['todo', 'À vérifier'], ['done', 'Vérifiée'], ['false', 'Fausse']], st, 'hyp-seg" data-key="' + key)}</div>`;
    });
  }
  return h + `</div>`;
}

function risquesTab(idea) {
  const s = idea.structure, a = idea.analyse;
  if (!a) return cta('Risques, faiblesses, atouts et hypothèses à vérifier, à partir de ton texte et de listes types adaptées au domaine.', 'd-analyse', 'Éprouver l\u2019idée');
  const risks = A(a.risques), fc = a.faisabilite === 'bonne' ? 'ok' : a.faisabilite === 'moyenne' ? 'mid' : 'low';
  let h = `<div class="block verdict v-${fc}"><h3>Verdict</h3><div class="v-big">Faisabilité ${esc(a.faisabilite)}</div><div class="small">Point bloquant : ${esc(a.point_bloquant)}</div></div>`;
  const q = (cls, t, arr) => `<div class="swot-q ${cls}"><b>${t}</b>${arr.length ? '<ul>' + arr.map(x => `<li>${esc(x)}</li>`).join('') + '</ul>' : '<span class="missing">Rien d\u2019identifié</span>'}</div>`;
  h += `<div class="block"><h3>Diagnostic SWOT</h3><div class="swot">
    ${q('q-s', 'Forces', A(a.forces).length ? A(a.forces) : A(s.ressources))}
    ${q('q-w', 'Faiblesses', [...A(a.faiblesses), ...A(s.contraintes)])}
    ${q('q-o', 'Opportunités', A(a.opportunites))}
    ${q('q-t', 'Menaces', A(a.dependances).map(d => 'Dépend de : ' + d))}</div>
    <p class="small muted" style="margin:8px 0 0">Les risques détaillés sont ci-dessous, classés interne ou externe.</p></div>`;
  h += `<div class="block"><h3>Risques</h3>${risks.map(r => {
    const key = riskKey(r), st = getStatus(idea, key);
    return `<div class="risk g-${esc(r.gravite)} st-${st}"><b>${esc(r.risque)}</b>
      <span class="pill">gravité ${esc(r.gravite)}</span><span class="pill">probabilité ${esc(r.probabilite)}</span><span class="pill">${r.origine === 'interne' ? 'interne' : 'externe'}</span>${r.liste ? '<span class="pill">liste type</span>' : ''}
      <small>Signal : ${esc(r.signal)}</small><small>Parade : ${esc(r.parade)}</small>
      ${segHTML('risk', [['todo', 'À traiter'], ['doing', 'En cours'], ['done', 'Maîtrisé']], st, 'risk-seg" data-key="' + key)}</div>`;
  }).join('') || '<span class="missing">Aucun risque identifié</span>'}</div>`;
  return h;
}

function planTab(idea) {
  const a = idea.analyse;
  if (!a) return cta('Ton objectif découpé en étapes, en partant des actions que tu as citées.', 'd-analyse', 'Construire le plan');
  const steps = idea.steps || [], n = nextStep(idea), done = steps.filter(s => s.done).length, u = U(idea);
  let h = n ? `<div class="block next-card"><span class="k">Prochaine action</span><b>${esc(n.text)}</b>${n.date ? `<small>Avant le ${fmtDay(n.date)}</small>` : ''}</div>`
    : `<div class="block next-card"><span class="k">Plan terminé</span><b>Toutes les étapes sont faites.</b></div>`;
  h += `<div class="block"><div class="block-head"><h3>Plan d\u2019action</h3><span class="small muted">${done}/${steps.length}</span></div>
    <p class="small muted" style="margin:0 0 8px">${u.echeance ? `Dates réparties jusqu\u2019à l\u2019échéance (${fmtDay(u.echeance)}). ` : ''}« Toi » : tiré de ton idée · « Méthode » : étape type pour ce genre de projet · « Déduit » : proposé par Claude · « Ajout » : ajouté par toi.</p>
    ${steps.map(st => `<div class="step ${st.done ? 'done' : ''}" data-id="${st.id}">
      <button class="cbox ${st.done ? 'on' : ''}" data-check="${st.id}" aria-label="Fait">${st.done ? '✓' : ''}</button>
      <div class="step-body"><div class="step-t">${esc(st.text)}</div>
        <div class="step-m"><span class="src s-${st.source}">${SRC_LABEL[st.source] || 'Déduit'}</span> · <label class="date-l">${st.date ? 'avant le ' + fmtDay(st.date) : 'sans date'}<input type="date" data-date="${st.id}" value="${esc(st.date || '')}"></label></div>
        ${st.livrable ? `<div class="step-l">→ ${esc(st.livrable)}</div>` : ''}</div>
      <button class="x" data-del="${st.id}" aria-label="Supprimer">×</button></div>`).join('')}
    <div class="ans-row" style="margin-top:10px"><input type="text" id="step-new" placeholder="Ajouter une étape"><button class="btn primary sm" id="step-add">Ajouter</button></div>
    <button class="link" id="step-spread" style="margin-top:8px">${u.echeance ? 'Répartir les dates jusqu\u2019à l\u2019échéance' : 'Dater les étapes (une par semaine)'}</button></div>`;
  if (a.test) h += `<div class="block"><h3>Test avant d\u2019investir</h3>${esc(a.test)}</div>`;
  const crit = A(a.criteres_reussite);
  if (crit.length) h += `<div class="block"><h3>Critères de réussite</h3>${crit.map(c => { const key = 'crit|' + hashTxt(c), st = getStatus(idea, key);
    return `<div class="step ${st === 'done' ? 'done' : ''}"><button class="cbox ${st === 'done' ? 'on' : ''}" data-crit="${key}">${st === 'done' ? '✓' : ''}</button><div class="step-body"><div class="step-t">${esc(c)}</div></div></div>`; }).join('')}</div>`;
  h += `<div class="block"><h3>Passer à l\u2019action</h3><div class="row wrap">
    ${CAN_ICS ? '<button class="btn primary" id="d-ics">Exporter vers l\u2019agenda</button>' : ''}<button class="btn" id="d-copy-plan">Copier le plan</button></div>
    ${CAN_ICS ? '<p class="small muted" style="margin:8px 0 0">Crée un fichier .ics avec les étapes datées et non faites, à ouvrir avec Google Agenda ou l\u2019agenda du téléphone.</p>' : ''}</div>`;
  return h;
}

function bindDetail(idea) {
  const on = (sel, fn) => { const el = $(sel); if (el) el.onclick = fn; };
  const rerender = () => { persistIdea(idea); renderDetail(); };
  on('#d-menu', () => openMenu(idea));
  on('#d-struct', () => runStructure(idea));
  on('#d-restruct', () => runStructure(idea));
  on('#d-analyse', () => runAnalyse(idea));
  document.querySelectorAll('.tabs4 button').forEach(b => b.onclick = () => { detailTab = b.dataset.t; editingLetter = null; renderDetail(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  document.querySelectorAll('[data-goto]').forEach(el => el.onclick = () => { detailTab = el.dataset.goto; renderDetail(); });
  // Ce que tu as dit
  on('#raw-edit-btn', () => { editingRaw = true; renderDetail(); });
  on('#raw-cancel', () => { editingRaw = false; renderDetail(); });
  on('#raw-save', () => { const v = $('#raw-edit').value.trim(); if (v) { idea.raw = v; idea.updated = Date.now(); } editingRaw = false;
    if (idea.structure && idea.structure.engine !== 'claude') { structureLocal(idea, true); toast('Texte modifié et réanalysé'); } else { rerender(); toast('Texte modifié : restructure pour mettre l\u2019analyse à jour'); } });
  on('#comp-open', () => { $('#comp-zone').hidden = false; $('#comp-open').hidden = true; $('#comp-text').focus(); });
  on('#comp-cancel', () => { if (recording) stopDictation(); $('#comp-zone').hidden = true; $('#comp-open').hidden = false; });
  on('#comp-add', async () => {
    if (recording) await stopDictation();
    const t = $('#comp-text').value.trim(); if (!t) return;
    idea.complements.push({ date: Date.now(), text: t }); idea.updated = Date.now();
    if (idea.structure && idea.structure.engine !== 'claude') { structureLocal(idea, true); toast('Précision ajoutée et prise en compte'); } else { rerender(); toast('Précision ajoutée'); }
  });
  bindMic('comp-mic', 'comp-text');
  // Classement
  const ut = $('#u-type'); if (ut) ut.onchange = () => setUser(idea, { type: ut.value });
  document.querySelectorAll('.theme-pick .tpill').forEach(b => b.onclick = () => {
    const cur = U(idea).themes, t = b.dataset.th;
    setUser(idea, { themes: cur.includes(t) ? cur.filter(x => x !== t) : [...cur, t] }); renderDetail();
  });
  on('#u-themes-edit', () => show('settings'));
  const ud = $('#u-due'); if (ud) ud.onchange = () => { setUser(idea, { echeance: ud.value }); renderDetail(); };
  on('#u-imp', () => { setUser(idea, { important: !U(idea).important }); renderDetail(); });
  on('#u-urg', () => { setUser(idea, { urgent: !U(idea).urgent }); renderDetail(); });
  // Développer
  document.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => { editingLetter = b.dataset.edit; renderDetail(); const ta = $('#ans-' + editingLetter); if (ta) ta.focus(); });
  document.querySelectorAll('[data-save]').forEach(b => b.onclick = async () => {
    if (recording) await stopDictation();
    const k = b.dataset.save, v = $('#ans-' + k).value.trim(); if (!v) return;
    idea.complements = idea.complements.filter(c => c.letter !== k);
    idea.complements.push({ date: Date.now(), text: v, letter: k });
    editingLetter = null; idea.updated = Date.now(); vibrate(20);
    if (idea.structure && idea.structure.engine !== 'claude') structureLocal(idea, true); else rerender();
  });
  SMART_KEYS.forEach(([k]) => bindMic('mic-' + k, 'ans-' + k));
  document.querySelectorAll('.hyp-seg, .risk-seg').forEach(sg => sg.querySelectorAll('button').forEach(b => b.onclick = () => {
    setStatus(idea, sg.dataset.key, b.dataset.v); vibrate(12); rerender();
  }));
  // Plan
  document.querySelectorAll('[data-check]').forEach(b => b.onclick = () => {
    const st = idea.steps.find(x => x.id === b.dataset.check); st.done = !st.done; st.doing = false; idea.updated = Date.now(); vibrate(st.done ? [15, 30, 15] : 12); rerender();
  });
  document.querySelectorAll('[data-crit]').forEach(b => b.onclick = () => { const k = b.dataset.crit; setStatus(idea, k, getStatus(idea, k) === 'done' ? 'todo' : 'done'); rerender(); });
  document.querySelectorAll('[data-date]').forEach(inp => inp.onchange = () => { const st = idea.steps.find(x => x.id === inp.dataset.date); st.date = inp.value; idea.updated = Date.now(); rerender(); });
  document.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    if (!(await ask('Supprimer cette étape ?', 'Supprimer'))) return;
    idea.steps = idea.steps.filter(x => x.id !== b.dataset.del); rerender();
  });
  const addStep = () => { const v = $('#step-new').value.trim(); if (!v) return; idea.steps.push({ id: uid(), text: v, livrable: '', source: 'ajout', date: '', done: false }); rerender(); };
  on('#step-add', addStep);
  const sn = $('#step-new'); if (sn) sn.onkeydown = e => { if (e.key === 'Enter') addStep(); };
  on('#step-spread', () => { spreadDates(idea, true); rerender(); toast('Dates réparties'); });
  on('#d-ics', () => exportIcs(idea));
  on('#d-copy-plan', async () => { try { await navigator.clipboard.writeText(planText(idea)); toast('Plan copié'); } catch { toast('Copie impossible'); } });
}

/* Menu ⋮ */
function openMenu(idea) {
  const s = idea.structure, a = idea.analyse, sheet = $('#sheet');
  const items = [
    s ? ['m-restruct', 'Restructurer', engineMode() === 'claude' && CLAUDE_OK() ? 'Par Claude' : 'Analyse locale, hors ligne'] : ['m-restruct', 'Structurer', ''],
    s ? ['m-analyse', a ? 'Ré-éprouver' : 'Éprouver', a ? 'Refait risques, SWOT et plan (tes étapes cochées sont gardées)' : 'Risques, SWOT et plan'] : null,
    s && CLAUDE_OK() ? ['m-deep', 'Analyse approfondie (Claude)', CLAUDE_HINT] : null,
    ['m-pdf-fiche', 'PDF fiche', 'Document A4 de l\u2019idée'],
    s ? ['m-pdf-carte', 'PDF carte', 'Carte et détail par indicateur'] : null,
    ['m-copy', 'Copier le texte', 'Version texte de la fiche'],
    s ? ['m-report', 'Signaler une erreur', 'Domaine, date, étape ou risque à côté : sert à corriger le moteur'] : null,
    ['m-del', 'Supprimer l\u2019idée', '']
  ].filter(Boolean);
  $('#sheet-body').innerHTML = `<div class="menu-list">${items.map(([id, l, d]) => `<button class="menu-item ${id === 'm-del' ? 'danger' : ''}" id="${id}"><b>${l}</b>${d ? `<small>${d}</small>` : ''}</button>`).join('')}</div>`;
  const close = () => { sheet.classList.remove('open'); setTimeout(() => (sheet.hidden = true), 250); };
  sheet.onclick = e => { if (e.target === sheet) close(); };
  const act = (id, fn) => { const el = $('#' + id); if (el) el.onclick = () => { close(); fn(el); }; };
  act('m-restruct', () => runStructure(idea));
  act('m-analyse', () => runAnalyse(idea));
  act('m-deep', () => runDeep(idea));
  act('m-pdf-fiche', () => runPdf('fiche', idea, $('#d-menu')));
  act('m-pdf-carte', () => runPdf('carte', idea, $('#d-menu')));
  act('m-copy', () => shareIdea(idea));
  act('m-report', () => openReport(idea));
  act('m-del', async () => {
    if (!(await ask('Supprimer cette idée ?', 'Supprimer'))) return;
    ideas = ideas.filter(i => i.id !== idea.id); removeIdeaStore(idea); updateCount(); show('list'); toast('Idée supprimée');
  });
  sheet.hidden = false; requestAnimationFrame(() => sheet.classList.add('open'));
}

/* Agenda (.ics) et textes */
function planText(idea) {
  const s = idea.structure || {}, L = ['Plan : ' + (s.titre || 'Idée')];
  (idea.steps || []).forEach((st, i) => L.push(`${st.done ? '[x]' : '[ ]'} ${i + 1}. ${st.text}${st.date ? ' (avant le ' + fmtDay(st.date) + ')' : ''}${st.livrable ? ' → ' + st.livrable : ''}`));
  return L.join('\n');
}
function exportIcs(idea) {
  const steps = (idea.steps || []).filter(s => !s.done && s.date);
  if (!steps.length) { toast('Aucune étape datée à exporter : date les étapes d\u2019abord'); return; }
  const s = idea.structure || {}, esc2 = t => String(t).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const ev = steps.map(st => {
    const d = st.date.replace(/-/g, ''), d2 = new Date(st.date + 'T12:00:00'); d2.setDate(d2.getDate() + 1);
    return ['BEGIN:VEVENT', `UID:forge-${idea.id}-${st.id}@forge`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${d2.toISOString().slice(0, 10).replace(/-/g, '')}`,
      `SUMMARY:${esc2(st.text)}`, `DESCRIPTION:${esc2((s.titre ? 'Idée : ' + s.titre : '') + (st.livrable ? '\nLivrable : ' + st.livrable : ''))}`, 'TRANSP:TRANSPARENT', 'END:VEVENT'].join('\r\n');
  });
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Forge//FR', 'CALSCALE:GREGORIAN', ...ev, 'END:VCALENDAR'].join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar' }), aEl = document.createElement('a');
  aEl.href = URL.createObjectURL(blob); aEl.download = `forge-plan-${slug(s.titre)}.ics`;
  document.body.appendChild(aEl); aEl.click(); aEl.remove(); setTimeout(() => URL.revokeObjectURL(aEl.href), 2000);
  toast(steps.length + ' étape(s) exportée(s) vers l\u2019agenda');
}

/* ---------- Carte mentale V3 : SMART / SWOT / Action ---------- */
const IMP = { haute: 3, moyenne: 2, basse: 1 };
const IMP_COL = { haute: '#ff7a8a', moyenne: '#f2cf6b', basse: '#8f86a3' };
const ST_LABEL = { todo: 'À faire', doing: 'En cours', done: 'Résolu', false: 'Fausse' };
const ST_W = { todo: 0, doing: 0.5, done: 1, false: 0 };
const ASSET_COL = '#b794f6', NEUTRAL_COL = '#6b6280';
const LEAF_W = 210, PAD_Y = 9, R_CENTER = 60, R_BRANCH = 36;
const SMART_KEYS = [['specifique', 'S', 'Spécifique'], ['mesurable', 'M', 'Mesurable'], ['atteignable', 'A', 'Atteignable'], ['pertinent', 'R', 'Pertinent'], ['temporel', 'T', 'Temporel']];
const mapViews = {};
let mapState = null;

const hashTxt = t => { let h = 5381; for (const c of String(t)) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0; return h.toString(36); };
function stateColor(p, l = 60) { return `hsl(${Math.round(Math.max(0, Math.min(1, p)) * 145)} 78% ${l}%)`; }
function wrap(text, n, max) {
  const words = String(text).split(/\s+/), lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > n && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  if (lines.length > max) { lines.length = max; lines[max - 1] = lines[max - 1].replace(/.{0,2}$/, '') + '…'; }
  return lines.map(l => l.length > n + 4 ? l.slice(0, n + 2) + '…' : l);
}
const gravImp = g => g === 'élevée' ? 'haute' : g === 'faible' ? 'basse' : 'moyenne';

/* Évaluation SMART : celle de Claude, ou reconstituée pour les idées structurées avec la V1 */
function smartOf(s, a) {
  if (s.smart && typeof s.smart === 'object') return s.smart;
  const f = (v, q) => v ? { etat: 'ok', element: v, manque: '' } : { etat: 'absent', element: '', manque: q };
  return {
    specifique: f(s.objectif, 'Formuler précisément le résultat visé'),
    mesurable: a && A(a.criteres_reussite).length ? { etat: 'ok', element: '', manque: '' } : f('', 'Définir comment constater la réussite'),
    atteignable: f(A(s.ressources).join(', '), 'Identifier les moyens nécessaires'),
    pertinent: f([s.pourquoi, s.pour_qui].filter(Boolean).join(' · '), 'Préciser pourquoi et pour qui'),
    temporel: f(s.echeance, 'Fixer une échéance')
  };
}

/* Modèle de la carte V3 : chaque point vient d'une seule source et partage son statut avec les onglets */
function modelOf(idea) {
  const s = idea.structure || {}, a = idea.analyse;
  if (a && !idea.steps) mergeSteps(idea);
  const st = smartState(idea), risks = A(a && a.risques);
  const riskItem = r => ({ key: riskKey(r), text: r.risque || String(r), imp: gravImp(r.gravite), sub: [r.signal && 'Signal : ' + r.signal, r.parade && 'Parade : ' + r.parade].filter(Boolean).join('\n') });
  const smartSub = x => {
    const items = [];
    if (x.extrait) items.push({ text: 'Repéré : ' + x.extrait, imp: 'moyenne', preset: 'done' });
    if (x.answer) items.push({ text: 'Ta réponse : ' + x.answer, imp: 'moyenne', preset: 'done' });
    if (!x.answer && x.claude !== 'ok') items.push({ text: x.manque || (x.label + ' : à préciser'), imp: x.claude === 'absent' ? 'haute' : 'moyenne' });
    return { key: 'smart-' + x.k, short: x.L, label: x.label, counted: true, items };
  };
  const B = [
    { key: 'smart', label: 'Objectif SMART', short: 'SMART', subs: st.map(smartSub) },
    {
      key: 'swot', label: 'Diagnostic SWOT', short: 'SWOT', subs: [
        { key: 'swot-f', short: '+', label: 'Forces', counted: false, items: (a && A(a.forces).length ? A(a.forces) : A(s.ressources)).map(t => ({ text: t, imp: 'moyenne' })) },
        { key: 'swot-w', short: '−', label: 'Faiblesses', counted: true, items: [
          ...A(a && a.faiblesses).map(t => ({ text: t, imp: 'moyenne' })),
          ...A(s.contraintes).map(t => ({ text: 'Contrainte : ' + t, imp: 'moyenne' })),
          ...risks.filter(r => r.origine === 'interne').map(riskItem),
          ...hypList(a).map(h => ({ key: 'hyp|' + hashTxt(h.texte), text: 'Hypothèse : ' + h.texte, imp: 'basse', hyp: true }))
        ] },
        { key: 'swot-o', short: '↗', label: 'Opportunités', counted: false, items: A(a && a.opportunites).map(t => ({ text: t, imp: 'moyenne' })) },
        { key: 'swot-t', short: '!', label: 'Menaces', counted: true, items: [
          ...risks.filter(r => r.origine !== 'interne').map(riskItem),
          ...A(a && a.dependances).map(d => ({ text: 'Dépend de : ' + d, imp: 'moyenne' }))
        ] }
      ]
    },
    {
      key: 'action', label: 'Passage à l’action', short: 'ACTION', subs: [
        { key: 'act-plan', short: '≡', label: 'Plan', counted: true, items: (idea.steps || []).map((x, i) => ({ key: 'step|' + x.id, text: x.text, sub: [x.date && 'Avant le ' + fmtDay(x.date), x.livrable && 'Livrable : ' + x.livrable].filter(Boolean).join('\n'), imp: i === 0 ? 'haute' : 'moyenne' })) },
        { key: 'act-test', short: '?', label: 'Test', counted: true, items: a && a.test ? [{ key: 'test|' + hashTxt(a.test), text: a.test, imp: 'haute' }] : [] },
        { key: 'act-crit', short: '★', label: 'Réussite', counted: true, items: A(a && a.criteres_reussite).map(c => ({ key: 'crit|' + hashTxt(c), text: c, imp: 'basse' })) }
      ]
    }
  ];
  idea.points ||= {};
  const weigh = items => {
    const real = items.filter(i => !i.placeholder), tot = real.reduce((n, i) => n + IMP[i.imp], 0);
    return tot ? real.reduce((n, i) => n + IMP[i.imp] * ST_W[i.status], 0) / tot : null;
  };
  B.forEach(b => {
    b.subs.forEach(sb => {
      sb.items = sb.items.filter(i => i && i.text);
      if (!sb.items.length) sb.items = [{ text: a ? 'Rien d’identifié pour l’instant' : 'À explorer : lance « Éprouver »', imp: 'basse', placeholder: true }];
      sb.branch = b;
      sb.items.forEach(it => {
        it.key = it.key || sb.key + '|' + hashTxt(it.text);
        const p = idea.points[it.key] || {};
        it.status = it.placeholder ? 'todo' : getStatus(idea, it.key, it.preset);
        it.imp = p.i || (it.status === 'false' ? 'haute' : it.imp); it.note = p.n || ''; it.theme = sb;
      });
      sb.real = sb.items.filter(i => !i.placeholder);
      sb.progress = sb.counted ? weigh(sb.items) : null;
      sb.color = !sb.counted ? (sb.real.length ? ASSET_COL : NEUTRAL_COL) : sb.progress === null ? NEUTRAL_COL : stateColor(sb.progress);
      sb.done = sb.real.filter(i => i.status === 'done').length;
      sb.open = sb.counted ? sb.real.filter(i => i.status !== 'done') : [];
      sb.urgent = sb.open.filter(i => i.imp === 'haute').length;
    });
    b.progress = weigh(b.subs.filter(x => x.counted).flatMap(x => x.items));
    b.color = b.progress === null ? NEUTRAL_COL : stateColor(b.progress);
  });
  const counted = B.flatMap(b => b.subs.filter(x => x.counted).flatMap(x => x.items));
  return { branches: B, subs: B.flatMap(b => b.subs), progress: weigh(counted) || 0 };
}

/* Disposition : centre → 3 branches → sous-indicateurs en couronne */
function layoutMap(M, expanded) {
  const N = M.subs.length;
  M.subs.forEach(sb => { sb.r = Math.min(36, 23 + 3 * Math.sqrt(sb.real.length)); });
  const rmax = Math.max(...M.subs.map(x => x.r));
  const R2 = Math.max(225, (N * (2 * rmax + 30)) / (2 * Math.PI)), R1 = Math.min(122, R2 * 0.52);
  let ang = -Math.PI / 2 - (M.branches[0].subs.length / N) * Math.PI;
  M.branches.forEach(b => {
    const sector = (b.subs.length / N) * 2 * Math.PI;
    b.a = ang + sector / 2; b.x = R1 * Math.cos(b.a); b.y = R1 * Math.sin(b.a);
    b.subs.forEach((sb, j) => {
      sb.a = ang + (j + 0.5) * sector / b.subs.length;
      sb.x = R2 * Math.cos(sb.a); sb.y = R2 * Math.sin(sb.a);
      sb.dir = Math.cos(sb.a) >= -0.01 ? 1 : -1;
    });
    ang += sector;
  });
  // cadre serré autour des bulles et de leurs libellés, pour une vue d'ensemble plus lisible
  let x0 = -R_CENTER - 12, x1 = R_CENTER + 12, y0 = -R_CENTER - 12, y1 = R_CENTER + 12;
  M.subs.forEach(sb => {
    const cx = Math.cos(sb.a), lw = sb.label.length * 7.4 + 14;
    let a = sb.x - sb.r - 8, b = sb.x + sb.r + 8;
    if (Math.abs(cx) < 0.3) { a = Math.min(a, sb.x - lw / 2); b = Math.max(b, sb.x + lw / 2); }
    else if (cx > 0) b = Math.max(b, sb.x + sb.r + lw); else a = Math.min(a, sb.x - sb.r - lw);
    x0 = Math.min(x0, a); x1 = Math.max(x1, b);
    y0 = Math.min(y0, sb.y - sb.r - 26); y1 = Math.max(y1, sb.y + sb.r + 26);
  });
  const all = { x: x0 - 12, y: y0 - 12, w: x1 - x0 + 24, h: y1 - y0 + 24 };
  const t = M.subs.find(x => x.key === expanded);
  if (t) {
    t.items.forEach(it => { it.lines = wrap(it.text, 25, 3); it.h = 20 + it.lines.length * 16; });
    const stack = t.items.reduce((n, i) => n + i.h + PAD_Y, 0) - PAD_Y;
    let yy = t.y - stack / 2;
    const x0 = t.x + t.dir * (t.r + 56);
    t.items.forEach(it => { it.x = x0; it.y = yy; it.left = t.dir > 0 ? x0 : x0 - LEAF_W; yy += it.h + PAD_Y; });
    const xs = [t.x - t.dir * (t.r + 10), x0 + t.dir * LEAF_W];
    t.box = { x: Math.min(...xs) - 16, y: Math.min(t.y - t.r - 40, t.y - stack / 2) - 16, w: Math.abs(xs[1] - xs[0]) + 32, h: Math.max(stack, 2 * t.r + 50) + 40 };
  }
  return all;
}

function arc(r, p) { const c = 2 * Math.PI * r; return `stroke-dasharray="${(c * Math.min(1, Math.max(0, p || 0))).toFixed(1)} ${c.toFixed(1)}"`; }
const curve = (x1, y1, x2, y2, bend) => {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
  return `M${x1.toFixed(1)},${y1.toFixed(1)} Q${(mx - dy / L * bend).toFixed(1)},${(my + dx / L * bend).toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`;
};

function mapInner(idea, M, expanded) {
  const s = idea.structure || {};
  const openSub = M.subs.find(x => x.key === expanded);
  let links = '', nodes = '', leaves = '';
  M.branches.forEach((b, bi) => {
    const ux = Math.cos(b.a), uy = Math.sin(b.a), bdim = openSub && openSub.branch !== b;
    links += `<path class="mm-link${bdim ? ' dim' : ''}" style="animation-delay:${bi * 70}ms" d="${curve(ux * R_CENTER, uy * R_CENTER, b.x - ux * R_BRANCH, b.y - uy * R_BRANCH, 0)}" stroke="${b.color}" stroke-width="4.5"/>`;
    b.subs.forEach((sb, j) => {
      const open = sb.key === expanded, dim = expanded && !open;
      const vx = sb.x - b.x, vy = sb.y - b.y, vl = Math.hypot(vx, vy);
      links += `<path class="mm-link${dim ? ' dim' : ''}" style="animation-delay:${120 + bi * 70 + j * 40}ms" d="${curve(b.x + vx / vl * R_BRANCH, b.y + vy / vl * R_BRANCH, sb.x - vx / vl * sb.r, sb.y - vy / vl * sb.r, 10)}" stroke="${sb.color}" stroke-width="${open ? 3 : 2.2}"/>`;
      const sx = Math.cos(sb.a), sy = Math.sin(sb.a);
      let lx, ly, anchor;
      if (open) { lx = sb.x; ly = sb.y - sb.r - 14; anchor = 'middle'; }
      else {
        lx = sb.x + sx * (sb.r + 11); ly = sb.y + sy * (sb.r + 11) + 5;
        anchor = Math.abs(sx) < 0.3 ? 'middle' : sx > 0 ? 'start' : 'end';
        if (Math.abs(sx) < 0.3) ly += sy > 0 ? 8 : -2;
      }
      const inner = sb.counted
        ? `<text x="${sb.x}" y="${sb.y - 1}" text-anchor="middle" class="mm-short">${esc(sb.short)}</text>
           <text x="${sb.x}" y="${sb.y + 14}" text-anchor="middle" class="mm-count">${sb.progress === null ? '—' : Math.round(sb.progress * 100) + '%'}</text>`
        : `<text x="${sb.x}" y="${sb.y - 1}" text-anchor="middle" class="mm-short">${esc(sb.short)}</text>
           <text x="${sb.x}" y="${sb.y + 14}" text-anchor="middle" class="mm-count">${sb.real.length}</text>`;
      nodes += `<g class="mm-theme${open ? ' open' : ''}${dim ? ' dim' : ''}${sb.counted ? '' : ' asset'}" data-th="${sb.key}" style="animation-delay:${200 + bi * 70 + j * 40}ms">
        <circle cx="${sb.x}" cy="${sb.y}" r="${sb.r + 8}" fill="${sb.color}" opacity=".15" class="mm-aura"/>
        <circle cx="${sb.x}" cy="${sb.y}" r="${sb.r}" fill="#1f1631"/>
        <circle cx="${sb.x}" cy="${sb.y}" r="${sb.r}" fill="${sb.color}" fill-opacity=".22" stroke="${sb.color}" stroke-width="2" ${sb.counted ? '' : 'stroke-dasharray="4 3"'}/>
        ${sb.counted && sb.progress !== null ? `<circle cx="${sb.x}" cy="${sb.y}" r="${sb.r - 5}" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="3"/>
        <circle cx="${sb.x}" cy="${sb.y}" r="${sb.r - 5}" fill="none" stroke="${sb.color}" stroke-width="3" stroke-linecap="round" ${arc(sb.r - 5, sb.progress)} transform="rotate(-90 ${sb.x} ${sb.y})"/>` : ''}
        ${inner}
        <text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${anchor}" class="mm-th-label">${esc(sb.label)}</text>
        ${sb.urgent ? `<circle cx="${sb.x + sb.r * .72}" cy="${sb.y - sb.r * .72}" r="9" fill="#ff7a8a" stroke="#1a1229" stroke-width="2"/><text x="${sb.x + sb.r * .72}" y="${sb.y - sb.r * .72 + 4}" text-anchor="middle" class="mm-badge">${sb.urgent}</text>` : ''}
      </g>`;

      if (open) sb.items.forEach((it, ii) => {
        const d = sb.dir, cy = it.y + it.h / 2;
        leaves += `<path class="mm-link" style="animation-delay:${ii * 30}ms" d="M${sb.x + d * sb.r},${sb.y} C${sb.x + d * (sb.r + 34)},${sb.y} ${it.x - d * 30},${cy} ${it.x},${cy}" stroke="${sb.color}" stroke-width="1.6" opacity=".6"/>`;
        const sx2 = d > 0 ? it.left + 16 : it.left + LEAF_W - 15, tx = d > 0 ? it.left + 32 : it.left + 13, ix = d > 0 ? it.left + LEAF_W - 30 : it.left + 12;
        let mark;
        if (it.placeholder) mark = `<circle cx="${sx2}" cy="${cy}" r="7" fill="none" stroke="#6b6280" stroke-width="2" stroke-dasharray="2 2"/>`;
        else if (it.status === 'done') mark = `<circle cx="${sx2}" cy="${cy}" r="8" fill="#4fd1a0"/><path d="M${sx2 - 4},${cy} l3,3 l5,-6" stroke="#062419" stroke-width="2" fill="none" stroke-linecap="round"/>`;
        else if (it.status === 'doing') mark = `<circle cx="${sx2}" cy="${cy}" r="7.5" fill="none" stroke="#c49be6" stroke-width="2"/><path d="M${sx2},${cy - 7.5} A7.5,7.5 0 0 1 ${sx2},${cy + 7.5}Z" fill="#c49be6"/>`;
        else if (it.status === 'false') mark = `<circle cx="${sx2}" cy="${cy}" r="8" fill="#ff7a8a"/><path d="M${sx2 - 3.5},${cy - 3.5} l7,7 M${sx2 + 3.5},${cy - 3.5} l-7,7" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`;
        else mark = `<circle cx="${sx2}" cy="${cy}" r="7.5" fill="none" stroke="#8f86a3" stroke-width="2"/>`;
        const dots = it.placeholder ? '' : [0, 1, 2].map(k => `<circle cx="${ix + k * 9}" cy="${it.y + 10}" r="3" fill="${k < IMP[it.imp] ? IMP_COL[it.imp] : 'rgba(255,255,255,.12)'}"/>`).join('');
        const lines = it.lines.map((l, k) => `<tspan x="${tx}" y="${it.y + 26 + k * 16}">${esc(l)}</tspan>`).join('');
        leaves += `<g class="mm-leaf st-${it.status}${it.placeholder ? ' missing' : ''}" ${it.placeholder ? '' : `data-pt="${esc(it.key)}"`} style="animation-delay:${80 + ii * 30}ms">
          <rect x="${it.left}" y="${it.y}" width="${LEAF_W}" height="${it.h}" rx="13" class="mm-under"/><rect x="${it.left}" y="${it.y}" width="${LEAF_W}" height="${it.h}" rx="13" style="--c:${sb.color}"/>${mark}${dots}<text class="mm-t">${lines}</text></g>`;
      });
    });
    // nœud de branche
    nodes += `<g class="mm-branch${bdim ? ' dim' : ''}" data-br="${b.key}" style="animation-delay:${100 + bi * 70}ms">
      <circle cx="${b.x}" cy="${b.y}" r="${R_BRANCH + 7}" fill="${b.color}" opacity=".18"/>
      <circle cx="${b.x}" cy="${b.y}" r="${R_BRANCH}" fill="#241a3a" stroke="${b.color}" stroke-width="2.5"/>
      <circle cx="${b.x}" cy="${b.y}" r="${R_BRANCH - 6}" fill="none" stroke="${b.color}" stroke-width="3.5" stroke-linecap="round" ${arc(R_BRANCH - 6, b.progress)} transform="rotate(-90 ${b.x} ${b.y})"/>
      <text x="${b.x}" y="${b.y + 1}" text-anchor="middle" class="mm-br-label">${esc(b.short)}</text>
      <text x="${b.x}" y="${b.y + 15}" text-anchor="middle" class="mm-count">${b.progress === null ? '—' : Math.round(b.progress * 100) + '%'}</text></g>`;
  });
  const prog = M.progress, title = wrap(s.titre || 'Idée', 12, 3);
  const center = `<g class="mm-center" data-center="1">
    <circle r="${R_CENTER + 12}" fill="url(#mm-halo)"/>
    <circle r="${R_CENTER}" fill="url(#mm-grad)"/>
    <circle r="${R_CENTER - 6}" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="5"/>
    <circle r="${R_CENTER - 6}" fill="none" stroke="${stateColor(prog, 64)}" stroke-width="5" stroke-linecap="round" ${arc(R_CENTER - 6, prog)} transform="rotate(-90)"/>
    <text text-anchor="middle" class="mm-title">${title.map((l, k) => `<tspan x="0" y="${(k - (title.length - 1) / 2) * 15 - 6}">${esc(l)}</tspan>`).join('')}</text>
    <text y="${title.length * 7.5 + 14}" text-anchor="middle" class="mm-center-pct">${Math.round(prog * 100)} %</text></g>`;
  return links + nodes + center + leaves;
}

function dashboardHTML(M) {
  const counted = M.subs.filter(x => x.counted).flatMap(x => x.real);
  if (!counted.length) return '';
  const done = counted.filter(i => i.status === 'done').length, open = counted.filter(i => i.status !== 'done');
  const urgent = open.filter(i => i.imp === 'haute').length, prog = M.progress;
  const groups = M.branches.map(b => `
    <div class="br-head"><span>${esc(b.label)}</span><b style="color:${b.color}">${b.progress === null ? '—' : Math.round(b.progress * 100) + ' %'}</b></div>
    ${b.subs.map(t => `<div class="th-row" data-th="${t.key}"><span class="th-dot" style="background:${t.color}"></span><span class="th-name">${esc(t.label)}</span>
      ${t.counted ? `<span class="th-bar"><span style="width:${Math.round((t.progress || 0) * 100)}%;background:${t.color}"></span></span><span class="th-num">${t.done}/${t.real.length}</span>`
        : `<span class="th-asset">${t.real.length ? t.real.length + ' atout' + (t.real.length > 1 ? 's' : '') : 'à explorer'}</span><span class="th-num"></span>`}
      ${t.urgent ? `<span class="th-urg">${t.urgent}</span>` : '<span class="th-urg off"></span>'}</div>`).join('')}`).join('');
  const prio = open.sort((x, y) => IMP[y.imp] - IMP[x.imp] || (x.theme.progress || 0) - (y.theme.progress || 0)).slice(0, 6).map(i => `
    <div class="prio" data-pt="${esc(i.key)}"><span class="prio-imp" style="background:${IMP_COL[i.imp]}"></span>
      <div><div>${esc(i.text)}</div><small style="color:${i.theme.color}">${esc(i.theme.branch.short)} · ${esc(i.theme.label)} · ${ST_LABEL[i.status]}</small></div></div>`).join('');
  return `<div class="block"><h3>Avancement</h3>
      <div class="meter"><span style="width:${Math.round(prog * 100)}%;background:${stateColor(prog)}"></span></div>
      <div class="small muted">${Math.round(prog * 100)} % · ${done} réglé(s) sur ${counted.length} · ${open.length} ouvert(s)${urgent ? ` dont <b style="color:#ff7a8a">${urgent} important(s)</b>` : ''}</div>
      <div class="th-list">${groups}</div>
      <p class="muted small" style="margin:10px 0 0">Forces et opportunités sont des atouts : elles restent hors jauge.</p></div>
    ${prio ? `<div class="block highlight"><h3>Priorités ouvertes</h3>${prio}</div>` : '<div class="block highlight"><h3>Priorités</h3>Tout est réglé.</div>'}`;
}

function mapSection() {
  return `<div class="mm-wrap" id="mm-wrap">
      <svg id="mm" class="mm"><defs>
        <radialGradient id="mm-grad" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#9a6af0"/><stop offset="1" stop-color="#4a2aa0"/></radialGradient>
        <radialGradient id="mm-halo"><stop offset=".7" stop-color="#7b4dd6" stop-opacity=".45"/><stop offset="1" stop-color="#7b4dd6" stop-opacity="0"/></radialGradient>
      </defs><g id="mm-g"></g></svg>
      <div class="mm-tools">
        <button class="icon-btn" id="mm-in" aria-label="Zoom avant">+</button>
        <button class="icon-btn" id="mm-out" aria-label="Zoom arrière">−</button>
        <button class="icon-btn" id="mm-fit" aria-label="Vue d'ensemble">⤢</button>
        <button class="icon-btn" id="mm-full" aria-label="Plein écran">⛶</button>
      </div>
      <div class="mm-legend"><span class="grad-legend"><i></i>à régler → réglé</span><span><i class="lg asset"></i>Atout</span><span><i class="lg done"></i>Résolu</span></div>
    </div>
    <p class="muted small mm-hint">Touche un indicateur pour afficher ses points, puis un point pour changer son statut. Touche une branche pour la cadrer, le centre pour revenir.</p>
    <div id="mm-dash"></div>`;
}

function initMap(idea) {
  const svg = $('#mm'), g = $('#mm-g'), wrapEl = $('#mm-wrap');
  const prev = mapViews[idea.id] || {};
  const st = mapState = { idea, svg, g, model: null, bb: null, vp: prev.vp || null, expanded: prev.expanded || null };
  const remember = () => { mapViews[idea.id] = { vp: st.vp, expanded: st.expanded }; };
  const apply = anim => {
    g.style.transition = anim ? 'transform .5s cubic-bezier(.2,.8,.2,1)' : 'none';
    g.style.transform = `translate(${st.vp.x}px,${st.vp.y}px) scale(${st.vp.k})`;
    remember();
  };
  const fitBox = (bb, anim = true) => {
    const W = svg.clientWidth, H = svg.clientHeight, k = Math.min(W / bb.w, H / bb.h, 1.5);
    st.vp = { k, x: W / 2 - (bb.x + bb.w / 2) * k, y: H / 2 - (bb.y + bb.h / 2) * k }; apply(anim);
  };
  const zoomAt = (f, cx, cy, anim) => {
    const k = Math.min(3, Math.max(0.2, st.vp.k * f)); f = k / st.vp.k;
    st.vp = { k, x: cx - (cx - st.vp.x) * f, y: cy - (cy - st.vp.y) * f }; apply(anim);
  };
  const branchBox = b => {
    const xs = [b.x, ...b.subs.map(x => x.x)], ys = [b.y, ...b.subs.map(x => x.y)], pad = 110;
    return { x: Math.min(...xs) - pad, y: Math.min(...ys) - pad, w: Math.max(...xs) - Math.min(...xs) + 2 * pad, h: Math.max(...ys) - Math.min(...ys) + 2 * pad };
  };
  st.refresh = () => {
    st.model = modelOf(idea);
    if (st.expanded && !st.model.subs.some(t => t.key === st.expanded)) st.expanded = null;
    st.bb = layoutMap(st.model, st.expanded);
    g.innerHTML = mapInner(idea, st.model, st.expanded);
    $('#mm-dash').innerHTML = dashboardHTML(st.model);
    $('#mm-dash').querySelectorAll('[data-pt]').forEach(el => el.onclick = () => openPoint(el.dataset.pt));
    $('#mm-dash').querySelectorAll('[data-th]').forEach(el => el.onclick = () => { expand(el.dataset.th, true); wrapEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
    remember();
  };
  const expand = (key, force) => {
    st.expanded = (st.expanded === key && !force) ? null : key;
    st.refresh(); vibrate(12);
    const t = st.model.subs.find(x => x.key === st.expanded);
    fitBox(t ? t.box : st.bb);
  };
  const collapse = () => { if (st.expanded) { st.expanded = null; st.refresh(); } fitBox(st.bb); };
  st.refresh();
  if (st.vp) apply(false); else fitBox(st.bb, false);

  const pts = new Map(); let moved = false, downEl = null, last = null, pinch = null;
  svg.addEventListener('pointerdown', e => {
    try { svg.setPointerCapture(e.pointerId); } catch {}
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) { moved = false; downEl = e.target; last = { x: e.clientX, y: e.clientY }; }
    if (pts.size === 2) { const [p, q] = [...pts.values()]; pinch = { d: Math.hypot(p.x - q.x, p.y - q.y), k: st.vp.k }; moved = true; }
  });
  svg.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const r = svg.getBoundingClientRect();
    if (pts.size === 2 && pinch) {
      const [p, q] = [...pts.values()], d = Math.hypot(p.x - q.x, p.y - q.y);
      zoomAt((pinch.k * d / pinch.d) / st.vp.k, (p.x + q.x) / 2 - r.left, (p.y + q.y) / 2 - r.top, false);
    } else if (pts.size === 1 && last) {
      const dx = e.clientX - last.x, dy = e.clientY - last.y;
      if (!moved && Math.hypot(dx, dy) < 6) return;
      moved = true; st.vp.x += dx; st.vp.y += dy; last = { x: e.clientX, y: e.clientY }; apply(false);
    }
  });
  const up = e => {
    pts.delete(e.pointerId);
    if (pts.size < 2) pinch = null;
    if (pts.size === 1) { const [p] = [...pts.values()]; last = { x: p.x, y: p.y }; }
    if (pts.size === 0 && !moved && downEl) {
      const c = sel => downEl.closest ? downEl.closest(sel) : null;
      const leaf = c('[data-pt]'), th = c('[data-th]'), br = c('[data-br]'), center = c('[data-center]');
      if (leaf) openPoint(leaf.dataset.pt);
      else if (th) expand(th.dataset.th);
      else if (br) { if (st.expanded) { st.expanded = null; st.refresh(); } fitBox(branchBox(st.model.branches.find(x => x.key === br.dataset.br))); }
      else if (center || st.expanded) collapse();
    }
    if (pts.size === 0) downEl = null;
  };
  svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
  svg.addEventListener('wheel', e => { e.preventDefault(); const r = svg.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top, false); }, { passive: false });
  $('#mm-in').onclick = () => zoomAt(1.3, svg.clientWidth / 2, svg.clientHeight / 2, true);
  $('#mm-out').onclick = () => zoomAt(1 / 1.3, svg.clientWidth / 2, svg.clientHeight / 2, true);
  $('#mm-fit').onclick = collapse;
  $('#mm-full').onclick = () => {
    wrapEl.classList.toggle('full'); document.body.classList.toggle('no-scroll', wrapEl.classList.contains('full'));
    requestAnimationFrame(() => { const t = st.model.subs.find(x => x.key === st.expanded); fitBox(t ? t.box : st.bb); });
  };
}

/* ---------- Export PDF (fiche et carte) ---------- */
const PDF_BASE = 'vendor/';
let pdfLibPromise = null;
function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = () => rej(new Error('Chargement impossible : ' + src));
    document.head.appendChild(s);
  });
}
function loadPdfLib() {
  if (window.jspdf && window.FORGE_PDF_FONTS) return Promise.resolve();
  pdfLibPromise ||= Promise.all([
    window.jspdf ? null : loadScript(PDF_BASE + 'jspdf.umd.min.js'),
    window.FORGE_PDF_FONTS ? null : loadScript(PDF_BASE + 'pdf-fonts.js')
  ]).catch(e => { pdfLibPromise = null; throw e; });
  return pdfLibPromise;
}
async function logoPng() {
  const img = $('#logo');
  try {
    if (!img.complete) await new Promise(r => { img.onload = r; img.onerror = r; });
    const c = document.createElement('canvas'); c.width = c.height = 192;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0, 192, 192);
    return c.toDataURL('image/png');
  } catch { return null; }
}

/* Couleurs (impression sur fond clair) */
const C = {
  ink: [33, 26, 46], muted: [112, 104, 128], faint: [168, 160, 182], line: [226, 220, 236], panel: [247, 244, 251],
  violet: [106, 63, 207], violetD: [74, 42, 160], mauve: [176, 130, 220], green: [38, 166, 120], red: [222, 72, 92], amber: [214, 160, 30],
  white: [255, 255, 255]
};
const IMP_RGB = { haute: C.red, moyenne: C.amber, basse: [170, 162, 186] };
function hslRgb(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}
const progRgb = p => p === null || p === undefined ? [150, 142, 166] : hslRgb(Math.round(Math.max(0, Math.min(1, p)) * 140), 72, 45);
const tint = (c, t) => c.map(v => Math.round(v + (255 - v) * t));
const ASSET_RGB = [150, 110, 220];
const PDF_SHORT = { 'act-plan': 'P', 'act-test': '?', 'act-crit': '★', 'swot-f': '+', 'swot-w': '−', 'swot-o': '↗', 'swot-t': '!' };

function newDoc(orientation) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4', compress: true });
  const F = window.FORGE_PDF_FONTS;
  doc.addFileToVFS('Inter-Regular.ttf', F.regular); doc.addFont('Inter-Regular.ttf', 'Inter', 'normal');
  doc.addFileToVFS('Inter-Bold.ttf', F.bold); doc.addFont('Inter-Bold.ttf', 'Inter', 'bold');
  doc.addFileToVFS('Inter-SemiBold.ttf', F.semibold); doc.addFont('Inter-SemiBold.ttf', 'InterSemi', 'normal');
  doc.setFont('Inter', 'normal'); doc.setLineHeightFactor(1.3);
  const P = {
    doc, W: doc.internal.pageSize.getWidth(), H: doc.internal.pageSize.getHeight(), M: orientation === 'landscape' ? 12 : 16,
    font(kind = 'r', size = 10, color = C.ink) {
      if (kind === 'b') doc.setFont('Inter', 'bold'); else if (kind === 's') doc.setFont('InterSemi', 'normal'); else doc.setFont('Inter', 'normal');
      doc.setFontSize(size); doc.setTextColor(...color);
    },
    fill(c) { doc.setFillColor(...c); }, stroke(c, w = 0.3) { doc.setDrawColor(...c); doc.setLineWidth(w); },
    lh(size) { return size * 0.3528 * 1.3; },            // hauteur de ligne en mm
    lines(text, w) { return doc.splitTextToSize(String(text ?? ''), w); }
  };
  return P;
}
function pdfFooters(P, label) {
  const { doc } = P, n = doc.getNumberOfPages(), d = new Date().toLocaleDateString('fr-FR');
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    P.stroke(C.line, 0.3); doc.line(P.M, P.H - 10, P.W - P.M, P.H - 10);
    P.font('r', 7.5, C.faint);
    doc.text(`Forge · ${label} · exporté le ${d}`, P.M, P.H - 6);
    doc.text(`${i} / ${n}`, P.W - P.M, P.H - 6, { align: 'right' });
  }
}
function header(P, kicker, title, sub, logo) {
  const { doc } = P, h = P.W > P.H ? 24 : 34;
  P.fill(C.violetD); doc.rect(0, 0, P.W, h, 'F');
  P.fill(C.violet); doc.triangle(P.W * 0.55, 0, P.W, 0, P.W, h, 'F');
  let x = P.M;
  if (logo) { try { doc.addImage(logo, 'PNG', P.M, (h - 14) / 2, 14, 14); x += 18; } catch {} }
  P.font('b', 7.5, tint(C.mauve, 0.3)); doc.text(kicker.toUpperCase(), x, h / 2 - (P.W > P.H ? 3 : 6), { charSpace: 0.6 });
  P.font('b', P.W > P.H ? 14 : 16, C.white);
  const tl = P.lines(title, P.W - x - P.M - 4).slice(0, 2);
  doc.text(tl, x, h / 2 + (P.W > P.H ? 2.5 : -0.5));
  if (sub && P.W < P.H) { P.font('r', 8.5, tint(C.mauve, 0.55)); doc.text(sub, x, h - 5); }
  return h;
}
/* Écrivain à flux avec saut de page automatique */
function flow(P, top) {
  const F = {
    y: top, x: P.M, w: P.W - 2 * P.M, bottom: P.H - 15,
    ensure(h) { if (F.y + h > F.bottom) { P.doc.addPage(); F.y = P.M + 2; return true; } return false; },
    gap(h) { F.y += h; },
    section(title) {
      F.ensure(18); F.y += 6;
      P.fill(C.green); P.doc.circle(F.x + 1.2, F.y - 1.1, 1.1, 'F');
      P.font('b', 8.5, C.violet); P.doc.text(title.toUpperCase(), F.x + 4, F.y, { charSpace: 0.5 });
      P.stroke(C.line, 0.3); P.doc.line(F.x + 4 + P.doc.getTextWidth(title.toUpperCase()) + title.length * 0.5 + 3, F.y - 1.2, F.x + F.w, F.y - 1.2);
      F.y += 6;
    },
    para(text, size = 10, color = C.ink, kind = 'r', indent = 0) {
      P.font(kind, size, color);
      const ls = P.lines(text, F.w - indent), lh = P.lh(size);
      ls.forEach(l => { F.ensure(lh); P.doc.text(l, F.x + indent, F.y + lh * 0.75); F.y += lh; });
    },
    bullets(arr, opts = {}) {
      const size = opts.size || 10, lh = P.lh(size);
      if (!arr.length) { F.para(opts.empty || 'Non mentionné', 9.5, C.faint); F.gap(1); return; }
      arr.forEach(t => {
        P.font('r', size, C.ink);
        const ls = P.lines(t, F.w - 6);
        F.ensure(ls.length * lh + 1);
        if (opts.box) { P.stroke(C.faint, 0.35); P.doc.rect(F.x + 0.3, F.y + lh * 0.2, 3, 3); }
        else { P.fill(opts.dot || C.mauve); P.doc.circle(F.x + 1.4, F.y + lh * 0.5, 0.75, 'F'); }
        P.font('r', size, C.ink);
        ls.forEach((l, i) => P.doc.text(l, F.x + 6, F.y + lh * 0.75 + i * lh));
        F.y += ls.length * lh + 1.2;
      });
    }
  };
  return F;
}
function bar(P, x, y, w, h, p, color) {
  P.fill(C.line); P.doc.roundedRect(x, y, w, h, h / 2, h / 2, 'F');
  if (p > 0) { P.fill(color); P.doc.roundedRect(x, y, Math.max(h, w * Math.min(1, p)), h, h / 2, h / 2, 'F'); }
}
function statusMark(P, x, y, r, st, placeholder) {
  const { doc } = P;
  if (placeholder) { doc.setLineDashPattern([0.6, 0.6], 0); P.stroke(C.faint, 0.35); doc.circle(x, y, r, 'S'); doc.setLineDashPattern([], 0); return; }
  if (st === 'done') {
    P.fill(C.green); doc.circle(x, y, r, 'F');
    P.stroke(C.white, r * 0.28); doc.setLineCap('round'); doc.lines([[r * 0.38, r * 0.38], [r * 0.7, -0.8 * r]], x - r * 0.5, y + 0.02 * r); doc.setLineCap('butt');
  } else if (st === 'doing') {
    P.stroke(C.mauve, r * 0.25); doc.circle(x, y, r, 'S');
    const pts = []; for (let i = 0; i <= 12; i++) { const a = -Math.PI / 2 + Math.PI * i / 12; pts.push([x + r * Math.cos(a), y + r * Math.sin(a)]); }
    P.fill(C.mauve); doc.lines(pts.slice(1).map((p, i) => [p[0] - pts[i][0], p[1] - pts[i][1]]), pts[0][0], pts[0][1], [1, 1], 'F', true);
  } else { P.stroke(C.faint, r * 0.25); doc.circle(x, y, r, 'S'); }
}
function impDots(P, x, y, imp) {
  for (let k = 0; k < 3; k++) { P.fill(k < IMP[imp] ? IMP_RGB[imp] : C.line); P.doc.circle(x + k * 2.2, y, 0.75, 'F'); }
}
const slug = t => String(t || 'idee').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'idee';

/* ----- Fiche ----- */
async function exportFichePdf(idea) {
  await loadPdfLib();
  const s = idea.structure || {}, a = idea.analyse, logo = await logoPng();
  const P = newDoc('portrait'), { doc } = P;
  const u = U(idea), m = s.titre ? maturity(idea) : null, q = quadrant(u);
  const h = header(P, 'Fiche idée', s.titre || 'Idée brute', `Créée le ${new Date(idea.created).toLocaleDateString('fr-FR')} · ${STATUS[idea.status]}`, logo);
  const F = flow(P, h + 8);

  if (s.resume) { F.para(s.resume, 11.5, C.ink, 's'); F.gap(3); }
  if (s.titre) {
    const cells = [['Maturité', `${m.ok} / 5 · ${m.label}`], ['Priorité', q || 'À définir'], ['Échéance', u.echeance ? new Date(u.echeance + 'T12:00:00').toLocaleDateString('fr-FR') : 'Aucune'], ['Type', u.type || '—']];
    const cw = F.w / cells.length; F.ensure(16);
    P.fill(C.panel); doc.roundedRect(F.x, F.y, F.w, 14, 2.5, 2.5, 'F');
    cells.forEach(([k, v], i) => {
      P.font('r', 7, C.muted); doc.text(k.toUpperCase(), F.x + 4 + i * cw, F.y + 5, { charSpace: 0.3 });
      P.font('s', 9.5, C.ink); doc.text(P.lines(String(v), cw - 6)[0], F.x + 4 + i * cw, F.y + 10.5);
    });
    F.y += 17;
    if (u.themes.length) { F.para('Thèmes : ' + u.themes.join(' · '), 9, C.muted); F.gap(1); }
  }

  F.section('Ce que tu as dit');
  F.para(idea.raw, 9.8, C.ink);
  idea.complements.filter(c => !c.letter).forEach(c => { F.gap(1); F.para('+ ' + c.text, 9.3, C.muted); });

  if (s.titre) {
    F.section('Maturité : objectif SMART');
    const lab = { ok: 'Rempli', partiel: 'Partiel', absent: 'Absent' }, ec = { ok: C.green, partiel: C.amber, absent: C.red };
    m.st.forEach(x => {
      const col = ec[x.etat] || C.red, body = [];
      if (x.extrait) body.push(['r', C.ink, 'Repéré : ' + x.extrait]);
      if (x.answer) body.push(['s', C.ink, 'Ta réponse : ' + x.answer]);
      if (!x.answer && x.etat !== 'ok' && x.manque) body.push(['r', C.muted, '→ ' + x.manque]);
      if (!body.length) body.push(['r', C.faint, 'Non précisé']);
      const bl = body.map(([kd, c, t]) => [kd, c, P.lines(t, F.w - 46)]);
      const hh = Math.max(11, 3 + bl.reduce((n, b) => n + b[2].length * P.lh(9.5), 0) + 2);
      F.ensure(hh + 2);
      P.fill(tint(col, 0.85)); P.stroke(col, 0.4); doc.roundedRect(F.x, F.y, 9, 9, 2, 2, 'FD');
      P.font('b', 12, col); doc.text(x.L, F.x + 4.5, F.y + 6.4, { align: 'center' });
      P.font('b', 10, C.ink); doc.text(x.label, F.x + 13, F.y + 4);
      P.font('s', 7.5, col); doc.text(x.answer ? 'Réglé par toi' : (lab[x.etat] || 'Absent'), F.x + 13, F.y + 8.2);
      let yy = F.y + 4;
      bl.forEach(([kd, c, ls]) => { P.font(kd, 9.5, c); ls.forEach(l => { doc.text(l, F.x + 46, yy); yy += P.lh(9.5); }); });
      F.y += hh; P.stroke(C.line, 0.2); doc.line(F.x + 13, F.y - 1, F.x + F.w, F.y - 1); F.y += 1.5;
    });
  }

  if (a) {
    F.section('Verdict');
    const vt = P.lines('Point bloquant : ' + (a.point_bloquant || '—'), F.w - 10);
    const vh = 9 + vt.length * P.lh(9.5) + 2; F.ensure(vh + 2);
    const fc = a.faisabilite === 'bonne' ? C.green : a.faisabilite === 'moyenne' ? C.amber : C.red;
    P.fill(tint(fc, 0.88)); P.stroke(tint(fc, 0.4), 0.3); doc.roundedRect(F.x, F.y, F.w, vh, 2.5, 2.5, 'FD');
    P.font('b', 11, fc); doc.text('Faisabilité ' + (a.faisabilite || '—'), F.x + 5, F.y + 6.5);
    P.font('r', 9.5, C.ink); doc.text(vt, F.x + 5, F.y + 12);
    F.y += vh + 3;

    F.section('Plan d’action');
    const steps = idea.steps || [];
    steps.forEach((st, i) => {
      const et = P.lines(st.text, F.w - 14), meta = [SRC_LABEL[st.source] || 'Déduit', st.date ? 'avant le ' + new Date(st.date + 'T12:00:00').toLocaleDateString('fr-FR') : '', st.livrable ? '→ ' + st.livrable : ''].filter(Boolean).join(' · ');
      const ml = P.lines(meta, F.w - 14), hh = et.length * P.lh(10) + ml.length * P.lh(8.3) + 3;
      F.ensure(hh);
      P.stroke(st.done ? C.green : C.faint, 0.4); if (st.done) { P.fill(C.green); doc.roundedRect(F.x + 0.5, F.y + 0.6, 3.6, 3.6, 0.8, 0.8, 'FD'); P.stroke(C.white, 0.5); doc.lines([[0.9, 0.9], [1.6, -1.9]], F.x + 1.3, F.y + 2.5); }
      else doc.roundedRect(F.x + 0.5, F.y + 0.6, 3.6, 3.6, 0.8, 0.8, 'S');
      P.font('s', 10, st.done ? C.muted : C.ink); doc.text(et, F.x + 7, F.y + 3.6);
      P.font('r', 8.3, C.muted); doc.text(ml, F.x + 7, F.y + 3.6 + et.length * P.lh(10));
      F.y += hh + 1;
    });
    if (a.test) {
      const tl = P.lines(a.test, F.w - 10), th = 10 + tl.length * P.lh(9.5); F.ensure(th + 3); F.gap(1);
      P.fill(C.panel); doc.roundedRect(F.x, F.y, F.w, th, 2.5, 2.5, 'F'); P.fill(C.violet); doc.rect(F.x, F.y + 2, 1.2, th - 4, 'F');
      P.font('b', 8, C.violet); doc.text('TEST AVANT D’INVESTIR', F.x + 5, F.y + 5.5, { charSpace: 0.3 });
      P.font('r', 9.5, C.ink); doc.text(tl, F.x + 5, F.y + 10.5); F.y += th + 2;
    }

    F.section('Hypothèses à vérifier');
    const hl = { todo: 'à vérifier', done: 'vérifiée', false: 'fausse' }, hc = { todo: C.muted, done: C.green, false: C.red };
    hypList(a).forEach(hy => {
      const st = getStatus(idea, 'hyp|' + hashTxt(hy.texte)), tl = P.lines(hy.texte, F.w - 34), hh = tl.length * P.lh(9.8) + 2;
      F.ensure(hh);
      P.font('r', 9.8, C.ink); doc.text(tl, F.x, F.y + 3.6);
      P.font('s', 7.5, hc[st] || C.muted); P.fill(tint(hc[st] || C.muted, 0.88));
      const t = hl[st] || 'à vérifier', tw = doc.getTextWidth(t) + 4; doc.roundedRect(F.x + F.w - tw, F.y + 0.6, tw, 4, 1.2, 1.2, 'F'); doc.text(t, F.x + F.w - tw + 2, F.y + 3.5);
      F.y += hh + 1.2;
    });

    F.section('Diagnostic SWOT');
    const risks = A(a.risques);
    const Q = [['Forces', A(a.forces).length ? A(a.forces) : A(s.ressources), ASSET_RGB], ['Faiblesses', [...A(a.faiblesses), ...A(s.contraintes)], C.amber],
      ['Opportunités', A(a.opportunites), ASSET_RGB], ['Menaces', A(a.dependances).map(d => 'Dépend de : ' + d), C.red]];
    const qw = (F.w - 4) / 2;
    for (let row = 0; row < 2; row++) {
      const pair = Q.slice(row * 2, row * 2 + 2).map(([t, arr, c]) => ({ t, c, ls: arr.length ? arr.map(x => P.lines(x, qw - 10)) : [['Rien d’identifié']], empty: !arr.length }));
      const qh = Math.max(...pair.map(q2 => 9 + q2.ls.reduce((n, l) => n + l.length * P.lh(9) + 0.8, 0))) + 2;
      F.ensure(qh + 3);
      pair.forEach((q2, i) => {
        const x = F.x + i * (qw + 4);
        P.fill(tint(q2.c, 0.92)); doc.roundedRect(x, F.y, qw, qh, 2.5, 2.5, 'F');
        P.font('b', 8, q2.c); doc.text(q2.t.toUpperCase(), x + 4, F.y + 5.5, { charSpace: 0.4 });
        let yy = F.y + 10.2;
        q2.ls.forEach(l => {
          if (!q2.empty) { P.fill(q2.c); doc.circle(x + 5, yy - 1.1, 0.7, 'F'); }
          P.font('r', 9, q2.empty ? C.faint : C.ink); doc.text(l, x + 7.5, yy); yy += l.length * P.lh(9) + 0.8;
        });
      });
      F.y += qh + 3;
    }

    F.section('Risques');
    const rl = { todo: 'à traiter', doing: 'en cours', done: 'maîtrisé' };
    risks.forEach(r => {
      const gc = r.gravite === 'élevée' ? C.red : r.gravite === 'moyenne' ? C.amber : C.green, st = getStatus(idea, riskKey(r));
      const tl = P.lines(r.risque, F.w - 8), sl = P.lines('Signal : ' + (r.signal || '—'), F.w - 8), pl = P.lines('Parade : ' + (r.parade || '—'), F.w - 8);
      const hh = tl.length * P.lh(10) + 5 + (sl.length + pl.length) * P.lh(8.8) + 2;
      F.ensure(hh + 2);
      P.fill(gc); doc.rect(F.x, F.y, 1.2, hh, 'F');
      P.font('s', 10, C.ink); doc.text(tl, F.x + 4, F.y + 3.8);
      let yy = F.y + 3.8 + tl.length * P.lh(10) + 0.6, px = F.x + 4;
      [['gravité ' + (r.gravite || '?'), gc], ['probabilité ' + (r.probabilite || '?'), C.muted], [r.origine === 'interne' ? 'interne' : 'externe', C.violet], [rl[st] || 'à traiter', st === 'done' ? C.green : st === 'doing' ? C.mauve : C.muted]].forEach(([t, c]) => {
        P.font('s', 7, c); const tw = doc.getTextWidth(t) + 4;
        P.fill(tint(c, 0.88)); doc.roundedRect(px, yy - 2.9, tw, 4, 1.2, 1.2, 'F'); doc.text(t, px + 2, yy); px += tw + 2;
      });
      yy += 4.2;
      P.font('r', 8.8, C.muted); doc.text(sl, F.x + 4, yy); yy += sl.length * P.lh(8.8); doc.text(pl, F.x + 4, yy);
      F.y += hh + 2.5;
    });
    F.section('Critères de réussite');
    F.bullets(A(a.criteres_reussite), { box: true });
  } else if (s.titre) {
    F.section('Analyse'); F.para('L’idée n’a pas encore été éprouvée (menu de l\u2019idée → Éprouver).', 9.5, C.muted);
  }
  pdfFooters(P, 'Fiche');
  return { doc, name: `forge-fiche-${slug(s.titre)}.pdf` };
}

/* ----- Carte ----- */
function pdfCurve(P, x0, y0, qx, qy, x2, y2) {
  const c1x = x0 + 2 / 3 * (qx - x0), c1y = y0 + 2 / 3 * (qy - y0), c2x = x2 + 2 / 3 * (qx - x2), c2y = y2 + 2 / 3 * (qy - y2);
  P.doc.lines([[c1x - x0, c1y - y0, c2x - x0, c2y - y0, x2 - x0, y2 - y0]], x0, y0, [1, 1], 'S');
}
function pdfArc(P, x, y, r, p, color, w) {
  if (!p || p <= 0) return;
  const n = Math.max(4, Math.round(48 * Math.min(1, p))), pts = [];
  for (let i = 0; i <= n; i++) { const t = -Math.PI / 2 + 2 * Math.PI * Math.min(1, p) * i / n; pts.push([x + r * Math.cos(t), y + r * Math.sin(t)]); }
  P.stroke(color, w); P.doc.setLineCap('round');
  P.doc.lines(pts.slice(1).map((q, i) => [q[0] - pts[i][0], q[1] - pts[i][1]]), pts[0][0], pts[0][1], [1, 1], 'S');
  P.doc.setLineCap('butt');
}
function drawMap(P, M, idea, box) {
  const { doc } = P, bb = layoutMap(M, null);
  const k = Math.min(box.w / bb.w, box.h / bb.h);
  const ox = box.x + (box.w - bb.w * k) / 2, oy = box.y + (box.h - bb.h * k) / 2;
  const X = x => ox + (x - bb.x) * k, Y = y => oy + (y - bb.y) * k, R = r => r * k;
  const cx = X(0), cy = Y(0);
  // liens
  M.branches.forEach(b => {
    const ux = Math.cos(b.a), uy = Math.sin(b.a), bc = progRgb(b.progress);
    P.stroke(bc, 1.1); doc.line(cx + ux * R(R_CENTER), cy + uy * R(R_CENTER), X(b.x) - ux * R(R_BRANCH), Y(b.y) - uy * R(R_BRANCH));
    b.subs.forEach(sb => {
      const col = sb.counted ? progRgb(sb.progress) : ASSET_RGB;
      const x0 = X(b.x), y0 = Y(b.y), x2 = X(sb.x), y2 = Y(sb.y), dx = x2 - x0, dy = y2 - y0, L = Math.hypot(dx, dy);
      const sx = x0 + dx / L * R(R_BRANCH), sy = y0 + dy / L * R(R_BRANCH), ex = x2 - dx / L * R(sb.r), ey = y2 - dy / L * R(sb.r);
      const mx = (sx + ex) / 2 - dy / L * 2.5, my = (sy + ey) / 2 + dx / L * 2.5;
      P.stroke(tint(col, 0.15), 0.6); if (!sb.counted) doc.setLineDashPattern([1, 0.8], 0);
      pdfCurve(P, sx, sy, mx, my, ex, ey); doc.setLineDashPattern([], 0);
    });
  });
  // sous-indicateurs
  M.subs.forEach(sb => {
    const x = X(sb.x), y = Y(sb.y), r = R(sb.r), col = sb.counted ? progRgb(sb.progress) : ASSET_RGB;
    P.fill(tint(col, 0.86)); P.stroke(col, 0.5);
    if (!sb.counted) doc.setLineDashPattern([0.9, 0.7], 0);
    doc.circle(x, y, r, 'FD'); doc.setLineDashPattern([], 0);
    if (sb.counted && sb.progress !== null) { P.stroke(tint(col, 0.6), 0.7); doc.circle(x, y, r - 1.3, 'S'); pdfArc(P, x, y, r - 1.3, sb.progress, col, 0.9); }
    const sh = PDF_SHORT[sb.key] || sb.short;
    P.font('b', Math.max(7, r * 2.3), tint(col, -0.1).map(v => Math.max(0, v - 30)));
    doc.text(sh, x, y + r * 0.1, { align: 'center' });
    P.font('s', Math.max(5, r * 1.15), C.muted);
    doc.text(sb.counted ? (sb.progress === null ? '—' : Math.round(sb.progress * 100) + '%') : String(sb.real.length), x, y + r * 0.62, { align: 'center' });
    const ux = Math.cos(sb.a), uy = Math.sin(sb.a);
    let lx = x + ux * (r + 1.8), ly = y + uy * (r + 1.8) + 1.2, al = Math.abs(ux) < 0.3 ? 'center' : ux > 0 ? 'left' : 'right';
    if (Math.abs(ux) < 0.3) ly += uy > 0 ? 1.8 : -0.6;
    P.font('s', 7.2, C.ink); doc.text(sb.label, lx, ly, { align: al });
    if (sb.urgent) {
      const bx = x + r * 0.72, by = y - r * 0.72;
      P.fill(C.red); P.stroke(C.white, 0.4); doc.circle(bx, by, 1.9, 'FD');
      P.font('b', 6, C.white); doc.text(String(sb.urgent), bx, by + 0.75, { align: 'center' });
    }
  });
  // branches
  M.branches.forEach(b => {
    const x = X(b.x), y = Y(b.y), r = R(R_BRANCH), col = progRgb(b.progress);
    P.fill(C.white); P.stroke(col, 0.9); doc.circle(x, y, r, 'FD');
    pdfArc(P, x, y, r - 1.4, b.progress, col, 1);
    P.font('b', Math.max(5.5, r * 1.25), C.ink); doc.text(b.short, x, y + 0.3, { align: 'center' });
    P.font('s', Math.max(5, r * 1.05), C.muted); doc.text(b.progress === null ? '—' : Math.round(b.progress * 100) + '%', x, y + r * 0.5, { align: 'center' });
  });
  // centre
  const rc = R(R_CENTER);
  P.fill(C.violet); doc.circle(cx, cy, rc, 'F');
  P.stroke(tint(C.white, 0), 0.2); pdfArc(P, cx, cy, rc - 1.5, M.progress, progRgb(M.progress).map(v => Math.min(255, v + 40)), 1.1);
  P.font('b', Math.max(6, rc * 0.62), C.white);
  const tl = P.lines((idea.structure || {}).titre || 'Idée', rc * 1.6).slice(0, 3);
  tl.forEach((l, i) => doc.text(l, cx, cy - (tl.length - 1) * rc * 0.13 + i * rc * 0.26 - rc * 0.08, { align: 'center' }));
  P.font('s', Math.max(5.5, rc * 0.5), tint(C.mauve, 0.6));
  doc.text(Math.round(M.progress * 100) + ' %', cx, cy + rc * 0.62, { align: 'center' });
}

async function exportCartePdf(idea) {
  await loadPdfLib();
  const s = idea.structure || {}, logo = await logoPng(), M = modelOf(idea);
  const P = newDoc('landscape'), { doc } = P;
  const h = header(P, 'Carte de l’idée · SMART / SWOT / Action', s.titre || 'Idée', '', logo);
  // carte à gauche
  const mapBox = { x: P.M, y: h + 6, w: 178, h: P.H - h - 6 - 18 };
  P.fill(C.panel); doc.roundedRect(mapBox.x, mapBox.y, mapBox.w, mapBox.h, 3, 3, 'F');
  drawMap(P, M, idea, { x: mapBox.x + 4, y: mapBox.y + 4, w: mapBox.w - 8, h: mapBox.h - 8 });
  // légende
  let lx = mapBox.x + 4; const ly = P.H - 14.5;
  P.font('r', 7, C.muted);
  for (let i = 0; i < 20; i++) { P.fill(progRgb(i / 19)); doc.rect(lx + i * 1.1, ly - 2.2, 1.15, 2.6, 'F'); }
  doc.text('à régler → réglé', lx + 24, ly); lx += 50;
  P.fill(tint(ASSET_RGB, 0.8)); P.stroke(ASSET_RGB, 0.35); doc.setLineDashPattern([0.6, 0.5], 0); doc.circle(lx + 1.3, ly - 0.9, 1.3, 'FD'); doc.setLineDashPattern([], 0);
  doc.text('atout (hors jauge)', lx + 4, ly); lx += 32;
  P.fill(C.red); doc.circle(lx + 1.3, ly - 0.9, 1.3, 'F'); doc.text('points importants ouverts', lx + 4, ly);

  // panneau d'avancement à droite
  const px = mapBox.x + mapBox.w + 6, pw = P.W - P.M - px; let y = h + 9;
  P.font('b', 8.5, C.violet); doc.text('AVANCEMENT', px, y, { charSpace: 0.5 }); y += 6;
  P.font('b', 20, progRgb(M.progress)); doc.text(Math.round(M.progress * 100) + ' %', px, y + 4);
  const counted = M.subs.filter(x => x.counted).flatMap(x => x.real), open = counted.filter(i => i.status !== 'done');
  P.font('r', 8, C.muted); doc.text(`${counted.length - open.length} réglé(s) sur ${counted.length}`, px + 30, y);
  doc.text(`${open.filter(i => i.imp === 'haute').length} important(s) ouvert(s)`, px + 30, y + 4);
  y += 8; bar(P, px, y, pw, 2.2, M.progress, progRgb(M.progress)); y += 7;
  M.branches.forEach(b => {
    P.font('b', 8.5, C.ink); doc.text(b.label, px, y);
    P.font('b', 8.5, progRgb(b.progress)); doc.text(b.progress === null ? '—' : Math.round(b.progress * 100) + ' %', px + pw, y, { align: 'right' });
    y += 2.5; bar(P, px, y, pw, 1.6, b.progress || 0, progRgb(b.progress)); y += 5;
    b.subs.forEach(sb => {
      const col = sb.counted ? progRgb(sb.progress) : ASSET_RGB;
      P.fill(col); doc.circle(px + 1.2, y - 1, 1.1, 'F');
      P.font('r', 8, C.ink); doc.text(sb.label, px + 4, y);
      P.font('r', 7.5, C.muted);
      doc.text(sb.counted ? `${sb.done}/${sb.real.length}` : (sb.real.length ? sb.real.length + ' atout' + (sb.real.length > 1 ? 's' : '') : 'à explorer'), px + pw - (sb.urgent ? 5 : 0), y, { align: 'right' });
      if (sb.urgent) { P.fill(C.red); doc.circle(px + pw - 1.6, y - 1, 1.6, 'F'); P.font('b', 5.5, C.white); doc.text(String(sb.urgent), px + pw - 1.6, y - 0.3, { align: 'center' }); }
      y += 4.4;
    });
    y += 2.5;
  });

  // pages de détail sur deux colonnes
  doc.addPage();
  const colW = (P.W - 2 * P.M - 8) / 2, top = P.M + 4, bottom = P.H - 15;
  let col = 0, cy = top;
  const cx = () => P.M + col * (colW + 8);
  const ensure = hh => { if (cy + hh > bottom) { if (col === 0) { col = 1; cy = top; } else { doc.addPage(); col = 0; cy = top; } } };
  P.font('b', 13, C.ink); doc.text('Détail par indicateur', cx(), cy + 2); cy += 9;
  M.branches.forEach(b => {
    ensure(18);
    const bc = progRgb(b.progress);
    P.fill(tint(bc, 0.85)); doc.roundedRect(cx(), cy, colW, 8, 2, 2, 'F');
    P.font('b', 9.5, tint(bc, -0.2).map(v => Math.max(0, v - 40))); doc.text(b.label.toUpperCase(), cx() + 3, cy + 5.4, { charSpace: 0.4 });
    doc.text(b.progress === null ? '—' : Math.round(b.progress * 100) + ' %', cx() + colW - 3, cy + 5.4, { align: 'right' });
    cy += 11;
    b.subs.forEach(sb => {
      const col2 = sb.counted ? progRgb(sb.progress) : ASSET_RGB;
      ensure(14);
      P.fill(col2); doc.circle(cx() + 1.6, cy + 1.2, 1.6, 'F');
      P.font('b', 9.5, C.ink); doc.text(sb.label, cx() + 5, cy + 2.4);
      P.font('r', 7.5, C.muted);
      const info = sb.counted ? (sb.progress === null ? 'rien à évaluer' : `${Math.round(sb.progress * 100)} % · ${sb.done}/${sb.real.length} réglé(s)`) : 'atout, hors jauge';
      doc.text(info, cx() + colW, cy + 2.4, { align: 'right' });
      if (sb.counted && sb.progress !== null) { bar(P, cx() + 5, cy + 4.2, colW - 5, 1.2, sb.progress, col2); }
      cy += 7.5;
      sb.items.forEach(it => {
        const tl = P.lines(it.text, colW - 18), sub = it.sub ? P.lines(it.sub, colW - 18) : [], note = it.note ? P.lines('Note : ' + it.note, colW - 18) : [];
        const hh = tl.length * P.lh(9) + (sub.length + note.length) * P.lh(7.8) + 2.2;
        ensure(hh);
        statusMark(P, cx() + 7, cy + 1.3, 1.5, it.status, it.placeholder);
        P.font(it.placeholder ? 'r' : 'r', 9, it.placeholder ? C.faint : it.status === 'done' ? C.muted : C.ink);
        doc.text(tl, cx() + 10.5, cy + 2.4);
        let yy = cy + 2.4 + tl.length * P.lh(9);
        if (sub.length) { P.font('r', 7.8, C.muted); doc.text(sub, cx() + 10.5, yy - 0.6); yy += sub.length * P.lh(7.8); }
        if (note.length) { P.font('r', 7.8, C.violet); doc.text(note, cx() + 10.5, yy - 0.6); }
        if (!it.placeholder) impDots(P, cx() + colW - 5.4, cy + 1.3, it.imp);
        cy += hh;
      });
      cy += 3;
    });
    cy += 3;
  });
  // priorités
  const prio = open.sort((x, y2) => IMP[y2.imp] - IMP[x.imp] || (x.theme.progress || 0) - (y2.theme.progress || 0)).slice(0, 8);
  if (prio.length) {
    ensure(20); P.font('b', 9.5, C.violet); doc.text('PRIORITÉS OUVERTES', cx(), cy + 3, { charSpace: 0.4 }); cy += 7;
    prio.forEach((it, i) => {
      const tl = P.lines(it.text, colW - 14), hh = tl.length * P.lh(9) + P.lh(7.5) + 2;
      ensure(hh);
      P.fill(IMP_RGB[it.imp]); doc.circle(cx() + 2, cy + 1.3, 1.3, 'F');
      P.font('r', 9, C.ink); doc.text(tl, cx() + 6, cy + 2.4);
      P.font('r', 7.5, C.muted); doc.text(`${it.theme.branch.short} · ${it.theme.label} · ${ST_LABEL[it.status]}`, cx() + 6, cy + 2.4 + tl.length * P.lh(9));
      cy += hh;
    });
  }
  pdfFooters(P, 'Carte');
  return { doc, name: `forge-carte-${slug(s.titre)}.pdf` };
}

async function runPdf(kind, idea, btn) {
  const label = btn.textContent;
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>PDF…';
  try {
    const { doc, name } = kind === 'carte' ? await exportCartePdf(idea) : await exportFichePdf(idea);
    await deliverPdf(doc, name);
  } catch (e) { toast(e && e.message ? e.message : 'Export PDF impossible', 4000); }
  finally { btn.disabled = false; btn.textContent = label; }
}

async function deliverPdf(doc, name) { doc.save(name); toast('PDF enregistré dans tes téléchargements'); }

function openPoint(key) {
  const st = mapState; if (!st) return;
  const it = st.model.subs.flatMap(t => t.items).find(i => i.key === key); if (!it || it.placeholder) return;
  const sheet = $('#sheet');
  const opts = key.startsWith('hyp|') ? [['todo', 'À vérifier'], ['done', 'Vérifiée'], ['false', 'Fausse']]
    : key.startsWith('risk|') ? [['todo', 'À traiter'], ['doing', 'En cours'], ['done', 'Maîtrisé']]
    : key.startsWith('step|') ? [['todo', 'À faire'], ['doing', 'En cours'], ['done', 'Fait']]
    : [['todo', 'À faire'], ['doing', 'En cours'], ['done', it.theme.counted ? 'Résolu' : 'Exploité']];
  const seg = (name, o, cur) => `<div class="seg small-seg" data-name="${name}">${o.map(([v, l]) => `<button data-v="${v}" class="${v === cur ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  $('#sheet-body').innerHTML = `
    <div class="sheet-theme" style="color:${it.theme.color}">● ${esc(it.theme.branch.short)} · ${esc(it.theme.label)}</div>
    <p class="sheet-text">${esc(it.text)}</p>
    ${it.sub ? `<p class="muted small" style="white-space:pre-line">${esc(it.sub)}</p>` : ''}
    ${it.theme.counted ? '' : '<p class="muted small">Atout : hors jauge d’avancement.</p>'}
    <div class="field">Statut${seg('s', opts, it.status)}</div>
    <div class="field">Importance${seg('i', [['basse', 'Basse'], ['moyenne', 'Moyenne'], ['haute', 'Haute']], it.imp)}</div>
    <label class="field">Note<textarea id="sheet-note" rows="2" placeholder="Où tu en es, ce qui reste à faire…">${esc(it.note)}</textarea></label>
    <button class="btn primary" id="sheet-close">Fermer</button>`;
  const cur = { s: it.status, i: it.imp };
  const commit = () => {
    const idea = st.idea; setStatus(idea, key, cur.s);
    idea.points ||= {};
    const prev = idea.points[key] || {};
    idea.points[key] = Object.assign({}, prev, key.startsWith('step|') ? {} : { s: cur.s }, { i: cur.i, n: $('#sheet-note').value.trim() });
    idea.updated = Date.now(); persistIdea(idea); st.refresh();
  };
  sheet.querySelectorAll('.small-seg').forEach(sg => sg.querySelectorAll('button').forEach(b => b.onclick = () => {
    sg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    cur[sg.dataset.name] = b.dataset.v; vibrate(15); commit();
  }));
  const close = () => { commit(); sheet.classList.remove('open'); setTimeout(() => (sheet.hidden = true), 250); };
  $('#sheet-close').onclick = close;
  sheet.onclick = e => { if (e.target === sheet) close(); };
  sheet.hidden = false; requestAnimationFrame(() => sheet.classList.add('open'));
}

/* ---------- Export texte d'une idée ---------- */
function toMarkdown(idea) {
  const s = idea.structure, a = idea.analyse, L = [];
  const list = (t, arr) => { arr = A(arr); if (arr.length) { L.push('', '## ' + t); arr.forEach(x => L.push('- ' + x)); } };
  L.push('# ' + (s?.titre || 'Idée'), '');
  if (s) {
    const m = maturity(idea), u = U(idea), q = quadrant(u);
    L.push(s.resume, '', `Maturité ${m.ok}/5 (${m.label}) · ${q || 'priorité à définir'}${u.echeance ? ' · échéance ' + fmtDay(u.echeance) : ''}${u.themes.length ? ' · ' + u.themes.join(', ') : ''}`);
    L.push('', '## Ce que tu as dit', idea.raw, ...idea.complements.filter(c => !c.letter).map(c => '+ ' + c.text));
    L.push('', '## SMART', ...m.st.map(x => `- ${x.L} ${x.label} : ${x.answer ? 'réglé (' + x.answer + ')' : x.etat}${!x.answer && x.etat !== 'ok' && x.manque ? ' → ' + x.manque : ''}`));
  } else L.push(idea.raw);
  if (a) {
    L.push('', '## Verdict', `Faisabilité ${a.faisabilite}. Point bloquant : ${a.point_bloquant}`);
    L.push('', '## Plan'); (idea.steps || []).forEach((st, i) => L.push(`${st.done ? '[x]' : '[ ]'} ${i + 1}. ${st.text}${st.date ? ' (avant le ' + fmtDay(st.date) + ')' : ''}`));
    if (a.test) L.push('', '## Test', a.test);
    list('Hypothèses à vérifier', hypList(a).map(h => h.texte));
    list('Forces', A(a.forces)); list('Faiblesses', [...A(a.faiblesses), ...A(s.contraintes)]); list('Opportunités', a.opportunites);
    L.push('', '## Risques'); A(a.risques).forEach(r => L.push(`- ${r.risque} [${r.gravite}, ${r.origine}] Parade : ${r.parade}`));
    list('Critères de réussite', a.criteres_reussite);
  }
  return L.join('\n');
}
async function shareIdea(idea) {
  const text = toMarkdown(idea);
  try { await navigator.clipboard.writeText(text); toast('Copié dans le presse-papiers'); }
  catch { toast('Copie impossible dans cette vue'); }
}

/* ---------- Réglages ---------- */
function fillSettings() {
  $('#set-key').value = settings.apiKey;
  $('#set-model').value = settings.model;
  $('#set-cats').value = settings.categories.join('\n');
  $('#set-engine').value = settings.engine || 'local';
}
$('#btn-save-settings').addEventListener('click', () => {
  settings.apiKey = $('#set-key').value.trim();
  settings.model = $('#set-model').value;
  settings.engine = $('#set-engine').value;
  const cats = $('#set-cats').value.split('\n').map(s => s.trim()).filter(Boolean);
  settings.categories = cats.length ? [...new Set(cats)] : DEFAULT_CATS;
  save(LS_SETTINGS, settings); toast('Réglages enregistrés'); vibrate(20);
});
$('#btn-export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ app: 'forge', version: 1, exported: new Date().toISOString(), ideas }, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'forge-sauvegarde-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast('Sauvegarde exportée (sans la clé API)');
});
$('#file-import').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    const incoming = Array.isArray(data) ? data : data.ideas;
    if (!Array.isArray(incoming)) throw 0;
    const known = new Set(ideas.map(i => i.id)); let n = 0;
    for (const i of incoming) if (i && i.id && i.raw && !known.has(i.id)) { i.complements ||= []; ideas.push(i); n++; }
    ideas.sort((x, y) => y.created - x.created); persist(); updateCount();
    toast(n + ' idée(s) importée(s)');
  } catch { toast('Fichier de sauvegarde invalide'); }
  e.target.value = '';
});
$('#btn-wipe').addEventListener('click', async () => {
  if (!(await ask('Effacer toutes les idées de cet appareil ? Cette action est définitive.', 'Tout effacer'))) return;
  ideas = []; persist(); updateCount(); toast('Toutes les idées ont été effacées');
});

/* ---------- Démarrage ---------- */
updateCount();
if (!SR) $('#mic-status').textContent = 'Écris ou utilise le micro du clavier';
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => r.update()).catch(() => {});
show('capture');
