import dotenv from "dotenv";
dotenv.config();

import app from "./server";

const port = Number(process.env.API_PORT ?? 4000);

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
