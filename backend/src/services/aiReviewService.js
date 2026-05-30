const DEFAULT_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_MODEL = 'deepseek-chat';

function createAIReviewError(code, message, status = 500, cause) {
  const error = new Error(message);
  error.name = 'AIReviewServiceError';
  error.code = code;
  error.status = status;

  if (cause) {
    error.cause = cause;
  }

  return error;
}

function buildChatCompletionsUrl(baseUrl) {
  return `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
}

function stripJsonFence(content) {
  const trimmed = content.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1].trim() : trimmed;
}

function extractJsonObject(content) {
  const text = stripJsonFence(content);

  try {
    return JSON.parse(text);
  } catch {
    // Continue with best-effort extraction below.
  }

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    return [value.trim()];
  }

  return [];
}

function buildMarkdownReport(report) {
  const risks =
    report.risks.length > 0
      ? report.risks.map((item) => `- ${typeof item === 'string' ? item : JSON.stringify(item)}`).join('\n')
      : '- 暂无明确风险。';
  const suggestions =
    report.suggestions.length > 0
      ? report.suggestions
          .map((item) => `- ${typeof item === 'string' ? item : JSON.stringify(item)}`)
          .join('\n')
      : '- 暂无 Review 建议。';
  const testSuggestions =
    report.testSuggestions.length > 0
      ? report.testSuggestions
          .map((item) => `- ${typeof item === 'string' ? item : JSON.stringify(item)}`)
          .join('\n')
      : '- 暂无测试建议。';

  return [
    '# AI PR Review 报告',
    '',
    '## 变更总结',
    report.summary || '模型未提供变更总结。',
    '',
    '## 风险等级',
    report.riskLevel || 'unknown',
    '',
    '## 风险代码',
    risks,
    '',
    '## Review 建议',
    suggestions,
    '',
    '## 测试建议',
    testSuggestions
  ].join('\n');
}

function normalizeReviewReport(value, rawContent) {
  if (!value || typeof value !== 'object') {
    return {
      summary: '模型返回了非 JSON 内容，已将原始内容放入 markdownReport。',
      riskLevel: 'unknown',
      risks: [],
      suggestions: [],
      testSuggestions: [],
      markdownReport: rawContent || ''
    };
  }

  const report = {
    summary: typeof value.summary === 'string' ? value.summary : '',
    riskLevel: typeof value.riskLevel === 'string' ? value.riskLevel : 'unknown',
    risks: normalizeArray(value.risks),
    suggestions: normalizeArray(value.suggestions),
    testSuggestions: normalizeArray(value.testSuggestions),
    markdownReport: typeof value.markdownReport === 'string' ? value.markdownReport : ''
  };

  if (!report.markdownReport) {
    report.markdownReport = buildMarkdownReport(report);
  }

  return report;
}

async function parseResponseJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function mapDeepSeekError(response, body) {
  if (response.status === 401 || response.status === 403) {
    return createAIReviewError(
      'AI_AUTH_FAILED',
      'DeepSeek authentication failed. Please check DEEPSEEK_API_KEY.',
      response.status
    );
  }

  if (response.status === 429) {
    return createAIReviewError(
      'AI_RATE_LIMITED',
      'DeepSeek API rate limit exceeded. Please retry later.',
      429
    );
  }

  const providerMessage = body?.error?.message || body?.message;
  const message = providerMessage
    ? `DeepSeek request failed: ${providerMessage}`
    : 'DeepSeek request failed. Please retry later.';

  return createAIReviewError('AI_REQUEST_FAILED', message, response.status || 502);
}

export async function generateReviewReport(prompt, options = {}) {
  const apiKey = options.apiKey ?? process.env.DEEPSEEK_API_KEY;
  const baseUrl =
    (options.baseUrl ?? process.env.DEEPSEEK_BASE_URL ?? '').trim() || DEFAULT_BASE_URL;
  const model = (options.model ?? process.env.DEEPSEEK_MODEL ?? '').trim() || DEFAULT_MODEL;
  const fetchImpl = options.fetchImpl || globalThis.fetch;

  if (!apiKey?.trim()) {
    throw createAIReviewError(
      'AI_CONFIG_MISSING',
      'DeepSeek API key is not configured. Please set DEEPSEEK_API_KEY.',
      500
    );
  }

  if (typeof fetchImpl !== 'function') {
    throw createAIReviewError('AI_REQUEST_FAILED', 'Fetch API is not available.', 500);
  }

  let response;

  try {
    response = await fetchImpl(buildChatCompletionsUrl(baseUrl), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              'You are a senior code reviewer. Return JSON only with keys summary, riskLevel, risks, suggestions, testSuggestions, markdownReport.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        response_format: {
          type: 'json_object'
        }
      })
    });
  } catch (error) {
    throw createAIReviewError(
      'AI_REQUEST_FAILED',
      'DeepSeek request failed. Please retry later.',
      502,
      error
    );
  }

  const body = await parseResponseJson(response);

  if (!response.ok) {
    throw mapDeepSeekError(response, body);
  }

  const content = body?.choices?.[0]?.message?.content;

  if (typeof content !== 'string' || content.trim() === '') {
    throw createAIReviewError(
      'AI_EMPTY_RESPONSE',
      'DeepSeek returned an empty review result. Please retry later.',
      502
    );
  }

  return normalizeReviewReport(extractJsonObject(content), content);
}
