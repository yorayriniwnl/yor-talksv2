// Operator-only access; diagnostics expose IDs/state, never notification content.
import { pool } from '@workspace/db';
import { NotificationRepository } from '../repositories/notification-repository.js';

if (!process.env.DATABASE_URL) throw new Error('Explicit approved DATABASE_URL is required');
try {
  const repository = new NotificationRepository();
  const [command = 'inspect', id, reason] = process.argv.slice(2);
  if (command === 'inspect') console.log(JSON.stringify(await repository.inspectFailedDelivery(), null, 2));
  else if (command === 'replay' && id && /^[0-9a-f-]{36}$/i.test(id) && reason) {
    await repository.replayFailedDelivery(id, reason);
    console.log('Undelivered dead notification replay recorded; previous attempts retained');
  } else throw new Error('Usage: notification-delivery.ts inspect | replay <notification-id> <machine-reason>');
} finally { await pool.end(); }
