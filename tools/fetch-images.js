// Télécharge les photos des cartes de vocabulaire depuis Wikipédia / Wikimedia Commons (licences libres)
// et les enregistre dans public/img pour un usage hors ligne. Les crédits vont dans public/content/images.json.
// Usage : node tools/fetch-images.js        (une carte s'illustre avec  "img": "<titre d'article Wikipédia anglais>")
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'public');
const UNITS = path.join(ROOT, 'content', 'units');
const IMG = path.join(ROOT, 'img');
const DB = path.join(ROOT, 'content', 'images.json');
const UA = { 'User-Agent': 'TwilightLearningApp/1.0 (personal offline English study tool)' };
fs.mkdirSync(IMG, { recursive: true });

const db = fs.existsSync(DB) ? JSON.parse(fs.readFileSync(DB, 'utf8')) : {};
const wanted = new Set();
for (const f of fs.readdirSync(UNITS).filter(f => f.endsWith('.json'))) {
  const u = JSON.parse(fs.readFileSync(path.join(UNITS, f), 'utf8'));
  for (const c of u.cards || []) if (c.img && !(c.img in db)) wanted.add(c.img);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const strip = s => String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const slug = s => s.toLowerCase().normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

async function getJSON(url) {
  for (let i = 0; i < 6; i++) {
    try { const r = await fetch(url, { headers: UA }); if (r.ok) return r.json(); } catch { /* nouvel essai */ }
    await sleep(4000 * (i + 1));
  }
  throw new Error('échec : ' + url);
}

(async () => {
  const titles = [...wanted];
  console.log(`${titles.length} image(s) à chercher.`);
  let ok = 0, miss = [];
  for (let i = 0; i < titles.length; i += 20) {
    const batch = titles.slice(i, i + 20);
    const q = await getJSON('https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=thumbnail|name&pithumbsize=480&pilicense=free&redirects=1&titles=' + encodeURIComponent(batch.join('|')));
    // Retrouver le titre demandé à partir des redirections / normalisations.
    const back = {};
    for (const n of q.query.normalized || []) back[n.to] = n.from;
    for (const r of q.query.redirects || []) back[r.to] = back[r.from] || r.from;
    for (const p of Object.values(q.query.pages || {})) {
      const asked = back[p.title] || p.title;
      if (!p.thumbnail || !p.pageimage) { miss.push(asked); continue; }
      try {
        const meta = await getJSON('https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata|url&titles=' + encodeURIComponent('File:' + p.pageimage));
        const page = Object.values(meta.query.pages)[0];
        const info = page.imageinfo?.[0];
        const em = info?.extmetadata || {};
        const url = p.thumbnail.source.split('?')[0];
        const ext = (url.match(/\.(jpe?g|png|gif|webp)$/i)?.[1] || 'jpg').toLowerCase().replace('jpeg', 'jpg');
        const file = `${slug(asked)}.${ext}`;
        const img = await fetch(url, { headers: UA });
        if (!img.ok) throw new Error('HTTP ' + img.status);
        fs.writeFileSync(path.join(IMG, file), Buffer.from(await img.arrayBuffer()));
        db[asked] = {
          file: `img/${file}`,
          artist: strip(em.Artist?.value) || 'Wikimedia Commons',
          license: strip(em.LicenseShortName?.value) || '',
          source: info?.descriptionurl || `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(p.pageimage)}`,
        };
        ok++;
        process.stdout.write('.');
      } catch (e) {
        miss.push(asked);
      }
      await sleep(500);
    }
    fs.writeFileSync(DB, JSON.stringify(db, null, 1));
  }
  // Marque les titres introuvables pour ne pas les rechercher à chaque fois.
  for (const t of miss) if (!db[t]) db[t] = null;
  fs.writeFileSync(DB, JSON.stringify(db, null, 1));
  console.log(`\n${ok} image(s) téléchargée(s).` + (miss.length ? ` Introuvables : ${miss.join(', ')}` : ''));
})();
