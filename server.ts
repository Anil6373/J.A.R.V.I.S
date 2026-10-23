/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import http from 'http';
import dotenv from 'dotenv';
import { ApiRouter } from './server/apiRouter.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const apiRouter = new ApiRouter();

// Forward /api requests to ApiRouter
app.use(async (req, res, next) => {
  if (req.url?.startsWith('/api')) {
    const handled = await apiRouter.handleRequest(req, res);
    if (!handled) next();
  } else {
    next();
  }
});

// Serve frontend build if dist/ exists
const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`[JARVIS] Core server active at http://localhost:${port}`);
});
