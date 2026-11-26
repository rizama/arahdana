import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startDevServer } from "../../src/server/dev.js";

const url = process.env.TEST_DATABASE_URL;
if (
  !url ||
  new URL(url).pathname !== "/menghitung_mimpi_test" ||
  url === process.env.DATABASE_URL
) {
  throw new Error("Separate test database required");
}

const payload = {
  expense: 5000000,
  married: true,
  dependents: 2,
  years: 2,
  initial: 12000000,
  payment: 1000000,
  rate: 5,
  dream_name: "",
};

let dev: Awaited<ReturnType<typeof startDevServer>> | undefined;

async function fetchCsrf(origin: string) {
  const response = await fetch(`${origin}/api/csrf`);
  expect(response.status).toBe(200);
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) throw new Error("Missing CSRF Set-Cookie header");
  const csrfCookie = setCookie.split(";")[0];
  const { token } = (await response.json()) as { token: string };
  return { csrfCookie, token };
}

beforeAll(async () => {
  dev = await startDevServer({
    databaseUrl: url,
    port: 0,
    apiPort: 0,
    logLevel: "silent",
  });
});

afterAll(async () => {
  await dev?.close();
});

describe("Vite dev proxy Host/Origin preservation", () => {
  it("accepts POST via localhost with other cookies and valid CSRF token", async () => {
    const origin = `http://localhost:${dev!.port}`;
    const { csrfCookie, token } = await fetchCsrf(origin);

    const response = await fetch(`${origin}/api/calculate/dana-darurat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
        Cookie: `other=1; ${csrfCookie}`,
        "X-CSRF-Token": token,
      },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { target?: unknown };
    expect(typeof body.target).toBe("number");
  });

  it("accepts POST via 127.0.0.1 with valid Origin and CSRF token", async () => {
    const origin = `http://127.0.0.1:${dev!.port}`;
    const { csrfCookie, token } = await fetchCsrf(origin);

    const response = await fetch(`${origin}/api/calculate/dana-darurat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
        Cookie: csrfCookie,
        "X-CSRF-Token": token,
      },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { target?: unknown };
    expect(typeof body.target).toBe("number");
  });

  it("still rejects mismatched Origin even with valid CSRF cookie and token", async () => {
    const origin = `http://localhost:${dev!.port}`;
    const { csrfCookie, token } = await fetchCsrf(origin);

    const response = await fetch(`${origin}/api/calculate/dana-darurat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://evil.test",
        Cookie: csrfCookie,
        "X-CSRF-Token": token,
      },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(403);
  });
});
