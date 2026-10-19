import { spawn } from 'node:child_process';
import path from 'node:path';

try {
  process.loadEnvFile('.env');
} catch {}

const apiServerEnv = {
  ...process.env,
  PORT: process.env.PORT || '4000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/yor_talks',
  REDIS_URL: process.env.REDIS_URL || 'redis://127.0.0.1:6380',
  JWT_SECRET: process.env.JWT_SECRET || 'change-me-access',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'change-me-refresh',
  CORS_ORIGINS: process.env.CORS_ORIGINS || 'http://localhost:5173',
};

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const rootDir = process.cwd();

const commands = [
  { command: npmCommand, args: ['run', 'dev'], env: apiServerEnv, cwd: path.resolve(rootDir, 'api-server') },
  { command: npmCommand, args: ['run', 'dev'], env: process.env, cwd: path.resolve(rootDir, 'social') },
];

const children = commands.map(({ command, args, env, cwd }) => {
  const child = spawn(command, args, { stdio: 'inherit', env, cwd, shell: true });
  child.on('exit', (code, signal) => {
    if (signal || (typeof code === 'number' && code !== 0)) {
      for (const other of children) {
        if (other !== child && !other.killed) {
          other.kill();
        }
      }
      process.exit(code ?? 1);
    }
  });
  return child;
});

const shutdown = () => {
  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);