import assert from 'node:assert/strict';
import test from 'node:test';

import { buildReviewPrompt } from '../src/services/promptBuilder.js';

function createPrInfo(patch) {
  return {
    owner: 'openai',
    repo: 'codex',
    pullNumber: 123,
    pullRequest: {
      title: 'Improve parser',
      body: 'This PR improves PR URL parsing.',
      user: {
        login: 'octocat'
      },
      html_url: 'https://github.com/openai/codex/pull/123'
    },
    changedFiles: [
      {
        filename: 'backend/src/utils/parsePrUrl.js',
        status: 'modified',
        additions: 12,
        deletions: 3,
        changes: 15,
        patch
      }
    ]
  };
}

test('buildReviewPrompt creates model-ready context for ordinary diff', () => {
  const patch = '@@ -1 +1 @@\n-old\n+new';
  const result = buildReviewPrompt(createPrInfo(patch));

  assert.match(result.prompt, /Improve parser/);
  assert.match(result.prompt, /This PR improves PR URL parsing\./);
  assert.match(result.prompt, /octocat/);
  assert.match(result.prompt, /backend\/src\/utils\/parsePrUrl\.js/);
  assert.match(result.prompt, /```diff\n@@ -1 \+1 @@\n-old\n\+new\n```/);
  assert.match(result.prompt, /变更总结/);
  assert.match(result.prompt, /风险等级/);
  assert.match(result.prompt, /风险代码/);
  assert.match(result.prompt, /Review 建议/);
  assert.match(result.prompt, /测试建议/);
  assert.deepEqual(result.metadata.truncatedFiles, []);
});

test('buildReviewPrompt includes truncation metadata for overlong diff', () => {
  const longPatch = [
    '@@ -1,3 +1,100 @@',
    ...Array.from({ length: 160 }, (_, index) => `+generated line ${index}`)
  ].join('\n');
  const result = buildReviewPrompt(createPrInfo(longPatch), {
    maxPatchChars: 220
  });

  assert.match(result.prompt, /Patch truncated/);
  assert.match(result.prompt, /truncatedFiles: backend\/src\/utils\/parsePrUrl\.js/);
  assert.doesNotMatch(result.prompt, /\+generated line 159/);
  assert.deepEqual(result.metadata.truncatedFiles, ['backend/src/utils/parsePrUrl.js']);
  assert.ok(result.metadata.promptPatchChars <= 220);
});
