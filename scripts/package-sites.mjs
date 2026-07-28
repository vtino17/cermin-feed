import { cpSync, mkdirSync, rmSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist/server', { recursive: true });
mkdirSync('dist/.openai', { recursive: true });
cpSync('apps/dashboard/dist', 'dist/client', { recursive: true });
cpSync('deploy/sites-worker.js', 'dist/server/index.js');
cpSync('.openai/hosting.json', 'dist/.openai/hosting.json');
