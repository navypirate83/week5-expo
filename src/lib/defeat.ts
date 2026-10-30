// The rule for when a player has lost. A player is defeated when EITHER:
//   - their life total is 0 or lower, or
//   - their poison counters have reached the Max Poison Counters setting (10 or 20), or gone past it.
// It's a small separate function so the rule lives in one place and is easy to test.
export function isDefeated(life: number, poisonCounters: number, maxPoison: number): boolean {
  return life <= 0 || poisonCounters >= maxPoison;
}
