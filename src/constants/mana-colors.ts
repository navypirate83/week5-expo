// The colors a player can give their life total area. They are the five colors of Magic, plus
// "none" (the colorless symbol), which keeps the normal look of the app.
//
// Each color is named by the letter Scryfall uses for its symbol: {W} white, {U} blue,
// {B} black, {R} red, {G} green, and {C} colorless. The letter is what gets saved in the
// settings, and it is also how we find the symbol's picture.
export const MANA_COLORS = ['W', 'U', 'B', 'R', 'G', 'C'] as const;
export type ManaColor = (typeof MANA_COLORS)[number];

// The color every player starts with: none.
export const DEFAULT_PLAYER_COLOR: ManaColor = 'C';

// The most players a game can have, so the settings keep a color for each of up to 6 players.
export const MAX_PLAYER_COLORS = 6;

// The name shown to screen readers for each color's button.
export const MANA_COLOR_NAMES: Record<ManaColor, string> = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
  C: 'None (colorless)',
};

// How a colored life total area looks. Every color brings its OWN text color, so the numbers
// stay easy to read whether the app is in Light or Dark theme:
//   background - the color of the whole area
//   text       - the color of the numbers and symbols on it
//   button     - the color of the round + and - buttons (a see-through shade of the text color,
//                so they are a little lighter or darker than the background)
// "None" is not listed here: it uses the app's normal colors for the current theme.
export const PANEL_COLORS: Record<Exclude<ManaColor, 'C'>, { background: string; text: string; button: string }> = {
  W: { background: '#D8CFA6', text: '#1C1B17', button: 'rgba(0, 0, 0, 0.12)' },
  U: { background: '#2E6DB4', text: '#FFFFFF', button: 'rgba(255, 255, 255, 0.22)' },
  B: { background: '#3E3548', text: '#FFFFFF', button: 'rgba(255, 255, 255, 0.18)' },
  R: { background: '#C4472F', text: '#FFFFFF', button: 'rgba(255, 255, 255, 0.22)' },
  G: { background: '#3C8A4E', text: '#FFFFFF', button: 'rgba(255, 255, 255, 0.22)' },
};
