// Correcteur grammatical anglais entièrement local : Harper (WebAssembly, ~20 Mo, public/vendor/harper).
const BASE = new URL('../vendor/harper/', import.meta.url).href;

let linterPromise = null;

export function grammarAvailable() {
  return fetch(BASE + 'harper_wasm_slim_bg.wasm', { method: 'HEAD' }).then(r => r.ok).catch(() => false);
}

export function loadGrammar() {
  if (!linterPromise) {
    linterPromise = (async () => {
      const { LocalLinter } = await import(BASE + 'index.js');
      const { slimBinary } = await import(BASE + 'slimBinary.js');
      const linter = new LocalLinter({ binary: slimBinary });
      await linter.setup();
      return linter;
    })();
    linterPromise.catch(() => { linterPromise = null; });
  }
  return linterPromise;
}

// Libellés français des catégories de Harper.
const KINDS = {
  Spelling: 'Orthographe', Agreement: 'Accord', Grammar: 'Grammaire', Capitalization: 'Majuscule',
  Punctuation: 'Ponctuation', Repetition: 'Répétition', WordChoice: 'Choix du mot', Style: 'Style',
  Readability: 'Lisibilité', Formatting: 'Mise en forme', Enhancement: 'Amélioration', Usage: 'Usage',
  Miscellaneous: 'Divers', Eggcorn: 'Confusion de mots', Malapropism: 'Confusion de mots', Typo: 'Faute de frappe',
  Nonstandard: 'Forme non standard', Redundancy: 'Redondance', Regionalism: 'Régionalisme', BoundaryError: 'Espacement',
};

// Analyse un texte : liste des problèmes avec position, explication et suggestions.
export async function checkText(text) {
  const linter = await loadGrammar();
  const lints = await linter.lint(text);
  return lints.map(l => {
    const span = l.span();
    const kind = l.lint_kind();
    return {
      start: span.start, end: span.end,
      text: l.get_problem_text(),
      kind, kindFr: KINDS[kind] || l.lint_kind_pretty(),
      message: l.message(),
      suggestions: l.suggestions().map(s => s.get_replacement_text()).filter((v, i, a) => a.indexOf(v) === i).slice(0, 3),
    };
  }).sort((a, b) => a.start - b.start);
}

// Applique une suggestion à un texte.
export const applyFix = (text, issue, replacement) => text.slice(0, issue.start) + replacement + text.slice(issue.end);
