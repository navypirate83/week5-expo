// This file is the "brain" of the card search box. It has no screens in it, only
// functions that take a typed phrase and a list of card names and say which names match best.
//
// The big idea: before comparing, we "clean" both the typed text and every card name so
// that small differences don't matter. Capital letters, accents and symbols all disappear:
//   "Ur-Dragon"   ->  "ur dragon"
//   "K'rrik"      ->  "k rrik"
//   "Dragon's Fire" -> "dragon s fire"

// Cleans a piece of text so two spellings of the same thing look identical.
export function normalize(text: string): string {
  return (
    text
      .toLowerCase()
      // Æ and Ö etc. need special care: turn "æ" into "ae", then split accented letters
      // into the plain letter plus a separate accent mark, and throw the accent marks away.
      .replace(/æ/g, 'ae')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      // Every run of anything that is not a letter or number (commas, dashes, dots,
      // apostrophes, "//", spaces...) becomes a single space.
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
  );
}

// One card name, with its cleaned-up forms worked out ahead of time so searching is fast.
export type IndexedName = {
  name: string; // the real name, shown to the user
  norm: string; // cleaned: "k rrik son of yawgmoth"
  compact: string; // cleaned with no spaces at all: "krrikson ofyawgmoth" style, used to match "krrik"
  words: string[]; // the cleaned name split into words
};

// Prepares the whole list of names once (35,000+ of them) so each keystroke is quick.
export function buildIndex(names: string[]): IndexedName[] {
  return names.map((name) => {
    const norm = normalize(name);
    return { name, norm, compact: norm.replace(/ /g, ''), words: norm.split(' ') };
  });
}

// How different two words are: the number of single-letter edits (add, remove, change)
// needed to turn one into the other. "dragn" -> "dragon" is 1. We give up early once it
// is clear the words are further apart than `max`, to keep this quick.
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      rowMin = Math.min(rowMin, current[j]);
    }
    if (rowMin > max) return max + 1;
    previous = current;
  }
  return previous[b.length];
}

// A match, with a score where LOWER is a closer match.
type Match = { name: string; score: number; length: number };

// Gives one card name a score for the typed text, or null if it doesn't match at all.
// From best to worst:
//   0  the name is exactly what was typed
//   1  the name STARTS with what was typed
//   2  a word in the name starts with what was typed (middle of the name: "Dragon" in "Ur-Dragon")
//   3  what was typed appears anywhere inside the name
//   4  it matches once spaces are ignored on both sides ("krrik" finds "K'rrik")
//   5  every typed word appears somewhere in the name, in any order
// Within the same level, a match closer to the front of the name scores a little better.
function scoreName(entry: IndexedName, query: string, queryCompact: string, tokens: string[]) {
  const { norm, compact } = entry;
  if (norm === query) return 0;
  if (norm.startsWith(query)) return 1;
  if (compact.startsWith(queryCompact)) return 1.5;

  const wordStart = norm.indexOf(' ' + query);
  if (wordStart !== -1) return 2 + wordStart / 1000;

  const anywhere = norm.indexOf(query);
  if (anywhere !== -1) return 3 + anywhere / 1000;

  const compactAt = compact.indexOf(queryCompact);
  if (compactAt !== -1) return 4 + compactAt / 1000;

  if (tokens.length > 1 && tokens.every((token) => norm.includes(token))) return 5;

  return null;
}

// Backup for typos: used only when nothing matched normally. Every typed word must be
// close to some word in the name (1 letter off for short words, 2 for long ones).
function scoreTypos(entry: IndexedName, tokens: string[]) {
  let total = 0;
  for (const token of tokens) {
    const allowed = token.length >= 7 ? 2 : 1;
    let best = allowed + 1;
    for (const word of entry.words) {
      // Compare against the start of the word too, so half-typed words still work.
      const distance = Math.min(
        editDistance(token, word, allowed),
        editDistance(token, word.slice(0, token.length), allowed),
      );
      if (distance < best) best = distance;
    }
    if (best > allowed) return null;
    total += best;
  }
  return 10 + total;
}

// The main function: give it the prepared list and what the user typed, and it returns
// up to `limit` card names, best match first.
export function searchCardNames(index: IndexedName[], typed: string, limit = 8): string[] {
  const query = normalize(typed);
  if (!query) return [];
  const queryCompact = query.replace(/ /g, '');
  const tokens = query.split(' ');

  const matches: Match[] = [];
  for (const entry of index) {
    const score = scoreName(entry, query, queryCompact, tokens);
    if (score !== null) matches.push({ name: entry.name, score, length: entry.norm.length });
  }

  // Nothing matched? Try forgiving small typos (only once there are enough letters to guess from).
  if (matches.length === 0 && queryCompact.length >= 3) {
    for (const entry of index) {
      const score = scoreTypos(entry, tokens);
      if (score !== null) matches.push({ name: entry.name, score, length: entry.norm.length });
    }
  }

  // Best score first; if tied, shorter names (closer to what was typed) first, then A to Z.
  matches.sort((a, b) => a.score - b.score || a.length - b.length || a.name.localeCompare(b.name));
  return matches.slice(0, limit).map((match) => match.name);
}
