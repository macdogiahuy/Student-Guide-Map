import { createApp } from './app.js';
import { config } from './config/unifiedConfig.js';
import { prisma } from './lib/prisma.js';

const app = createApp();

const server = app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`[server] API listening on http://localhost:${config.port}/api/v1 (${config.env})`);
});

async function shutdown(signal: string) {
  // eslint-disable-next-line no-console
  console.log(`[server] ${signal} received, shutting down…`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
