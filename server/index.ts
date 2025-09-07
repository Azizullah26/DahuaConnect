import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Exclude webhook endpoint from compression middleware
app.use((req, res, next) => {
  // Skip compression for Dahua webhook to avoid decompression errors
  if (req.path === '/api/dahua-webhook') {
    next();
  } else {
    compression()(req, res, next);
  }
});

// Special handling for Dahua webhook data
app.use('/api/dahua-webhook', (req, res, next) => {
  // Disable compression for response
  res.setHeader('x-no-compression', '1');
  
  // Remove any compression headers from request to prevent decompression attempts
  delete req.headers['content-encoding'];
  delete req.headers['accept-encoding'];
  
  // Use raw body parser for all webhook data
  express.raw({ 
    type: () => true,
    limit: '50mb',
    inflate: false // Disable automatic decompression
  })(req, res, (err) => {
    if (err) {
      console.log('Raw body parsing error (non-critical):', err.message);
      // Continue anyway with empty body
      req.body = req.body || {};
    }
    next();
  });
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen(port, '0.0.0.0', () => {
    log(`serving on port ${port}`);
  });
})();
