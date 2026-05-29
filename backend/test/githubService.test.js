import assert from 'node:assert/strict';
import test from 'node:test';

import { fetchPullRequestInfo } from '../src/services/githubService.js';

function jsonResponse(body, status = 200, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    async json() {
      return body;
    }
  };
}

test('fetchPullRequestInfo fetches PR details and changed files', async () => {
  const calls = [];

  async function fakeFetch(url, options) {
    calls.push({ url, options });

    if (url === 'https://api.github.com/repos/openai/codex/pulls/123') {
      return jsonResponse({
        title: 'Add parser',
        body: 'Adds GitHub PR URL parsing.',
        user: {
          login: 'octocat'
        },
        html_url: 'https://github.com/openai/codex/pull/123'
      });
    }

    if (url === 'https://api.github.com/repos/openai/codex/pulls/123/files?per_page=100&page=1') {
      return jsonResponse([
        {
          filename: 'backend/src/utils/parsePrUrl.js',
          status: 'added',
          additions: 42,
          deletions: 0,
          changes: 42,
          patch: '@@ -0,0 +1,42 @@'
        }
      ]);
    }

    throw new Error(`Unexpected URL: ${url}`);
  }

  const result = await fetchPullRequestInfo('https://github.com/openai/codex/pull/123', {
    fetchImpl: fakeFetch,
    token: 'test-token'
  });

  assert.deepEqual(result, {
    owner: 'openai',
    repo: 'codex',
    pullNumber: 123,
    pullRequest: {
      title: 'Add parser',
      body: 'Adds GitHub PR URL parsing.',
      user: {
        login: 'octocat'
      },
      html_url: 'https://github.com/openai/codex/pull/123'
    },
    changedFiles: [
      {
        filename: 'backend/src/utils/parsePrUrl.js',
        status: 'added',
        additions: 42,
        deletions: 0,
        changes: 42,
        patch: '@@ -0,0 +1,42 @@'
      }
    ]
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].options.headers.Authorization, 'Bearer test-token');
});

test('fetchPullRequestInfo maps GitHub 404 to PR not found', async () => {
  await assert.rejects(
    () =>
      fetchPullRequestInfo('https://github.com/openai/codex/pull/404', {
        fetchImpl: async () => jsonResponse({ message: 'Not Found' }, 404)
      }),
    {
      name: 'GitHubServiceError',
      code: 'GITHUB_PR_NOT_FOUND',
      status: 404,
      message: /not found/
    }
  );
});

test('fetchPullRequestInfo maps GitHub API rate limits', async () => {
  await assert.rejects(
    () =>
      fetchPullRequestInfo('https://github.com/openai/codex/pull/123', {
        fetchImpl: async () =>
          jsonResponse(
            { message: 'API rate limit exceeded' },
            403,
            { 'x-ratelimit-remaining': '0' }
          )
      }),
    {
      name: 'GitHubServiceError',
      code: 'GITHUB_RATE_LIMITED',
      status: 429,
      message: /rate limit/
    }
  );
});

test('fetchPullRequestInfo maps network failures', async () => {
  await assert.rejects(
    () =>
      fetchPullRequestInfo('https://github.com/openai/codex/pull/123', {
        fetchImpl: async () => {
          throw new Error('Network unavailable');
        }
      }),
    {
      name: 'GitHubServiceError',
      code: 'GITHUB_REQUEST_FAILED',
      status: 502,
      message: /request failed/
    }
  );
});
