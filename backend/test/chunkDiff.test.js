import assert from 'node:assert/strict';
import test from 'node:test';

import { chunkDiff } from '../src/utils/chunkDiff.js';

test('chunkDiff keeps ordinary diff content and file metadata', () => {
  const patch = '@@ -1 +1 @@\n-console.log("old");\n+console.log("new");';
  const result = chunkDiff([
    {
      filename: 'src/app.js',
      status: 'modified',
      additions: 1,
      deletions: 1,
      changes: 2,
      patch
    }
  ]);

  assert.deepEqual(result.files, [
    {
      filename: 'src/app.js',
      status: 'modified',
      additions: 1,
      deletions: 1,
      patch
    }
  ]);
  assert.equal(result.stats.fileCount, 1);
  assert.equal(result.stats.originalPatchChars, patch.length);
  assert.equal(result.stats.promptPatchChars, patch.length);
  assert.deepEqual(result.stats.truncatedFiles, []);
});

test('chunkDiff truncates an overlong patch', () => {
  const longPatch = [
    '@@ -1,3 +1,100 @@',
    ...Array.from({ length: 120 }, (_, index) => `+line ${index}`)
  ].join('\n');
  const result = chunkDiff(
    [
      {
        filename: 'src/large.js',
        status: 'modified',
        additions: 120,
        deletions: 0,
        patch: longPatch
      }
    ],
    {
      maxPatchChars: 180
    }
  );

  assert.equal(result.files.length, 1);
  assert.ok(result.files[0].patch.length <= 180);
  assert.match(result.files[0].patch, /Patch truncated/);
  assert.doesNotMatch(result.files[0].patch, /\+line 119/);
  assert.deepEqual(result.stats.truncatedFiles, ['src/large.js']);
  assert.equal(result.stats.originalPatchChars, longPatch.length);
});
