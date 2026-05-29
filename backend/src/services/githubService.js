import { parsePrUrl } from '../utils/parsePrUrl.js';

const GITHUB_API_BASE_URL = 'https://api.github.com';
const API_VERSION = '2022-11-28';
const FILES_PER_PAGE = 100;

function createGitHubError(code, message, status, cause) {
  const error = new Error(message);
  error.name = 'GitHubServiceError';
  error.code = code;
  error.status = status;

  if (cause) {
    error.cause = cause;
  }

  return error;
}

function getHeader(response, headerName) {
  if (!response.headers || typeof response.headers.get !== 'function') {
    return null;
  }

  return response.headers.get(headerName);
}

function buildHeaders(token) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'ai-pr-review',
    'X-GitHub-Api-Version': API_VERSION
  };

  if (token?.trim()) {
    headers.Authorization = `Bearer ${token.trim()}`;
  }

  return headers;
}

async function parseJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isRateLimitResponse(response, body) {
  const remaining = getHeader(response, 'x-ratelimit-remaining');
  const message = body?.message || '';

  return (
    (response.status === 403 || response.status === 429) &&
    (remaining === '0' || /rate limit/i.test(message))
  );
}

async function requestGitHub(url, { fetchImpl, headers }) {
  let response;

  try {
    response = await fetchImpl(url, { headers });
  } catch (error) {
    throw createGitHubError('GITHUB_REQUEST_FAILED', 'GitHub request failed.', 502, error);
  }

  const body = await parseJson(response);

  if (response.status === 404) {
    throw createGitHubError('GITHUB_PR_NOT_FOUND', 'GitHub pull request was not found.', 404);
  }

  if (isRateLimitResponse(response, body)) {
    throw createGitHubError(
      'GITHUB_RATE_LIMITED',
      'GitHub API rate limit exceeded. Set GITHUB_TOKEN or retry later.',
      429
    );
  }

  if (!response.ok) {
    const message = body?.message ? `GitHub request failed: ${body.message}` : 'GitHub request failed.';
    throw createGitHubError('GITHUB_REQUEST_FAILED', message, response.status || 502);
  }

  return body;
}

function mapPullRequest(pullRequest) {
  return {
    title: pullRequest.title,
    body: pullRequest.body,
    user: {
      login: pullRequest.user?.login || null
    },
    html_url: pullRequest.html_url
  };
}

function mapChangedFile(file) {
  return {
    filename: file.filename,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    changes: file.changes,
    patch: file.patch || ''
  };
}

export async function fetchPullRequestInfo(prUrl, options = {}) {
  const { owner, repo, pullNumber } = parsePrUrl(prUrl);
  const fetchImpl = options.fetchImpl || globalThis.fetch;

  if (typeof fetchImpl !== 'function') {
    throw createGitHubError('GITHUB_REQUEST_FAILED', 'Fetch API is not available.', 500);
  }

  const token = options.token ?? process.env.GITHUB_TOKEN;
  const apiBaseUrl = options.apiBaseUrl || GITHUB_API_BASE_URL;
  const headers = buildHeaders(token);
  const repoPath = `${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const pullPath = `${apiBaseUrl}/repos/${repoPath}/pulls/${pullNumber}`;

  const pullRequest = await requestGitHub(pullPath, { fetchImpl, headers });
  const changedFiles = [];
  let page = 1;

  while (true) {
    const filesUrl = `${pullPath}/files?per_page=${FILES_PER_PAGE}&page=${page}`;
    const filesPage = await requestGitHub(filesUrl, { fetchImpl, headers });

    changedFiles.push(...filesPage.map(mapChangedFile));

    if (filesPage.length < FILES_PER_PAGE) {
      break;
    }

    page += 1;
  }

  return {
    owner,
    repo,
    pullNumber,
    pullRequest: mapPullRequest(pullRequest),
    changedFiles
  };
}
