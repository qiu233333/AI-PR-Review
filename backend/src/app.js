import cors from 'cors';
import express from 'express';

export function createApp() {
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
