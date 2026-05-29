const PR_URL_FORMAT = 'https://github.com/{owner}/{repo}/pull/{number}';

function createParseError(code, message) {
  const error = new Error(message);
  error.name = 'ParsePrUrlError';
  error.code = code;
  return error;
}

export function parsePrUrl(prUrl) {
  if (typeof prUrl !== 'string' || prUrl.trim() === '') {
    throw createParseError('EMPTY_PR_URL', `PR URL cannot be empty. Expected ${PR_URL_FORMAT}.`);
  }

  let url;

  try {
    url = new URL(prUrl.trim());
  } catch {
    throw createParseError(
      'NON_GITHUB_URL',
      `PR URL must be a GitHub link. Expected ${PR_URL_FORMAT}.`
    );
  }

  if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'github.com') {
    throw createParseError(
      'NON_GITHUB_URL',
      `PR URL must be a GitHub link. Expected ${PR_URL_FORMAT}.`
    );
  }

  const segments = url.pathname.split('/').filter(Boolean);
  const [owner, repo, resource, pullNumberText] = segments;

  if (segments.length < 4 || !owner || !repo || resource !== 'pull') {
    throw createParseError(
      'NOT_PULL_REQUEST_URL',
      `GitHub URL must be a pull request link. Expected ${PR_URL_FORMAT}.`
    );
  }

  if (segments.length > 4) {
    throw createParseError(
      'NOT_PULL_REQUEST_URL',
      `GitHub PR link must not include extra path segments. Expected ${PR_URL_FORMAT}.`
    );
  }

  if (!/^\d+$/.test(pullNumberText)) {
    throw createParseError('INVALID_PULL_NUMBER', 'GitHub PR number must be numeric.');
  }

  return {
    owner,
    repo,
    pullNumber: Number(pullNumberText)
  };
}
