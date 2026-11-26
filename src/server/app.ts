import express, { type ErrorRequestHandler } from "express";
import path from "node:path";
import { security } from "./security.js";
import { connectDatabase } from "./db/client.js";
import { calculatorRoutes } from "./modules/calculators/routes.js";
import { educationDefaults } from "../domain/calculators/education.js";
import { feedbackRoutes } from "./modules/feedback/routes.js";
export function createApp(databaseUrl: string) {
  const { pool, db } = connectDatabase(databaseUrl);
  const app = express();
  app.disable("x-powered-by");
  const guard = security();
  app.use(guard.headers);
  app.get("/api/csrf", guard.issue);
  app.use(["/api/feedback", "/api/calculate"], (req, res, next) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method))
      return guard.verify(req, res, next);
    next();
  });
  app.use(
    "/api/feedback",
    (req, res, next) => {
      if (req.method === "POST" && !req.is("application/json")) {
        res.status(400).json({ error: "Objek JSON diperlukan" });
        return;
      }
      next();
    },
    express.json({ limit: "16kb", strict: true }),
    feedbackRoutes(db),
  );
  app.get("/api/education-defaults", (_req, res) => {
    res.json(educationDefaults);
  });
  app.use(
    "/api/calculate",
    (req, res, next) => {
      if (req.method === "POST" && !req.is("application/json")) {
        res.status(400).json({ error: "Objek JSON diperlukan" });
        return;
      }
      next();
    },
    express.json({ limit: "16kb", strict: true }),
    calculatorRoutes(),
  );
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found" });
  });
  app.use(express.static(path.resolve("dist")));
  app.get(
    [
      "/",
      "/annuity",
      "/dana-darurat",
      "/properti",
      "/kendaraan",
      "/barang",
      "/menikah",
      "/dana-pensiun",
      "/pendidikan-anak",
      "/simulasi-kpr",
      "/liburan",
      "/pendidikan",
    ],
    (_req, res) => {
      res.sendFile(path.resolve("dist/index.html"));
    },
  );
  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });
  const errors: ErrorRequestHandler = (err, _req, res, _next) => {
    const status =
      err.type === "entity.too.large"
        ? 413
        : err.type === "entity.parse.failed"
          ? 400
          : 500;
    res
      .status(status)
      .json({
        error:
          status === 500 ? "Terjadi kesalahan internal" : "Payload tidak valid",
      });
  };
  app.use(errors);
  return { app, pool };
}
