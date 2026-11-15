// POST /api/score { manche, table, a, b } : saisie d'un score par les joueurs (ou correction par l'organisateur).
const store = require('../lib/store');
const { cle } = require('../lib/tournoi');
const { estAdmin, etat, route, refus } = require('../lib/commun');

function entier(x) {
  const n = Number(x);
  if (x === '' || x == null || !Number.isInteger(n) || n < 0 || n > 100000) throw refus(400, 'Chaque score doit être un nombre entier positif.');
  return n;
}

module.exports = route(async (req, res) => {
  if (req.method !== 'POST') throw refus(405, 'Méthode non autorisée');
  const b = req.body || {};
  const admin = estAdmin(req);
  const { config, scores } = await store.lire();
  const n = Number(b.manche), t = Number(b.table);
  const manche = config.manches.find(m => m.n === n);
  if (!manche) throw refus(404, 'Cette manche n\'existe pas.');
  if (!admin && n !== config.manches.length) throw refus(409, 'Cette manche est terminée : demandez à l\'organisateur de corriger.');
  if (!manche.tables.some(x => x.t === t)) throw refus(404, 'Cette table ne joue pas à cette manche.');
  const champ = cle(n, t);
  if (b.effacer) {
    if (!admin) throw refus(403, 'Réservé à l\'organisateur.');
    await store.effacerScores([champ]);
    delete scores[champ];
  } else {
    const valeur = { a: entier(b.a), b: entier(b.b), h: Date.now() };
    await store.ecrireScore(champ, valeur);
    scores[champ] = valeur;
  }
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(etat(config, scores));
});
