import assert from 'node:assert/strict';
import test from 'node:test';

import { parsePrUrl } from '../src/utils/parsePrUrl.js';

test('parsePrUrl parses a valid GitHub pull request URL', () => {
  assert.deepEqual(parsePrUrl('https://github.com/openai/codex/pull/123'), {
    owner: 'openai',
    repo: 'codex',
    pullNumber: 123
  });
});

test('parsePrUrl parses a valid GitHub pull request URL with a trailing slash', () => {
  assert.deepEqual(parsePrUrl('https://github.com/example/repo-name/pull/42/'), {
    owner: 'example',
    repo: 'repo-name',
    pullNumber: 42
  });
});

test('parsePrUrl rejects an empty string', () => {
  assert.throws(() => parsePrUrl(''), {
    name: 'ParsePrUrlError',
    code: 'EMPTY_PR_URL',
    message: /cannot be empty/
  });
});

test('parsePrUrl rejects a non-GitHub URL', () => {
  assert.throws(() => parsePrUrl('https://gitlab.com/openai/codex/pull/123'), {
    name: 'ParsePrUrlError',
    code: 'NON_GITHUB_URL',
    message: /GitHub link/
  });
});

test('parsePrUrl rejects a GitHub repository URL that is not a pull request URL', () => {
  assert.throws(() => parsePrUrl('https://github.com/openai/codex'), {
    name: 'ParsePrUrlError',
    code: 'NOT_PULL_REQUEST_URL',
    message: /pull request link/
  });
});

test('parsePrUrl rejects a GitHub pull request URL with a non-numeric PR number', () => {
  assert.throws(() => parsePrUrl('https://github.com/openai/codex/pull/not-a-number'), {
    name: 'ParsePrUrlError',
    code: 'INVALID_PULL_NUMBER',
    message: /must be numeric/
  });
});
