// Stockage : Redis Upstash (Vercel) via son API REST, ou un fichier local pour les essais.
const fs = require('fs');
const path = require('path');
const { configVide } = require('./tournoi');

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const K_CONFIG = 'belote:config';
const K_SCORES = 'belote:scores';
const FICHIER = process.env.BELOTE_FICHIER || path.join(__dirname, '..', '.donnees-locales.json');

function pret() { return !!(URL_ && TOKEN) || !process.env.VERCEL; }

async function redis(cmds) {
  const r = await fetch(URL_.replace(/\/$/, '') + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds),
  });
  if (!r.ok) throw new Error('Base de données injoignable (' + r.status + ')');
  const out = await r.json();
  for (const o of out) if (o.error) throw new Error('Redis : ' + o.error);
  return out.map(o => o.result);
}

function lireFichier() {
  try { return JSON.parse(fs.readFileSync(FICHIER, 'utf8')); } catch { return { config: null, scores: {} }; }
}
function ecrireFichier(d) { fs.writeFileSync(FICHIER, JSON.stringify(d)); }

function versObjet(h) {
  const brut = {};
  if (Array.isArray(h)) for (let i = 0; i < h.length; i += 2) brut[h[i]] = h[i + 1];
  else if (h) Object.assign(brut, h);
  const scores = {};
  for (const k in brut) { try { scores[k] = typeof brut[k] === 'string' ? JSON.parse(brut[k]) : brut[k]; } catch {} }
  return scores;
}

async function lire() {
  if (!URL_) { const d = lireFichier(); return { config: d.config || configVide(), scores: d.scores || {} }; }
  const [c, h] = await redis([['GET', K_CONFIG], ['HGETALL', K_SCORES]]);
  return { config: c ? JSON.parse(c) : configVide(), scores: versObjet(h) };
}

async function ecrireConfig(config) {
  if (!URL_) { const d = lireFichier(); d.config = config; d.scores = d.scores || {}; return ecrireFichier(d); }
  await redis([['SET', K_CONFIG, JSON.stringify(config)]]);
}

async function ecrireScore(champ, valeur) {
  if (!URL_) { const d = lireFichier(); d.scores = d.scores || {}; d.scores[champ] = valeur; return ecrireFichier(d); }
  await redis([['HSET', K_SCORES, champ, JSON.stringify(valeur)]]);
}

async function effacerScores(champs) {
  if (!champs.length) return;
  if (!URL_) { const d = lireFichier(); for (const c of champs) delete (d.scores || {})[c]; return ecrireFichier(d); }
  await redis([['HDEL', K_SCORES, ...champs]]);
}

async function toutEffacer() {
  if (!URL_) return ecrireFichier({ config: null, scores: {} });
  await redis([['DEL', K_CONFIG, K_SCORES]]);
}

module.exports = { pret, lire, ecrireConfig, ecrireScore, effacerScores, toutEffacer };
