import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = import.meta.dirname;
const entry = join(root, 'nowave.user.js');
const header = readFileSync(entry, 'utf8').match(/^\/\/ ==UserScript==\n(?:\/\/.*\n)*?\/\/ ==\/UserScript==\n/)[0];

await build({
  absWorkingDir: root,
  entryPoints: [entry],
  outfile: join(root, 'dist/nowave.user.js'),
  bundle: true,
  format: 'iife',
  target: 'es2022',
  charset: 'utf8',
  legalComments: 'none',
  banner: { js: header },
});
