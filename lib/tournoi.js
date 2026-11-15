// Logique du tournoi : classement et appariement "système suisse".
// Aucune dépendance, utilisée par les fonctions /api.

function configVide() {
  return { nom: 'Tournoi de belote', mode: 'points', equipes: [], manches: [], prochainId: 1 };
}

function cle(n, t) { return n + ':' + t; }

// Classement général. mode "points" : total des points d'abord (usage des concours de belote).
// mode "victoires" : victoires d'abord, points pour départager.
function classement(config, scores) {
  const S = new Map();
  for (const e of config.equipes) {
    S.set(e.id, { id: e.id, nom: e.nom, actif: e.actif !== false, j: 0, v: 0, n: 0, d: 0, pour: 0, contre: 0, exempt: 0 });
  }
  for (const m of config.manches) {
    const vals = [];
    for (const t of m.tables) {
      const sc = scores[cle(m.n, t.t)];
      if (!sc) continue;
      const A = S.get(t.a), B = S.get(t.b);
      if (!A || !B) continue;
      vals.push(sc.a, sc.b);
      A.j++; B.j++;
      A.pour += sc.a; A.contre += sc.b;
      B.pour += sc.b; B.contre += sc.a;
      if (sc.a > sc.b) { A.v++; B.d++; }
      else if (sc.b > sc.a) { B.v++; A.d++; }
      else { A.n++; B.n++; }
    }
    if (m.exempt != null && S.has(m.exempt)) {
      // L'équipe exempte reçoit une victoire et la moyenne des scores de la manche.
      const E = S.get(m.exempt);
      const moy = vals.length ? Math.round(vals.reduce((x, y) => x + y, 0) / vals.length) : 0;
      E.exempt++; E.v++; E.pour += moy;
    }
  }
  const L = [...S.values()];
  for (const s of L) { s.diff = s.pour - s.contre; s.vic = s.v + s.n / 2; }
  const parPoints = (x, y) => y.pour - x.pour || y.vic - x.vic || y.diff - x.diff || x.id - y.id;
  const parVictoires = (x, y) => y.vic - x.vic || y.pour - x.pour || y.diff - x.diff || x.id - y.id;
  L.sort(config.mode === 'victoires' ? parVictoires : parPoints);
  L.forEach((s, i) => { s.rang = i + 1; });
  return L;
}

function dejaJoue(config) {
  const set = new Set();
  for (const m of config.manches) for (const t of m.tables) {
    set.add(Math.min(t.a, t.b) + '-' + Math.max(t.a, t.b));
  }
  return (a, b) => set.has(Math.min(a, b) + '-' + Math.max(a, b));
}

// Apparie une liste d'ids triée (meilleur en premier) : 1er contre 2e, 3e contre 4e...
// en évitant les revanches tant que c'est possible.
function apparier(ids, joue) {
  let budget = 50000;
  function strict(rest) {
    if (rest.length === 0) return [];
    const a = rest[0];
    for (let j = 1; j < rest.length; j++) {
      if (--budget < 0) return null;
      const b = rest[j];
      if (joue(a, b)) continue;
      const suite = strict(rest.filter((_, k) => k !== 0 && k !== j));
      if (suite) return [[a, b], ...suite];
    }
    return null;
  }
  const ok = strict(ids);
  if (ok) return ok;
  // Impossible sans revanche : on en accepte le moins possible, le plus bas possible.
  const rest = ids.slice(); const paires = [];
  while (rest.length) {
    const a = rest.shift();
    let j = rest.findIndex(b => !joue(a, b));
    if (j < 0) j = 0;
    paires.push([a, rest.splice(j, 1)[0]]);
  }
  return paires;
}

// Construit la manche suivante. Renvoie { n, tables:[{t,a,b}], exempt }.
function mancheSuivante(config, scores, alea = Math.random) {
  const n = config.manches.length + 1;
  let ordre = classement(config, scores).filter(s => s.actif);
  if (ordre.length < 2) throw new Error('Il faut au moins 2 équipes actives.');
  if (n === 1) {
    // Première manche : tirage au sort.
    for (let i = ordre.length - 1; i > 0; i--) {
      const j = Math.floor(alea() * (i + 1));
      [ordre[i], ordre[j]] = [ordre[j], ordre[i]];
    }
  }
  let exempt = null;
  if (ordre.length % 2 === 1) {
    // La moins bien classée qui n'a pas encore été exempte.
    let k = -1;
    for (let i = ordre.length - 1; i >= 0; i--) if (!ordre[i].exempt) { k = i; break; }
    if (k < 0) k = ordre.length - 1;
    exempt = ordre[k].id;
    ordre.splice(k, 1);
  }
  const paires = apparier(ordre.map(s => s.id), dejaJoue(config));
  return { n, tables: paires.map((p, i) => ({ t: i + 1, a: p[0], b: p[1] })), exempt };
}

module.exports = { configVide, classement, mancheSuivante, cle };
