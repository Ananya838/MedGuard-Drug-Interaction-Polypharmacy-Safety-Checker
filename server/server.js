import { app } from './app.js';
import { config, closePool } from './config.js';

const PORT = config.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`MedGuard API server running on port ${PORT} [env: ${config.NODE_ENV}]`);
});

async function shutdown(signal) {
  console.log(`Received ${signal}. Shutting down MedGuard API server gracefully...`);
  server.close(async () => {
    await closePool();
    console.log('Database connections closed. Process terminating.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default server;

