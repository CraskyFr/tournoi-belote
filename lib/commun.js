const store = require('./store');
const { classement } = require('./tournoi');

function codeAdmin() {
  return process.env.ADMIN_CODE || (process.env.VERCEL ? null : '1234');
}

function estAdmin(req) {
  const c = codeAdmin();
  const recu = req.headers['x-admin-code'];
  return !!c && typeof recu === 'string' && recu === c;
}

function etat(config, scores) {
  return { config, scores, classement: classement(config, scores), heure: Date.now() };
}

// Enveloppe commune : erreurs lisibles, vérification de la configuration.
function route(fn) {
  return async (req, res) => {
    try {
      if (!store.pret()) {
        return res.status(503).json({ erreur: 'Base de données non reliée : ajoutez Upstash Redis au projet Vercel puis redéployez.' });
      }
      await fn(req, res);
    } catch (e) {
      res.status(e.code || 500).json({ erreur: e.message || 'Erreur inattendue' });
    }
  };
}

function refus(code, message) { const e = new Error(message); e.code = code; return e; }

module.exports = { codeAdmin, estAdmin, etat, route, refus };
