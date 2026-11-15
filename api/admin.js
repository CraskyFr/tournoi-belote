// POST /api/admin { action, ... } avec l'en-tête x-admin-code : gestion du tournoi par l'organisateur.
const store = require('../lib/store');
const { mancheSuivante, cle } = require('../lib/tournoi');
const { codeAdmin, estAdmin, etat, route, refus } = require('../lib/commun');

function nomPropre(s) { return String(s || '').replace(/\s+/g, ' ').trim().slice(0, 60); }

module.exports = route(async (req, res) => {
  if (req.method !== 'POST') throw refus(405, 'Méthode non autorisée');
  if (!codeAdmin()) throw refus(503, 'Code organisateur non défini : ajoutez la variable ADMIN_CODE dans Vercel puis redéployez.');
  if (!estAdmin(req)) throw refus(403, 'Code organisateur incorrect.');
  const b = req.body || {};
  const { config, scores } = await store.lire();
  let ecrire = true;

  switch (b.action) {
    case 'verifier': ecrire = false; break;

    case 'reglages':
      if (b.nom != null) config.nom = nomPropre(b.nom) || 'Tournoi de belote';
      if (b.mode === 'points' || b.mode === 'victoires') config.mode = b.mode;
      break;

    case 'ajouterEquipes': {
      const noms = (Array.isArray(b.noms) ? b.noms : []).map(nomPropre).filter(Boolean);
      if (!noms.length) throw refus(400, 'Aucun nom d\'équipe reçu.');
      if (config.equipes.length + noms.length > 400) throw refus(400, 'Limite de 400 équipes atteinte.');
      for (const nom of noms) config.equipes.push({ id: config.prochainId++, nom, actif: true });
      break;
    }

    case 'renommer': {
      const e = config.equipes.find(x => x.id === Number(b.id));
      if (!e) throw refus(404, 'Équipe introuvable.');
      e.nom = nomPropre(b.nom) || e.nom;
      break;
    }

    case 'activer': {
      const e = config.equipes.find(x => x.id === Number(b.id));
      if (!e) throw refus(404, 'Équipe introuvable.');
      e.actif = !!b.actif;
      break;
    }

    case 'supprimer': {
      const id = Number(b.id);
      const aJoue = config.manches.some(m => m.exempt === id || m.tables.some(t => t.a === id || t.b === id));
      if (aJoue) throw refus(409, 'Cette équipe a déjà joué : retirez-la du tournoi au lieu de la supprimer.');
      config.equipes = config.equipes.filter(x => x.id !== id);
      break;
    }

    case 'nouvelleManche': {
      const derniere = config.manches[config.manches.length - 1];
      if (derniere && !b.forcer) {
        const manquants = derniere.tables.filter(t => !scores[cle(derniere.n, t.t)]).map(t => t.t);
        if (manquants.length) throw refus(409, 'Scores manquants pour la manche ' + derniere.n + ' : table' + (manquants.length > 1 ? 's ' : ' ') + manquants.join(', ') + '.');
      }
      config.manches.push(mancheSuivante(config, scores));
      break;
    }

    case 'annulerManche': {
      const m = config.manches.pop();
      if (!m) throw refus(409, 'Aucune manche à annuler.');
      const champs = m.tables.map(t => cle(m.n, t.t));
      await store.effacerScores(champs);
      for (const c of champs) delete scores[c];
      break;
    }

    case 'toutEffacer': {
      await store.toutEffacer();
      const vide = await store.lire();
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(etat(vide.config, vide.scores));
    }

    default: throw refus(400, 'Action inconnue.');
  }

  if (ecrire) await store.ecrireConfig(config);
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(etat(config, scores));
});
