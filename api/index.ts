// Vercel serverless entry — the Express app is served under /api/*
// via vercel.json rewrites, same origin as the static frontend.
import { createApp } from '../server/src/app.js';

const app = createApp();

export default app;
