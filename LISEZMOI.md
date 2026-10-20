# Twilight — guide d'utilisation

Twilight est une application locale pour apprendre l'anglais avec des leçons courtes, des exercices et des flashcards en répétition espacée.
Elle peut accueillir le contenu de :
- *English Grammar in Use* (Intermediate) — 145 unités ;
- *English Vocabulary in Use* (Pre-intermediate & Intermediate) — 100 unités ;
- *English Vocabulary in Use* (Advanced) — 101 unités ;
- *English Collocations in Use* (Intermediate) — 60 unités ;
- *150 Common English Proverbs*.

> Le contenu tiré des livres n'est **pas** publié avec le code (droit d'auteur). Voir [README.md](README.md) pour la partie technique et open source.

## Installer (une seule fois)
Il faut **Node.js 22.5 ou plus récent** : https://nodejs.org

```
npm run setup
```
Cette commande installe le contenu d'exemple si le dossier `public/content` est vide, puis télécharge la voix américaine Piper (environ 100 Mo).

## Lancer
Double-clique sur **`Lancer Twilight.bat`** (ou `npm start`). Le navigateur s'ouvre sur http://localhost:4317.
Garde la fenêtre noire ouverte pendant que tu étudies ; ferme-la pour arrêter.

## Hors ligne
Tout fonctionne sans internet : polices, icônes, contenu, photos et voix sont dans le dossier.
Un Service Worker garde l'application dans le navigateur : Twilight s'ouvre même si le serveur est arrêté. La progression est alors gardée dans le navigateur, puis synchronisée avec la base SQLite dès que le serveur revient.

**Prononciation** : la voix américaine **Piper** fonctionne entièrement hors ligne. Les voix Windows servent de secours (Réglages → Voix et aide).

## Méthode
Chaque séance (1 h 30 par défaut, réglable) se répartit selon la recherche :
- **40 % flashcards en répétition espacée** : chaque carte revient juste avant que tu ne l'oublies ;
- **40 % exercices** : tu cherches la réponse dans ta mémoire, avec correction immédiate ; les erreurs reviennent plus vite ;
- **20 % leçons** : une leçon courte, puis la pratique tout de suite.

Un **rappel de la leçon** s'affiche avant chaque série d'exercices. Le bouton 💡 *Rappel* reste disponible sur chaque exercice.
Les séances non terminées des 14 derniers jours peuvent être **reprises** depuis l'accueil ou la colonne « À terminer ».

## Données
- Progression : base SQLite `data/twilight.db`, avec une copie automatique par jour dans `data/backups/` (les 30 dernières sont gardées).
- Réglages → Exporter / Importer pour sauvegarder ailleurs.

## Contenu
- `public/content/catalog.json` : liste des unités de chaque livre ;
- `public/content/units/<id>.json` : une unité (`g` grammaire, `vi` vocabulaire, `va` avancé, `co` collocations) ;
- `npm run check` : vérifie les unités et met à jour `index.json` ;
- `npm run images` : télécharge les photos des cartes qui ont un champ `img` (titre d'un article Wikipédia anglais).
