export const FAKE_PASSWORD = 'YORAY';
export const PASSWORD_LENGTH = FAKE_PASSWORD.length;
export const MAX_ATTEMPTS = 6;

export type TileState = 'correct' | 'present' | 'absent';
export type GameStatus = 'playing' | 'won' | 'lost';

export type GuessEvaluation = {
  guess: string;
  tiles: TileState[];
  solved: boolean;
};

const TILE_PRIORITY: Record<TileState, number> = {
  absent: 0,
  present: 1,
  correct: 2,
};

export function normalizeGuess(value: string): string {
  return value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, PASSWORD_LENGTH);
}

export function evaluateGuess(value: string, answer = FAKE_PASSWORD): GuessEvaluation {
  const guess = normalizeGuess(value);
  const normalizedAnswer = normalizeGuess(answer);
  const tiles: TileState[] = Array.from({ length: PASSWORD_LENGTH }, () => 'absent');
  const remaining = new Map<string, number>();

  for (let index = 0; index < PASSWORD_LENGTH; index += 1) {
    const character = normalizedAnswer[index];
    if (guess[index] === character && character) {
      tiles[index] = 'correct';
      continue;
    }
    if (character) remaining.set(character, (remaining.get(character) ?? 0) + 1);
  }

  for (let index = 0; index < PASSWORD_LENGTH; index += 1) {
    if (tiles[index] === 'correct') continue;
    const character = guess[index];
    const available = character ? (remaining.get(character) ?? 0) : 0;
    if (available > 0) {
      tiles[index] = 'present';
      remaining.set(character, available - 1);
    }
  }

  return { guess, tiles, solved: tiles.every((tile) => tile === 'correct') };
}

export function buildKeyboardState(evaluations: GuessEvaluation[]): Record<string, TileState> {
  const keyboard: Record<string, TileState> = {};

  for (const evaluation of evaluations) {
    evaluation.guess.split('').forEach((character, index) => {
      const nextState = evaluation.tiles[index];
      const currentState = keyboard[character];
      if (!currentState || TILE_PRIORITY[nextState] > TILE_PRIORITY[currentState]) {
        keyboard[character] = nextState;
      }
    });
  }

  return keyboard;
}

export function getGameStatus(evaluations: GuessEvaluation[]): GameStatus {
  if (evaluations.some((evaluation) => evaluation.solved)) return 'won';
  if (evaluations.length >= MAX_ATTEMPTS) return 'lost';
  return 'playing';
}
