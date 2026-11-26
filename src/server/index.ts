import { createApp } from './app.js';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required');
const { app, pool } = createApp(process.env.DATABASE_URL);
const server = app.listen(Number(process.env.PORT ?? 3000), '127.0.0.1', () => console.log('Arda (Arah Dana): http://127.0.0.1:' + (process.env.PORT ?? 3000)));
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => server.close(() => { void pool.end(); }));
