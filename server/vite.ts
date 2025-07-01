import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const vite = await createViteServer({
    ...viteConfig,
    server: {
      middlewareMode: true,
      hmr: { server },
    },
    appType: 'custom',
  });

  // Use Vite's middleware for all non-API routes
  app.use((req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
      return next();
    }
    // Use Vite's middleware for all other routes
    return vite.middlewares(req, res, next);
  });

  // Serve the React app for all other routes
  app.use('*', async (req, res, next) => {
    const url = req.originalUrl;
    
    // Skip API routes (should be handled by your API routes)
    if (url.startsWith('/api/')) {
      return next();
    }

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        '..',
        'client',
        'index.html'
      );
      
      // Read the HTML template
      let template = await fs.promises.readFile(clientTemplate, 'utf-8');
      
      // Apply Vite HTML transforms
      template = await vite.transformIndexHtml(url, template);
      
      // Send the transformed HTML
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e: any) {
      // If Vite is not ready yet, show a loading message
      if (e.code === 'ENOENT') {
        return res.status(503).send('Vite is starting up, please try again in a moment...');
      }
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (req, res, next) => {
    try {
      const indexPath = path.resolve(distPath, "index.html");
      if (!fs.existsSync(indexPath)) {
        throw new Error(`Index file not found at ${indexPath}`);
      }
      res.sendFile(indexPath);
    } catch (error) {
      console.error('Error serving index.html:', error);
      next(error);
    }
  });
}
