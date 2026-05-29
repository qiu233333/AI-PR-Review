import cors from 'cors';
import express from 'express';

import { fetchPullRequestInfo } from './services/githubService.js';

export function createApp({ githubService = { fetchPullRequestInfo } } = {}) {
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
