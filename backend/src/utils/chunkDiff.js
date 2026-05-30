const DEFAULT_MAX_PATCH_CHARS = 8000;
const DEFAULT_MAX_TOTAL_PATCH_CHARS = 40000;

function toText(value) {
  return typeof value === 'string' ? value : '';
}

function toNumber(value) {
  return Number.isFinite(value) ? value : 0;
}

function makeTruncationNotice(originalLength, keptLength, reason) {
  return [
    '',
    `[Patch truncated: ${reason} Original length: ${originalLength} chars. Kept: ${keptLength} chars.]`
  ].join('\n');
}

function truncatePatch(patch, maxChars, reason) {
  if (patch.length <= maxChars) {
    return {
      patch,
      truncated: false
    };
  }

  let keptLength = Math.max(0, maxChars - makeTruncationNotice(patch.length, 0, reason).length);
  let finalNotice = makeTruncationNotice(patch.length, keptLength, reason);

  while (keptLength > 0 && keptLength + finalNotice.length > maxChars) {
    keptLength -= 1;
    finalNotice = makeTruncationNotice(patch.length, keptLength, reason);
  }

  if (finalNotice.length > maxChars) {
    return {
      patch: finalNotice.slice(0, maxChars),
      truncated: true
    };
  }

  return {
    patch: `${patch.slice(0, keptLength)}${finalNotice}`,
    truncated: true
  };
}

export function chunkDiff(changedFiles = [], options = {}) {
  const maxPatchChars = options.maxPatchChars ?? DEFAULT_MAX_PATCH_CHARS;
  const maxTotalPatchChars = options.maxTotalPatchChars ?? DEFAULT_MAX_TOTAL_PATCH_CHARS;
  let remainingTotalPatchChars = maxTotalPatchChars;
  let originalPatchChars = 0;
  let promptPatchChars = 0;
  const truncatedFiles = [];

  const files = changedFiles.map((file) => {
    const filename = toText(file.filename);
    const status = toText(file.status);
    const additions = toNumber(file.additions);
    const deletions = toNumber(file.deletions);
    const rawPatch = toText(file.patch);
    originalPatchChars += rawPatch.length;

    const filePatchLimit = Math.max(0, Math.min(maxPatchChars, remainingTotalPatchChars));
    const patchResult =
      filePatchLimit > 0
        ? truncatePatch(rawPatch, filePatchLimit, 'Patch exceeded the prompt length limit.')
        : {
            patch: makeTruncationNotice(
              rawPatch.length,
              0,
              'Total prompt patch budget was already exhausted.'
            ),
            truncated: rawPatch.length > 0
          };

    if (patchResult.truncated) {
      truncatedFiles.push(filename);
    }

    remainingTotalPatchChars = Math.max(0, remainingTotalPatchChars - patchResult.patch.length);
    promptPatchChars += patchResult.patch.length;

    return {
      filename,
      status,
      additions,
      deletions,
      patch: patchResult.patch
    };
  });

  return {
    files,
    stats: {
      fileCount: files.length,
      originalPatchChars,
      promptPatchChars,
      truncatedFiles
    }
  };
}
