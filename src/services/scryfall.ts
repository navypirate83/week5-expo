import { Platform } from 'react-native';

// This file is the only place that talks to Scryfall's website (its "API").
// An API is a web address that hands back data instead of a page. Everything here asks
// for data, then trims it down to the few pieces our screens actually use.

const API = 'https://api.scryfall.com';

// Scryfall asks every app to say who it is and what it wants to receive.
// Web browsers don't allow apps to set their own name, so that part is skipped on the web.
const HEADERS: Record<string, string> = {
  Accept: 'application/json',
  ...(Platform.OS === 'web' ? {} : { 'User-Agent': 'MTGLifeTracker/1.0' }),
};

// ---- The shapes of the data our app uses ----

// One face of a card. Most cards have one; double-sided cards have two.
export type CardFace = {
  name: string;
  manaCost: string;
  typeLine: string;
  oracleText: string; // the official rules text of the card
  stats: string; // "2/3" for creatures, "Loyalty 4" for planeswalkers, or "" for others
};

export type CardData = {
  name: string;
  faces: CardFace[];
  imageUrls: string[]; // one picture, or two for double-sided cards
};

// One official ruling: a date and what the ruling says.
export type Ruling = {
  publishedAt: string;
  comment: string;
};

// ---- Talking to Scryfall ----

// Asks for a web address and gives back the data, or throws an error with a clear message.
// "status" lets callers tell "not found" (404) apart from "no internet" (no status at all).
export class ScryfallError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

async function getJson(url: string): Promise<any> {
  let response: Response;
  try {
    response = await fetch(url, { headers: HEADERS });
  } catch {
    // fetch fails like this when there is no internet connection.
    throw new ScryfallError('Could not reach Scryfall. Check your internet connection.');
  }
  if (!response.ok) {
    throw new ScryfallError(`Scryfall answered with an error (${response.status}).`, response.status);
  }
  return response.json();
}

// Gets the list of every card name Scryfall knows (about 35,000 of them).
export async function fetchCardNames(): Promise<string[]> {
  const catalog = await getJson(`${API}/catalog/card-names`);
  return catalog.data as string[];
}

// One mana or game symbol, such as {W} (white mana) or {T} (tap).
export type CardSymbol = {
  imageUrl: string; // the address of the symbol's picture (an SVG)
  description: string; // plain-English meaning, like "one white mana", used for screen readers
};

// Gets every symbol Scryfall has (84 of them), as a lookup table keyed by the
// text that appears in card text: "{W}", "{2}", "{W/U}", "{T}"...
export async function fetchSymbology(): Promise<Record<string, CardSymbol>> {
  const result = await getJson(`${API}/symbology`);
  const table: Record<string, CardSymbol> = {};
  for (const symbol of result.data as any[]) {
    table[symbol.symbol] = { imageUrl: symbol.svg_uri, description: symbol.english };
  }
  return table;
}

// Pulls the useful pieces out of one face of a card (or out of a single-faced card).
function toFace(source: any): CardFace {
  let stats = '';
  if (source.power !== undefined && source.toughness !== undefined) {
    stats = `${source.power}/${source.toughness}`;
  } else if (source.loyalty !== undefined) {
    stats = `Loyalty ${source.loyalty}`;
  }
  return {
    name: source.name ?? '',
    manaCost: source.mana_cost ?? '',
    typeLine: source.type_line ?? '',
    oracleText: source.oracle_text ?? '',
    stats,
  };
}

// Looks up one card by its exact name and returns just what we need, plus its rulings address.
export async function fetchCard(name: string): Promise<{ card: CardData; rulingsUrl: string }> {
  let raw: any;
  try {
    raw = await getJson(`${API}/cards/named?exact=${encodeURIComponent(name)}`);
  } catch (error) {
    // If the exact name isn't found, let Scryfall make its best guess before giving up.
    if (error instanceof ScryfallError && error.status === 404) {
      raw = await getJson(`${API}/cards/named?fuzzy=${encodeURIComponent(name)}`);
    } else {
      throw error;
    }
  }

  // Double-sided cards keep their text and pictures inside "card_faces".
  const faces: CardFace[] = raw.card_faces ? raw.card_faces.map(toFace) : [toFace(raw)];

  // Most cards (and "split" cards like Fire // Ice) have one picture for the whole card.
  // Double-sided cards have one picture per face instead.
  let imageUrls: string[] = [];
  if (raw.image_uris?.normal) {
    imageUrls = [raw.image_uris.normal];
  } else if (raw.card_faces) {
    imageUrls = raw.card_faces.map((face: any) => face.image_uris?.normal).filter(Boolean);
  }

  return { card: { name: raw.name, faces, imageUrls }, rulingsUrl: raw.rulings_uri };
}

// Gets the official rulings for a card, newest last (the order Scryfall gives them in).
export async function fetchRulings(rulingsUrl: string): Promise<Ruling[]> {
  const result = await getJson(rulingsUrl);
  return (result.data as any[]).map((ruling) => ({
    publishedAt: ruling.published_at,
    comment: ruling.comment,
  }));
}
