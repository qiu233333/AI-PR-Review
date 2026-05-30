import assert from 'node:assert/strict';
import test from 'node:test';

import { generateReviewReport } from '../src/services/aiReviewService.js';

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    }
  };
}

test('generateReviewReport calls DeepSeek with OpenAI-compatible chat completions payload', async () => {
  let requestUrl;
  let requestOptions;

  const result = await generateReviewReport('Review this PR context.', {
    apiKey: 'test-api-key',
    baseUrl: 'https://deepseek.example/v1/',
    model: 'deepseek-chat',
    fetchImpl: async (url, options) => {
      requestUrl = url;
      requestOptions = options;

      return jsonResponse({
        choices: [
          {
            message: {
              content: JSON.stringify({
                summary: '更新了 PR 分析流程。',
                riskLevel: 'medium',
                risks: ['需要关注错误处理。'],
                suggestions: ['补充异常路径测试。'],
                testSuggestions: ['运行后端单测。'],
                markdownReport: '# Review\n\n更新了 PR 分析流程。'
              })
            }
          }
        ]
      });
    }
  });

  const payload = JSON.parse(requestOptions.body);

  assert.equal(requestUrl, 'https://deepseek.example/v1/chat/completions');
  assert.equal(requestOptions.method, 'POST');
  assert.equal(requestOptions.headers.Authorization, 'Bearer test-api-key');
  assert.equal(payload.model, 'deepseek-chat');
  assert.equal(payload.messages[1].content, 'Review this PR context.');
  assert.deepEqual(payload.response_format, { type: 'json_object' });
  assert.deepEqual(result, {
    summary: '更新了 PR 分析流程。',
    riskLevel: 'medium',
    risks: ['需要关注错误处理。'],
    suggestions: ['补充异常路径测试。'],
    testSuggestions: ['运行后端单测。'],
    markdownReport: '# Review\n\n更新了 PR 分析流程。'
  });
});

test('generateReviewReport falls back when model output is not valid JSON', async () => {
  const result = await generateReviewReport('Review this PR context.', {
    apiKey: 'test-api-key',
    fetchImpl: async () =>
      jsonResponse({
        choices: [
          {
            message: {
              content: '# Review\n\n模型返回了 Markdown，而不是 JSON。'
            }
          }
        ]
      })
  });

  assert.equal(result.riskLevel, 'unknown');
  assert.deepEqual(result.risks, []);
  assert.deepEqual(result.suggestions, []);
  assert.deepEqual(result.testSuggestions, []);
  assert.match(result.summary, /非 JSON/);
  assert.match(result.markdownReport, /模型返回了 Markdown/);
});

test('generateReviewReport rejects missing API key before making a request', async () => {
  let called = false;

  await assert.rejects(
    () =>
      generateReviewReport('Review this PR context.', {
        apiKey: '',
        fetchImpl: async () => {
          called = true;
          return jsonResponse({});
        }
      }),
    {
      name: 'AIReviewServiceError',
      code: 'AI_CONFIG_MISSING',
      status: 500,
      message: /DEEPSEEK_API_KEY/
    }
  );

  assert.equal(called, false);
});

test('generateReviewReport maps DeepSeek authentication failures', async () => {
  await assert.rejects(
    () =>
      generateReviewReport('Review this PR context.', {
        apiKey: 'bad-token',
        fetchImpl: async () =>
          jsonResponse(
            {
              error: {
                message: 'Invalid API key'
              }
            },
            401
          )
      }),
    {
      name: 'AIReviewServiceError',
      code: 'AI_AUTH_FAILED',
      status: 401,
      message: /DEEPSEEK_API_KEY/
    }
  );
});
