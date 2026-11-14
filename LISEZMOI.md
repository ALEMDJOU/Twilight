# Twilight — guide d'utilisation

Twilight est une application locale pour apprendre l'anglais avec des leçons courtes, des exercices et des flashcards en répétition espacée.
Elle peut accueillir le contenu de :
- *English Grammar in Use* (Intermediate) — 145 unités ;
- *English Vocabulary in Use* (Pre-intermediate & Intermediate) — 100 unités ;
- *English Vocabulary in Use* (Advanced) — 101 unités ;
- *English Collocations in Use* (Intermediate) — 60 unités ;
- *English Idioms in Use* (Intermediate) — 62 unités ;
- *English Idioms & Phrasal Verbs* (The Complete Guide) — 21 unités ;
- *150 Common English Proverbs*.

> Le contenu tiré des livres n'est **pas** publié avec le code (droit d'auteur). Voir [README.md](README.md) pour la partie technique et open source.

## Installer (une seule fois)
Il faut **Node.js 22.5 ou plus récent** : https://nodejs.org

```
npm run setup
```
Cette commande installe le contenu d'exemple si le dossier `public/content` est vide, puis télécharge les moteurs hors ligne : voix américaine Piper, reconnaissance vocale Vosk et correcteur Harper (environ 170 Mo).

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
Les flashcards sont proposées par **petites séances de 50 cartes**.

## Exercices
- Chaque exercice a sa **consigne précise**, en anglais et en français.
- En bas de l'exercice, les **mots difficiles** de la question sont traduits en français (jamais la réponse) ; après ta réponse, la **phrase entière** est traduite.
- Les **compliments sont dits à voix haute** par la voix américaine, sur un ton enjoué (« Incredible! You're worth it! ») ; après une erreur, un encouragement plus doux. Réglages → *Compliments à voix haute* pour les couper.
- Collocations, idiomes et phrasal verbs sont **illustrés** par des dessins créés dans l'application (hors ligne).
- Écoute, dictée et prononciation (reconnaissance vocale Vosk), rédaction corrigée par Harper : tout fonctionne hors ligne.
- **Expression écrite** : l'application propose un sujet parmi 150 (essay d'opinion, avantages et inconvénients, récit, e-mail, description), avec 3 questions guides, des expressions utiles et une longueur cible. Le sujet reste visible à côté de la zone d'écriture, une barre indique la longueur, et le brouillon est gardé automatiquement.
- **Correcteur IA local (facultatif)** : dans l'expression écrite, le bouton « Améliorer avec l'IA locale » fait corriger ton texte par un petit modèle de langue (Qwen3-1.7B) qui tourne sur ton PC. Le bouton « Corriger mon essay avec l'IA locale » fonctionne en deux étapes. D'abord une correction stricte : texte corrigé (ajouts en vert, suppressions barrées) et liste de tes corrections, expliquées en anglais par une liste vérifiée d'erreurs typiques des francophones. Ensuite un bilan de professeur : notes sur 5 (réponse au sujet, organisation, vocabulaire, grammaire), niveau estimé, trois conseils sur tes idées et ta structure, et un essay modèle de niveau B2 à écouter, avec les mots de liaison en gras. Compte environ 2 minutes en tout. Installation une seule fois : `npm run setup:ai` (environ 1,1 Go, le téléchargement reprend s'il est coupé). Le modèle démarre à la demande et s'arrête après 10 minutes sans usage. Il peut se tromper : garde un œil critique.

## Accent tonique
L'onglet **Accent** explique sur quelle syllabe appuyer : 14 règles avec leurs exceptions (noms et verbes de deux syllabes, paires *REcord / reCORD*, terminaisons comme *-tion* ou *-ity*, mots composés, *-teen / -ty*, américain ou britannique…). Clique sur un mot pour l'écouter, puis entraîne-toi avec le quiz de chaque règle ou le **test général** : les erreurs reviennent en fin de série et ton meilleur score est gardé.
La **séance du jour** contient aussi un exercice de 10 mots : tu choisis la syllabe à accentuer, puis tu écoutes le mot. Les mots ratés reviennent en priorité les jours suivants.

## Pages longues
Une **barre d'ancrages** reste en haut de l'écran sur les leçons, les livres, les proverbes et les réglages : un clic mène directement à une partie (A, B, C…, Images, À retenir, Exercices, Cartes) et la partie en cours est mise en évidence. Le bouton ↑ en bas à droite remonte en haut de la page.
Les séances non terminées des 14 derniers jours peuvent être **reprises** depuis l'accueil ou la colonne « À terminer ».

## Données
- Progression : base SQLite `data/twilight.db`, avec une copie automatique par jour dans `data/backups/` (les 30 dernières sont gardées).
- Réglages → Exporter / Importer pour sauvegarder ailleurs.

## Contenu
- `public/content/catalog.json` : liste des unités de chaque livre ;
- `public/content/units/<id>.json` : une unité (`g` grammaire, `vi` vocabulaire, `va` avancé, `co` collocations, `id` idiomes, `ip` idiomes & phrasal verbs) ;
- dans chaque exercice, champs facultatifs `instr` / `instrFr` (consigne), `gloss` (traductions des mots visibles), `trFr` (traduction de la phrase complète) ;
- `npm run check` : vérifie les unités et met à jour `index.json` ;
- `npm run images` : télécharge les photos des cartes qui ont un champ `img` (titre d'un article Wikipédia anglais).
