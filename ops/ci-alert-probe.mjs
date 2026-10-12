const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const startsAt = new Date(Date.now() - 1000).toISOString();
const alert = { labels: { alertname: 'YorSyntheticDeliveryRehearsal', severity: 'test', rehearsal: String(Date.now()) },
  annotations: { summary: 'Internal synthetic alert delivery and resolution rehearsal' }, startsAt };
async function send(endsAt) {
  const response = await fetch('http://alertmanager:9093/api/v2/alerts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify([{ ...alert, endsAt }]) });
  if (!response.ok) throw new Error('Pinned Alertmanager rejected synthetic alert');
}
async function waitFor(state) {
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    const response = await fetch('http://127.0.0.1:9099/state');
    const report = await response.json();
    if (report.rejected !== 0) throw new Error('Synthetic webhook authentication failed');
    if (report[state] > 0) return;
    await delay(250);
  }
  throw new Error(`Synthetic ${state} alert was not delivered`);
}
await send(new Date(Date.now() + 120000).toISOString());
await waitFor('firing');
await send(new Date(Date.now() - 1).toISOString());
await waitFor('resolved');
console.log('[reliability] Pinned Alertmanager delivered authenticated firing and resolved alerts to the isolated receiver');
