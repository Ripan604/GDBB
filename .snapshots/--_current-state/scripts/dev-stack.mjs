import { spawn } from 'node:child_process';
import process from 'node:process';

function run(name, command, args, color) {
  const child = spawn(command, args, {
    stdio: ['inherit', 'pipe', 'pipe'],
    env: process.env,
    shell: process.platform === 'win32',
    windowsHide: false,
  });

  const prefix = `\x1b[${color}m[${name}]\x1b[0m`;

  child.stdout?.on('data', (chunk) => {
    process.stdout.write(`${prefix} ${chunk}`);
  });

  child.stderr?.on('data', (chunk) => {
    process.stderr.write(`${prefix} ${chunk}`);
  });

  child.on('exit', (code, signal) => {
    const reason = signal ? `signal ${signal}` : `code ${code ?? 0}`;
    process.stdout.write(`${prefix} exited (${reason})\n`);
  });

  return child;
}

function stopChild(child) {
  if (!child || child.killed) return;

  if (process.platform === 'win32' && child.pid) {
    const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    killer.on('error', () => {
      try {
        child.kill('SIGTERM');
      } catch {}
    });
    return;
  }

  try {
    child.kill('SIGTERM');
  } catch {}
}

const pnpmCmd = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

const web = run('web', pnpmCmd, ['-C', 'apps/web', 'dev'], '36');
const engine = run('engine', pythonCmd, ['-m', 'uvicorn', 'app.main:app', '--reload', '--port', '8000', '--app-dir', 'apps/engine'], '35');

const shutdown = () => {
  stopChild(web);
  stopChild(engine);
  setTimeout(() => process.exit(0), 400);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

web.on('exit', () => {
  stopChild(engine);
  process.exit(0);
});

engine.on('exit', () => {
  stopChild(web);
  process.exit(0);
});
