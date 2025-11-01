/**
 * Smoke test: Verify server can start without errors
 */

import { describe, it, expect } from 'vitest';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Server Startup Smoke Test', () => {
  it('should start server without crashing', async () => {
    const serverPath = path.resolve(__dirname, '../../apps/api/src/server.js');
    const testPort = 8081; // Use different port to avoid conflicts

    const server = spawn('node', [serverPath], {
      env: {
        ...process.env,
        PORT: testPort,
        NODE_ENV: 'test',
        REDIS_URL: 'redis://localhost:6379'
      }
    });

    let output = '';
    let started = false;

    server.stdout.on('data', (data) => {
      output += data.toString();
      if (output.includes('started successfully')) {
        started = true;
      }
    });

    server.stderr.on('data', (data) => {
      output += data.toString();
    });

    // Wait for server to start or timeout
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        server.kill();
        reject(new Error('Server startup timeout'));
      }, 10000);

      const checkInterval = setInterval(() => {
        if (started) {
          clearTimeout(timeout);
          clearInterval(checkInterval);
          server.kill();
          resolve();
        }
      }, 500);
    });

    expect(started).toBe(true);
    expect(output).toContain('Cyberstreams API Server');
  }, { timeout: 15000 });
});
