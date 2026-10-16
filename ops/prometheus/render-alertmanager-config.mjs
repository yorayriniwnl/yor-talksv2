import { chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export function renderAlertmanagerConfig(template, environment) {
  const receiver = new URL(environment.ALERTMANAGER_WEBHOOK_URL ?? '');
  if (receiver.protocol !== 'https:' || receiver.username || receiver.password || !receiver.hostname) {
    throw new Error('ALERTMANAGER_WEBHOOK_URL must be an HTTPS URL without embedded credentials');
  }
  const username = environment.ALERTMANAGER_WEBHOOK_USER ?? '';
  if (!username.trim() || /[\r\n]/.test(username)) throw new Error('ALERTMANAGER_WEBHOOK_USER must be a non-empty single line');
  const replacements = {
    '{{ALERTMANAGER_WEBHOOK_URL}}': JSON.stringify(receiver.toString()),
    '{{ALERTMANAGER_WEBHOOK_USER}}': JSON.stringify(username),
  };
  let rendered = template;
  for (const [placeholder, value] of Object.entries(replacements)) {
    if (!rendered.includes(placeholder)) throw new Error(`Alertmanager template is missing ${placeholder}`);
    rendered = rendered.replaceAll(placeholder, value);
  }
  if (rendered.includes('{{ALERTMANAGER_')) throw new Error('Alertmanager template contains an unknown placeholder');
  return rendered;
}

async function main() {
  const templatePath = process.env.ALERTMANAGER_TEMPLATE_FILE ?? '/templates/alertmanager.yml';
  const outputPath = process.env.ALERTMANAGER_OUTPUT_FILE ?? '/rendered/alertmanager.yml';
  const rendered = renderAlertmanagerConfig(await readFile(templatePath,'utf8'),process.env);
  await mkdir(path.dirname(outputPath),{recursive:true});
  const temporaryPath = `${outputPath}.${process.pid}.tmp`;
  await writeFile(temporaryPath,rendered,{encoding:'utf8',mode:0o644});
  await chmod(temporaryPath,0o644);
  await rename(temporaryPath,outputPath);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => {
    process.stderr.write(`[alertmanager-config] ${error instanceof Error ? error.message : 'configuration failed'}\n`);
    process.exitCode = 1;
  });
}
