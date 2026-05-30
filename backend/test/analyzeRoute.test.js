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

test('POST /api/review/analyze fetches PR info, builds prompt, and returns review report', async () => {
  const prInfo = {
    owner: 'openai',
    repo: 'codex',
    pullNumber: 123,
    pullRequest: {
      title: 'Add AI review',
      body: 'Test body',
      user: {
        login: 'octocat'
      },
      html_url: 'https://github.com/openai/codex/pull/123'
    },
    changedFiles: []
  };
  const review = {
    summary: '新增 AI Review 服务。',
    riskLevel: 'low',
    risks: [],
    suggestions: ['保持测试覆盖。'],
    testSuggestions: ['运行 npm test。'],
    markdownReport: '# AI PR Review 报告'
  };

  const server = await listen(
    createApp({
      githubService: {
        async fetchPullRequestInfo(prUrl) {
          assert.equal(prUrl, 'https://github.com/openai/codex/pull/123');
          return prInfo;
        }
      },
      promptBuilder: {
        buildReviewPrompt(input) {
          assert.equal(input, prInfo);
          return {
            prompt: 'PROMPT_CONTEXT'
          };
        }
      },
      aiReviewService: {
        async generateReviewReport(prompt) {
          assert.equal(prompt, 'PROMPT_CONTEXT');
          return review;
        }
      }
    })
  );

  try {
    const response = await postJson(server, '/api/review/analyze', {
      prUrl: 'https://github.com/openai/codex/pull/123/'
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.deepEqual(response.body.data, review);
  } finally {
    await close(server);
  }
});

test('POST /api/review/analyze returns clear PR URL errors', async () => {
  const server = await listen(createApp());

  try {
    const response = await postJson(server, '/api/review/analyze', {
      prUrl: 'https://github.com/openai/codex'
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, 'NOT_PULL_REQUEST_URL');
    assert.match(response.body.error.message, /pull request link/);
  } finally {
    await close(server);
  }
});

test('POST /api/review/analyze returns friendly AI service errors', async () => {
  const error = new Error('DeepSeek API key is not configured. Please set DEEPSEEK_API_KEY.');
  error.name = 'AIReviewServiceError';
  error.code = 'AI_CONFIG_MISSING';
  error.status = 500;

  const server = await listen(
    createApp({
      githubService: {
        async fetchPullRequestInfo() {
          return {
            owner: 'openai',
            repo: 'codex',
            pullNumber: 123,
            pullRequest: {
              title: 'Add AI review',
              body: '',
              user: {
                login: 'octocat'
              },
              html_url: 'https://github.com/openai/codex/pull/123'
            },
            changedFiles: []
          };
        }
      },
      promptBuilder: {
        buildReviewPrompt() {
          return {
            prompt: 'PROMPT_CONTEXT'
          };
        }
      },
      aiReviewService: {
        async generateReviewReport() {
          throw error;
        }
      }
    })
  );

  try {
    const response = await postJson(server, '/api/review/analyze', {
      prUrl: 'https://github.com/openai/codex/pull/123'
    });

    assert.equal(response.status, 500);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, 'AI_CONFIG_MISSING');
    assert.match(response.body.error.message, /DEEPSEEK_API_KEY/);
  } finally {
    await close(server);
  }
});
