// How long saved Scryfall data (the card name list, card details and rulings, and the
// mana symbols) is trusted before the app asks Scryfall for a newer copy.
//
// Inside this time the saved copy is used as-is, so the app works the same offline and
// doesn't re-download things that rarely change. After it, the app refreshes the copy
// whenever it is online. If it can't (no internet), it keeps using the old copy. Saved data
// is never deleted just for being old, so it stays available for as long as the phone keeps it.
export const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
