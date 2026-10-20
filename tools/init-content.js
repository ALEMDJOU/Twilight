// Installe le contenu d'exemple (samples/content) si public/content est vide.
// Le contenu tiré des livres n'est pas distribué : chacun crée le sien à partir des livres qu'il possède.
// Usage : npm run setup
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'samples', 'content');
const DEST = path.join(__dirname, '..', 'public', 'content');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dest, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else if (!fs.existsSync(d)) fs.copyFileSync(s, d);
  }
}

if (fs.existsSync(path.join(DEST, 'catalog.json'))) {
  console.log('Contenu déjà présent dans public/content : rien à faire.');
} else {
  copyDir(SRC, DEST);
  console.log('Contenu d’exemple installé dans public/content.');
}
require('./check-content.js');
