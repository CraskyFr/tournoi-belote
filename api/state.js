// GET /api/state : tout l'état public du tournoi (équipes, manches, scores, classement).
const store = require('../lib/store');
const { etat, route } = require('../lib/commun');

module.exports = route(async (req, res) => {
  const { config, scores } = await store.lire();
  // Le réseau Vercel garde la réponse 5 s : 200 téléphones ne coûtent qu'une lecture de la base.
  res.setHeader('Cache-Control', req.query && req.query.frais ? 'no-store' : 'public, s-maxage=5, stale-while-revalidate=10');
  res.status(200).json(etat(config, scores));
});
