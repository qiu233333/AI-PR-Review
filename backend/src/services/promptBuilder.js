import { chunkDiff } from '../utils/chunkDiff.js';

function textOrFallback(value, fallback) {
  if (typeof value === 'string' && value.trim() !== '') {
    return value.trim();
  }

  return fallback;
}

function buildFileContext(file, index) {
  return [
    `### File ${index + 1}: ${file.filename}`,
    `- status: ${file.status}`,
    `- additions: ${file.additions}`,
    `- deletions: ${file.deletions}`,
    '',
    '```diff',
    file.patch || '[No patch provided by GitHub API.]',
    '```'
  ].join('\n');
}

export function buildReviewPrompt(prInfo, options = {}) {
  const pullRequest = prInfo.pullRequest || {};
  const { files, stats } = chunkDiff(prInfo.changedFiles || [], options);
  const author = textOrFallback(pullRequest.user?.login, 'unknown');
  const title = textOrFallback(pullRequest.title, '(no title)');
  const body = textOrFallback(pullRequest.body, '(no description)');
  const htmlUrl = textOrFallback(pullRequest.html_url, '(no url)');
  const repoPath =
    prInfo.owner && prInfo.repo ? `${prInfo.owner}/${prInfo.repo}` : '(unknown repository)';
  const pullNumber = prInfo.pullNumber ? `#${prInfo.pullNumber}` : '(unknown PR number)';
  const truncatedFilesText =
    stats.truncatedFiles.length > 0 ? stats.truncatedFiles.join(', ') : 'none';

  const prompt = [
    'You are a senior code reviewer. Review the following GitHub Pull Request context.',
    'Do not invent files or changes that are not present in the context.',
    '',
    '请使用中文 Markdown 输出，并且必须包含以下部分：',
    '1. 变更总结',
    '2. 风险等级：低风险 / 中风险 / 高风险',
    '3. 风险代码',
    '4. Review 建议',
    '5. 测试建议',
    '',
    '## Pull Request',
    `- repository: ${repoPath}`,
    `- pullNumber: ${pullNumber}`,
    `- title: ${title}`,
    `- author: ${author}`,
    `- url: ${htmlUrl}`,
    '',
    '## Description',
    body,
    '',
    '## Diff Length Control',
    `- changedFiles: ${stats.fileCount}`,
    `- originalPatchChars: ${stats.originalPatchChars}`,
    `- promptPatchChars: ${stats.promptPatchChars}`,
    `- truncatedFiles: ${truncatedFilesText}`,
    '',
    '## Changed Files',
    files.map(buildFileContext).join('\n\n')
  ].join('\n');

  return {
    prompt,
    files,
    metadata: {
      repository: repoPath,
      pullNumber: prInfo.pullNumber || null,
      ...stats
    }
  };
}
