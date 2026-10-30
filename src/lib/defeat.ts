// How much commander damage from ONE other player is enough to defeat you.
export const COMMANDER_DAMAGE_LIMIT = 21;

// The rule for when a player has lost. A player is defeated when ANY of these is true:
//   - their life total is 0 or lower, or
//   - their poison counters have reached the Max Poison Counters setting (10 or 20), or gone past it, or
//   - they have taken 21 or more commander damage from a single other player
//     ("mostCommanderDamage" is the biggest amount taken from any one player, not the total).
// It's a small separate function so the rule lives in one place and is easy to test.
export function isDefeated(
  life: number,
  poisonCounters: number,
  maxPoison: number,
  mostCommanderDamage = 0,
): boolean {
  return life <= 0 || poisonCounters >= maxPoison || mostCommanderDamage >= COMMANDER_DAMAGE_LIMIT;
}
