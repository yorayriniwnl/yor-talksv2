import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderAlertmanager } from '../ops/prometheus/render-alertmanager.mjs';

test('Alertmanager rendering escapes receiver values and rejects unresolved/insecure configuration', () => {
  const template = 'url: ${ALERTMANAGER_WEBHOOK_URL}\nusername: ${ALERTMANAGER_WEBHOOK_USER}\n';
  const source = renderAlertmanager(template, { ALERTMANAGER_WEBHOOK_URL: 'https://example.test/alerts?source=a:b', ALERTMANAGER_WEBHOOK_USER: 'operator: "one" # literal' });
  assert.match(source, /username: "operator: \\"one\\" # literal"/);
  assert.equal(source.includes('${'), false);
  for (const url of ['', 'http://example.test', 'https://user:password@example.test', '${MISSING}', 'CHANGE_ME']) {
    assert.throws(() => renderAlertmanager(template, { ALERTMANAGER_WEBHOOK_URL: url, ALERTMANAGER_WEBHOOK_USER: 'operator' }));
  }
  assert.throws(() => renderAlertmanager(template + '${UNKNOWN}', { ALERTMANAGER_WEBHOOK_URL: 'https://example.test', ALERTMANAGER_WEBHOOK_USER: 'operator' }));
  for (const character of ['\u0001', '\t', '\u0085', '\u2028', '\u2029']) {
    assert.throws(() => renderAlertmanager(template, {
      ALERTMANAGER_WEBHOOK_URL: 'https://example.test', ALERTMANAGER_WEBHOOK_USER: `first${character}second`,
    }));
  }
});
