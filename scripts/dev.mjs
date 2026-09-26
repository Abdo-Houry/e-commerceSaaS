// Runs the shared-package watchers, the API and the web app side by side, prefixing each line of output.
import { spawn } from 'node:child_process';

const tasks = [
  { name: 'shared', color: '\x1b[33m', args: ['exec', '-w', '@matjari/shared', '--', 'tsc', '-p', 'tsconfig.json', '--watch', '--preserveWatchOutput'] },
  { name: 'shared', color: '\x1b[33m', args: ['run', 'dev', '-w', '@matjari/shared'] },
  { name: 'api', color: '\x1b[36m', args: ['run', 'dev', '-w', '@matjari/api'] },
  { name: 'web', color: '\x1b[35m', args: ['run', 'dev', '-w', '@matjari/web'] },
];

const children = tasks.map(({ name, color, args }) => {
  const child = spawn('npm', args, { shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
  const prefix = `${color}[${name}]\x1b[0m `;
  const pipe = (stream, out) =>
    stream.on('data', (buf) =>
      buf
        .toString()
        .split(/\r?\n/)
        .filter((l) => l.trim() && !/Found 0 errors|Starting compilation|File change detected/.test(l))
        .forEach((l) => out.write(prefix + l + '\n')),
    );
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on('exit', (code) => {
    console.log(`${prefix}exited with code ${code}`);
    children.forEach((c) => c !== child && c.kill());
    process.exit(code ?? 0);
  });
  return child;
});

process.on('SIGINT', () => children.forEach((c) => c.kill()));
