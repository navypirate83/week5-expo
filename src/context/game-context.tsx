import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

// This file keeps the CURRENT GAME: how many players there are, and each player's life total
// and poison counters. It lives here, not inside the life screen, so it can be saved on the
// phone every time it changes. When you close the app and open it again, the game is loaded
// back, exactly where you left it. (Settings work the same way: see settings-context.tsx.)

// The name of the "drawer" on the phone where the game is kept.
const GAME_KEY = 'current-game';

// Everything that makes up a game.
//   players - how many players, or null when no game has been started (the "How many players?" screen)
//   lives   - each player's life total: lives[0] is Player 1, lives[1] is Player 2...
//   poisons - each player's poison counters, in the same order
//   commander - a table of commander damage: commander[2][0] is how much damage Player 3
//               has taken from Player 1's commander. (A player's own entry is always 0.)
type Game = {
  players: number | null;
  lives: number[];
  poisons: number[];
  commander: number[][];
};

// The state when no game is running.
const NO_GAME: Game = { players: null, lives: [], poisons: [], commander: [] };

// A fresh commander damage table for this many players: everything at 0.
function emptyCommander(players: number): number[][] {
  return Array.from({ length: players }, () => Array.from({ length: players }, () => 0));
}

// Checks that saved commander damage is a proper players-by-players table of whole numbers
// that are 0 or more.
function validCommander(table: unknown, players: number): table is number[][] {
  return (
    Array.isArray(table) &&
    table.length === players &&
    table.every(
      (row) =>
        Array.isArray(row) &&
        row.length === players &&
        row.every((damage) => typeof damage === 'number' && Number.isInteger(damage) && damage >= 0),
    )
  );
}

// Turns whatever was saved on the phone back into a proper Game. The saved text could be
// missing, damaged, or from an older version of the app, so every part is checked, and if
// anything looks wrong we start with no game instead of showing nonsense.
function readSavedGame(saved: unknown): Game {
  const data = (saved ?? {}) as Partial<Record<keyof Game, unknown>>;
  const { players, lives, poisons, commander } = data;

  const validPlayers = typeof players === 'number' && Number.isInteger(players) && players >= 2 && players <= 6;
  const validLives = Array.isArray(lives) && lives.every((life) => typeof life === 'number' && Number.isFinite(life));
  const validPoisons =
    Array.isArray(poisons) &&
    poisons.every((poison) => typeof poison === 'number' && Number.isInteger(poison) && poison >= 0);

  if (!validPlayers || !validLives || !validPoisons) return NO_GAME;
  // There must be exactly one life total and one poison count for every player.
  if ((lives as number[]).length !== players || (poisons as number[]).length !== players) return NO_GAME;

  return {
    players: players as number,
    lives: lives as number[],
    poisons: poisons as number[],
    // Games saved before commander damage existed have no table, so they start with zeros.
    commander: validCommander(commander, players as number) ? commander : emptyCommander(players as number),
  };
}

// What other files get when they ask for the game: its current state, plus the actions that
// change it.
type GameContextValue = {
  game: Game;
  // Begins a new game with this many players, everyone at the starting life and 0 poison.
  startGame: (players: number, startingLife: number) => void;
  // Changes one player's life by +1 or -1. (playerIndex 0 is Player 1.)
  adjustLife: (playerIndex: number, change: number) => void;
  // Changes one player's poison counters by +1 or -1. They never go below 0.
  adjustPoison: (playerIndex: number, change: number) => void;
  // Changes how much commander damage one player has taken from another's commander by +1 or
  // -1 (never below 0). Every point also takes 1 life from the player who took the damage,
  // and gives it back when the damage is taken off again.
  //   victimIndex - the player taking the damage (0 is Player 1)
  //   sourceIndex - the player whose commander is dealing it
  adjustCommander: (victimIndex: number, sourceIndex: number, change: number) => void;
  // "New game": same number of players, everyone back to the starting life and 0 poison.
  resetGame: (startingLife: number) => void;
  // Ends the game and goes back to choosing how many players.
  leaveGame: () => void;
};

const GameContext = createContext<GameContextValue | null>(null);

// Wrap the app in this once (done in src/app/_layout.tsx). It loads the saved game when the
// app starts and saves it again every time it changes.
export function GameProvider({ children }: { children: ReactNode }) {
  const [game, setGame] = useState<Game>(NO_GAME);
  // "loaded" becomes true once we've looked for a saved game. Until then we show nothing, so
  // you never see the "How many players?" screen flash before your game appears.
  const [loaded, setLoaded] = useState(false);

  // When the app starts: look in the storage drawer for a saved game.
  useEffect(() => {
    AsyncStorage.getItem(GAME_KEY)
      .then((text) => {
        if (text) setGame(readSavedGame(JSON.parse(text)));
      })
      // If reading fails (or the saved text is damaged) we just start with no game.
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  // Whenever the game changes: save it. We skip saving until loading has finished, so the
  // empty starting state never overwrites a saved game.
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(GAME_KEY, JSON.stringify(game)).catch(() => {});
  }, [game, loaded]);

  const value: GameContextValue = {
    game,
    startGame: (players, startingLife) =>
      setGame({
        players,
        lives: Array.from({ length: players }, () => startingLife),
        poisons: Array.from({ length: players }, () => 0),
        commander: emptyCommander(players),
      }),
    // For the two adjust functions: copy the list and change only that player's number.
    adjustLife: (playerIndex, change) =>
      setGame((current) => ({
        ...current,
        lives: current.lives.map((life, index) => (index === playerIndex ? life + change : life)),
      })),
    adjustPoison: (playerIndex, change) =>
      setGame((current) => ({
        ...current,
        poisons: current.poisons.map((poison, index) =>
          index === playerIndex ? Math.max(0, poison + change) : poison,
        ),
      })),
    adjustCommander: (victimIndex, sourceIndex, change) =>
      setGame((current) => {
        const before = current.commander[victimIndex][sourceIndex];
        const after = Math.max(0, before + change);
        // If the damage was already 0 and we tried to lower it, nothing changes at all.
        const applied = after - before;
        if (applied === 0) return current;
        return {
          ...current,
          commander: current.commander.map((row, victim) =>
            victim === victimIndex ? row.map((damage, source) => (source === sourceIndex ? after : damage)) : row,
          ),
          // Commander damage also counts as life lost.
          lives: current.lives.map((life, index) => (index === victimIndex ? life - applied : life)),
        };
      }),
    resetGame: (startingLife) =>
      setGame((current) => ({
        players: current.players,
        lives: current.lives.map(() => startingLife),
        poisons: current.poisons.map(() => 0),
        commander: emptyCommander(current.lives.length),
      })),
    leaveGame: () => setGame(NO_GAME),
  };

  if (!loaded) return null;

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

// Any screen calls useGame() to read or change the current game.
export function useGame() {
  const value = useContext(GameContext);
  // If this fires, a screen is being used outside the GameProvider by mistake.
  if (!value) {
    throw new Error('useGame must be used inside a GameProvider');
  }
  return value;
}
