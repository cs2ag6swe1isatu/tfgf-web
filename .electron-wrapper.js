#!/usr/bin/env node
// Wrapper to launch electron-forge with --no-sandbox when running as root
const { spawn } = require('child_process');
const args = ['node_modules/.bin/electron-forge', 'start'];

// Add --no-sandbox if running as root
if (process.getuid && process.getuid() === 0) {
  args.push('--no-sandbox');
}

const child = spawn('node', args, { stdio: 'inherit' });
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
child.on('exit', (code) => process.exit(code));
