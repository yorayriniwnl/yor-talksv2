import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  Delete,
  Gamepad2,
  KeyRound,
  LockKeyhole,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Terminal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  buildKeyboardState,
  evaluateGuess,
  FAKE_PASSWORD,
  getGameStatus,
  MAX_ATTEMPTS,
  normalizeGuess,
  PASSWORD_LENGTH,
  type GuessEvaluation,
} from '@/lib/arcade-password-game';
import '@/styles/arcade.css';

const KEYBOARD_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

type Feedback = {
  tone: 'neutral' | 'success' | 'error';
  text: string;
};

const DEFAULT_FEEDBACK: Feedback = {
  tone: 'neutral',
  text: 'Type five letters. The firewall is waiting to be impressed.',
};

export default function Arcade() {
  const [evaluations, setEvaluations] = useState<GuessEvaluation[]>([]);
  const [draft, setDraft] = useState('');
  const [feedback, setFeedback] = useState<Feedback>(DEFAULT_FEEDBACK);
  const status = getGameStatus(evaluations);
  const keyboardState = useMemo(() => buildKeyboardState(evaluations), [evaluations]);
  const attemptsRemaining = MAX_ATTEMPTS - evaluations.length;

  const submitGuess = () => {
    if (status !== 'playing') return;

    if (draft.length !== PASSWORD_LENGTH) {
      setFeedback({
        tone: 'error',
        text: `The fake firewall needs exactly ${PASSWORD_LENGTH} letters. No shortcuts.`,
      });
      return;
    }

    const evaluation = evaluateGuess(draft);
    const attemptNumber = evaluations.length + 1;
    setEvaluations((current) => [...current, evaluation]);
    setDraft('');

    if (evaluation.solved) {
      setFeedback({ tone: 'success', text: 'Access granted. The firewall has been emotionally compromised.' });
    } else if (attemptNumber === MAX_ATTEMPTS) {
      setFeedback({ tone: 'error', text: 'Access denied. Good news: none of this was real anyway.' });
    } else {
      setFeedback({ tone: 'neutral', text: `${MAX_ATTEMPTS - attemptNumber} attempt${MAX_ATTEMPTS - attemptNumber === 1 ? '' : 's'} left. Keep poking the simulation.` });
    }
  };

  const resetGame = () => {
    setEvaluations([]);
    setDraft('');
    setFeedback(DEFAULT_FEEDBACK);
  };

  const handleVirtualKey = (key: string) => {
    if (status !== 'playing') return;
    if (key === 'BACKSPACE') {
      setDraft((current) => current.slice(0, -1));
      return;
    }
    if (key === 'ENTER') {
      submitGuess();
      return;
    }
    setDraft((current) => current.length < PASSWORD_LENGTH ? `${current}${key}` : current);
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (status !== 'playing') return;
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') && target.id !== 'fake-password-input') {
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        setDraft((current) => current.slice(0, -1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        submitGuess();
      } else if (/^[a-zA-Z]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setDraft((current) => current.length < PASSWORD_LENGTH ? `${current}${e.key.toUpperCase()}` : current);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [status, draft, evaluations]);

  return (
    <div className="arcade-page min-h-screen pb-24 font-sans">
      <header className="arcade-topbar">
        <div className="arcade-topbar__brand">
          <div className="arcade-topbar__mark" aria-hidden="true"><Gamepad2 /></div>
          <div>
            <p>YOR / ARCADE</p>
            <h1>Cyber Arcade</h1>
          </div>
        </div>
        <div className="arcade-topbar__status" aria-live="polite">
          <span className="arcade-live-pill"><i /> {status === 'playing' ? 'SIMULATION LIVE' : status === 'won' ? 'ACCESS GRANTED' : 'ACCESS DENIED'}</span>
          <span className="arcade-topbar__attempts">{evaluations.length}/{MAX_ATTEMPTS} attempts</span>
        </div>
      </header>

      <div className="arcade-page__content">
        <section className="arcade-intro" aria-labelledby="arcade-title">
          <div className="arcade-intro__copy">
            <p className="arcade-kicker"><span /> Puzzle 001 / Access control</p>
            <h2 id="arcade-title">Enter your<br /><em>password to proceed.</em></h2>
            <p className="arcade-intro__description">A tiny fake security checkpoint for people who enjoy pressing buttons until something gives up.</p>
            <div className="arcade-intro__meta" aria-label="Game properties">
              <div><span>MODE</span><strong>LOCAL / FAKE</strong></div>
              <div><span>OBJECTIVE</span><strong>BREAK THE LOOP</strong></div>
              <div><span>RISK LEVEL</span><strong>EMOTIONAL</strong></div>
            </div>
          </div>

          <div className="arcade-console" aria-label="Fake terminal status">
            <div className="arcade-console__chrome">
              <span><i /> <i /> <i /></span>
              <small>yor-secure-shell</small>
              <span className="arcade-console__lock"><LockKeyhole /> fake mode</span>
            </div>
            <div className="arcade-console__body">
              <div className="arcade-console__heading"><Terminal /><span>handshake_log</span><small>09:59:∞</small></div>
              <p><b>›</b> initializing absolutely nothing...</p>
              <p><b>›</b> locating suspiciously fun human <span className="arcade-console__ok">OK</span></p>
              <p><b>›</b> real credentials required <span className="arcade-console__skip">SKIP</span></p>
              <div className="arcade-console__cursor"><b>›</b><span>waiting for input</span><i /></div>
            </div>
          </div>
        </section>

        <section className="arcade-game operator-panel" aria-labelledby="arcade-game-title">
          <div className="arcade-game__heading">
            <div>
              <p className="arcade-kicker"><span /> The designer&apos;s challenge</p>
              <h2 id="arcade-game-title">Make the fake firewall sweat.</h2>
              <p>Green means perfect. Amber means close enough to make the firewall nervous. Red means absolutely not.</p>
            </div>
            <div className="arcade-attempts" aria-label={`${attemptsRemaining} attempts remaining`}>
              <span>ATTEMPTS</span>
              <strong>{String(evaluations.length).padStart(2, '0')}<small>/{String(MAX_ATTEMPTS).padStart(2, '0')}</small></strong>
              <em>{attemptsRemaining === 0 ? 'final signal' : `${attemptsRemaining} remaining`}</em>
            </div>
          </div>

          <div className="arcade-game__body">
            <div className="arcade-board-column">
              <div className="arcade-board" role="grid" aria-label="Fake password attempts">
                {Array.from({ length: MAX_ATTEMPTS }).map((_, rowIndex) => {
                  const evaluation = evaluations[rowIndex];
                  const isActive = !evaluation && rowIndex === evaluations.length && status === 'playing';
                  return (
                    <motion.div
                      key={`row-${rowIndex}`}
                      role="row"
                      aria-label={evaluation ? `Attempt ${rowIndex + 1}: ${evaluation.guess}` : isActive ? `Attempt ${rowIndex + 1}: current input` : `Attempt ${rowIndex + 1}: empty`}
                      className={cn('arcade-board__row', isActive && 'is-active')}
                      initial={evaluation ? { opacity: 0, x: -12 } : undefined}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.28, delay: evaluation ? rowIndex * 0.035 : 0 }}
                    >
                      {Array.from({ length: PASSWORD_LENGTH }).map((__, tileIndex) => {
                        const character = evaluation?.guess[tileIndex] ?? (isActive ? draft[tileIndex] ?? '' : '');
                        const tileState = evaluation?.tiles[tileIndex];
                        return (
                          <div
                            key={`tile-${rowIndex}-${tileIndex}`}
                            role="gridcell"
                            aria-label={character ? `${character}${tileState ? `, ${tileState}` : ''}` : 'Empty'}
                            className={cn('arcade-tile', tileState && `arcade-tile--${tileState}`, isActive && 'is-current')}
                          >
                            {character || (isActive && tileIndex === draft.length ? <span className="arcade-tile__caret" aria-hidden="true" /> : null)}
                          </div>
                        );
                      })}
                    </motion.div>
                  );
                })}
              </div>

              <form
                className="arcade-entry"
                onSubmit={(event: FormEvent<HTMLFormElement>) => {
                  event.preventDefault();
                  submitGuess();
                }}
              >
                <label htmlFor="fake-password-input">Your fake password</label>
                <div className="arcade-entry__control">
                  <span aria-hidden="true">&gt;</span>
                  <input
                    id="fake-password-input"
                    type="text"
                    value={draft}
                    onChange={(event) => setDraft(normalizeGuess(event.target.value))}
                    maxLength={PASSWORD_LENGTH}
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    enterKeyHint="go"
                    placeholder="TYPE CODE"
                    aria-describedby="fake-password-feedback"
                    disabled={status !== 'playing'}
                  />
                  <span className="arcade-entry__count" aria-hidden="true">{draft.length}/{PASSWORD_LENGTH}</span>
                  <Button type="submit" size="sm" disabled={status !== 'playing'}>
                    Submit <ArrowRight />
                  </Button>
                </div>
                <p id="fake-password-feedback" className="arcade-feedback" data-tone={feedback.tone} role="status" aria-live="polite">
                  {feedback.tone === 'success' ? <Check /> : feedback.tone === 'error' ? <LockKeyhole /> : <Sparkles />}
                  <span>{feedback.text}</span>
                </p>
              </form>
            </div>

            <aside className="arcade-guide" aria-label="Game instructions">
              <div className="arcade-guide__heading"><KeyRound /><span>Signal rules</span></div>
              <p>Crack the five-letter fake password before the simulation runs out of patience.</p>
              <div className="arcade-legend">
                <div><span className="arcade-legend__swatch is-correct">Y</span><span><strong>Correct</strong><small>Right character, right place.</small></span></div>
                <div><span className="arcade-legend__swatch is-present">O</span><span><strong>Present</strong><small>Right character, wrong place.</small></span></div>
                <div><span className="arcade-legend__swatch is-absent">X</span><span><strong>Absent</strong><small>The firewall has no idea.</small></span></div>
              </div>
              <div className="arcade-hint"><span>HINT 001</span><p>It&apos;s in the brand. Obviously.</p></div>
            </aside>
          </div>

          <div className="arcade-keyboard" aria-label="On-screen keyboard">
            {KEYBOARD_ROWS.map((row, rowIndex) => (
              <div className="arcade-keyboard__row" key={row}>
                {rowIndex === 2 && (
                  <button type="button" className="arcade-key arcade-key--wide" onClick={() => handleVirtualKey('ENTER')} disabled={status !== 'playing'} aria-label="Submit guess">
                    <ArrowRight /> <span>Enter</span>
                  </button>
                )}
                {row.split('').map((character) => {
                  const state = keyboardState[character];
                  return (
                    <button
                      type="button"
                      key={character}
                      className={cn('arcade-key', state && `arcade-key--${state}`)}
                      onClick={() => handleVirtualKey(character)}
                      disabled={status !== 'playing'}
                      aria-label={`Enter ${character}`}
                    >
                      {character}
                    </button>
                  );
                })}
                {rowIndex === 2 && (
                  <button type="button" className="arcade-key arcade-key--wide" onClick={() => handleVirtualKey('BACKSPACE')} disabled={status !== 'playing'} aria-label="Delete last character">
                    <Delete /> <span>Delete</span>
                  </button>
                )}
              </div>
            ))}
          </div>

          <AnimatePresence initial={false}>
            {status !== 'playing' && (
              <motion.div
                className="arcade-result"
                data-status={status}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                role="alert"
              >
                <div className="arcade-result__icon">{status === 'won' ? <ShieldCheck /> : <LockKeyhole />}</div>
                <div>
                  <span>{status === 'won' ? 'FAKE ACCESS GRANTED' : 'FAKE ACCESS DENIED'}</span>
                  <h3>{status === 'won' ? 'You are officially inside nothing.' : 'The simulation wins this round.'}</h3>
                  <p>The fake password was <code>{FAKE_PASSWORD}</code>. Keep it secret from the imaginary hackers.</p>
                </div>
                <Button type="button" variant="outline" onClick={resetGame}><RefreshCcw /> Run it back</Button>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <footer className="arcade-footer">
          <span><i /> No credentials were harmed in the making of this game.</span>
          <span>YOR / LOCAL SIMULATION / 001</span>
        </footer>
      </div>
    </div>
  );
}
