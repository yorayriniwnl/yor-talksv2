// Operator-only CLI: use approved database access; never prints job payloads.
import { pool } from '@workspace/db';
import { BackgroundJobRepository } from '../repositories/background-job-repository.js';

if (!process.env.DATABASE_URL) throw new Error('Explicit approved DATABASE_URL is required');
try {
  const repository = new BackgroundJobRepository();
  const [command = 'inspect', id, reason] = process.argv.slice(2);
  if (command === 'inspect') console.log(JSON.stringify(await repository.inspect(), null, 2));
  else if (command === 'replay' && id && reason) {
    await repository.replayDead(id, reason);
    console.log('Dead job replay recorded; original retry history retained');
  } else throw new Error('Usage: lifecycle-jobs.ts inspect | replay <job-id> <machine-reason>');
} finally { await pool.end(); }
