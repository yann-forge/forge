/* Forge — moteur d'analyse local.
   Fonctionne hors ligne, sans IA : extraction par règles (français), évaluation SMART
   déterministe et bases de connaissances par domaine (plans, risques, hypothèses, tests).
   Produit les mêmes structures de données que l'analyse par Claude. */
(function (root) {
  'use strict';

  /* =========================================================
     1. Outils texte
     ========================================================= */
  // Repli caractère par caractère (même longueur que l'original : les positions restent alignées)
  const FOLD = { 'à': 'a', 'â': 'a', 'ä': 'a', 'á': 'a', 'ç': 'c', 'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e', 'î': 'i', 'ï': 'i', 'í': 'i', 'ô': 'o', 'ö': 'o', 'ó': 'o', 'ù': 'u', 'û': 'u', 'ü': 'u', 'ú': 'u', 'ÿ': 'y', 'ñ': 'n', '’': "'", '‘': "'", '`': "'", '´': "'", '«': '"', '»': '"', '–': '-', '—': '-', ' ': ' ', ' ': ' ' };
  function fold(s) {
    const a = String(s).split(''); let o = '';
    for (const ch of a) { const l = ch.toLowerCase(); o += l.length === 1 ? (FOLD[l] || l) : ch; }
    return o;
  }
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const clean = s => String(s || '').replace(/\s+/g, ' ').replace(/\s+([,.;:!?])/g, '$1').trim();
  const words = s => s.split(/[^a-z0-9'@-]+/).filter(Boolean);
  const uniq = arr => [...new Set(arr.filter(Boolean))];
  const uniqBy = (arr, f) => { const seen = new Set(); return arr.filter(x => { const k = f(x); if (seen.has(k)) return false; seen.add(k); return true; }); };
  const trimEnd = s => s.replace(/[\s,;:.!?-]+$/, '').replace(/^[\s,;:.-]+/, '');
  const MAXW = (s, n) => { const w = s.split(/\s+/); return w.length > n ? w.slice(0, n).join(' ') + '…' : s; };

  // Phrases et propositions, avec positions dans le texte d'origine
  function sentences(text) {
    const out = []; const re = /[^.!?\n;]+[.!?;]*/g; let m;
    while ((m = re.exec(text))) { const t = m[0]; const lead = t.length - t.trimStart().length; const s = t.trim(); if (s.length > 1) out.push({ start: m.index + lead, end: m.index + lead + s.length, text: s }); }
    return out;
  }
  const CLAUSE_SPLIT = /,|\s*:\s+(?=[a-z])|\s+et\s+(?=(?:je|j'|il|on|nous|tu|faut|faudrait|puis|ensuite|apres|aussi|demander|acheter|contacter|faire|trouver|monter|creer|preparer|reserver|enregistrer|envoyer|appeler|ecrire|lancer|organiser|commander|tester|souder|fabriquer|construire)\b)|\s+mais\s+|\s+puis\s+|\s+ensuite\s+|\s+donc\s+|\s+sinon\s+|\s*\(|\)/g;
  function clauses(text, ftext) {
    const out = [];
    for (const s of sentences(text)) {
      const fs = ftext.slice(s.start, s.end); let last = 0; let m; CLAUSE_SPLIT.lastIndex = 0;
      const push = (a, b) => { const raw = text.slice(s.start + a, s.start + b); const lead = raw.length - raw.trimStart().length; const t = trimEnd(raw.trim()); if (t.length > 2) out.push({ start: s.start + a + lead, end: s.start + a + lead + t.length, text: t, f: fold(t), sentence: s }); };
      while ((m = CLAUSE_SPLIT.exec(fs))) { push(last, m.index); last = m.index + m[0].length; }
      push(last, fs.length);
    }
    return out;
  }

  /* =========================================================
     2. Nombres en lettres
     ========================================================= */
  const NUMW = { zero: 0, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16, vingt: 20, vingts: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60, cent: 100, cents: 100, mille: 1000 };
  const APPROX = { dizaine: 10, douzaine: 12, quinzaine: 15, vingtaine: 20, trentaine: 30, quarantaine: 40, cinquantaine: 50, soixantaine: 60, centaine: 100, millier: 1000 };
  const NUM_WORD_RE = '(?:(?:zero|une?|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|vingts?|trente|quarante|cinquante|soixante|cents?|mille)(?:[\\s-](?:et[\\s-])?(?:une?|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|vingts?|cents?|mille))*)';
  function wordsToNum(s) {
    let total = 0, cur = 0;
    for (const w of s.split(/[\s-]+/)) {
      if (w === 'et') continue;
      const v = NUMW[w]; if (v === undefined) return null;
      if (v === 100) cur = (cur || 1) * 100; else if (v === 1000) { total += (cur || 1) * 1000; cur = 0; } else cur += v;
    }
    return total + cur;
  }
  function parseNum(s) {
    s = s.trim();
    if (/^\d/.test(s)) { const k = /k$/i.test(s); const n = parseFloat(s.replace(/k$/i, '').replace(/\s/g, '').replace(',', '.')); return k ? n * 1000 : n; }
    if (APPROX[s.replace(/^une?\s+/, '')]) return APPROX[s.replace(/^une?\s+/, '')];
    return wordsToNum(s);
  }

  /* =========================================================
     3. Dates
     ========================================================= */
  const MONTHS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
  const MONTH_RE = '(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre|janv|fevr?|avr|juil|sept|oct|nov|dec)\\.?';
  const monthIdx = m => { m = m.replace('.', ''); const i = MONTHS.findIndex(x => x.startsWith(m.slice(0, 3)) && (m.length < 4 || x.startsWith(m.slice(0, 4)))); return i; };
  const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const lastDay = (y, m) => new Date(y, m + 1, 0).getDate();
  function futureDate(today, m, d, year) {
    let y = year || today.getFullYear();
    let dt = new Date(y, m, Math.min(d, lastDay(y, m)), 12);
    if (!year && dt < today) dt = new Date(y + 1, m, Math.min(d, lastDay(y + 1, m)), 12);
    return dt;
  }
  const addDays = (t, n) => { const d = new Date(t); d.setDate(d.getDate() + n); return d; };
  const addMonths = (t, n) => { const d = new Date(t); d.setMonth(d.getMonth() + n); return d; };
  const UNIT_DAYS = { jour: 1, jours: 1, semaine: 7, semaines: 7, mois: 30, an: 365, ans: 365, annee: 365, annees: 365 };

  function findDates(text, ft, today) {
    const found = [];
    const add = (m, date, kind, conf) => found.push({ start: m.index, end: m.index + m[0].length, text: trimEnd(text.substr(m.index, m[0].length).trim()), date: iso(date), kind, conf });
    const scan = (re, fn) => { re.lastIndex = 0; let m; while ((m = re.exec(ft))) { const r = fn(m); if (r) add(m, r[0], r[1], r[2] || 1); } };
    const yr = s => s ? (s.length === 2 ? 2000 + +s : +s) : null;
    // 15 mars (2027)
    scan(new RegExp(`\\b(?:le\\s+|du\\s+|au\\s+)?(\\d{1,2})(?:er)?\\s+${MONTH_RE}(?:\\s+(\\d{4}))?`, 'g'), m => { const mi = monthIdx(m[2]); if (mi < 0 || +m[1] > 31) return null; return [futureDate(today, mi, +m[1], yr(m[3])), 'date']; });
    // 15/03(/2027)
    scan(/\b(\d{1,2})[\/.](\d{1,2})(?:[\/.](\d{2,4}))?\b/g, m => { const d = +m[1], mo = +m[2] - 1; if (d > 31 || mo > 11 || mo < 0) return null; return [futureDate(today, mo, d, yr(m[3])), 'date']; });
    // fin / début / mi janvier
    scan(new RegExp(`\\b(fin|debut|mi|courant|milieu)(?:\\s+(?:du\\s+mois\\s+)?(?:de\\s+|d')?|-)${MONTH_RE}(?:\\s+(\\d{4}))?`, 'g'), m => {
      const mi = monthIdx(m[2]); if (mi < 0) return null;
      const y0 = yr(m[3]); const base = futureDate(today, mi, 28, y0); const y = base.getFullYear();
      const d = m[1] === 'fin' ? lastDay(y, mi) : m[1] === 'debut' ? 10 : 15;
      return [new Date(y, mi, d, 12), 'periode'];
    });
    // en janvier / janvier 2027 / pour janvier
    scan(new RegExp(`\\b(?:en|pour|avant|d'ici|des|courant)\\s+${MONTH_RE}(?:\\s+(\\d{4}))?\\b`, 'g'), m => { const mi = monthIdx(m[1]); if (mi < 0) return null; const b = futureDate(today, mi, 28, yr(m[2])); const avant = /^avant/.test(m[0]); return [new Date(b.getFullYear(), mi, avant ? 1 : lastDay(b.getFullYear(), mi), 12), 'periode', .9]; });
    scan(new RegExp(`\\b${MONTH_RE}\\s+(\\d{4})\\b`, 'g'), m => { const mi = monthIdx(m[1]); if (mi < 0) return null; return [new Date(+m[2], mi, lastDay(+m[2], mi), 12), 'periode']; });
    // dans / d'ici / sous N jours|semaines|mois|ans
    scan(new RegExp(`\\b(dans|d'ici|sous|en|avant)\\s+(\\d+|${NUM_WORD_RE}|quelques)\\s+(jours?|semaines?|mois|ans?|annees?)\\b`, 'g'), m => {
      const n = m[2] === 'quelques' ? 3 : parseNum(m[2]); if (!n) return null;
      const u = UNIT_DAYS[m[3]]; const d = u === 30 ? addMonths(today, n) : u === 365 ? addMonths(today, 12 * n) : addDays(today, n * u);
      return [d, m[1] === 'en' ? 'duree' : 'relatif', m[1] === 'en' ? .6 : 1];
    });
    scan(/\b(demain|apres-demain|la semaine prochaine|le mois prochain|l'annee prochaine|ce week-end|ce weekend|cette semaine|ce mois-ci|cette annee|d'ici la fin de l'annee|fin d'annee|fin de l'annee|fin du mois|d'ici la fin du mois)\b/g, m => {
      const k = m[1]; const t = today;
      if (k === 'demain') return [addDays(t, 1), 'relatif'];
      if (k === 'apres-demain') return [addDays(t, 2), 'relatif'];
      if (k === 'la semaine prochaine') return [addDays(t, 7 + ((5 - t.getDay() + 7) % 7)), 'relatif'];
      if (k === 'cette semaine') return [addDays(t, (5 - t.getDay() + 7) % 7), 'relatif'];
      if (k.startsWith('ce week')) return [addDays(t, (6 - t.getDay() + 7) % 7 || 7), 'relatif'];
      if (k === 'le mois prochain') { const d = addMonths(t, 1); return [new Date(d.getFullYear(), d.getMonth(), lastDay(d.getFullYear(), d.getMonth()), 12), 'periode']; }
      if (k === 'ce mois-ci' || k.includes('fin du mois')) return [new Date(t.getFullYear(), t.getMonth(), lastDay(t.getFullYear(), t.getMonth()), 12), 'periode'];
      if (k === "l'annee prochaine") return [new Date(t.getFullYear() + 1, 11, 31, 12), 'periode', .7];
      return [new Date(t.getFullYear(), 11, 31, 12), 'periode'];
    });
    scan(new RegExp(`\\bun\\s+(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\\s+(?:de\\s+|d'|en\\s+|du mois de\\s+)${MONTH_RE}(?:\\s+(\\d{4}))?`, 'g'), m => { const mi = monthIdx(m[1]); if (mi < 0) return null; return [futureDate(today, mi, 15, yr(m[2])), 'periode', .9]; });
    scan(new RegExp(`\\b(avant|pour|d'ici|des)\\s+(?:les?|la|l')\\s*[a-z-]+(?:\\s+[a-z-]+){0,3}?\\s+(?:de\\s+|d'|du mois de\\s+|en\\s+)${MONTH_RE}(?:\\s+(\\d{4}))?`, 'g'), m => { const mi = monthIdx(m[2]); if (mi < 0) return null; const b = futureDate(today, mi, 1, yr(m[3])); return [m[1] === 'avant' ? b : new Date(b.getFullYear(), mi, lastDay(b.getFullYear(), mi), 12), 'periode', .9]; });
    scan(new RegExp(`\\b(?:a partir de|a compter de|des)\\s+${MONTH_RE}(?:\\s+(\\d{4}))?`, 'g'), m => { const mi = monthIdx(m[1]); if (mi < 0) return null; return [futureDate(today, mi, 1, yr(m[2])), 'debut', .8]; });
    // jours de la semaine
    scan(/\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)(\s+prochain)?\b(?!\s+\d)/g, m => { const target = DAYS.indexOf(m[1]); let diff = (target - today.getDay() + 7) % 7; if (diff === 0 || m[2]) diff += diff === 0 ? 7 : 0; return [addDays(today, diff || 7), 'date', .8]; });
    // fêtes et saisons
    const fixed = [[/\b(?:noel)\b/g, 11, 24], [/\b(?:nouvel an|jour de l'an)\b/g, 11, 31], [/\b(?:la )?saint[- ]valentin\b/g, 1, 14], [/\b(?:fete de la musique)\b/g, 5, 21], [/\b(?:la )?rentree\b/g, 8, 5], [/\b(?:le )?14 juillet\b/g, 6, 14], [/\b(?:la )?toussaint\b/g, 10, 1]];
    for (const [re, mo, d] of fixed) scan(re, () => [futureDate(today, mo, d), 'evenement', .9]);
    const VAC = { printemps: [3, 15], ete: [6, 15], noel: [11, 22], toussaint: [9, 25], fevrier: [1, 15], hiver: [1, 15], paques: [3, 15] };
    scan(/\b(?:pendant |aux |durant |pour )?les vacances (?:de |d'|du )?(printemps|ete|noel|toussaint|fevrier|hiver|paques)\b/g, m => [futureDate(today, VAC[m[1]][0], VAC[m[1]][1]), 'periode', .8]);
    const SEASONS = { printemps: [2, 20, 5, 20], ete: [5, 21, 8, 22], automne: [8, 22, 11, 20], hiver: [11, 21, 2, 19] };
    scan(/\b(avant|pour|d'ici|des|fin|debut|cet|ce|au|en|l'|pendant|durant|tout)\s*(?:l'|le\s+|la\s+)?(printemps|ete|automne|hiver)\b/g, m => {
      const [m1, d1, m2, d2] = SEASONS[m[2]]; const fin = /^(fin|pendant|durant|tout)$/.test(m[1]);
      return [futureDate(today, fin ? m2 : m1, fin ? d2 : d1), 'saison', .8];
    });
    // dédoublonnage : on garde l'expression la plus longue
    found.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
    const out = []; for (const f of found) { if (out.some(o => f.start < o.end && f.end > o.start)) continue; out.push(f); }
    return out;
  }
  // Durées associées à un objectif (« au bout de trois mois », « pendant 2 semaines »)
  function findDurations(ft, text) {
    const out = []; const re = new RegExp(`\\b(au bout d'|au bout de|pendant|sur|en|apres|d'ici)\\s*(\\d+|${NUM_WORD_RE}|quelques)\\s+(jours?|semaines?|mois|ans?|annees?)\\b`, 'g'); let m;
    while ((m = re.exec(ft))) out.push({ start: m.index, end: m.index + m[0].length, text: text.substr(m.index, m[0].length) });
    return out;
  }

  /* =========================================================
     4. Montants, quantités, unités
     ========================================================= */
  const NUMBER_RE = `(\\d{1,3}(?:[ .]\\d{3})+|\\d+(?:[.,]\\d+)?k?|${NUM_WORD_RE}|(?:une?\\s+)?(?:dizaine|douzaine|quinzaine|vingtaine|trentaine|quarantaine|cinquantaine|soixantaine|centaine|millier)s?)`;
  function findMoney(text, ft) {
    const out = []; let m;
    const re1 = new RegExp(`(?:(environ|pas plus de|max(?:imum)?|moins de|jusqu'a|au plus|budget(?: de)?|autour de|a peu pres|entre)\\s+)?${NUMBER_RE}\\s*(?:a\\s+${NUMBER_RE}\\s*)?(€|euros?|eur\\b|balles|k€|keuros)`, 'g');
    while ((m = re1.exec(ft))) {
      const v = parseNum(m[2]); if (v === null || isNaN(v)) continue;
      const mult = /k€|keuros/.test(m[4]) ? 1000 : 1;
      const ctx = ft.slice(Math.max(0, m.index - 40), m.index);
      const after = ft.slice(m.index + m[0].length, m.index + m[0].length + 22);
      const pre22 = ft.slice(Math.max(0, m.index - 24), m.index);
      const price = /^\s*(?:la |le |l'|par |de l')?(?:piece|unite|billet|entree|place|personne|chacune?|ttc|ht|date|concert|prestation|seance|soiree|heure|jour|journee|semaine|soir|nuit|week-end|mois|cours|atelier|adhesion|cotisation|kit|exemplaire|location)\b/.test(after) || /\b(?:entree|place|billet|cotisation|adhesion|tarif|prix|abonnement|adherents?|membres?|places?|contreparties?)\s+(?:a|de|:)?\s*$/.test(pre22) || (/\s(?:a|à)\s*$/.test(pre22) && !(m[1] || '').trim() && !/budget|cout/.test(pre22)) || /\b(?:paie|paye|verse|rapporte|donne|recoit|facture|vend)\s+(?:[a-z'-]+\s+){0,2}$/.test(pre22);
      const ctx2 = ft.slice(Math.max(0, m.index - 90), m.index);
      const goal = /\b(objectif|obtenir|recolter|lever|gagner|atteindre|vendre pour|chiffre d'affaires|ca de|recette|benefice|faire)\s*:?\s*(?:de\s+|d')?(?:[a-z'-]+\s+){0,2}$/.test(ctx) || /^\s*(?:de|d')\s*(?:recette|ca\b|chiffre|benefice|marge|dons|subvention|financement)/.test(after) || /\b(subvention|demande de financement|dotation|mecenat|aide de|campagne|ulule|kisskiss|crowdfunding|financement participatif|cagnotte|collecte|collecter)\b[^.]*$/.test(ctx2) && !/budget|cout|depense|payer|acheter/.test(ctx);
      out.push({ start: m.index, end: m.index + m[0].length, text: text.substr(m.index, m[0].length).trim().replace(/^budget\s+(?:de\s+)?/i, ''), value: v * mult, qual: m[1] || '', limit: /pas plus|max|moins de|jusqu'a|au plus/.test(m[1] || ''), goal: goal && !price, price });
    }
    const re2 = /€\s?(\d+(?:[.,]\d+)?)/g;
    while ((m = re2.exec(ft))) out.push({ start: m.index, end: m.index + m[0].length, text: text.substr(m.index, m[0].length), value: parseFloat(m[1].replace(',', '.')), qual: '', limit: false });
    return out;
  }
  const TECH_UNITS = { 'w': 'puissance', 'watts?': 'puissance', 'kw': 'puissance', 'v': 'tension', 'volts?': 'tension', 'a': 'courant', 'amperes?': 'courant', 'ma': 'courant', 'ohms?': 'impédance', 'kohms?': 'impédance', 'k': 'valeur', 'hz': 'fréquence', 'khz': 'fréquence', 'db': 'niveau', 'dbu': 'niveau', 'cm': 'dimension', 'mm': 'dimension', 'm2': 'surface', 'm²': 'surface', 'm3': 'volume', 'm³': 'volume', 'kg': 'masse', 'g': 'masse', 'l': 'volume', 'litres?': 'volume', 'btu': 'puissance frigorifique', '°c': 'température', 'degres': 'température', 'pouces?': 'dimension', 'mah': 'capacité', 'wh': 'énergie', 'kwh': 'énergie', 'tr/min': 'vitesse', 'rpm': 'vitesse', 'bpm': 'tempo', 'ms': 'temps', 'secondes?': 'temps', 'ah': 'capacité', 'min': 'durée', 'minutes?': 'durée', 'heures?': 'durée', 'h': 'durée' };
  function findSpecs(text, ft) {
    const out = []; const keys = Object.keys(TECH_UNITS).sort((a, b) => b.length - a.length).join('|');
    const re = new RegExp(`\\b(\\d+(?:[.,]\\d+)?)\\s?(${keys})(?![a-z])`, 'g'); let m;
    while ((m = re.exec(ft))) { const unit = Object.keys(TECH_UNITS).find(k => new RegExp(`^(?:${k})$`).test(m[2])); out.push({ start: m.index, end: m.index + m[0].length, text: text.substr(m.index, m[0].length), value: parseFloat(m[1].replace(',', '.')), kind: TECH_UNITS[unit] }); }
    return out;
  }
  // Cibles chiffrées (« 200 abonnés », « une centaine de personnes », « 3 concerts »)
  const TARGET_NOUNS = 'demi-journees?|journees?|locations?|reservations?|mails?|e-mails?|candidatures?|prestations?|soirees?|kits?|exemplaires?|abonnes?|auditeurs?|ecoutes?|streams?|vues?|likes?|followers?|fans?|ventes?|vendus?|exemplaires?|cd|vinyles?|disques?|copies|clients?|commandes?|inscrits?|inscriptions?|participants?|personnes?|spectateurs?|entrees?|billets?|places?|adherents?|membres?|benevoles?|eleves?|enfants?|jeunes|familles?|visiteurs?|dates?|concerts?|representations?|seances?|ateliers?|episodes?|titres?|morceaux?|chansons?|clips?|videos?|articles?|produits?|pieces?|unites?|prototypes?|pedales?|amplis?|exemplaires|partenaires?|sponsors?|mecenes?|groupes?|artistes?|projets?|dossiers?|heures?|jours?|semaines?|mois|pourcents?|%|euros? de (?:ca|chiffre d.affaires|benefice|recette|marge)|chiffre d.affaires|ca\\b';
  function findTargets(text, ft, money) {
    const out = []; let m;
    const re = new RegExp(`${NUMBER_RE}\\s*(?:de\\s+|d')?(?:(?:nouveaux|nouvelles|nouveau|nouvelle|vrais|vraies|grands?|grandes|petits?|petites|premiers?|premieres?|autres|bons?|bonnes)\\s+)?(${TARGET_NOUNS})`, 'g');
    while ((m = re.exec(ft))) {
      if (money.some(x => m.index >= x.start && m.index < x.end)) continue;
      const v = parseNum(m[1]); if (v === null || isNaN(v)) continue;
      if (/^(?:une?|zero)$/.test(m[1].trim())) continue;
      const pre = ft.slice(Math.max(0, m.index - 3), m.index);
      if (/\b(le|du|au)\s*$/.test(pre)) continue; // « le 15 mars » géré par les dates
      out.push({ start: m.index, end: m.index + m[0].length, text: text.substr(m.index, m[0].length).trim(), value: v, noun: m[2] });
    }
    const obj = new RegExp(`\\bobjectifs?\\s*:?\\s*(?:de\\s+)?(\\d+(?:[.,]\\d+)?)\\s+([a-z'-]+)`, 'g');
    while ((m = obj.exec(ft))) if (!/^(euros?|€|eur)$/.test(m[2]) && !out.some(o => o.start <= m.index + m[0].length && o.end >= m.index)) out.push({ start: m.index, end: m.index + m[0].length, text: text.substr(m.index, m[0].length).replace(/^objectifs?\s*:?\s*(?:de\s+)?/i, ''), value: parseFloat(m[1]), noun: m[2] });
    const pct = /(\d+(?:[.,]\d+)?)\s?(%|pour ?cent)/g;
    while ((m = pct.exec(ft))) out.push({ start: m.index, end: m.index + m[0].length, text: text.substr(m.index, m[0].length), value: parseFloat(m[1]), noun: '%' });
    return uniqBy(out, x => x.start);
  }

  /* =========================================================
     5. Verbes d'action (infinitifs et formes conjuguées courantes)
     ========================================================= */
  const ER_VERBS = 'constituer completer justifier prouver attester actualiser corriger numeroter compiler recolter quantifier lister recenser schematiser cabler router piloter declencher heberger signer contractualiser assurer tarifer tester ramener amener emmener apporter rapporter preter changer reprendre caler bosser kiffer graver presser tirer rassembler bloquer liberer reveiller remonter acheminer livrer convoquer rembourser nommer deleguer recompenser juger selectionner auditionner heberger charger decharger ranger animer evaluer informer prevenir solder budgetiser mutualiser fabriquer realiser ameliorer modifier adapter recycler coder automatiser regler partager postuler candidater telecharger accompagner aider booker chiffrer clarifier collaborer consulter creuser debuter demenager depanner diagnostiquer dupliquer economiser elargir emprunter enseigner equilibrer exposer fideliser filtrer gagner illustrer importer exporter informer integrer lister mobiliser moderniser monetiser nettoyer orienter parrainer planter positionner pitcher prospecter recenser reconditionner relier remplacer rentabiliser reprogrammer retravailler reviser sauver scanner sonder sponsoriser stabiliser surveiller synchroniser tracer transformer trier utiliser visser blinder dessouder ressouder bobiner cartographier acheter appeler ajouter ajuster aller amenager animer annoncer annuler apporter assembler assurer budgeter brancher bricoler calculer calibrer caler chercher chiffrer cibler cabler collecter coller commander communiquer comparer composer compter concretiser confirmer contacter controler coordonner copier creer customiser cuisiner deballer decider decouper declarer decorer definir delimiter demander demarcher demarrer deplacer deposer designer dessiner developper diffuser distribuer documenter donner doser echanger editer embaucher emprunter encaisser engager enregistrer ensemencer entrainer envoyer equiper essayer estimer etudier evaluer facturer fixer filmer finaliser financer former fraiser gerer graver imaginer imprimer installer interviewer inviter isoler jouer lancer livrer localiser louer maquetter marquer masteriser mesurer mixer modeliser monter motiver negocier noter numeriser optimiser organiser packager participer payer peaufiner percer peser photographier piloter planifier poncer poser poster pratiquer preparer presenter preter prevoir programmer projeter promouvoir proposer prototyper publier rassembler rechercher recruter recuperer rediger relancer reparer repeter reserver rencontrer renseigner renover repertorier restaurer retoucher rejoindre rester reunir sampler sauvegarder scier securiser sensibiliser signer simuler solliciter souder souscrire sonoriser sourcer structurer stocker tailler tester tirer tourner transporter travailler trouver valider vendre verifier visiter voter'.split(/\s+/);
  const IRREG = {
    faire: 'fais fait faisons faites font fasse fasses fassent ferai feras fera ferons'.split(' '),
    prendre: 'prends prend prenons prennent prenne prendrai prendra'.split(' '),
    mettre: 'mets met mettons mettent mette mettrai mettra'.split(' '),
    ecrire: 'ecris ecrit ecrivons ecrivent ecrive ecrirai ecrira'.split(' '),
    construire: 'construis construit construisons construisent construise construirai'.split(' '),
    produire: 'produis produit produisons produisent produise produirai'.split(' '),
    reduire: 'reduis reduit reduise'.split(' '),
    vendre: 'vends vend vendons vendent vende vendrai'.split(' '),
    rendre: 'rends rend rende rendrai'.split(' '),
    sortir: 'sors sort sortons sortent sorte sortirai sortira'.split(' '),
    ouvrir: 'ouvre ouvrons ouvrent ouvrirai'.split(' '),
    offrir: 'offre offrons offrent offrirai'.split(' '),
    finir: 'finis finit finissons finisse finirai'.split(' '),
    choisir: 'choisis choisit choisissons choisisse choisirai'.split(' '),
    reunir: 'reunis reunit reunisse'.split(' '),
    remplir: 'remplis remplit remplisse'.split(' '),
    batir: 'batis batit batisse'.split(' '),
    obtenir: 'obtiens obtient obtienne obtiendrai'.split(' '),
    tenir: 'tiens tient tienne tiendrai'.split(' '),
    venir: 'viens vient vienne viendrai'.split(' '),
    voir: 'vois voit voyons voie verrai'.split(' '),
    recevoir: 'recois recoit recoive recevrai'.split(' '),
    aller: 'vais va allons aille irai'.split(' '),
    reflechir: 'reflechis reflechit reflechisse'.split(' '),
    definir: 'definis definit definisse'.split(' '),
    investir: 'investis investit investisse'.split(' '),
    repondre: 'reponds repond reponde'.split(' '),
    peindre: 'peins peint peigne'.split(' '),
    joindre: 'joins joint joigne'.split(' '),
    apprendre: 'apprends apprend apprenne'.split(' '),
    comprendre: 'comprends comprend comprenne'.split(' '),
    entreprendre: 'entreprends entreprend entreprenne'.split(' '),
    reprendre: 'reprends reprend reprenne'.split(' '),
    soumettre: 'soumets soumet soumette'.split(' '),
    transmettre: 'transmets transmet transmette'.split(' '),
    decrire: 'decris decrit decrive'.split(' '),
    inscrire: 'inscris inscrit inscrive'.split(' '),
    concevoir: 'concois concoit concoive'.split(' '),
    resoudre: 'resous resout resolve'.split(' '),
    elire: 'elis elit elise'.split(' '),
    fournir: 'fournis fournit fournisse'.split(' '),
    relire: 'relis relit relise'.split(' '),
    joindre: 'joins joint joigne'.split(' '),
    remplir: 'remplis remplit remplisse'.split(' '),
    conduire: 'conduis conduit conduise'.split(' '),
    reprendre: 'reprends reprend reprenne reprenons'.split(' '),
    refaire: 'refais refait refasse'.split(' '),
    detruire: 'detruis detruit'.split(' '),
    accueillir: 'accueille accueillons accueillent'.split(' '),
    nourrir: 'nourris nourrit'.split(' '),
    convaincre: 'convaincs convainc convainque'.split(' '),
    permettre: 'permets permet permette'.split(' ')
  };
  const ALL_VERBS = new Set([...ER_VERBS, ...Object.keys(IRREG), 'mettre en place', 'mettre en ligne']);
  const FORM2INF = new Map();
  for (const v of ER_VERBS) {
    const st = v.slice(0, -2);
    const forms = [st + 'e', st + 'es', st + 'ent', st + 'ons', st + 'ez', st + 'erai', st + 'eras', st + 'era', st + 'erons', st + 'ais', st + 'ait'];
    if (/g$/.test(st)) forms.push(st + 'eons');
    if (/l$/.test(st)) forms.push(st + 'le', st + 'les', st + 'lent');
    if (/t$/.test(st)) forms.push(st + 'te', st + 'tes', st + 'tent');
    for (const f of forms) if (!FORM2INF.has(f)) FORM2INF.set(f, v);
  }
  for (const [inf, forms] of Object.entries(IRREG)) for (const f of forms) if (!FORM2INF.has(f)) FORM2INF.set(f, inf);
  const toInf = w => ALL_VERBS.has(w) ? w : (FORM2INF.get(w) || null);

  // Verbes « de projet » utilisés pour repérer l'objectif principal
  const PROJECT_VERBS = new Set('former apprendre coder demarcher monter preparer tourner booker diffuser lancer creer monter organiser fabriquer construire realiser developper produire sortir enregistrer ouvrir mettre ecrire composer acheter investir equiper installer concevoir fonder demarrer preparer proposer animer programmer publier vendre reparer renover restaurer modifier ameliorer obtenir trouver financer former recruter tourner filmer designer prototyper apprendre faire'.split(' '));

  /* =========================================================
     6. Lexiques
     ========================================================= */
  const STOP = new Set("a au aux avec ce ces cet cette c'est dans de des du elle en et eux il ils je j' la le les leur lui ma mais me mes moi mon ne nos notre nous on ou par pas pour qu que qui sa se ses son sur ta te tes toi ton tu un une vos votre vous y d' l' n' s' m' t' qu' est sont suis etre avoir ai as a avons ont fait faire faut faudrait il-y bien tres plus moins aussi comme si ca cela ceci tout tous toute toutes rien chose choses truc trucs genre peu peut-etre peut etre deja encore puis alors donc car parce quand dont ici la-bas avant apres pendant depuis entre vers chez sans sous idee envie besoin veux voudrais aimerais pense crois sais dois vais va vont serait sera c'etait cest jai mettre petit petite gros grosse grand grande bon bonne".split(' '));
  const VAGUE = [['peut-être', 'peut[- ]etre'], ['genre', "genre(?! de| d'|s)"], ['un peu', "un peu(?! de| d')"], ['quelque chose', 'quelque chose'], ['un truc', 'un truc|des trucs'], ['machin', 'machin'], ['plus ou moins', 'plus ou moins'], ['éventuellement', 'eventuellement'], ['à voir', 'a voir|on verra'], ['si possible', 'si possible'], ['sûrement', 'surement|probablement'], ['quelques', 'quelques'], ['plusieurs', 'plusieurs'], ['pas mal', 'pas mal'], ['bientôt', 'bientot'], ['un jour', 'un jour(?! de| ou)'], ['à un moment', 'a un moment'], ['vite fait', 'vite fait'], ['en gros', 'en gros'], ['etc.', 'etc'], ['pourquoi pas', 'pourquoi pas'], ['sympa', 'sympa']];
  const AUDIENCE = 'lyceens|collegiens|apprentis|stagiaires|public|gens|personnes|jeunes|ados|adolescents|enfants|familles|parents|seniors|retraites|habitants|riverains|adherents|membres|benevoles|musiciens|artistes|groupes|eleves|etudiants|clients|abonnes|auditeurs|spectateurs|fans|amateurs|debutants|pros|professionnels|guitaristes|bassistes|chanteurs|batteurs|techniciens|partenaires|ecoles|structures|associations|entreprises|commercants|quartier|ville|mairie|collectivites|programmateurs|salles|labels|medias|journalistes|touristes|scolaires|centre social|maisons de quartier|ehpad|hopitaux|personnes agees|personnes handicapees';
  const ROLES = 'ville|fondation|inge son|ingenieur du son|technicien|regisseur|graphiste|monteur|monteuse|videaste|photographe|mixeur|masteriseur|producteur|realisateur|beatmaker|musicien|batteur|bassiste|guitariste|chanteur|chanteuse|choriste|comptable|tresorier|tresoriere|president|presidente|secretaire|bureau|conseil d\'administration|benevoles?|mecene|sponsor|partenaire|banque|banquier|mairie|prefecture|region|departement|drac|sacem|cnm|adami|spedidam|urssaf|guso|pole emploi|france travail|imprimeur|fournisseur|distributeur|label|tourneur|attache de presse|programmateur|luthier|electronicien|electricien|frigoriste|soudeur|menuisier|artisan|fablab|ami|amie|pote|frere|soeur|cousin|cousine|pere|mere|copain|copine|collegue|associe|associee';
  const EQUIP = 'qu-?\\d+|x32|m32|sq-?\\d|dlive|platines|cdj|micro|micros|interface|carte son|console|table de mixage|enceintes?|retours?|ampli|amplis|amplificateur|guitare|basse|batterie|clavier|synthe|synthetiseur|pedales?|pedalier|cables?|casque|ordinateur|ordi|pc|mac|logiciel|daw|ableton|cubase|reaper|pro tools|logic|plugin|camera|appareil photo|eclairage|projecteurs?|lumieres?|sono|sonorisation|scene|vehicule|camion|voiture|remorque|local|salle|studio|atelier|garage|imprimante 3d|imprimante|fer a souder|station de soudage|oscilloscope|multimetre|generateur|alimentation de labo|perceuse|visseuse|scie|ponceuse|defonceuse|etabli|etau|tour|fraiseuse|laser|cnc|arduino|raspberry|esp32|breadboard|site internet|site web|compte bancaire|stock|outils?|materiel';
  const COMPONENTS = 'resistances?|condensateurs?|transistors?|diodes?|leds?|potentiometres?|potars?|footswitch|footswitchs|interrupteurs?|switchs?|jacks?|boitiers?|boitier|pcb|circuit imprime|plaque d\'essai|veroboard|stripboard|ampli op|aop|op-amp|ne5532|tl072|jrc4558|lm386|lampes?|tubes?|12ax7|el34|el84|6l6|transfos?|transformateurs?|self|redresseur|regulateur|compresseurs?|ventilateurs?|ventilo|echangeur|evaporateur|condenseur|radiateur|dissipateur|peltier|module peltier|tuyaux?|cuivre|fluide|gaz|r290|r32|r410a|thermostat|capteurs?|sondes?|moteurs?|relais|fusibles?|cordon secteur|prise|batterie lithium|accu|cellules|bms|haut-parleurs?|hp|baffle|caisson|bois|contreplaque|mdf|alu|aluminium|acier|tole|vis|colle|peinture|vernis|tissu|grille';

  /* =========================================================
     7. Domaines
     ========================================================= */
  const DOMAINS = {
    musique: { label: 'Musique', kw: { 'booker': 3, 'booking': 3, 'programmateurs': 3, 'dossier de presse': 3, 'dates de concert': 3, 'trio': 2, 'quartet': 2, 'solo': 1, 'enregistre': 2, 'pressage': 3, 'presser': 3, 'album': 3, 'ep': 3, 'single': 3, 'morceau': 3, 'morceaux': 3, 'titre': 1, 'chanson': 3, 'chansons': 3, 'compo': 3, 'composer': 3, 'composition': 3, 'enregistrer': 2, 'enregistrement': 3, 'studio': 2, 'mixage': 3, 'mixer': 2, 'mastering': 3, 'master': 1, 'maquette': 2, 'demo': 2, 'clip': 3, 'groupe': 2, 'repet': 2, 'repetition': 2, 'concert': 2, 'tournee': 3, 'live': 1, 'spotify': 3, 'deezer': 3, 'bandcamp': 3, 'streaming': 3, 'distribution': 1, 'vinyle': 3, 'cd': 2, 'sacem': 2, 'musique': 2, 'musical': 2, 'podcast': 3, 'beat': 2, 'prod': 1, 'chanteur': 1, 'guitare': 1, 'basse': 1, 'batterie': 1, 'jazz': 2, 'rock': 2, 'folk': 2, 'rap': 2, 'electro': 2, 'arrangement': 2, 'paroles': 3, 'texte': 1, 'label': 1, 'sortie': 1, 'playlist': 3, 'radio': 2, 'son': 1, 'sound': 1 } },
    asso: { label: 'Association', kw: { 'association': 3, 'asso': 3, 'tlm103': 3, 'bureau': 2, 'ca': 1, "conseil d'administration": 3, 'ag': 2, 'assemblee generale': 3, 'statuts': 3, 'adherent': 3, 'adherents': 3, 'adhesion': 3, 'cotisation': 3, 'subvention': 3, 'subventions': 3, 'dossier': 2, 'prefecture': 3, 'mairie': 2, 'benevole': 3, 'benevoles': 3, 'mecenat': 3, 'mecene': 3, 'rescrit': 3, 'recu fiscal': 3, 'cerfa': 3, 'tresorerie': 2, 'tresorier': 3, 'president': 2, 'loi 1901': 3, 'compte rendu': 2, 'demarche': 2, 'demarches': 2, 'administratif': 2, 'licence': 2, 'guso': 3, 'convention': 2, 'partenariat': 2 } },
    achat: { label: 'Achat de matériel', kw: { 'acheter': 3, 'achat': 3, 'commander': 2, 'commande': 1, 'investir': 2, 'investissement': 2, 'occasion': 3, 'neuf': 2, 'leboncoin': 3, 'thomann': 3, 'woodbrass': 3, 'amazon': 2, 'magasin': 2, 'prix': 2, 'modele': 2, 'marque': 2, 'comparer': 3, 'budget': 1, 'louer': 2, 'location': 2, 'devis': 2, 'remplacer': 2, 'upgrade': 3, 'equiper': 3, "s'equiper": 3, 'materiel': 2 } },
    evenement: { label: 'Événement', kw: { 'anniversaire': 2, 'ans de': 2, 'celebrer': 3, 'inauguration': 3, 'soiree concert': 3, 'festival': 3, 'soiree': 3, 'evenement': 3, 'event': 3, 'concert': 2, 'spectacle': 3, 'scene': 1, 'programmation': 3, 'programmer': 2, 'billetterie': 3, 'billets': 3, 'entree': 2, 'jauge': 3, 'salle': 2, 'lieu': 2, 'buvette': 3, 'catering': 3, 'artistes': 2, 'plateau': 2, 'affiche': 2, 'communication': 1, 'flyer': 2, 'technique': 1, 'sono': 2, 'lumiere': 2, 'regie': 2, 'securite': 2, 'benevoles': 1, 'date': 1, 'organiser': 3, 'fete': 2, 'bal': 2, 'vernissage': 3, 'apero': 2, 'scene ouverte': 3, 'jam': 3, 'open mic': 3, 'tremplin': 3 } },
    culturel: { label: 'Action culturelle', kw: { 'faire decouvrir': 3, 'decouvrir': 2, 'metier': 2, 'metiers': 2, 'lyceens': 3, 'collegiens': 3, 'eleves': 2, 'bac pro': 3, 'apprentis': 2, 'immersion': 3, 'mise en situation': 2, 'ados': 2, 'adolescents': 2, 'jeunes': 1, 'enfants': 1, 'habitants': 2, 'creation sonore': 3, 'restitution': 3, 'seances': 2, 'ateliers de': 3, 'atelier': 3, 'ateliers': 3, 'action culturelle': 3, 'mediation': 3, 'eac': 3, 'education artistique': 3, 'ecole': 2, 'ecoles': 2, 'college': 2, 'lycee': 2, 'scolaire': 3, 'scolaires': 3, 'residence': 3, 'intervention': 3, 'quartier': 2, 'centre social': 3, 'ehpad': 3, 'public': 1, 'publics': 2, 'sensibiliser': 3, 'sensibilisation': 3, 'transmission': 3, 'pedagogique': 3, 'drac': 3, 'appel a projets': 3, 'politique de la ville': 3, 'inclusion': 2, 'participatif': 3, 'exposition': 2, 'rencontre': 2, 'conference': 2, 'patrimoine': 3, 'decouverte': 2, 'initiation': 3 } },
    business: { label: 'Business', kw: { 'offre': 2, 'location de': 2, 'journee': 1, 'contrat de location': 3, 'assurer le materiel': 2, 'page web': 1, 'business': 3, 'entreprise': 3, 'societe': 2, 'micro-entreprise': 3, 'auto-entrepreneur': 3, 'auto entrepreneur': 3, 'siret': 3, 'statut': 2, 'clients': 3, 'client': 3, 'vendre': 3, 'vente': 3, 'ventes': 3, 'chiffre d\'affaires': 3, 'ca': 1, 'marge': 3, 'rentable': 3, 'rentabilite': 3, 'benefice': 3, 'tarif': 3, 'tarifs': 3, 'prix de vente': 3, 'devis': 2, 'facture': 3, 'facturer': 3, 'urssaf': 3, 'tva': 3, 'marche': 2, 'concurrence': 3, 'concurrents': 3, 'boutique': 3, 'e-commerce': 3, 'site de vente': 3, 'etsy': 3, 'commercialiser': 3, 'lancer ma': 2, 'lancer mon': 2, 'service': 1, 'prestation': 2, 'prestations': 2, 'investisseur': 3, 'pret': 2, 'banque': 2, 'business plan': 3, 'freelance': 3 } },
    formation: { label: 'Formation', kw: { 'former': 3, 'formation': 3, 'apprendre': 3, 'cours': 2, 'tuto': 2, 'tutos': 2, 'tutoriel': 2, 'certification': 3, 'diplome': 2, 'progresser': 3, 'maitriser': 3, 'pratiquer': 2, 'entrainer': 2, 'exercices': 2, 'methode': 1, 'stage': 2, 'masterclass': 3 } },
    fabrication: { label: 'Fabrication', kw: { 'fabriquer': 3, 'fabrication': 3, 'construire': 3, 'construction': 2, 'diy': 3, 'bricoler': 3, 'bricolage': 3, 'prototype': 3, 'souder': 3, 'soudure': 3, 'circuit': 3, 'schema': 3, 'pcb': 3, 'composants': 3, 'electronique': 3, 'pedale': 3, 'pedales': 3, 'overdrive': 3, 'fuzz': 3, 'distortion': 3, 'delay': 2, 'reverb': 2, 'ampli': 2, 'amplificateur': 3, 'lampes': 2, 'lampe': 1, 'enceinte': 2, 'baffle': 3, 'climatiseur': 3, 'clim': 3, 'compresseur': 2, 'peltier': 3, 'refroidir': 2, 'ventilateur': 2, 'boitier': 3, 'imprimante 3d': 3, 'impression 3d': 3, 'modelisation': 3, 'cnc': 3, 'arduino': 3, 'esp32': 3, 'raspberry': 3, 'capteur': 2, 'moteur': 2, 'menuiserie': 3, 'bois': 1, 'atelier': 1, 'plans': 2, 'kit': 2, 'monter': 1, 'transfo': 3, 'alimentation': 2, 'tension': 2, 'watts': 2, 'luthier': 3, 'lutherie': 3 } }
  };

  /* Bases de connaissances par domaine -------------------------------------------- */
  // Étapes de méthode : ajoutées seulement si tes propres actions ne les couvrent pas déjà
  const MAKE_OBJ = 'ampli|amplificateur|preampli|pedale|pedalboard|enceinte|baffle|caisson|synthe|synthetiseur|boite a rythmes|flight case|meuble|etagere|table|lampe|boitier|cable|cables|micro|guitare|basse|instrument|controleur|sequenceur|clim|climatiseur|ventilateur|radiateur|robot|drone|machine';
  const TECH_GEAR = 'carte son|interface|console|table de mixage|ampli|micro|enceinte|ordinateur|ordi|logiciel|pedale|cable|synthe|clavier|guitare|basse|batterie|casque|plugin|qu-?\\d|camera|projecteur';
  const PRIVATE = c => c.has('potes|amis|copains|entre nous|privee?|anniversaire|jardin de|chez (?:moi|mon|ma|nous)|en famille|fete de famille') && !c.has('billet|billetterie|entree payante|affiche|public|jauge de \\d{3}');
  const VEHICLE = 'camion|camionnette|voiture|vehicule|utilitaire|van|fourgon|remorque|scooter';
  const PLAN = {
    musique: [
      { t: 'Fixer la liste des titres et le format de sortie (single, EP, album)', kw: 'liste|titres|format|tracklist', l: 'Liste des titres arrêtée' },
      { t: 'Enregistrer une maquette de chaque titre', kw: 'maquette|demo|pre-prod', l: 'Maquettes écoutables', when: c => !c.has('podcast') },
      { t: 'Réserver le studio ou préparer le home studio', kw: 'studio|reserver|home studio', l: 'Dates d’enregistrement fixées', when: c => c.has('enregistr|studio|album|ep\\b|single') },
      { t: 'Enregistrer les prises', kw: 'enregistr|prises', l: 'Pistes enregistrées' },
      { t: 'Faire mixer et masteriser', kw: 'mix|master', l: 'Fichiers masterisés' },
      { t: 'Déclarer les œuvres et préparer les métadonnées (ISRC, crédits)', kw: 'sacem|declar|isrc|metadonnee', l: 'Œuvres déclarées, métadonnées prêtes', when: c => c.has('sortie|sortir|spotify|streaming|distribu|album|ep\\b|single|cd|vinyle') },
      { t: 'Préparer la promotion (visuels, réseaux, presse, playlists)', kw: 'promo|communication|reseaux|presse|visuel|pochette', l: 'Plan de promotion daté' },
      { t: 'Envoyer au distributeur au moins 4 semaines avant la sortie', kw: 'distribu|envoyer|mettre en ligne|publier', l: 'Sortie programmée', when: c => c.has('sortie|sortir|spotify|streaming|distribu|album|ep\\b|single') }
    ],
    podcast: [
      { t: 'Définir le format (durée, fréquence, ton) et le nom', kw: 'format|duree|frequence|nom', l: 'Fiche format d’une page' },
      { t: 'Écrire le conducteur des trois premiers épisodes', kw: 'conducteur|ecrire|script|sujet', l: 'Trois conducteurs' },
      { t: 'Enregistrer un épisode pilote', kw: 'enregistr|pilote|episode', l: 'Épisode pilote enregistré' },
      { t: 'Choisir l’hébergeur et créer le flux', kw: 'heberg|flux|rss|plateforme|compte', l: 'Flux en ligne' },
      { t: 'Publier le premier épisode et l’annoncer', kw: 'publier|sortir|annoncer|lancer', l: 'Épisode en ligne' }
    ],
    asso: [
      { t: 'Rédiger la démarche en une page (objet, coût, calendrier)', kw: 'rediger|note|une page|fiche', l: 'Note d’une page' },
      { t: 'Faire valider par le bureau ou le CA', kw: 'valid|bureau|ca\\b|conseil|vote|ag\\b', l: 'Décision actée (compte rendu)' },
      { t: 'Rassembler les pièces (statuts, RIB, budget, bilan)', kw: 'pieces|statuts|rib|bilan|justificatif', l: 'Dossier complet', when: c => c.has('subvention|dossier|mecenat|banque|prefecture|demande') },
      { t: 'Déposer le dossier avant la date limite', kw: 'deposer|envoyer|soumettre|dossier', l: 'Accusé de réception', when: c => c.has('subvention|dossier|appel|prefecture|demande') },
      { t: 'Relancer et suivre la réponse', kw: 'relancer|suivre|rappeler', l: 'Réponse obtenue' }
    ],
    achat: [
      { t: 'Lister les critères indispensables (usage, compatibilité, budget maximum)', kw: 'criteres|besoin|liste', l: 'Liste de critères' },
      { t: 'Comparer trois modèles ou offres', kw: 'compar|modeles|offres|devis', l: 'Tableau comparatif' },
      { t: 'Vérifier la compatibilité avec ton installation actuelle', kw: 'compatib|verifier|brancher', l: 'Compatibilité confirmée', when: c => c.has(TECH_GEAR) },
      { t: 'Faire vérifier le véhicule (contrôle technique, historique d’entretien)', kw: 'controle|verifier|historique|mecanicien|garage', l: 'Rapport de vérification', when: c => c.has(VEHICLE) },
      { t: 'Essayer en magasin ou chercher des avis d’utilisateurs', kw: 'essayer|tester|avis', l: 'Avis recueillis' },
      { t: 'Acheter (neuf, occasion ou location) et garder la facture', kw: 'acheter|commander|louer|achat', l: 'Facture et garantie' }
    ],
    evenement: [
      { t: 'Arrêter la date, le lieu et la jauge', kw: 'date|lieu|salle|jauge|reserver', l: 'Lieu réservé par écrit' },
      { t: 'Établir le budget prévisionnel (dépenses et recettes)', kw: 'budget|previsionnel|chiffrer', l: 'Budget équilibré sur papier' },
      { t: 'Confirmer la programmation (artistes, contrats ou conventions)', kw: 'programm|artistes|contrat|groupes|booker', l: 'Engagements signés' },
      { t: 'Faire les déclarations (mairie, SACEM, assurance, sécurité)', kw: 'declar|sacem|mairie|assurance|autorisation|securite', l: 'Déclarations faites', when: c => !PRIVATE(c) },
      { t: 'Prévenir les voisins et fixer une heure de fin', kw: 'voisin|prevenir', l: 'Voisins prévenus', when: c => PRIVATE(c) },
      { t: 'Organiser la technique et l’équipe (son, lumière, bénévoles)', kw: 'technique|son|lumiere|sono|benevoles|equipe|regie', l: 'Fiche technique et planning d’équipe' },
      { t: 'Inviter les participants et confirmer le nombre', kw: 'inviter|invitation|confirmer', l: 'Liste des présents', when: c => PRIVATE(c) },
      { t: 'Lancer la communication et la billetterie', when: c => !PRIVATE(c), kw: 'communication|com\\b|affiche|flyer|billet|reseaux|annoncer', l: 'Billetterie ouverte, visuels diffusés' },
      { t: 'Préparer le jour J (planning, caisse, accueil)', kw: 'jour j|planning|caisse|accueil|conducteur', l: 'Conducteur du jour J' }
    ],
    culturel: [
      { t: 'Définir le public, le format et le nombre de séances', kw: 'public|format|seances|ateliers', l: 'Fiche action' },
      { t: 'Trouver et confirmer la structure partenaire', kw: 'partenaire|ecole|centre|structure|contacter', l: 'Accord du partenaire' },
      { t: 'Monter le budget et le plan de financement', kw: 'budget|financ|subvention|drac|appel', l: 'Budget et financeurs identifiés' },
      { t: 'Préparer le déroulé pédagogique de chaque séance', kw: 'deroule|pedagog|contenu|programme', l: 'Déroulé écrit' },
      { t: 'Planifier les séances avec le partenaire', kw: 'planifier|calendrier|dates', l: 'Calendrier validé' },
      { t: 'Prévoir l’évaluation (présence, retours, traces)', kw: 'evaluation|bilan|retours|questionnaire', l: 'Grille d’évaluation' }
    ],
    business: [
      { t: 'Décrire l’offre et le client type en une page', kw: 'offre|client|cible|persona', l: 'Fiche offre' },
      { t: 'Interroger 10 clients potentiels', kw: 'interroger|sonder|questionnaire|clients|enquete|marche', l: 'Retours de 10 personnes' },
      { t: 'Calculer le prix de revient et le prix de vente', kw: 'prix|tarif|marge|cout|chiffrer|calculer', l: 'Grille de prix avec marge' },
      { t: 'Choisir le statut et vérifier tes obligations', kw: 'statut|micro|siret|urssaf|declar|immatricul', l: 'Statut choisi' },
      { t: 'Préparer un premier lot ou une offre test', kw: 'lot|test|premier|prototype|stock', l: 'Offre test prête' },
      { t: 'Vendre aux premiers clients et mesurer', kw: 'vendre|vente|commercialiser|lancer', l: 'Premières ventes' }
    ],
    fabrication: [
      { t: 'Écrire le cahier des charges chiffré (fonction, performances, dimensions, budget)', kw: 'cahier des charges|specs|specifications|definir', l: 'Cahier des charges d’une page' },
      { t: 'Choisir ou dessiner le schéma', kw: 'schema|plan|dessiner|concevoir|modelis', l: 'Schéma validé' },
      { t: 'Établir la nomenclature et chiffrer les pièces', kw: 'nomenclature|bom|pieces|composants|chiffrer|liste', l: 'Liste des pièces avec prix' },
      { t: 'Commander les pièces', kw: 'commander|acheter|achat', l: 'Pièces reçues' },
      { t: 'Monter un prototype de test', kw: 'prototype|breadboard|maquette|monter|souder|assembler', l: 'Prototype fonctionnel' },
      { t: 'Mesurer et ajuster', kw: 'mesur|tester|regler|ajuster|calibr', l: 'Mesures conformes au cahier des charges' },
      { t: 'Réaliser le boîtier et la finition', kw: 'boitier|finition|peinture|percer|habillage', l: 'Objet fini' }
    ],
    general: [
      { t: 'Écrire l’objectif en une phrase chiffrée et datée', kw: 'objectif|definir', l: 'Objectif écrit' },
      { t: 'Lister les moyens nécessaires (temps, argent, personnes)', kw: 'moyens|ressources|budget', l: 'Liste des moyens' },
      { t: 'Faire une première version simple', kw: 'version|essai|tester|premier', l: 'Première version' }
    ]
  };

  // Risques : déclenchés par des indices du texte
  const R = (r, g, p, o, sig, par, when) => ({ r, g, p, o, sig, par, when });
  const RISKS = {
    musique: [
      R('Mixage et mastering plus longs ou plus chers que prévu', 'moyenne', 'moyenne', 'interne', 'Plus de deux allers-retours sur le même titre', 'Fixer un nombre de corrections et un budget avant de commencer', c => c.has('mix|master|enregistr|album|ep\\b|single')),
      R('Sortie sans promotion : peu d’écoutes', 'élevée', 'moyenne', 'interne', 'Aucun visuel ni plan de communication à J-30', 'Préparer la promotion avant d’envoyer au distributeur', c => c.has('sortie|sortir|spotify|streaming|album|ep\\b|single|podcast|clip')),
      R('Droits non réglés (reprise, sample, œuvres non déclarées)', 'élevée', 'moyenne', 'interne', 'Un titre contient un extrait ou une reprise sans autorisation', 'Déclarer les œuvres et obtenir les autorisations avant la sortie', c => c.has('reprise|sample|cover|sacem|droits')),
      R('Indisponibilité d’un musicien ou d’un intervenant', 'moyenne', 'moyenne', 'externe', 'Dates de répétition ou d’enregistrement repoussées', 'Caler les dates par écrit et prévoir un remplaçant', c => c.has('groupe|musicien|batteur|bassiste|guitariste|chanteu|repet') || c.people.length),
      R('Rythme de publication non tenu', 'moyenne', 'moyenne', 'interne', 'Deux échéances manquées d’affilée', 'Produire plusieurs contenus d’avance', c => c.has('podcast|episode|chaine|youtube|regulier|chaque semaine|toutes les')),
      R('Qualité audio insuffisante en home studio', 'moyenne', 'moyenne', 'interne', 'Bruit de fond, résonance de la pièce', 'Traiter la pièce et faire un test d’écoute sur plusieurs systèmes', c => c.has('micro|home studio|enregistr|podcast'))
    ],
    asso: [
      R('Démarche non validée par le bureau ou le CA', 'élevée', 'moyenne', 'interne', 'Pas de décision au compte rendu de la prochaine réunion', 'Présenter une note d’une page et faire voter', () => true),
      R('Dossier déposé hors délai ou incomplet', 'élevée', 'moyenne', 'interne', 'Date limite à moins de trois semaines sans pièces réunies', 'Rétroplanning à partir de la date limite, pièces rassemblées tôt', c => c.has('subvention|dossier|appel|cerfa|demande')),
      R('Trésorerie insuffisante avant le versement des fonds', 'élevée', 'moyenne', 'interne', 'Dépenses engagées avant notification', 'Échelonner les dépenses, demander un acompte', c => c.has('subvention|versement|avance')),
      R('Taux de réponse faible des structures démarchées', 'élevée', 'élevée', 'externe', 'Moins d’une réponse sur cinq après relance', 'Cibler des structures déjà liées à la culture locale, relancer à J+10, viser un rendez-vous plutôt qu’un don direct', c => c.has('demarch|mecenat|sponsor|entreprises|partenaires')),
      R('Éligibilité au mécénat non vérifiée (intérêt général, reçus fiscaux)', 'élevée', 'moyenne', 'interne', 'Une entreprise demande un reçu fiscal', 'Vérifier les critères d’intérêt général, demander un rescrit fiscal en cas de doute', c => c.has('mecenat|mecene|recu fiscal|don\\b|dons')),
      R('Peu de renouvellements d’adhésion', 'élevée', 'moyenne', 'externe', 'Moins de la moitié des adhérents de l’an dernier ont renouvelé à mi-campagne', 'Relance personnelle des anciens adhérents, rappeler ce que l’adhésion apporte, échéance claire', c => c.has('adhesions?|adherents?|cotisations?|membres')),
      R('Pas assez de bénévoles disponibles', 'moyenne', 'moyenne', 'externe', 'Moins de la moitié des postes pourvus à J-15', 'Lister les postes et recruter tôt', c => c.has('benevole|equipe|evenement|soiree|festival|fete')),
      R('Responsabilité ou assurance non couverte', 'élevée', 'faible', 'interne', 'Activité nouvelle non prévue au contrat d’assurance', 'Vérifier le contrat de responsabilité civile de l’association', c => c.has('evenement|atelier|public|transport|materiel|soiree'))
    ],
    achat: [
      R('Matériel incompatible avec ton installation', 'élevée', 'moyenne', 'interne', 'Connectique, format ou alimentation différents', 'Vérifier la fiche technique point par point avant l’achat', c => c.has(TECH_GEAR)),
      R('Coûts d’usage sous-estimés (assurance, entretien, carte grise, carburant)', 'moyenne', 'élevée', 'interne', 'Premières factures supérieures aux prévisions', 'Chiffrer le coût annuel complet avant l’achat', c => c.has(VEHICLE)),
      R('Prix final supérieur au budget (port, accessoires, taxes)', 'moyenne', 'moyenne', 'interne', 'Écart de plus de 10 % au moment de payer', 'Chiffrer l’achat complet, accessoires compris', () => true),
      R('Matériel d’occasion défectueux ou arnaque', 'élevée', 'moyenne', 'externe', 'Vendeur pressé, paiement hors plateforme, pas d’essai', 'Essayer avant de payer, paiement sécurisé', c => c.has('occasion|leboncoin|reconditionne|vinted|ebay')),
      R('Achat sous-utilisé', 'moyenne', 'moyenne', 'interne', 'Pas d’usage concret prévu dans le mois qui suit', 'Lier l’achat à un projet daté, envisager la location', c => !c.has('pour (le|la|les|mon|ma|mes)|besoin'))
    ],
    evenement: [
      R('Fréquentation insuffisante', 'élevée', 'moyenne', 'externe', 'Moins de 30 % des places vendues à J-15', 'Communication à J-45, préventes, partenariats médias', c => !PRIVATE(c)),
      R('Déclarations ou autorisations manquantes (mairie, SACEM, sécurité)', 'élevée', 'moyenne', 'interne', 'Aucune déclaration faite à J-30', 'Lister les obligations selon le lieu et la jauge, déclarer tôt', c => !PRIVATE(c)),
      R('Nuisances sonores et voisinage', 'moyenne', 'moyenne', 'externe', 'Plainte ou passage des forces de l’ordre', 'Prévenir les voisins, fixer une heure de fin, limiter le volume après 22 h', c => c.has('voisin|jardin|plein air|exterieur|dehors|cour|terrasse|appartement|maison|chez')),
      R('Dépassement du budget technique', 'moyenne', 'moyenne', 'interne', 'Devis techniques supérieurs au prévisionnel', 'Fiche technique minimale et devis comparés', c => c.has('son|lumiere|sono|technique|scene|regie|location')),
      R('Désistement d’un artiste ou d’un intervenant', 'élevée', 'faible', 'externe', 'Pas de confirmation écrite à J-30', 'Contrats ou conventions signés, artiste de remplacement identifié', c => c.has('artiste|groupe|programm|concert|plateau')),
      R('Météo défavorable', 'élevée', 'moyenne', 'externe', 'Prévisions défavorables à J-5', 'Prévoir un repli couvert ou une date de report', c => c.has('exterieur|plein air|dehors|parc|jardin|place|plage|guinguette|ete')),
      R('Sécurité du public et gestion de la jauge', 'élevée', 'faible', 'interne', 'Affluence au-delà de la capacité du lieu', 'Billetterie plafonnée, plan d’évacuation, équipe accueil', c => c.has('jauge|public|soiree|festival|concert')),
      R('Équipe insuffisante le jour J', 'moyenne', 'moyenne', 'externe', 'Postes non pourvus à J-7', 'Planning d’équipe par poste, réserves', () => true)
    ],
    culturel: [
      R('Public cible non atteint', 'élevée', 'moyenne', 'externe', 'Peu d’inscrits ou de participants à la première séance', 'S’appuyer sur un relais de terrain (structure, enseignant, animateur)', () => true),
      R('Financement public incertain ou tardif', 'élevée', 'moyenne', 'externe', 'Pas de réponse à la date de démarrage prévue', 'Caler le calendrier sur celui des appels à projets, prévoir une version réduite', c => c.has('subvention|drac|region|appel|financ|ville|departement')),
      R('Partenaire non engagé', 'moyenne', 'moyenne', 'externe', 'Pas de convention ou de dates confirmées', 'Formaliser par une convention simple', () => true),
      R('Bilan exigé par les financeurs non préparé', 'moyenne', 'moyenne', 'interne', 'Aucune trace collectée pendant l’action', 'Prévoir présences, photos et retours dès la première séance', c => c.has('subvention|drac|region|appel|financ'))
    ],
    business: [
      R('Pas de clients prêts à payer ce prix', 'élevée', 'moyenne', 'externe', 'Intérêt exprimé sans achat ni précommande', 'Tester avec une précommande ou une offre limitée', () => true),
      R('Prix mal calculé : marge trop faible', 'élevée', 'moyenne', 'interne', 'Coût réel (temps, matière, frais) supérieur au prix', 'Calculer le prix de revient complet, temps compris', () => true),
      R('Obligations administratives et fiscales mal anticipées', 'moyenne', 'moyenne', 'interne', 'Déclarations ou cotisations non prévues', 'Vérifier statut, déclarations, assurance avant la première vente', () => true),
      R('Compatibilité avec ta situation actuelle (statut, revenus, temps)', 'moyenne', 'moyenne', 'interne', 'Conflit d’horaires ou effet sur tes droits actuels', 'Te renseigner auprès des organismes concernés avant de démarrer', () => true),
      R('Trésorerie insuffisante au démarrage', 'moyenne', 'moyenne', 'interne', 'Stock ou dépenses à avancer avant les premières ventes', 'Démarrer petit, faire payer un acompte', c => c.has('stock|fabriqu|achat|investi|materiel|local')),
      R('Concurrence déjà bien installée', 'moyenne', 'moyenne', 'externe', 'Offres équivalentes moins chères', 'Identifier ce qui te distingue avant de lancer', () => true)
    ],
    fabrication: [
      R('Risque électrique (tension secteur ou haute tension)', 'élevée', 'moyenne', 'interne', 'Intervention sur un circuit branché ou des condensateurs chargés', 'Travailler hors tension, décharger les condensateurs, protections (fusible, terre, isolation)', c => c.has('secteur|230 ?v|220 ?v|haute tension|lampes?|tubes?|transfos?|transformateur|el34|el84|6l6|12ax7|climatiseur|clim|compresseur|frigo|pompe a chaleur|decoupage|smps|alim(?:entation)? (?:secteur|integree|interne)|classe? d\\b|[1-9]\\d{2,} ?w\\b')),
      R('Manipulation de fluide frigorigène réglementée', 'élevée', 'élevée', 'interne', 'Besoin de charger ou d’ouvrir un circuit de gaz', 'Utiliser un groupe déjà chargé et scellé, ou faire intervenir un professionnel certifié', c => c.has('climatiseur|clim|frigo|refriger|pompe a chaleur|compresseur|gaz|r290|r32|r410|fluide')),
      R('Performances en dessous du cahier des charges', 'moyenne', 'moyenne', 'interne', 'Mesures du prototype éloignées des objectifs', 'Valider sur prototype avant de finaliser', () => true),
      R('Échauffement et dissipation thermique', 'élevée', 'moyenne', 'interne', 'Composants trop chauds après 30 minutes de fonctionnement', 'Dimensionner dissipateurs et ventilation, mesurer la température', c => c.has('ampli|amplificateur|clim|climatiseur|peltier|moteur|lampes?|tubes?|compresseur|radiateur') || (c.has('\\d+ ?w\\b|watts?|puissance') && !c.has('enceinte|haut-parleur|\\bhp\\b|baffle'))),
      R('Bruit, souffle ou ronflette', 'moyenne', 'élevée', 'interne', 'Buzz ou souffle audible au repos', 'Plan de masse soigné, câbles blindés, alimentation filtrée', c => c.has('pedale|overdrive|fuzz|distortion|ampli|preampli|audio|micro|guitare|synthe|sequenceur|midi')),
      R('Alimentation inversée ou inadaptée qui détruit le circuit', 'moyenne', 'moyenne', 'interne', 'Composant qui chauffe dès la mise sous tension', 'Diode de protection, vérifier polarité et tension avant branchement', c => c.has('pedale|9 ?v|alimentation|arduino|esp32|led|batterie')),
      R('Pièces introuvables ou délais de livraison longs', 'moyenne', 'moyenne', 'externe', 'Rupture ou délai supérieur à trois semaines', 'Commander tôt, identifier des équivalents', () => true),
      R('Outillage ou instruments de mesure manquants', 'moyenne', 'moyenne', 'interne', 'Étape bloquée faute d’outil', 'Lister les outils au départ, emprunter ou passer par un fablab', c => !c.has('fer a souder|oscillo|multimetre|outils|atelier|fablab|imprimante 3d|perceuse|scie')),
      R('Coût final supérieur à un produit du commerce', 'moyenne', 'moyenne', 'interne', 'Nomenclature plus chère que l’équivalent du commerce', 'Comparer avant de commander, réutiliser des pièces', () => true)
    ],
    general: [
      R('Manque de temps pour avancer', 'moyenne', 'moyenne', 'interne', 'Aucune étape faite en deux semaines', 'Bloquer un créneau fixe par semaine', c => !c.has('le soir|week-?end|chaque semaine|par semaine|heures? par|temps libre|vacances'))
    ]
  };

  PLAN.formation = [
    { t: 'Définir ce que tu dois savoir faire à la fin (exemples concrets)', kw: 'definir|objectif|savoir', l: 'Liste de compétences visées' },
    { t: 'Choisir une ressource (cours, tutoriels, formation, mentor)', kw: 'choisir|cours|formation|tuto|inscri|trouver', l: 'Ressource choisie' },
    { t: 'Bloquer des créneaux de pratique réguliers', kw: 'creneau|planning|regulier|chaque|bloquer', l: 'Créneaux au calendrier' },
    { t: 'Réaliser un projet d’entraînement complet', kw: 'projet|exercice|entrainer|pratiquer|mixer|faire', l: 'Projet terminé' },
    { t: 'Faire évaluer ton travail par quelqu’un d’expérimenté', kw: 'avis|retour|evaluer|faire ecouter|montrer', l: 'Retours notés' },
    { t: 'Mettre en pratique dans une situation réelle', kw: 'proposer|prestation|reel|client|concert', l: 'Première mise en pratique' }
  ];
  RISKS.formation = [
    R('Apprentissage abandonné en cours de route', 'élevée', 'moyenne', 'interne', 'Deux semaines sans pratique', 'Créneaux fixes et un projet concret à terminer', () => true),
    R('Trop de théorie, pas assez de pratique', 'moyenne', 'moyenne', 'interne', 'Beaucoup de tutoriels regardés, peu de travaux finis', 'Une heure de pratique pour une heure de théorie', () => true),
    R('Niveau insuffisant pour vendre une prestation', 'élevée', 'moyenne', 'interne', 'Retours négatifs sur les premiers travaux', 'Faire valider tes travaux avant de proposer une prestation payante', c => c.has('prestation|vendre|clients?|proposer'))
  ];
  PLAN.clip = [
    { t: 'Écrire l’intention et le découpage du clip (plans, durée, lieux)', kw: 'ecrire|scenario|decoupage|storyboard|idee', l: 'Découpage écrit' },
    { t: 'Constituer l’équipe (réalisation, image, montage)', kw: 'videaste|realisat|equipe|cadreur|monteur', l: 'Équipe confirmée' },
    { t: 'Faire les repérages et obtenir les autorisations de tournage', kw: 'autorisation|reperage|lieu|tram|demander', l: 'Autorisations écrites' },
    { t: 'Établir le plan de tournage (date, horaires, matériel, figurants)', kw: 'plan de tournage|planning|figurants|horaires', l: 'Feuille de service' },
    { t: 'Tourner', kw: 'tourn|tournage|filmer', l: 'Rushes sauvegardés en double' },
    { t: 'Monter, étalonner, caler le son définitif', kw: 'montage|monter|etalonn|mixage', l: 'Clip exporté' },
    { t: 'Préparer la sortie (miniature, date, relais presse et réseaux)', kw: 'sortie|sortir|publier|promo|diffus', l: 'Sortie programmée' }
  ];
  RISKS.clip = [
    R('Autorisation de tournage refusée ou tardive (lieu public, transport, commerce)', 'élevée', 'moyenne', 'externe', 'Pas de réponse écrite trois semaines avant le tournage', 'Demander tôt, par écrit, avec dates et équipe ; prévoir un lieu de repli', () => true),
    R('Droit à l’image des personnes filmées', 'moyenne', 'moyenne', 'interne', 'Personnes reconnaissables sans accord', 'Faire signer une autorisation aux figurants, éviter les visages non consentis', c => c.has('tram|rue|public|figurant|gens|passants|ville')),
    R('Météo ou lumière défavorable le jour du tournage', 'moyenne', 'moyenne', 'externe', 'Prévisions défavorables à J-3', 'Date de repli, plans intérieurs prévus', c => c.has('exterieur|dehors|rue|tram|plein air|ville|parc')),
    R('Tournage plus long que prévu, montage repoussé', 'moyenne', 'élevée', 'interne', 'Plans prévus non tournés en fin de journée', 'Découpage précis, plans prioritaires tournés en premier', () => true),
    R('Sortie sans promotion : peu de vues', 'élevée', 'moyenne', 'interne', 'Aucun relais prévu à J-15', 'Préparer miniature, relais presse et réseaux avant la sortie', () => true)
  ];
  PLAN.diffusion = [
    { t: 'Fixer un objectif de ventes par canal (distributeur, librairies, concerts, en ligne)', kw: 'objectif|canal|repartir', l: 'Objectifs par canal' },
    { t: 'Préparer les supports (fiche produit, visuels, argumentaire, prix)', kw: 'fiche|support|visuel|argumentaire|plaquette|prix', l: 'Kit de vente prêt' },
    { t: 'Démarcher les points de vente et confirmer les conditions (dépôt, remise, retours)', kw: 'demarch|contacter|points de vente|librair|magasin|distribu|conditions', l: 'Points de vente engagés' },
    { t: 'Lancer la promotion (concerts, presse, réseaux)', kw: 'promo|presse|reseaux|concert|communication', l: 'Actions de promotion datées' },
    { t: 'Suivre les ventes chaque mois et réassortir', kw: 'suivre|ventes|reassort|stock|bilan', l: 'Tableau de suivi des ventes' }
  ];
  RISKS.diffusion = [
    R('Ventes en dessous de l’objectif', 'élevée', 'moyenne', 'externe', 'Moins d’un quart de l’objectif à mi-parcours', 'Concentrer l’effort sur le canal qui vend le mieux, lier les ventes aux concerts', () => true),
    R('Stock invendu ou retours des points de vente', 'moyenne', 'moyenne', 'externe', 'Retours en fin de période de dépôt', 'Commander ou presser par petites séries, négocier les conditions de retour', c => c.has('cd|vinyles?|stock|exemplaires|depot|fnac|librair|disquaire')),
    R('Conditions des distributeurs moins favorables que prévu (remise, délais de paiement)', 'moyenne', 'moyenne', 'externe', 'Remise ou délai de paiement supérieur à l’estimation', 'Faire préciser les conditions par écrit avant l’envoi du stock', c => c.has('distribu|fnac|librair|wiseband|depot'))
  ];
  PLAN.ag = [
    { t: 'Fixer la date, le lieu et l’ordre du jour', kw: 'date|lieu|ordre du jour|fixer', l: 'Ordre du jour écrit' },
    { t: 'Envoyer la convocation dans le délai prévu par les statuts', kw: 'convoqu|convocation|envoyer', l: 'Convocations envoyées' },
    { t: 'Préparer le rapport moral et le rapport financier', kw: 'rapport|bilan|compte|financier|moral', l: 'Rapports prêts' },
    { t: 'Préparer les votes (résolutions, candidatures au bureau)', kw: 'vote|voter|election|candidat|resolution', l: 'Liste des votes' },
    { t: 'Tenir l’AG et rédiger le procès-verbal', kw: 'tenir|proces-verbal|pv|compte rendu', l: 'PV signé' },
    { t: 'Déclarer les changements de dirigeants en préfecture dans les trois mois', kw: 'declarer|prefecture|greffe', l: 'Récépissé de déclaration', when: c => c.has('bureau|president|tresorier|secretaire|dirigeant|election|voter') }
  ];
  PLAN.probleme = [
    { t: 'Décrire le symptôme précisément (quand, où, dans quelles conditions)', kw: 'decrire|symptome|noter', l: 'Symptôme décrit et reproductible' },
    { t: 'Isoler la cause en changeant un seul élément à la fois', kw: 'isoler|tester|chercher|trouver|diagnostiqu|debrancher|cause|vient', l: 'Cause identifiée' },
    { t: 'Appliquer la correction', kw: 'corriger|reparer|changer|remplacer|regler|appliquer', l: 'Correction faite' },
    { t: 'Vérifier en conditions réelles', kw: 'verifier|valider|reessayer|concert|test', l: 'Problème absent en situation réelle' }
  ];
  RISKS.probleme = [
    R('Cause mal identifiée : le problème revient', 'élevée', 'moyenne', 'interne', 'Le symptôme réapparaît après la correction', 'Ne changer qu’un élément à la fois et noter chaque essai', () => true),
    R('Boucle de masse entre appareils', 'moyenne', 'élevée', 'interne', 'Ronflement qui disparaît quand on débranche un appareil', 'Brancher sur la même prise, liaisons symétriques, DI ou isolateur de masse côté ordinateur', c => c.has('ronfl|buzz|bourdon|masse|souffle|gresill|ordi|ordinateur|usb')),
    R('Risque électrique pendant l’intervention (tensions dangereuses, condensateurs chargés)', 'élevée', 'moyenne', 'interne', 'Intervention prévue dans l’appareil ouvert', 'Ne jamais ouvrir un ampli à lampes sans savoir décharger les condensateurs, sinon passer par un technicien', c => c.has('lampes?|tubes?|ampli a lampes|secteur|230|alimentation|transfo')),
    R('Pas de solution avant l’échéance', 'élevée', 'moyenne', 'interne', 'Toujours pas de cause trouvée à J-2', 'Prévoir une solution de contournement pour la date', c => c.has('concert|samedi|dimanche|demain|date|avant'))
  ];
  const HYPOS = {
    musique: ['Le public visé écoutera ou achètera ce que tu sors', 'Le format choisi correspond à ce que ce public consomme'],
    podcast: ['Il existe une audience intéressée par ce sujet', 'Tu pourras tenir le rythme de publication'],
    asso: ['Le bureau et les membres soutiennent la démarche', 'L’association remplit les conditions demandées'],
    achat: ['Ce matériel répond vraiment au besoin', 'Le prix est cohérent avec l’usage que tu en auras'],
    evenement: ['Le public viendra en nombre suffisant', 'Le lieu et la date conviennent aux artistes et au public'],
    culturel: ['Les structures partenaires seront intéressées', 'Le public visé participera jusqu’au bout'],
    business: ['Des clients achèteront à ce prix', 'Tu peux produire ou vendre à un coût qui laisse une marge'],
    fabrication: ['Tu disposes des compétences et des outils pour le réaliser', 'Le fait-maison sera moins cher ou meilleur qu’un produit du commerce'],
    general: ['Tu auras le temps nécessaire', 'L’objectif correspond vraiment à ton besoin'],
    probleme: ['Le problème vient d’un seul élément', 'Tu peux reproduire le problème à volonté'],
    formation: ['Tu auras du temps de pratique régulier', 'La ressource choisie correspond à ton niveau']
  };
  const TESTS = {
    musique: 'Faire écouter une maquette à cinq personnes du public visé et noter leurs réactions',
    podcast: 'Enregistrer un épisode test et le faire écouter à cinq personnes',
    asso: 'Présenter une note d’une page au bureau et recueillir l’avis avant de lancer le dossier',
    achat: 'Essayer le matériel en magasin, en location ou chez quelqu’un avant d’acheter',
    evenement: 'Ouvrir un formulaire d’intérêt ou des préventes pour mesurer la demande avant d’engager les frais',
    culturel: 'Animer une séance test avec un petit groupe et recueillir les retours',
    business: 'Proposer une précommande ou une offre limitée à dix clients potentiels',
    fabrication: 'Monter le cœur du système sur prototype (breadboard ou maquette) et mesurer avant d’investir dans la finition',
    general: 'Faire une version minimale en une journée et voir ce qui bloque',
    probleme: 'Reproduire le problème volontairement, puis vérifier qu’il disparaît après la correction',
    formation: 'Faire un petit travail complet dès la première semaine et le faire évaluer'
  };
  TESTS.clip = 'Tourner un plan test sur le lieu avec un téléphone pour vérifier lumière, cadre et faisabilité';
  HYPOS.clip = ['Le lieu de tournage sera accessible aux dates prévues', 'L’équipe est disponible le jour du tournage'];
  const QUESTIONS = {
    S: { musique: 'Quel format exactement (single, EP, album, clip, concert) et combien de titres ?', podcast: 'Quel format exactement : durée, fréquence, ton ?', asso: 'Quelle démarche exactement, et qui doit la valider ?', achat: 'Quel modèle précis, ou quels critères de choix ?', evenement: 'Quel événement exactement : format, lieu, jauge, programmation ?', culturel: 'Quelle action exactement : format, durée, public ?', business: 'Quel produit ou service exactement, et pour quel client ?', fabrication: 'Quel objet exactement : fonction, performances et dimensions visées ?', general: 'Que veux-tu obtenir exactement, en une phrase concrète ?' },
    M: { musique: 'Quel chiffre dira que c’est réussi : écoutes, ventes, dates, abonnés ?', podcast: 'Combien d’épisodes et d’auditeurs vises-tu, sur quelle durée ?', asso: 'Quel résultat concret : montant obtenu, dossier accepté, nombre d’adhérents ?', achat: 'Quel budget maximum, et quels critères pour dire que c’est le bon achat ?', evenement: 'Combien de spectateurs, et quel résultat financier ?', culturel: 'Combien de participants et de séances ?', business: 'Quel chiffre d’affaires ou combien de clients, sur quelle période ?', fabrication: 'Quelles performances chiffrées (puissance, gain, bruit, température, dimensions, coût) ?', general: 'Quel chiffre permettra de juger le résultat ?' },
    A: { musique: 'Qui joue, enregistre et mixe ? Avec quel matériel et quel budget ?', podcast: 'Avec quel matériel, et combien de temps par semaine ?', asso: 'Qui porte la démarche, avec quels moyens ?', achat: 'Quel budget, et où acheter (neuf, occasion, location) ?', evenement: 'Quel lieu, quelle équipe, quel budget ?', culturel: 'Quels partenaires, intervenants et financements ?', business: 'Quel budget de départ, quel temps par semaine, quelles compétences ?', fabrication: 'De quels outils, composants et compétences disposes-tu déjà ?', general: 'Avec quels moyens : temps, argent, personnes ?' },
    R: { general: 'Pourquoi c’est important pour toi, et pour qui ?', achat: 'À quoi va servir cet achat, concrètement ?', business: 'Quel problème ça règle pour tes clients ?', fabrication: 'Pourquoi le fabriquer plutôt que l’acheter ?' },
    T: { general: 'Pour quand ? Donne une date ou une période.', evenement: 'À quelle date doit-il avoir lieu ?', asso: 'Quelle est la date limite de la démarche ?' }
  };
  QUESTIONS.S.clip = 'Quel clip exactement : morceau, lieu, durée, intention visuelle ?';
  QUESTIONS.M.clip = 'Quel résultat vises-tu : nombre de vues, diffusions, festivals ?';
  QUESTIONS.A.clip = 'Quelle équipe (réalisation, image, montage), quel matériel, quel budget ?';
  QUESTIONS.S.formation = 'Que dois-tu savoir faire exactement à la fin ?';
  QUESTIONS.M.formation = 'Comment sauras-tu que tu as le niveau (un travail réussi, une certification, un client satisfait) ?';
  QUESTIONS.A.formation = 'Avec quelle ressource (cours, formateur, logiciel) et combien d’heures par semaine ?';
  QUESTIONS.S.probleme = 'Quel est le symptôme exact, et dans quelles conditions apparaît-il ?';
  QUESTIONS.M.probleme = 'Comment vérifieras-tu que c’est réglé (test, mesure) ?';
  QUESTIONS.A.probleme = 'De quels outils ou appuis disposes-tu pour diagnostiquer ?';
  QUESTIONS.R.probleme = 'Qu’est-ce que ça bloque si ce n’est pas réglé ?';
  const Q = (L, dom) => (QUESTIONS[L][dom] || QUESTIONS[L].general || QUESTIONS[L].musique);

  /* =========================================================
     8. Analyse du texte
     ========================================================= */
  function analyseText(text, opts) {
    const today = opts && opts.today ? new Date(opts.today + 'T12:00:00') : new Date();
    const ft = fold(text);
    const cl = clauses(text, ft);
    const has = re => new RegExp('\\b(?:' + re + ')', 'i').test(ft);
    const spanOf = (a, b) => clean(text.slice(a, b));

    // domaine
    const scores = {};
    for (const [k, d] of Object.entries(DOMAINS)) {
      let s = 0;
      for (const [w, p] of Object.entries(d.kw)) { const re = new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g'); const n = (ft.match(re) || []).length; s += Math.min(n, 3) * p; }
      scores[k] = s;
    }
    const firstF = fold((sentences(text)[0] || { text: '' }).text);
    if (new RegExp(`\\b(?:(?:me|se|nous) )?(?:faire|fabriquer|construire|monter|bricoler|concevoir|realiser) (?:moi-meme |soi-meme )?(?:un|une|des|mon|ma|mes|deux|2) (?:[a-z-]+ ){0,2}(?:${MAKE_OBJ})\\b`).test(ft) || /\b(fait maison|fait-maison|faits? main|a monter soi-meme|maison\b(?=[,.]|$))/.test(ft)) scores.fabrication += 4;
    if (/\b(classe d|tpa\d+|lm\d{3,4}|ne555|pt2399|smps|a decoupage|module)\b/.test(ft)) scores.fabrication += 2;
    if (/\b(?:changer d'|changer de|changer (?:les|le|la|mon|ma|mes)|remplacer (?:mon|ma|mes|les|le|la|des)|nouvel? |nouvelle |s'acheter|me prendre|prendre un|prendre une)/.test(ft) && /\b(ordi|ordinateur|mac|pc|micros?|interface|carte son|amplis?|guitare|basse|clavier|enceintes?|retours?|casque|camion|voiture|console|logiciel|telephone|tablette|projecteurs?|pieds?|cables?)\b/.test(ft) && !/\b(vendre|louer a|location de|offre)\b/.test(firstF)) scores.achat += 5;
    if (/\bdes ans\b|\b\d+ ans d/.test(ft) || /^(?:.*\b)?organiser\b/.test(firstF)) scores.evenement += 2;
    if (/\b(?:vendre|commercialiser|lancer (?:une|mon|ma|un) (?:offre|boutique|activite|entreprise|marque|business|service))\b/.test(firstF) && !/\b(cd|vinyles?|album|ep|disques?)\b/.test(firstF)) scores.business += 6;
    if (/\b(?:vendre|commercialiser|facturer)\b/.test(ft) && /\b(kits?|produits?|fait main|faits main|prestations?|service|boutique|clients?)\b/.test(ft) && !/\b(cd|vinyles?|album|ep|disques?)\b/.test(ft)) scores.business += 5;
    const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const domain = ranked[0][1] >= 3 ? ranked[0][0] : 'general';
    const domain2 = ranked[1] && ranked[1][1] >= 4 && ranked[1][1] >= ranked[0][1] * 0.6 ? ranked[1][0] : null;
    const podcast = has('podcast');
    const forceDomain = (inf) => /^(former|apprendre|progresser|entrainer)$/.test(inf) ? 'formation' : null;

    // entités
    const dates = findDates(text, ft, today);
    const durations = findDurations(ft, text);
    const money = findMoney(text, ft);
    const specs = findSpecs(text, ft).filter(s => !money.some(m => s.start >= m.start && s.start < m.end) && !dates.some(d => s.start >= d.start && s.start < d.end));
    const targets = findTargets(text, ft, money).filter(t => !dates.some(d => t.start >= d.start && t.start < d.end) && !durations.some(d => t.start >= d.start && t.start < d.end));

    // personnes : « demander à Julie », « avec Paul », prénoms en majuscule
    const people = [];
    let m; const orgs = [];
    const preO = /\b(?:[Dd]emander à|[Dd]emande à|[Aa]vec|[Cc]ontacter|[Aa]ppeler|[Éé]crire à|[Vv]oir avec|[Aa]ide de|[Mm]on pote|[Mm]a pote|[Mm]on ami|[Mm]on amie|[Mm]on frère|[Mm]a sœur|[Mm]on cousin|[Mm]a cousine|[Mm]on associé|[Mm]on collègue|[Mm]a collègue|[Pp]roposer à|[Ee]nvoyer à|[Rr]elancer|[Pp]ar|[Mm]ixage par|[Mm]ix par|[Mm]ixé par|[Mm]ontage par|[Aa]vec l'aide de)\s+((?:[A-ZÉÈÀÂÎÔÛÇ][\wéèêàâîôûç'’-]+)(?:\s+[A-ZÉÈÀÂÎÔÛÇ][\wéèêàâîôûç'’-]+)?)/g;
    const NOT_PEOPLE = /^(Je|Il|On|Le|La|Les|Un|Une|Pour|Avec|Et|Mais|Spotify|Deezer|Youtube|YouTube|Bandcamp|Instagram|Facebook|Tiktok|TikTok|Amazon|Thomann|Leboncoin|Angers|Paris|Nantes|Tours|Lyon|Mairie|Région|Drac|DRAC|Sacem|SACEM|Urssaf|URSSAF|Arduino|Qu|Noël)$/;
    while ((m = preO.exec(text))) { const name = m[1].replace(/[’']$/, ''); if (!NOT_PEOPLE.test(name.split(' ')[0])) people.push({ name, start: m.index, end: m.index + m[0].length, ctx: m[0] }); }
    const W2 = 0;
    const W = "[A-ZÉÈ][^\\s,;:()]*"; const orgRe = new RegExp(`\\b(?:via|chez|aupres de|auprès de|avec l'aide de|par l'intermediaire de)\\s+((?:(?:la |le |l'|les )?${W}(?:\\s+${W})*)(?:\\s*(?:,|et)\\s*(?:la |le |l'|les )?${W}(?:\\s+${W})*)*)`, 'g');
    while ((m = orgRe.exec(text))) m[1].split(/\s*(?:,|\bet\b)\s*/).map(x => trimEnd(x.trim()).replace(/^(?:la |le |l'|les )/i, '')).filter(x => x && !NOT_PEOPLE.test(x)).forEach(x => orgs.push(x));
    const subjRe = /(?:^|[.,;:!?]\s*|\bet\s+)([A-ZÉÈ][a-zéèêàç'-]{2,})\s+(fait|fera|s'occupe|s’occupe|gere|gère|va|peut|pourrait|m'aide|m’aide|doit|assure|prend|joue|mixe|enregistre|filme|monte|dessine|ecrit|écrit|chante|compose|accepte|est d'accord|est partant|est partante)\b([^.,;]*)/g;
    const subjAny = /(?:^|[.,;:!?]\s*|\bet\s+)([A-ZÉÈ][a-zéèêàç'-]{2,})\s+([a-zéèêàç'’-]+)([^.,;]*)/g;
    while ((m = subjAny.exec(text))) { const name = m[1], w = fold(m[2]).replace(/^(?:s'|m')/, ''); if (toInf(w) && !NOT_PEOPLE.test(name) && !/^(Il|Elle|On|Ca|Ça|Ce|Je|Tu|Nous|Vous|Ils|Elles|Le|La|Les|Un|Une|Pour|Avec|Faire|Avant|Budget|Objectif|Date|Dossier)$/.test(name) && !toInf(fold(name))) people.push({ name, start: m.index, end: m.index + m[0].length, ctx: clean(m[2] + m[3]) }); }
    while ((m = subjRe.exec(text))) { const name = m[1]; if (!NOT_PEOPLE.test(name) && !/^(Il|Elle|On|Ca|Ça|Ce|Je|Tu|Nous|Vous|Ils|Elles|Le|La|Les)$/.test(name)) people.push({ name, start: m.index, end: m.index + m[0].length, ctx: clean(m[2] + m[3]) }); }
    const CITIES = /^(Angers|Trélazé|Trelaze|Tours|Nantes|Paris|Lyon|Rennes|Le Mans|Saumur|Cholet|Laval|Bordeaux|Marseille|Lille|Toulouse|France|Europe)$/;
    const aRe = /(?:^|\s)(?:à|a|auprès de|aupres de)\s+((?:[A-ZÉÈ][\w'’éèêàç-]*)(?:\s+[A-ZÉÈ][\w'’éèêàç-]*){0,3})/g;
    while ((m = aRe.exec(text))) { const o = trimEnd(m[1]); const pre2 = fold(text.slice(Math.max(0, m.index - 40), m.index)); if (/\b(demander|demande|ecrire|envoyer|proposer|autorisation|dossier|declarer|presenter|soumettre|repondre|rendre|deposer|signaler|subvention)\b/.test(pre2) && !CITIES.test(o) && !NOT_PEOPLE.test(o.split(' ')[0])) orgs.push(o); }
    const roleRe = new RegExp('\\b(?:un |une |le |la |mon |ma |des |les |l\')?(' + ROLES + ')\\b', 'g');
    const roles = []; while ((m = roleRe.exec(ft))) roles.push({ role: text.substr(m.index + m[0].length - m[1].length, m[1].length), start: m.index, end: m.index + m[0].length });
    const equipRe = new RegExp('\\b(?:un |une |le |la |les |des |mon |ma |mes |du |de la |d\')?(' + EQUIP + ')(?![\\w-])', 'g');
    const equip = []; while ((m = equipRe.exec(ft))) equip.push({ item: text.substr(m.index + m[0].length - m[1].length, m[1].length), f: m[1], start: m.index, end: m.index + m[0].length });
    const BUY = /\b(acheter|achat|commander|louer|location|trouver|investir|il (?:me )?faut|faudrait|besoin d|remplacer|changer de|s'equiper)\b/;
    const OWN = /\b(j'ai|on a|nous avons|je possede|j'ai deja|deja|mon|ma|mes|notre|nos|dispose)\b/;
    for (let k = equip.length - 1; k >= 0; k--) if (/(?:entrees?|sorties?|prises?|canaux|voies)\s+(?:de\s+|d')?$/.test(ft.slice(Math.max(0, equip[k].start - 12), equip[k].start + (equip[k].end - equip[k].start - equip[k].f.length)))) equip.splice(k, 1);
    for (const e of equip) {
      const sn = sentences(text).find(x => e.start >= x.start && e.start <= x.end) || { start: 0, text: '' };
      const sf = fold(sn.text); const before = sf.slice(0, Math.max(0, e.start - sn.start) + 1);
      const isPlace = /^(studio|home studio|local|salle|atelier|garage)$/.test(e.f);
      e.kind = BUY.test(before) ? 'besoin' : isPlace ? 'lieu' : OWN.test(before) ? 'possede' : BUY.test(sf) ? 'besoin' : 'cite';
    }
    const compRe = new RegExp('\\b(' + COMPONENTS + ')\\b', 'g');
    const comps = []; while ((m = compRe.exec(ft))) comps.push(text.substr(m.index, m[1].length));

    // actions citées et objectif
    // Une proposition porte une action si un verbe d'action suit un « déclencheur » (il faut, je dois, je vais…)
    // ou si elle commence directement par un verbe (style télégraphique : « acheter un micro »).
    const MODAL = /\b(?:il\s+(?:me\s+)?(?:faut|faudrait|faudra)|faut|faudrait|faudra|je\s+dois|on\s+doit|nous\s+devons|je\s+devrais|on\s+devrait|je\s+vais|on\s+va|nous\s+allons|je\s+veux|je\s+voudrais|j'aimerais|j'aimerai|je\s+souhaite|je\s+compte|je\s+pense|je\s+prevois|j'ai\s+envie\s+de|l'idee\s+(?:c'est|serait)\s+de|ce\s+serait\s+bien\s+de|ca\s+serait\s+bien\s+de|ce\s+serait\s+cool\s+de|il\s+serait\s+bien\s+de|mon\s+objectif\s+(?:c'est|est)\s+de|on\s+pourrait|je\s+pourrais|penser\s+a|ne\s+pas\s+oublier\s+de|n'oublie\s+pas\s+de|idee\s*:|projet\s*:|a\s+faire\s*:)\s*(?:que\s+(?:je|j'|on|nous|tu)\s*|qu'(?:on|il|elle)\s*)?(?:(?:d'abord|aussi|encore|vite|absolument|surtout|ensuite|juste|deja|bien|vraiment|peut-etre|enfin|egalement|rapidement|bientot)\s+)*(?:de\s+|d')?(?:(?:d'abord|aussi|encore|vite|absolument|surtout|ensuite|juste|deja|bien|vraiment|peut-etre|enfin|egalement|rapidement|bientot)\s+)*(?:(?:me|se|te|nous)\s+|m'|s'|t')?/g;
    const LEAD = /^(?:(?:et|puis|ensuite|aussi|apres|d'abord|enfin|egalement|sinon|ou|alors|donc|surtout)(?![a-z'])\s*|(?:idee|projet)\s*:\s*|[-*]\s*|\d+[.)]\s*)*(?:(?:me|se)\s+|m'|s')?/;
    const SKIP_SOLO = new Set(['aller', 'faire', 'voir', 'tenir', 'venir', 'rester', 'donner', 'poser', 'mettre', 'aider', 'pouvoir']);
    const actions = []; let objective = null;
    const verbAt = (f, i, orig) => { const mm = /^([a-z'-]+)/.exec(f.slice(i)); if (!mm) return null; if (orig && /[éÉ]e?s?$/.test(orig.slice(i, i + mm[1].length))) return null; const w = mm[1].replace(/^(?:j'|l'|d'|m'|t'|s')/, ''); const inf = toInf(w); return inf ? { inf, w: mm[1], i, len: mm[1].length } : null; };
    for (const c of cl) {
      if (/\bje\s+me\s+demande\b|\bse\s+demander\b/.test(c.f)) continue;   // réflexion, pas une action
      let hit = null, modal = false;
      MODAL.lastIndex = 0; let mm;
      while ((mm = MODAL.exec(c.f))) {
        let p = mm.index + mm[0].length; let v = verbAt(c.f, p, c.text);
        if (!v) { const sub = /^que\s+(?:[a-z0-9'-]+\s+){1,2}?(?=[a-z])/.exec(c.f.slice(p)) || /^(?:[a-z0-9'-]+\s+)(?=[a-z])/.exec(c.f.slice(p)); if (sub) { const q = p + sub[0].length; const v2 = verbAt(c.f, q, c.text); if (v2 && !/^(un|une|le|la|les|des|du)$/.test(c.f.slice(p, q).trim())) v = v2; } }
        if (v) { hit = v; modal = true; break; } if (mm[0].length === 0) MODAL.lastIndex++; }
      if (!hit) { const lead = LEAD.exec(c.f)[0].length; if (!/^pour\b/.test(c.f.slice(lead))) hit = verbAt(c.f, lead, c.text); }
      if (!hit) continue;
      // « faire valider », « faire faire » : on garde l'auxiliaire et le verbe suivant
      let restStart = hit.i + hit.len;
      let rest = c.text.slice(restStart).trim();
      if (/^(?:que|qu'|ca|cela)\b/.test(fold(rest)) && hit.inf === 'faire') continue;
      if (/^(?:un|une)\s+(?:idee|projet)\b/.test(fold(rest))) continue;
      if (SKIP_SOLO.has(hit.inf) && rest.split(' ').length < 2) continue;
      const main = rest.replace(/\s+(?:pour|afin de|afin d'|parce que|car|histoire de)\s.*$/i, '');
      const phrase = clean(cap(infDisplay(hit.inf)) + (main ? ' ' + main : ''));
      if (phrase.split(' ').length < 2) continue;
      const refl = /(?:^|\s)(?:me|se|m'|s')\s*$/.test(c.f.slice(0, hit.i)) && /^(former|entrainer|equiper|lancer|mettre|preparer|renseigner|inscrire|occuper|organiser|perfectionner|remettre)$/.test(hit.inf);
      if (/^(?:le|la|les|l'|y|en|ca|lui|leur)$/i.test(main.trim())) continue;
      const phrase2 = refl ? clean((/^[aeiouyh]/.test(hit.inf) ? 'S\'' : 'Se ') + infDisplay(hit.inf) + (main ? ' ' + main : '')) : phrase;
      const item = { text: MAXW(phrase2, 14), inf: hit.inf, start: c.start, clause: c, modal, rest: main, refl };
      if (!objective && PROJECT_VERBS.has(hit.inf) && (modal || actions.length === 0)) { objective = item; continue; }
      actions.push(item);
    }
    if (!objective && actions.length) objective = actions.shift();

    // motivation (pourquoi) et public (pour qui)
    let why = null, forWhom = null;
    const whyRe = /\b(pour|afin de|afin d'|parce que|parce qu'|car|histoire de|dans le but de|l'objectif (?:c'est|est) de|le but (?:c'est|est) de|l'idee c'est de)\s+(.+)$/;
    const whyG = new RegExp(whyRe.source.replace('\\s+(.+)$', '\\s+'), 'g');
    for (const c of cl) for (const mm3 of [...c.f.matchAll(whyG)].map(x => [x[0], x[1], c.f.slice(x.index + x[0].length).trim(), x.index])) {
      const after = mm3[2]; const st = mm3[3];
      const orig = c.text.slice(st);
      const isWho = /^(?:(?:les|des|le|la|l'|mes|nos|ses|un|une|tous les|toutes les)\s*)?(?:[a-z'-]+\s+){0,2}?(?:AUD)\b/.source.replace('AUD', AUDIENCE);
      if (mm3[1] === 'pour' && new RegExp(isWho).test(after)) { if (!forWhom) forWhom = clean(orig.replace(/^pour\s+/i, '')); continue; }
      if (mm3[1] === 'pour' && /^\d|^(?:le|la)\s+\d|^(?:janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre|noel|l'ete|fin\s)\b/.test(after)) continue;
      const nm = /^pour\s+([A-ZÉÈ][\wéèêàç'-]+)/.exec(orig); if (mm3[1] === 'pour' && nm && !NOT_PEOPLE.test(nm[1])) { if (!forWhom) forWhom = nm[1]; continue; }
      if (mm3[1] === 'pour' && !/^(?:[a-z'-]+er|[a-z'-]+ir|[a-z'-]+re|que|qu'|se|s'|me|m'|le|la|les|l'|en|y|son|sa|ses|mon|ma|mes|notre|nos|leur|leurs|un|une|du)\b/.test(after) && !toInf(after.split(' ')[0])) continue;
      if (!why) why = clean(orig.replace(/^(?:l'objectif (?:c'est|est) de|le but (?:c'est|est) de)\s+/i, 'pour '));
    }
    if (!forWhom) { const fw = new RegExp(`\\b(aupres d(?:es|e la|u|e l')|a destination d(?:es|e)|aux|a des|pour (?:les|des)|avec (?:les|des))\\s+((?:[a-z'-]+\\s+){0,2}(?:${AUDIENCE})\\b[^,.;]*)`).exec(ft); if (fw) forWhom = clean(text.substr(fw.index, fw[0].length)); }

    // contraintes
    const constraints = [];
    const consRe = /\b(pas plus de|maximum|max\b|au maximum|budget (?:de|limite|serre)|limite|limitee?|seulement|uniquement|sans depasser|il ne faut pas|ne doit pas|doit etre|obligatoire|impose|pas le temps|peu de temps|trop cher|pas de place|petit budget|pas de budget|contrainte|impossible de|interdit)\b/g;
    const limits = money.filter(x => x.limit);
    for (const c of cl) { consRe.lastIndex = 0; if (!consRe.test(c.f)) continue; if (limits.some(x => x.start >= c.start && x.start <= c.end) && c.text.split(' ').length < 9) continue; constraints.push(MAXW(clean(c.text), 16)); }
    for (const mo of money) if (mo.limit) constraints.push('Budget maximum : ' + mo.text.replace(/^(pas plus de|maximum|max|moins de|jusqu'à|au plus)\s+/i, ''));

    // hypothèses formulées
    const hypDit = [];
    const hypRe = /\b(je pense que|je crois que|il me semble que|normalement|surement|ca devrait|ca va marcher|tout le monde|les gens (?:adorent|aiment|veulent|cherchent)|forcement|il suffit de|c'est facile|ca se vend|il y a de la demande|ca plait|ca marche bien)\b/;
    for (const c of cl) if (hypRe.test(c.f)) hypDit.push(cap(clean(c.text.replace(/^(?:et|mais|puis)\s+/i, '').replace(/^(?:je pense que|je crois que|il me semble que)\s+/i, ''))));

    // savoir-faire et opportunités formulés
    const skills = []; const skillRe = /\b(je sais(?! pas)|je connais(?! pas)|j'ai deja|j'ai l'habitude|j'ai de l'experience|mon experience|je maitrise|j'ai le materiel|j'ai un|j'ai une|j'ai des|on a deja|nous avons|j'ai fait|je suis)\b/;
    for (const c of cl) if (skillRe.test(c.f) && !/\bj'ai (?:une|un) (?:idee|projet|envie|besoin)\b/.test(c.f)) skills.push(cap(clean(c.text)));
    const gaps = []; const gapRe = /\b(je ne sais pas|je sais pas|jamais (?:fait|travaille|touche|utilise|bosse|essaye|monte)|je n'ai jamais|j'ai jamais|pas d'experience|aucune experience|debutant|je connais pas|je ne connais pas|je galere|pas doue|aucune idee de comment|pas le materiel|pas d'outils|je ne maitrise pas|je maitrise pas)\b/;
    for (const c of cl) if (gapRe.test(c.f)) gaps.push(cap(clean(c.text)));
    const opps = []; const oppRe = /\b(subventions?|appel a projets?|aides? (?:de|du|a la|aux)|partenaires? (?:interesse|pret|ok|d'accord|motive)|partenariat|il y a de la demande|ils cherchent|recherchent|tendance|marche porteur|pas de concurrence|personne ne (?:fait|propose)|on m'a propose|opportunite|soutien de|soutenu par|la ville soutient|politique de la ville|dispositif)\b/;
    const actClauses = new Set(); // rempli plus bas
    for (const c of cl) if (oppRe.test(c.f) && !hypRe.test(c.f)) opps.push({ c, t: cap(clean(c.text)) });

    // questions posées par l'auteur
    const asked = sentences(text).filter(s => /\?$/.test(s.text) || /^(est-ce que|comment|combien|quel|quelle|pourquoi|ou\b)/.test(fold(s.text)) || /\bje me demande\b/.test(fold(s.text))).map(s => clean(s.text.replace(/^.*?\bje me demande\s+/i, '')).replace(/^./, x => x.toUpperCase()));

    // flous
    const vagueIn = f => uniq(VAGUE.filter(([, re]) => new RegExp('(^|[^a-z])(?:' + re + ')([^a-z]|$)').test(f)).map(v => v[0]));
    const vague = vagueIn(ft);

    // temps disponible
    const timeRes = []; const timeRe = /\b(le soir|les soirs|le week-?end|les week-?ends|chaque semaine|par semaine|\d+\s*h(?:eures?)?\s*par|heures? par|temps libre|mi-temps)\b[^,.;]*/g;
    while ((m = timeRe.exec(ft))) timeRes.push(clean(text.substr(m.index, m[0].length)));

    // échéance principale
    const deadlineCue = /\b(avant|d'ici|pour|au plus tard|deadline|echeance|sortir|sortie|pret|prete|fini|finie|termine|livre|lancement|date limite|le jour)\b/;
    let deadline = null;
    const cands = dates.filter(d => d.kind !== 'duree' && d.kind !== 'debut' && d.conf >= 0.8);
    // échéance = la date de fin du projet : la plus tardive des dates citées
    if (cands.length) deadline = cands.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
    if (!deadline) { const weak = dates.filter(d => d.kind !== 'duree' && d.kind !== 'debut'); if (weak.length) deadline = weak.sort((a, b) => b.date.localeCompare(a.date))[0]; }
    if (!deadline) { const d = dates.find(x => x.kind === 'duree'); if (d) deadline = d; }

    let dom0 = domain, domB = domain2; const fd = objective && forceDomain(objective.inf); if (fd) { domB = domain !== fd ? domain : domB; dom0 = fd; }
    const sales = objective && /^(vendre|distribuer|diffuser|promouvoir|demarcher|commercialiser|ecouler)$/.test(objective.inf) && /^(musique|general)$/.test(dom0);
    const startDate = dates.find(d => d.kind === 'debut') || null;
    return { startDate, text, ft, cl, has, spanOf, domain: dom0, domain2: domB, sales, podcast, scores, dates, durations, money, specs, targets, people: uniqBy(people, p => p.name), orgs: uniq(orgs), roles: uniqBy(roles, r => fold(r.role)), equip: uniqBy(equip, e => fold(e.item)), comps: uniq(comps.map(c => c.toLowerCase())), actions: uniqBy(actions, a => fold(a.text)), objective, why, forWhom, vagueIn, oppsRaw: opps, constraints: uniq(constraints), hypDit: uniq(hypDit), skills: uniq(skills), gaps: uniq(gaps), opps: uniq(opps.filter(o => !(objective && o.c === objective.clause) && !actions.some(x => x.clause === o.c)).map(o => o.t)), asked, vague, timeRes: uniq(timeRes), deadline, today };
  }
  function infDisplay(inf) {
    const acc = { creer: 'créer', developper: 'développer', reserver: 'réserver', preparer: 'préparer', reparer: 'réparer', repeter: 'répéter', rediger: 'rédiger', decider: 'décider', definir: 'définir', deposer: 'déposer', declarer: 'déclarer', demarcher: 'démarcher', demarrer: 'démarrer', decouper: 'découper', deballer: 'déballer', decorer: 'décorer', delimiter: 'délimiter', deplacer: 'déplacer', ecrire: 'écrire', editer: 'éditer', echanger: 'échanger', etudier: 'étudier', evaluer: 'évaluer', equiper: 'équiper', gerer: 'gérer', negocier: 'négocier', reflechir: 'réfléchir', reunir: 'réunir', recuperer: 'récupérer', reduire: 'réduire', realiser: 'réaliser', recruter: 'recruter', renover: 'rénover', repertorier: 'répertorier', securiser: 'sécuriser', selectionner: 'sélectionner', verifier: 'vérifier', valider: 'valider', telecharger: 'télécharger', controler: 'contrôler', concretiser: 'concrétiser', repondre: 'répondre', batir: 'bâtir', cabler: 'câbler', prevoir: 'prévoir', preter: 'prêter', presenter: 'présenter', modeliser: 'modéliser', numeriser: 'numériser', interviewer: 'interviewer', decrire: 'décrire', ameliorer: 'améliorer', elaborer: 'élaborer', liberer: 'libérer', esperer: 'espérer', creuser: 'creuser', regler: 'régler', completer: 'compléter', repeindre: 'repeindre', depenser: 'dépenser', etablir: 'établir', echantillonner: 'échantillonner', designer: 'designer', interesser: 'intéresser', lancer: 'lancer' };
    return acc[inf] || inf;
  }

  /* =========================================================
     9. Structuration (même format que Claude)
     ========================================================= */
  const DOMAIN_THEME_HINTS = { formation: ['formation', 'apprentissage', 'personnel'], musique: ['musique', 'musical', 'projets musicaux', 'creation'], asso: ['association', 'asso', 'tlm103', 'demarches', 'administratif'], achat: ['achat', 'materiel', 'equipement', 'finances'], evenement: ['evenement', 'evenements', 'organisation', 'concert', 'festival'], culturel: ['action culturelle', 'culturel', 'culture', 'mediation'], business: ['business', 'entreprise', 'pro', 'travail', 'finances'], fabrication: ['fabrication', 'diy', 'bricolage', 'electronique', 'atelier', 'creation'], general: ['projet', 'personnel', 'autre'] };
  function pickCategory(dom, cats) {
    const fc = cats.map(c => fold(c));
    const hints = [fold(DOMAINS[dom] ? DOMAINS[dom].label : ''), ...(DOMAIN_THEME_HINTS[dom] || [])];
    for (const h of hints) { const i = fc.findIndex(c => c === h || (h.length > 3 && (c.includes(h) || h.includes(c)))); if (i >= 0) return cats[i]; }
    const i2 = fc.findIndex(c => c === 'projet'); if (i2 >= 0) return cats[i2];
    const i3 = fc.findIndex(c => c === 'autre'); return i3 >= 0 ? cats[i3] : cats[0];
  }
  function natureOf(a) {
    const f = a.ft;
    if ((a.objective && /^(reparer|depanner|diagnostiquer|resoudre)$/.test(a.objective.inf)) || /\b(?:probleme|panne|ne marche (?:pas|plus)|ne fonctionne (?:pas|plus)|bug|souci|cass[ee]|fuit|fuite|ronfl|gresill|buzz|bourdonn|crach|crepit|grogn|siffl|bruit parasite|ne s'allume|plus de son|sature|larsen|hs\b|grille|claque|perd (?:la |le )?(?:connexion|liaison|signal|son)|perte de (?:connexion|signal)|se deconnecte|deconnexion|plante|freeze|se coupe|coupures?|instable)/.test(f) && !/\b(?:je veux|j'aimerais|je voudrais|objectif|il faut (?:enregistrer|sortir|organiser|creer|monter|fabriquer))\b/.test(f.slice(0, 80))) return 'problème à résoudre';
    if (/\b(ameliorer|optimiser|upgrade|modifier|moder|modding|perfectionner|mieux)\b/.test(f)) return 'amélioration';
    if (a.asked.length && a.asked.join(' ').length > f.length * 0.5) return 'question';
    if (/\b(je me demande|reflechir|je reflechis|pourquoi pas|et si)\b/.test(f) && !a.objective) return 'réflexion';
    const n = a.actions.length + (a.objective ? 1 : 0);
    if (n <= 1 && f.length < 160 && /^(achat|general)$/.test(a.domain) && !(a.objective && PROJECT_VERBS.has(a.objective.inf) && (a.targets.length || a.deadline)) && !/\b(projet|lancer|creer|monter|organiser|fabriquer|construire|album|ep|festival|entreprise|ateliers?)\b/.test(f)) return 'action ponctuelle';
    return 'projet';
  }
  function titleOf(a) {
    if (a.objective) {
      let rest = a.objective.rest.replace(/\s+(?:pour|afin de|afin d'|parce que|car|avant|d'ici|qui|avec un budget)\s.*$/i, '');
      rest = rest.replace(/^(?:que\s+(?:je|j')\s*)/i, '');
      const t = clean((a.objective.refl ? (/^[aeiouyh]/.test(a.objective.inf) ? 'S\'' : 'Se ') + infDisplay(a.objective.inf) : cap(infDisplay(a.objective.inf))) + ' ' + rest);
      return MAXW(t, 9).replace(/[,;:]$/, '');
    }
    const s = sentences(a.text)[0]; return s ? MAXW(cap(clean(s.text.replace(/^(?:j'ai (?:une|un) (?:idee|projet)\s*[:,]?\s*)/i, ''))), 9) : 'Idée';
  }
  const fmtFr = isoD => { const d = new Date(isoD + 'T12:00:00'); return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); };

  function structure(fullText, opts) {
    const cats = (opts && opts.cats && opts.cats.length) ? opts.cats : ['Projet', 'Autre'];
    const a = analyseText(fullText, opts);
    const nat = natureOf(a);
    const dom = a.podcast && a.domain === 'musique' ? 'podcast' : a.domain;
    const qd = nat === 'problème à résoudre' ? 'probleme' : (dom === 'musique' && a.has('clip|tournage')) ? 'clip' : dom;
    const titre = nat === 'problème à résoudre' && sentences(a.text)[0] && !(a.objective && /^(reparer|trouver|resoudre|regler|corriger|depanner|diagnostiquer)$/.test(a.objective.inf)) ? MAXW('Résoudre : ' + clean(sentences(a.text)[0].text.replace(/^./, c => c.toLowerCase())).replace(/[.!?]$/, ''), 10) : titleOf(a);
    // S
    const objText = a.objective ? clean(a.objective.clause.text) : '';
    const objVague = a.objective ? a.vagueIn(fold(a.objective.clause.sentence ? a.objective.clause.sentence.text : a.objective.clause.text)) : a.vague;
    let S;
    const first = sentences(a.text)[0];
    if (qd === 'probleme' && first) S = /\b(quand|lorsque|des que|si|chaque fois|a chaque|seulement|uniquement)\b/.test(fold(first.text)) ? { etat: 'ok', extrait: MAXW(clean(first.text), 15), manque: '' } : { etat: 'partiel', extrait: MAXW(clean(first.text), 15), manque: Q('S', qd) };
    else if (!a.objective && first && first.text.split(/\s+/).length >= 4) S = { etat: 'partiel', extrait: MAXW(clean(first.text), 15), manque: 'Formule l\u2019objectif avec un verbe d\u2019action (fabriquer, organiser, obtenir…). ' + Q('S', qd) };
    else if (!a.objective) S = { etat: 'absent', extrait: '', manque: Q('S', qd) };
    else S = null;
    const objMain = a.objective ? fold(a.objective.rest || '').replace(/\b(?:un|une|le|la|les|des|du|de|d'|l'|mon|ma|mes)\b/g, ' ').trim() : '';
    const nW = objMain.split(/\s+/).filter(Boolean).length;
    const generic = (/\b(sous|argent|fric|thune|truc|trucs|chose|choses|machin|quelque chose)\b/.test(objMain) || (nW <= 2 && /\b(projet|activite|idee|affaire)\b/.test(objMain))) && !/\d/.test(objMain);
    const tooShort = a.objective && objMain.split(/\s+/).filter(Boolean).length < 2 && !/\d/.test(objMain);
    const objSent = a.objective && a.objective.clause.sentence;
    const later = objSent ? a.text.slice(objSent.end) : '';
    const specifics = (later.match(/\b[A-ZÉÈ][\wéèêàç'’-]{2,}|\d+/g) || []).filter(w => !/^(Je|Il|On|Le|La|Les|Un|Une|Ce|Ça|Ca|Et|Mais|Pour|Avec|Plutôt|Genre|Budget)$/.test(w)).length;
    const clarified = specifics >= 3 && !generic;
    if (S) {} else if (!clarified && (objVague.length || generic || tooShort || objText.split(' ').length < 4)) S = { etat: 'partiel', extrait: MAXW(objText, 15), manque: (objVague.length ? 'Mots flous : ' + objVague.slice(0, 3).join(', ') + '. ' : generic ? 'Objet trop général. ' : '') + Q('S', qd) };
    else S = { etat: 'ok', extrait: MAXW(objText, 15) + (clarified && (objVague.length || tooShort) ? ' (précisé ensuite)' : ''), manque: '' };
    // M
    const goalTargets = [...a.money.filter(x => x.goal).map(x => ({ text: x.text, start: x.start, end: x.end, noun: '€' })), ...a.targets.filter(t => !/^(heures?|jours?|semaines?|mois)$/.test(t.noun))];
    const specOk = (dom === 'fabrication') && a.specs.filter(s => !/durée/.test(s.kind)).length >= 1;
    let M;
    if (goalTargets.length || specOk) {
      const PRI = ['puissance', 'puissance frigorifique', 'niveau', 'fréquence', 'volume', 'tension', 'courant', 'température', 'capacité', 'énergie', 'impédance', 'valeur', 'vitesse', 'masse', 'surface', 'dimension'];
      const bestSpec = a.specs.filter(x => !/durée|tempo/.test(x.kind)).sort((x, y) => PRI.indexOf(x.kind) - PRI.indexOf(y.kind))[0];
      const t = goalTargets[0] || bestSpec; const dur = a.durations.find(d => Math.abs(d.start - t.end) < 40);
      M = { etat: 'ok', extrait: clean(t.text + (dur ? ' ' + dur.text : '')), manque: '' };
      if (dom === 'fabrication' && !specOk && !(goalTargets.length && a.money.length)) M = { etat: 'partiel', extrait: M.extrait, manque: Q('M', qd) };
    } else if (a.money.length) M = { etat: 'partiel', extrait: (a.money[0].price ? 'Prix ' : 'Budget ') + a.money[0].text, manque: Q('M', qd) };
    else M = { etat: 'absent', extrait: '', manque: Q('M', qd) };
    // A
    const resources = [];
    const inObj = x => a.objective && x.start >= a.objective.clause.start && x.start <= a.objective.clause.end;
    a.money.filter(x => x.price).forEach(x => { const mm = a.ft.slice(x.end, x.end + 14).match(/^\s*((?:la |le |l'|par )?[a-z]+)/); resources.push('Prix envisagé : ' + x.text + (mm ? ' ' + a.text.substr(x.end + mm[0].indexOf(mm[1]), mm[1].length) : '')); });
    a.money.filter(x => !x.limit && !x.goal && !x.price).forEach(x => resources.push('Budget : ' + x.text.replace(/^(environ|autour de|a peu pres|à peu près)\s+/i, '≈ ')));
    a.money.filter(x => x.limit).forEach(x => resources.push('Budget maximum : ' + x.text.replace(/^(pas plus de|maximum|max|moins de|jusqu'à|au plus)\s+/i, '')));
    a.people.forEach(p => resources.push(p.name + ' (' + clean(p.ctx.replace(p.name, '').trim()).toLowerCase() + ')'));
    const INSTIT = /mairie|prefecture|region|departement|drac|sacem|cnm|adami|spedidam|urssaf|guso|pole emploi|france travail|banque|distributeur|label|programmateur|imprimeur|fournisseur/;
    a.roles.forEach(r => { if (!a.people.some(p => a.spanOf(r.start, r.end).includes(p.name)) && !INSTIT.test(fold(r.role))) resources.push(cap(r.role)); });
    const eqs = a.equip.filter(e => !(inObj(e) && e.kind !== 'possede') && !(e.f === 'materiel' && a.equip.length > 1));
    eqs.filter(e => e.kind === 'possede').forEach(e => resources.push('Déjà là : ' + e.item));
    eqs.filter(e => e.kind === 'lieu').forEach(e => resources.push('Lieu : ' + e.item));
    eqs.filter(e => e.kind === 'besoin').forEach(e => resources.push('À acquérir : ' + e.item));
    eqs.filter(e => e.kind === 'cite').forEach(e => resources.push('Matériel : ' + e.item));
    a.timeRes.forEach(t => resources.push('Temps : ' + t));
    const funders = a.roles.filter(r => /drac|region|departement|mairie|ville|cnm|adami|spedidam|sacem|fondation|mecene|sponsor/.test(fold(r.role))).map(r => r.role);
    if (funders.length && a.has('financ|subvention|soutenu|aide|dotation|mecenat')) resources.push('Financement visé : ' + uniq(funders).join(', '));
    const resU = uniqBy(resources, r => fold(r)).slice(0, 8);
    const A = resU.length >= 2 ? { etat: 'ok', extrait: MAXW(resU.slice(0, 3).join(', '), 15), manque: '' } : resU.length === 1 ? { etat: 'partiel', extrait: resU[0], manque: Q('A', qd) } : { etat: 'absent', extrait: '', manque: Q('A', qd) };
    // R
    const Rr = a.why && a.forWhom ? { etat: 'ok', extrait: MAXW(fold(a.why).includes(fold(a.forWhom)) ? a.why : a.why + ' · ' + a.forWhom, 15), manque: '' } : a.why ? { etat: /^(achat|fabrication|asso|probleme)$/.test(qd) ? 'ok' : 'partiel', extrait: MAXW(a.why, 15), manque: /^(achat|fabrication|asso|probleme)$/.test(qd) ? '' : 'Pour qui exactement ?' } : a.forWhom ? { etat: 'partiel', extrait: MAXW(a.forWhom, 15), manque: 'Pourquoi c’est important ? ' } : { etat: 'absent', extrait: '', manque: Q('R', qd) };
    // T
    const T = !a.deadline && a.startDate ? { etat: 'ok', extrait: a.startDate.text + ' (démarrage)', manque: '' } : a.deadline && a.deadline.kind !== 'duree' ? { etat: 'ok', extrait: a.deadline.text, manque: '' } : a.deadline ? { etat: 'partiel', extrait: a.deadline.text, manque: 'Fixer une date précise. ' + Q('T', qd) } : (/\b(bientot|un jour|rapidement|vite|asap|des que possible|plus tard)\b/.test(a.ft) ? { etat: 'partiel', extrait: (a.ft.match(/\b(bientot|un jour|rapidement|vite|asap|des que possible|plus tard)\b/) || [''])[0], manque: Q('T', qd) } : { etat: 'absent', extrait: '', manque: Q('T', qd) });

    const whyTxt = a.why ? (a.deadline ? a.why.replace(a.deadline.text, '').trim() : a.why) : '';
    const why = whyTxt ? ' ' + trimEnd(whyTxt.replace(/^(car|parce que|parce qu')\s*/i, 'pour ').replace(/^Pour/, 'pour')) : '';
    const due = a.deadline && a.deadline.kind !== 'duree' && !(a.objective && a.deadline.start >= a.objective.clause.start && a.deadline.start <= a.objective.clause.end) ? ', échéance ' + a.deadline.text.replace(/^(avant|d'ici|pour)\s+/i, '') : '';
    const who = !a.why && a.forWhom ? ' pour ' + a.forWhom.replace(/^pour\s+/i, '') : '';
    const objPhrase = a.objective ? MAXW(clean((a.objective.refl ? 'Se ' + infDisplay(a.objective.inf) : cap(infDisplay(a.objective.inf))) + ' ' + a.objective.rest.replace(/\s+(?:avant|d'ici)\s.*$/i, '')), 16).replace(/…$/, '') : titre.replace(/…$/, '');
    const resume = clean(objPhrase + why + who + due).replace(/[.]+$/, '') + '.';

    const kw = uniq([...(DOMAINS[a.domain] ? Object.keys(DOMAINS[a.domain].kw).filter(k => new RegExp('\\b' + k + '\\b').test(a.ft)) : []), ...topWords(a)]).slice(0, 5);

    return {
      titre, resume, categorie: pickCategory(a.domain, cats), nature: nat, mots_cles: kw,
      smart: { specifique: S, mesurable: M, atteignable: A, pertinent: Rr, temporel: T },
      echeance_date: a.deadline ? a.deadline.date : '',
      ressources: resU, contraintes: a.constraints.slice(0, 6), actions_citees: a.actions.map(x => x.text).slice(0, 8),
      domaine: DOMAINS[a.domain] ? DOMAINS[a.domain].label : 'Général', domaine2: a.domain2 ? DOMAINS[a.domain2].label : '',
      questions_auteur: a.asked.slice(0, 5), mots_flous: a.vague, specs: a.specs.map(s => s.text), composants: a.comps.slice(0, 12),
      engine: 'local'
    };
  }
  function topWords(a) {
    const counts = {};
    for (let w of words(a.ft)) { w = w.replace(/^(?:[ldjmtsn]|qu)'/, ''); if (w.length < 5 || STOP.has(w) || toInf(w) || /^\d/.test(w) || /'/.test(w)) continue; counts[w] = (counts[w] || 0) + 1; }
    return Object.entries(counts).sort((x, y) => y[1] - x[1]).slice(0, 5).map(x => x[0]);
  }

  /* =========================================================
     10. Mise à l'épreuve (même format que Claude)
     ========================================================= */
  const VERB_LIVRABLE = { acheter: 'Achat effectué (facture)', commander: 'Commande reçue', louer: 'Location confirmée', contacter: 'Réponse obtenue', demander: 'Réponse obtenue', appeler: 'Réponse obtenue', ecrire: 'Message envoyé', envoyer: 'Envoi fait', relancer: 'Réponse obtenue', reserver: 'Réservation confirmée', enregistrer: 'Fichiers enregistrés', mixer: 'Mix validé', masteriser: 'Master validé', publier: 'En ligne', sortir: 'Sortie effective', creer: 'Créé et utilisable', monter: 'Monté et opérationnel', organiser: 'Organisé, date tenue', preparer: 'Prêt', tester: 'Test fait, résultats notés', mesurer: 'Mesures notées', souder: 'Soudures faites et vérifiées', fabriquer: 'Objet réalisé', construire: 'Objet construit', dessiner: 'Plan dessiné', rediger: 'Document rédigé', deposer: 'Dépôt confirmé', signer: 'Document signé', trouver: 'Trouvé et confirmé', lancer: 'Lancé', composer: 'Morceau composé', repeter: 'Répétition faite', programmer: 'Programmation fixée', installer: 'Installé et testé', former: 'Formation suivie', financer: 'Financement obtenu', vendre: 'Première vente', poster: 'Publié', chercher: 'Résultats trouvés', comparer: 'Comparatif fait', verifier: 'Vérifié', valider: 'Validé (trace écrite)', choisir: 'Choix arrêté', fixer: 'Fixé par écrit', definir: 'Défini par écrit', recruter: 'Personne recrutée', imprimer: 'Imprimé', reparer: 'Réparé et testé', remplacer: 'Remplacé et testé', regler: 'Réglé et vérifié', percer: 'Perçage fait', assembler: 'Assemblé', concevoir: 'Conçu (plan)', ouvrir: 'Ouvert', inscrire: 'Inscription faite', payer: 'Payé (reçu)', facturer: 'Facture envoyée' };
  function eprouver(fullText, st, opts) {
    const a = analyseText(fullText, opts);
    const dom = st && st.nature === 'problème à résoudre' ? 'probleme' : a.podcast && (a.domain === 'musique' || a.domain === 'general') ? 'podcast' : a.domain;
    const dom2 = dom === 'probleme' ? null : a.domain2;
    const c = { has: a.has, people: a.people, ft: a.ft };
    const smart = (st && st.smart) || {};

    /* --- plan --- */
    const isClip = dom === 'musique' && a.has('clip|tournage|tourner un|video');
    const objF = a.objective ? fold(a.objective.clause.text) : '';
    const tpl = (isClip ? PLAN.clip : a.sales && dom !== 'probleme' ? PLAN.diffusion : dom === 'asso' && /assemblee generale|\bag\b/.test(objF) ? PLAN.ag : (PLAN[dom] || PLAN.general)).filter(s => !s.when || s.when(c));
    if (dom2 && PLAN[dom2] && dom2 !== dom && /^(asso|evenement)$/.test(dom2)) { const extra = PLAN[dom2].filter(s => !s.when || s.when(c)).filter(s => /declar|valid|autoris|compatib|cahier/.test(fold(s.t))); extra.slice(0, 1).forEach(s => tpl.splice(Math.min(2, tpl.length), 0, s)); }
    const livOf = x => { if (x.inf === 'faire') { const v2 = toInf((fold(x.rest).match(/^([a-z'-]+)/) || [])[1] || ''); if (v2 && VERB_LIVRABLE[v2]) return VERB_LIVRABLE[v2]; } return VERB_LIVRABLE[x.inf] || 'Fait et vérifié'; };
    const userActs = a.actions.map(x => ({ etape: x.text, livrable: livOf(x), source: 'dit', inf: x.inf === 'faire' ? (toInf((fold(x.rest).match(/^([a-z'-]+)/) || [])[1] || '') || 'faire') : x.inf, f: fold(x.text) }));
    const reOf = s => new RegExp('\\b(?:' + s.kw + ')');
    const slot = new Map(); // index de phase -> actions de l'auteur
    const loose = [];
    for (const u of userActs) {
      let i = tpl.findIndex(s => reOf(s).test(u.inf));
      if (i < 0) i = tpl.findIndex(s => reOf(s).test(u.f));
      if (i < 0) { loose.push(u); continue; }
      if (!slot.has(i)) slot.set(i, []); slot.get(i).push(u);
    }
    const steps = [];
    tpl.forEach((s, i) => { if (slot.has(i)) steps.push(...slot.get(i)); else steps.push({ etape: s.t, livrable: s.l, source: 'methode' }); });
    steps.splice(Math.min(1, steps.length), 0, ...loose);
    // première étape faisable sous 48 h : on remonte une prise de contact si elle existe
    const quick = steps.findIndex(s => s.source === 'dit' && /^(demander|contacter|appeler|ecrire|envoyer|relancer|reserver|chercher|comparer|lister)$/.test(s.inf || ''));
    if (quick > 0) steps.unshift(steps.splice(quick, 1)[0]);
    let plan = steps.map(s => ({ etape: s.etape, livrable: s.livrable, source: s.source }));
    const mine = plan.filter(p => p.source === 'dit'); const meth = plan.filter(p => p.source !== 'dit');
    if (plan.length > 9) { const keep = new Set([...mine, ...meth.slice(0, Math.max(3, 9 - mine.length))]); plan = plan.filter(p => keep.has(p)); }

    /* --- risques --- */
    const lib = [...(isClip ? RISKS.clip : a.sales && dom !== 'probleme' ? RISKS.diffusion : RISKS[dom === 'podcast' ? 'musique' : dom] || []), ...(dom2 && RISKS[dom2] ? RISKS[dom2].filter(r => String(r.when) !== '() => true').slice(0, 2) : []), ...RISKS.general];
    let risques = lib.filter(r => { try { return r.when(c); } catch { return false; } }).map(r => ({ risque: r.r, gravite: r.g, probabilite: r.p, origine: r.o, signal: r.sig, parade: r.par, liste: true }));
    // risques tirés du texte
    for (const p of a.people) risques.unshift({ risque: `${p.name} n’est pas disponible ou se désiste`, gravite: 'élevée', probabilite: 'moyenne', origine: 'externe', signal: `Pas de réponse claire de ${p.name} sous une semaine`, parade: `Lui demander une confirmation écrite et prévoir une solution de repli`, liste: false });
    const deadlineDays = st && st.echeance_date ? Math.ceil((new Date(st.echeance_date + 'T12:00:00') - a.today) / 864e5) : null;
    const perStep = dom === 'probleme' ? 1 : st && st.nature === 'action ponctuelle' ? 2 : 7;
    if (deadlineDays !== null && deadlineDays < plan.length * perStep) risques.unshift({ risque: `Délai serré : ${deadlineDays} jours pour ${plan.length} étapes`, gravite: 'élevée', probabilite: 'élevée', origine: 'interne', signal: 'Une étape prend plus d’une semaine', parade: 'Réduire le périmètre ou repousser l’échéance dès maintenant', liste: false });
    if (!a.money.length && (dom === 'achat' || dom === 'fabrication' || dom === 'evenement' || dom === 'business' || a.has('acheter|commander|louer|payer|investir'))) risques.push({ risque: 'Dépassement de budget (aucun montant fixé)', gravite: 'moyenne', probabilite: 'élevée', origine: 'interne', signal: 'Dépenses engagées sans plafond', parade: 'Fixer un budget maximum avant la première dépense', liste: false });
    if (a.vague.length >= 2) risques.push({ risque: 'Objectif qui dérive en cours de route', gravite: 'moyenne', probabilite: 'moyenne', origine: 'interne', signal: 'Le projet change de forme à chaque étape', parade: 'Répondre aux questions de cadrage avant de démarrer', liste: false });
    const ORD = { 'élevée': 3, 'moyenne': 2, 'faible': 1 };
    risques = uniqBy(risques, r => fold(r.risque)).sort((x, y) => (ORD[y.gravite] * ORD[y.probabilite]) - (ORD[x.gravite] * ORD[x.probabilite])).slice(0, 8);

    /* --- hypothèses --- */
    const causeHyps = dom === 'probleme' ? a.cl.filter(c => /\b(je pense|surement|sans doute|peut-etre|probablement|ca doit etre|ca vient)\b/.test(c.f) && /\b(changer|remplacer|lampes?|condensateurs?|cable|alim|masse|potentiometre|jack|fusible|transfo|soudure|haut-parleur)\b/.test(c.f)).map(c => ({ texte: 'Cause supposée : ' + MAXW(clean(c.text.replace(/^(?:je pense|surement|sans doute|peut-être|probablement)\s*(?:que\s+)?/i, '')), 14), source: 'dit' })) : [];
    const hypotheses = [...causeHyps, ...a.hypDit.filter(h => !causeHyps.some(x => x.texte.includes(h.slice(0, 20)))).map(h => ({ texte: MAXW(h, 18), source: 'dit' })), ...((isClip ? HYPOS.clip : HYPOS[dom]) || HYPOS.general).map(h => ({ texte: h, source: 'liste' }))];
    if (a.people.length) hypotheses.push({ texte: `${a.people.map(p => p.name).join(' et ')} ${a.people.length > 1 ? 'sont d’accord et disponibles' : 'est d’accord et disponible'}`, source: 'deduit' });
    if (a.money.some(m => !m.limit && !m.goal) && (dom === 'achat' || dom === 'fabrication')) hypotheses.push({ texte: 'Le budget annoncé couvre l’ensemble (accessoires, port, imprévus)', source: 'deduit' });

    /* --- SWOT --- */
    const owned = a.equip.filter(e => (e.kind === 'possede' || e.kind === 'lieu') && e.f !== 'materiel').map(e => e.item);
    const forces = uniq([...a.skills.map(s => MAXW(s, 14)),
      ...(owned.length && !a.skills.some(s => owned.some(o => fold(s).includes(fold(o)))) ? ['Matériel ou lieu déjà disponible : ' + uniq(owned).join(', ')] : []),
      ...(a.money.some(m => !m.limit && !m.goal && !m.price) ? ['Budget déjà estimé (' + a.money.find(m => !m.limit && !m.goal && !m.price).text.replace(/^(environ)\s+/i, '≈ ') + ')'] : []),
      ...(() => { const r = a.roles.filter(x => !/mairie|region|departement|drac|prefecture|banque|urssaf|sacem|cnm|adami|spedidam|guso|france travail|pole emploi|bureau|conseil/.test(fold(x.role))).map(x => x.role); return r.length ? ['Appuis identifiés : ' + r.slice(0, 3).join(', ')] : []; })()]).slice(0, 6);
    const opportunites = a.opps.map(o => MAXW(o, 16)).slice(0, 4);
    const faiblesses = [];
    const LET = { specifique: 'Objectif encore imprécis', mesurable: 'Aucun critère chiffré de réussite', atteignable: 'Moyens pas encore identifiés', pertinent: 'Raison d’être ou public pas clairement posés', temporel: 'Pas d’échéance fixée' };
    for (const [k, l] of Object.entries(LET)) { const e = smart[k]; if (e && e.etat !== 'ok' && !(dom === 'probleme' && k === 'pertinent')) faiblesses.push(l); }
    a.gaps.forEach(g => faiblesses.push(MAXW(g, 14)));
    if (a.people.length === 1) faiblesses.push(`Une étape repose sur une seule personne (${a.people[0].name})`);
    if (a.vague.length) faiblesses.push('Formulation floue : ' + a.vague.slice(0, 3).join(', '));

    /* --- dépendances --- */
    const dependances = uniq([...a.orgs, ...a.people.map(p => `${p.name} (${clean(p.ctx.replace(p.name, '').trim())})`), ...a.roles.filter(r => /mairie|prefecture|region|departement|drac|sacem|banque|bureau|conseil|fournisseur|distributeur|imprimeur|urssaf|guso|label|programmateur/.test(fold(r.role))).map(r => cap(r.role))]).slice(0, 6);

    /* --- critères de réussite --- */
    const crit = [];
    for (const t of [...a.money.filter(x => x.goal).map(x => ({ text: x.text, end: x.end })), ...a.targets.filter(x => !/^(heures?|jours?|semaines?|mois)$/.test(x.noun))].slice(0, 3)) { const dur = a.durations.find(d => Math.abs(d.start - t.end) < 40); crit.push(cap(clean('Atteindre ' + t.text + (dur ? ' ' + dur.text : '')))); }
    if (dom === 'fabrication') a.specs.filter(s => !/durée/.test(s.kind)).slice(0, 3).forEach(s => crit.push(`Mesure conforme : ${s.text} (${s.kind})`));
    if (st && st.echeance_date) crit.push('Terminé avant le ' + fmtFr(st.echeance_date));
    const bud = a.money.find(m => !m.goal && !m.price); if (bud) crit.push('Budget respecté : ' + bud.text.replace(/^(environ|pas plus de|maximum|max|moins de)\s+/i, ''));
    if (!crit.length) crit.push('Un résultat observable atteint à l’échéance (à chiffrer dans l’onglet Développer)');

    /* --- verdict --- */
    const okN = Object.values(smart).filter(e => e && e.etat === 'ok').length;
    const severe = risques.filter(r => r.gravite === 'élevée' && r.probabilite !== 'faible').length;
    const score = okN * 2 + Math.min(2, (st && st.ressources ? st.ressources.length : 0)) + (a.skills.length ? 1 : 0) - severe - (deadlineDays !== null && deadlineDays < plan.length * perStep ? 2 : 0);
    const faisabilite = score >= 8 ? 'bonne' : score >= 4 ? 'moyenne' : 'faible';
    let point_bloquant;
    if (smart.specifique && smart.specifique.etat === 'absent') point_bloquant = 'L’objectif n’est pas encore défini précisément.';
    else { const top = risques.find(r => r.gravite === 'élevée' && r.probabilite !== 'faible'); const miss = Object.entries(LET).find(([k]) => smart[k] && smart[k].etat === 'absent');
      point_bloquant = top ? top.risque + '.' : miss ? miss[1] + '.' : 'Aucun point bloquant majeur repéré.'; }

    return {
      hypotheses: uniqBy(hypotheses, h => fold(h.texte)).slice(0, 6), forces, opportunites, faiblesses: uniq(faiblesses).slice(0, 6), risques, dependances,
      plan, test: (isClip ? TESTS.clip : TESTS[dom]) || TESTS.general, criteres_reussite: uniq(crit).slice(0, 5), faisabilite, point_bloquant, engine: 'local'
    };
  }

  const api = { structure, eprouver, analyseText, fold, findDates, findMoney, findTargets, version: '1.0' };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.ForgeEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
