import { spawn } from 'node:child_process';

const apiServerEnv = {
  ...process.env,
  PORT: process.env.PORT || '4000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/yor_talks',
  REDIS_URL: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  JWT_SECRET: process.env.JWT_SECRET || 'change-me-access',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'change-me-refresh',
  CORS_ORIGINS: process.env.CORS_ORIGINS || 'http://localhost:5173',
};

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const commands = [
  [npmCommand, ['run', '--prefix', 'api-server', 'dev'], apiServerEnv],
  [npmCommand, ['run', '--prefix', 'social', 'dev'], process.env],
];

const children = commands.map(([command, args, env]) => {
  const child = spawn(command, args, { stdio: 'inherit', env, shell: true });
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