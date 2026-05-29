import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';

import { createApp } from '../src/app.js';

function listen(app) {
  const server = http.createServer(app);

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function postJson(server, path, body) {
  const { port } = server.address();
  const payload = JSON.stringify(body);

  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      },
      (response) => {
        let responseBody = '';

        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          responseBody += chunk;
        });
        response.on('end', () => {
          resolve({
            status: response.statusCode,
            body: JSON.parse(responseBody)
          });
        });
      }
    );

    request.on('error', reject);
    request.end(payload);
  });
}

test('POST /api/review/fetch-pr returns fetched PR data', async () => {
  const server = await listen(
    createApp({
      githubService: {
        async fetchPullRequestInfo(prUrl) {
          assert.equal(prUrl, 'https://github.com/openai/codex/pull/123');
          return {
            owner: 'openai',
            repo: 'codex',
            pullNumber: 123,
            pullRequest: {
              title: 'Add parser',
              body: 'Test body',
              user: {
                login: 'octocat'
              },
              html_url: 'https://github.com/openai/codex/pull/123'
            },
            changedFiles: []
          };
        }
      }
    })
  );

  try {
    const response = await postJson(server, '/api/review/fetch-pr', {
      prUrl: 'https://github.com/openai/codex/pull/123'
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.pullRequest.title, 'Add parser');
  } finally {
    await close(server);
  }
});

test('POST /api/review/fetch-pr returns clear parse errors', async () => {
  const server = await listen(createApp());

  try {
    const response = await postJson(server, '/api/review/fetch-pr', {
      prUrl: ''
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, 'EMPTY_PR_URL');
    assert.match(response.body.error.message, /cannot be empty/);
  } finally {
    await close(server);
  }
});
