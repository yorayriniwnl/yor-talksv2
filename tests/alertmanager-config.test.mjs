import assert from 'node:assert/strict';
import test from 'node:test';
import { renderAlertmanagerConfig } from '../ops/prometheus/render-alertmanager-config.mjs';

const template=`receivers:
  - name: deployment-webhook
    webhook_configs:
      - url: {{ALERTMANAGER_WEBHOOK_URL}}
        http_config:
          basic_auth:
            username: {{ALERTMANAGER_WEBHOOK_USER}}
            password_file: /run/secrets/alertmanager_webhook_password
`;

test('Alertmanager runtime configuration safely quotes receiver values and leaves the password in its secret file',()=>{
  const rendered=renderAlertmanagerConfig(template,{
    ALERTMANAGER_WEBHOOK_URL:'https://alerts.example.test/hook?service=yor&region=ap-south-1',
    ALERTMANAGER_WEBHOOK_USER:'ops "on call"',
  });
  assert.match(rendered,/url: "https:\/\/alerts\.example\.test\/hook\?service=yor&region=ap-south-1"/);
  assert.match(rendered,/username: "ops \\"on call\\""/);
  assert.match(rendered,/password_file: \/run\/secrets\/alertmanager_webhook_password/);
  assert.doesNotMatch(rendered,/\$\{ALERTMANAGER_/);
});

test('Alertmanager rejects insecure receiver URLs and embedded credentials',()=>{
  assert.throws(()=>renderAlertmanagerConfig(template,{ALERTMANAGER_WEBHOOK_URL:'http://alerts.example.test/hook',ALERTMANAGER_WEBHOOK_USER:'ops'}),/HTTPS URL/);
  assert.throws(()=>renderAlertmanagerConfig(template,{ALERTMANAGER_WEBHOOK_URL:'https://user:password@alerts.example.test/hook',ALERTMANAGER_WEBHOOK_USER:'ops'}),/embedded credentials/);
});
