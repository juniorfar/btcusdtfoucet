import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { connectDB, getDBStatus } from './server/db.js';

import authRoutes from './server/routes/auth.js';
import gameRoutes from './server/routes/game.js';
import payoutRoutes from './server/routes/payout.js';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Health Endpoint
  app.get('/api/health', (_req, res) => {
    const dbStatus = getDBStatus();
    res.json({
      status: 'ok',
      service: 'BlockMatch Mining API',
      timestamp: new Date().toISOString(),
      database: dbStatus,
    });
  });

  // Mount API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/game', gameRoutes);
  app.use('/api/payout', payoutRoutes);

  // Catch-all 404 for unmatched /api routes
  app.all('/api/*', (_req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: 'API route not found',
    });
  });

  // Global Error Handler for /api routes
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.originalUrl && req.originalUrl.startsWith('/api')) {
      console.error('[API Error]', err);
      return res.status(err.status || 500).json({
        error: 'Server Error',
        message: err.message || 'An unexpected server error occurred',
      });
    }
    next(err);
  });

  // Vite Middleware / Static Asset Serving
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Vite] Initializing Vite middleware mode...');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : undefined,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) return next();
      try {
        const url = req.originalUrl;
        let template = await fs.promises.readFile(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    console.log('[Production] Serving static build from dist...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server ready on http://0.0.0.0:${PORT}`);
  });

  // Connect to MongoDB asynchronously in background after port 3000 is listening
  connectDB()
    .then((dbMessage) => console.log(`[Database] ${dbMessage}`))
    .catch((dbErr) => console.error('[Database] Connection failed:', dbErr));
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
