import cors from 'cors';
import express from 'express';

import { generateReviewReport } from './services/aiReviewService.js';
import { fetchPullRequestInfo } from './services/githubService.js';
import { buildReviewPrompt } from './services/promptBuilder.js';
import { parsePrUrl } from './utils/parsePrUrl.js';

export function createApp({
  githubService = { fetchPullRequestInfo },
  aiReviewService = { generateReviewReport },
  promptBuilder = { buildReviewPrompt }
} = {}) {
  const app = express();
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';

  app.use(cors({ origin: corsOrigin }));
  app.use(express.json());

  app.get('/api/health', (_request, response) => {
    response.json({
      status: 'ok',
      service: 'ai-pr-review-backend',
      timestamp: new Date().toISOString()
    });
  });

  app.post('/api/review/fetch-pr', async (request, response, next) => {
    try {
      const data = await githubService.fetchPullRequestInfo(request.body?.prUrl);
      response.json({
        success: true,
        data
      });
    } catch (error) {
      if (error.name === 'ParsePrUrlError' || error.name === 'GitHubServiceError') {
        response.status(error.status || 400).json({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
        return;
      }

      next(error);
    }
  });

  app.post('/api/review/analyze', async (request, response, next) => {
    try {
      const parsedPr = parsePrUrl(request.body?.prUrl);
      const normalizedPrUrl = `https://github.com/${parsedPr.owner}/${parsedPr.repo}/pull/${parsedPr.pullNumber}`;
      const prInfo = await githubService.fetchPullRequestInfo(normalizedPrUrl);
      const { prompt } = promptBuilder.buildReviewPrompt(prInfo);
      const data = await aiReviewService.generateReviewReport(prompt);

      response.json({
        success: true,
        data
      });
    } catch (error) {
      if (
        error.name === 'ParsePrUrlError' ||
        error.name === 'GitHubServiceError' ||
        error.name === 'AIReviewServiceError'
      ) {
        response.status(error.status || 400).json({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
        return;
      }

      next(error);
    }
  });

  app.use((_request, response) => {
    response.status(404).json({
      success: false,
      error: {
        message: 'Not found'
      }
    });
  });

  app.use((error, _request, response, _next) => {
    console.error(error);
    response.status(500).json({
      success: false,
      error: {
        message: 'Internal server error'
      }
    });
  });

  return app;
}
