import express from "express";
import cors from "cors";
import { coursesRouter } from "./routes/courses";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/courses", coursesRouter());

export default app;
