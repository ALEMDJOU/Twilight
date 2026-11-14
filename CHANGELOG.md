# Changelog

## 1.1.0 — 2026-11-14

### Added
- **Local AI essay coach** (optional, `npm run setup:ai`): Qwen3-1.7B run by llama.cpp on the CPU, started on demand on a free local port and stopped after 10 idle minutes.
  - Two steps: strict correction, then teacher feedback (scores for task, organisation, vocabulary and grammar, estimated level, three tips, B2 model answer to listen to).
  - Checked rule layer (`public/js/mistakes.js`): safe fixes for typical French-speaker mistakes the model misses (calques, tenses with a time clue, irregular pasts, *years old*, *Me and my brother*, *make a photo*…). Mistakes corrected in our tests: ~60 % with the model alone, ~94 % with the rules; no change on 97 correct test sentences.
  - Every correction is computed from a word-by-word diff and explained in English by checked rules; British and American spellings are both kept.
- **Writing practice**: 150 original writing tasks (opinion, advantages and disadvantages, story, email, description; B1 and B2) with guiding questions, useful expressions and a target length (`public/js/topics.js`).
- **Word stress** section: 14 rules with exceptions, ~280 words with audio, quiz, best scores, and a 10-word exercise in the daily session (missed words first).
- Exercise instructions in English and French, French translations of difficult words and of the full sentence, for every book.
- Spoken encouragement after answers (can be turned off).
- Sticky in-page anchors on long pages and a back-to-top button.
- `CHANGELOG.md`.

### Changed
- Essay writing page redesigned: task always visible next to the editor, one main « Corriger mon essay » action (AI if installed, otherwise Harper), « Vérification rapide » as a secondary action, length meter, automatic draft, confirmation before replacing a written text.
- AI results: progress steps with elapsed time and a stop button, anchors to each part, keyboard focus on the result, corrections list with explanations, accessible score meters.
- Colours: light-theme green, red, amber and muted text darkened, dark-theme muted text lightened, button gradient end darkened — text now meets WCAG AA contrast (4.5:1).

### Removed
- The large Vosk model experiment (about 8× slower on a modest laptop for a small accuracy gain).

## 1.0.0

First public version: daily session (flashcards, exercises, lessons), six exercise types, listening and pronunciation practice, Harper grammar checking, offline Piper voice, catch-up sessions, daily reminders, light and dark themes.
