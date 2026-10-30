// Decides how the round player buttons are arranged on the main screen.
//
// The answer is a list of rows, and each number is how many buttons are in that row, from
// the top of the screen to the bottom. For example [2, 1] means "two buttons in the top row,
// then one button centered in the row below".
//
// The buttons are numbered starting at 2 (there is no button numbered 1), so there is always
// one fewer button than the Max Players setting. The buttons are labeled 2, 3, 4... up to
// the Max Players number:
//   2 players -> [1]        one button (2), centered
//   3 players -> [1, 1]     two buttons (2, 3): one on top, one below
//   4 players -> [2, 1]     three buttons (2, 3, 4): two on top, one centered below
//   5 players -> [2, 2]     four buttons (2 to 5): two by two
//   6 players -> [2, 2, 1]  five buttons (2 to 6): two, then two, then one centered at the bottom
export function playerRows(maxPlayers: number): number[] {
  switch (maxPlayers) {
    case 2:
      return [1];
    case 3:
      return [1, 1];
    case 4:
      return [2, 1];
    case 5:
      return [2, 2];
    case 6:
      return [2, 2, 1];
    default:
      // Max Players only offers 2 to 6, but if something else ever arrives, show one button.
      return [1];
  }
}

// The number shown on the first button. Buttons count up from here: 2, 3, 4...
export const FIRST_PLAYER_NUMBER = 2;
