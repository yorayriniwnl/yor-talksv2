import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';

const bundle = await build({
  entryPoints: ['social/src/lib/arcade-password-game.ts'],
  bundle: true,
  write: false,
  platform: 'browser',
  format: 'esm',
});
const game = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

test('normalizes guesses into the five-character fake password format', () => {
  assert.equal(game.normalizeGuess(' y-oray! '), 'YORAY');
  assert.equal(game.normalizeGuess('too-long'), 'TOOLO');
  assert.equal(game.normalizeGuess('123'), '');
});

test('evaluates exact, present, and absent characters without over-counting duplicates', () => {
  assert.deepEqual(game.evaluateGuess('YORAY').tiles, ['correct', 'correct', 'correct', 'correct', 'correct']);
  assert.deepEqual(game.evaluateGuess('AYYYY').tiles, ['present', 'present', 'absent', 'absent', 'correct']);
  assert.deepEqual(game.evaluateGuess('ARRAY').tiles, ['absent', 'absent', 'correct', 'correct', 'correct']);
});

test('keyboard state keeps the strongest result seen for each character', () => {
  const evaluations = [
    game.evaluateGuess('ARRAY'),
    game.evaluateGuess('AYYYY'),
  ];

  assert.deepEqual(game.buildKeyboardState(evaluations), {
    A: 'correct',
    R: 'correct',
    Y: 'correct',
  });
});

test('game status remains playable, wins on the password, and loses after six misses', () => {
  assert.equal(game.getGameStatus([]), 'playing');
  assert.equal(game.getGameStatus([game.evaluateGuess('YORAY')]), 'won');
  assert.equal(game.getGameStatus(Array.from({ length: game.MAX_ATTEMPTS }, () => game.evaluateGuess('ZZZZZ'))), 'lost');
});
