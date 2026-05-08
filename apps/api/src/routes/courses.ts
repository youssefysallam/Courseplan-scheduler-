import { Router } from "express";
import fs from "fs";
import path from "path";

export function coursesRouter() {
  const router = Router();

  router.get("/", (_req, res) => {
    try {
      const abs = process.env.DATASET_PATH
        ? path.resolve(process.cwd(), process.env.DATASET_PATH)
        : path.resolve(__dirname, "../../../packages/shared/dataset/data/courses.sample.json");

      const raw = fs.readFileSync(abs, "utf-8");
      const courses = JSON.parse(raw);

      res.json({ courses });
    } catch (err) {
      res.status(500).json({
        error: "Failed to load courses dataset",
        cwd: process.cwd(),
        datasetPath: process.env.DATASET_PATH,
        message: err instanceof Error ? err.message : String(err)
      });
    }
  });

  return router;
}
