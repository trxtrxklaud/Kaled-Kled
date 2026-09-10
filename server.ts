import express from "express";
import path from "path";
import cors from "cors";
import authRoutes from "./src/api/auth";
import emailRoutes from "./src/api/email";
import eduservRoutes from "./src/api/eduserv";
import providenceRoutes from "./src/api/providence";
import { requireAuth, requireRole } from "./src/api/middleware";
import cookieParser from "cookie-parser";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  app.use(cookieParser());

  // === Phase 1 API Endpoints ===
  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Laravel-like Express API is running." });
  });

  // Auth mock for Phase 1 (until fully linked)
  app.use("/api/auth", authRoutes);
  app.use("/api/email", emailRoutes);
  app.use("/api/eduserv", eduservRoutes);
  // Phase 1 — read-only proxy to the Providence platform (server-side token)
  app.use("/api/providence", providenceRoutes);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
