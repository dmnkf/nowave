// The installed nowave would run alongside a bundle a dev script injects, so the scripts uninstall it for their run
// and afterwards install the last commit, extracted fresh so no earlier checkout can be in the way.
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function uninstallNowave() {
  execFileSync('ardia', ['scripts', 'uninstall', 'nowave'], { stdio: 'ignore' });
}

export function reinstallHead() {
  const head = execFileSync('git', ['-C', repo, 'rev-parse', 'HEAD']).toString().trim();
  const checkout = mkdtempSync(join(tmpdir(), 'nowave-head-'));
  const archive = execFileSync('git', ['-C', repo, 'archive', head, 'nowave.user.js', 'src'], { maxBuffer: 64 << 20 });
  execFileSync('tar', ['-x', '-C', checkout], { input: archive });
  execFileSync('ardia', ['scripts', 'install', join(checkout, 'nowave.user.js')], { stdio: 'ignore' });
  console.log(`reinstalled nowave at ${head.slice(0, 7)}`);
}
