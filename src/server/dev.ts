import { createServer } from "vite";
import { createApp } from "./app.js";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");

const port = Number(process.env.PORT ?? 3002);
const apiPort = Number(process.env.DEV_API_PORT ?? 3001);
const { app, pool } = createApp(process.env.DATABASE_URL);
const api = app.listen(apiPort, "127.0.0.1");
const vite = await createServer({
  server: {
    host: "127.0.0.1",
    port,
    strictPort: true,
    proxy: { "/api": `http://127.0.0.1:${apiPort}` },
  },
});
await vite.listen();
vite.printUrls();

let closing = false;
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => {
  if (closing) return;
  closing = true;
  api.close(() => void pool.end());
  void vite.close();
});
