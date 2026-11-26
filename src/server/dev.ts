import { once } from "node:events";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createServer, type ViteDevServer } from "vite";
import { createApp } from "./app.js";

export interface DevServerOptions {
  databaseUrl: string;
  port: number;
  apiPort: number;
  logLevel?: "info" | "warn" | "error" | "silent";
}

export async function startDevServer(options: DevServerOptions) {
  if (!options.databaseUrl) throw new Error("DATABASE_URL required");
  const { app, pool } = createApp(options.databaseUrl);
  const api = app.listen(options.apiPort, "127.0.0.1");
  await once(api, "listening");

  const apiAddress = api.address();
  if (!apiAddress || typeof apiAddress === "string") {
    await new Promise<void>((resolve) => api.close(() => resolve()));
    await pool.end();
    throw new Error("API server address unavailable");
  }
  const apiPort = apiAddress.port;

  let maybeVite: ViteDevServer | undefined;
  try {
    maybeVite = await createServer({
      logLevel: options.logLevel,
      server: {
        host: "127.0.0.1",
        port: options.port,
        strictPort: options.port !== 0,
        proxy: {
          "/api": {
            target: `http://127.0.0.1:${apiPort}`,
            changeOrigin: false,
          },
        },
      },
    });
    await maybeVite.listen();
  } catch (error) {
    await maybeVite?.close();
    await new Promise<void>((resolve) => api.close(() => resolve()));
    await pool.end();
    throw error;
  }

  const vite = maybeVite;
  const viteAddress = vite.httpServer?.address();
  if (!viteAddress || typeof viteAddress === "string") {
    await vite.close();
    await new Promise<void>((resolve) => api.close(() => resolve()));
    await pool.end();
    throw new Error("Vite server address unavailable");
  }
  const port = viteAddress.port;

  let closed: Promise<void> | undefined;
  const close = () => {
    closed ??= Promise.all([
      vite.close(),
      new Promise<void>((resolve, reject) =>
        api.close((err) => (err ? reject(err) : resolve())),
      ),
    ]).then(() => pool.end());
    return closed;
  };

  return { vite, api, port, apiPort, close };
}

const isEntrypoint =
  process.argv[1] !== undefined &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));

if (isEntrypoint) {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
  const dev = await startDevServer({
    databaseUrl: process.env.DATABASE_URL,
    port: Number(process.env.PORT ?? 3000),
    apiPort: Number(process.env.DEV_API_PORT ?? 3001),
  });
  dev.vite.printUrls();

  let closing = false;
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      if (closing) return;
      closing = true;
      void dev.close();
    });
  }
}
