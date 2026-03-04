import net from 'node:net';
import { spawn } from 'node:child_process';

const START_PORT = Number(process.env.GDBB_PORT_START ?? 3000);
const END_PORT = Number(process.env.GDBB_PORT_END ?? 3100);

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port);
  });
}

async function findOpenPort() {
  for (let port = START_PORT; port <= END_PORT; port += 1) {
    // eslint-disable-next-line no-await-in-loop
    const isOpen = await checkPort(port);
    if (isOpen) {
      return port;
    }
  }
  throw new Error(`No free port found between ${START_PORT} and ${END_PORT}.`);
}

async function main() {
  const port = await findOpenPort();
  process.stdout.write(`Starting Next.js dev server on port ${port}\n`);

  const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  const child = spawn(command, ['exec', 'next', 'dev', '-p', String(port)], {
    stdio: 'inherit',
    cwd: process.cwd(),
    shell: process.platform === 'win32',
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'Unknown error'}\n`);
  process.exit(1);
});
