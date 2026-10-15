import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('trusted outer ZIP unpacker rejects adversarial archives before writing', t => {
  try { execFileSync('python3', ['--version'], { stdio: 'pipe', timeout: 5000 }); }
  catch (error) {
    if (process.platform === 'win32' && !process.env.CI) { t.skip('Python is unavailable locally; Ubuntu CI must exercise outer ZIP tests'); return; }
    throw error;
  }
  execFileSync('python3', [fileURLToPath(new URL('./test_editorial_artifact.py', import.meta.url)), '-v'], { stdio: 'pipe', timeout: 15000 });
});
