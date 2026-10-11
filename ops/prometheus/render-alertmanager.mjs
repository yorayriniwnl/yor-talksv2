import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const forbiddenScalarCharacters = /[\x00-\x1f\x7f\x85\u2028\u2029]/;

export function renderAlertmanager(template, environment) {
  const rawUrl = environment.ALERTMANAGER_WEBHOOK_URL?.trim();
  const username = environment.ALERTMANAGER_WEBHOOK_USER?.trim();
  if (!rawUrl || !username || forbiddenScalarCharacters.test(rawUrl + username) || /\$\{|CHANGE_ME/i.test(rawUrl + username)) {
    throw new Error('Alertmanager receiver values are missing or unresolved');
  }
  let url;
  try { url = new URL(rawUrl); } catch { throw new Error('Invalid Alertmanager receiver URL'); }
  const localTest = environment.ALERTMANAGER_ALLOW_LOCAL_RECEIVER === 'true'
    && ['127.0.0.1', 'localhost', 'receiver'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(localTest && url.protocol === 'http:'))
    || url.username || url.password || url.hash) {
    throw new Error('Alertmanager receiver requires HTTPS and file-backed credentials');
  }
  const rendered = template
    .replaceAll('${ALERTMANAGER_WEBHOOK_URL}', JSON.stringify(url.href))
    .replaceAll('${ALERTMANAGER_WEBHOOK_USER}', JSON.stringify(username));
  if (/\$\{[^}]*\}/.test(rendered)) throw new Error('Unresolved Alertmanager configuration value');
  return rendered;
}

export function writeAlertmanagerConfig(templatePath, target, environment = process.env) {
  const passwordFile = environment.ALERTMANAGER_PASSWORD_FILE || '/run/secrets/alertmanager_webhook_password';
  const password = fs.readFileSync(passwordFile, 'utf8').trim();
  if (!password || forbiddenScalarCharacters.test(password) || /CHANGE_ME|\$\{/i.test(password)) {
    throw new Error('Alertmanager password file is empty, multiline, or unresolved');
  }
  const rendered = renderAlertmanager(fs.readFileSync(templatePath, 'utf8'), environment);
  fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
  const temporary = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, rendered, { mode: 0o600, flag: 'wx' });
  fs.renameSync(temporary, target);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    writeAlertmanagerConfig(process.argv[2] || '/etc/alertmanager/template.yml', process.argv[3] || '/tmp/yor-alertmanager/alertmanager.yml');
    console.log('Alertmanager configuration rendered');
  } catch {
    // Paths and provider values may carry secrets; never dump the configuration.
    console.error('Alertmanager configuration rejected: check receiver values and mounted password file');
    process.exitCode = 1;
  }
}
