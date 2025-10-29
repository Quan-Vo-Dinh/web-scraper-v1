import express, { type Express, type Request, type Response } from "express";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { cellphonesCrawler } from "./services/cellphones-crawler";
import { gearvnCrawler } from "./services/gearvn-crawler";

const app: Express = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());

// Job storage (in-memory for simplicity)
interface JobStatus {
  jobId: string;
  status: "pending" | "crawling" | "completed" | "error";
  progress: { crawled: number; total: number };
  message?: string;
  filePath?: string;
}

const jobs = new Map<string, JobStatus>();
const wsClients = new Map<string, Set<WebSocket>>();

// Create HTTP server for WebSocket
const server = createServer(app);
const wss = new WebSocketServer({ server });

// WebSocket connection handler
wss.on("connection", (ws: WebSocket) => {
  console.log("[WebSocket] New client connected");

  ws.on("message", (message: string) => {
    try {
      const { jobId } = JSON.parse(message);
      if (jobId) {
        if (!wsClients.has(jobId)) {
          wsClients.set(jobId, new Set());
        }
        wsClients.get(jobId)!.add(ws);
        console.log(`[WebSocket] Client tracking job: ${jobId}`);
      }
    } catch (error) {
      console.error("[WebSocket] Error parsing message:", error);
    }
  });

  ws.on("close", () => {
    console.log("[WebSocket] Client disconnected");
    // Clean up client from all job tracking
    wsClients.forEach((clients) => clients.delete(ws));
  });

  ws.on("error", (error) => {
    console.error("[WebSocket] Error:", error);
  });
});

// Helper function to broadcast progress to WebSocket clients
function broadcastProgress(jobId: string, update: Partial<JobStatus>) {
  const job = jobs.get(jobId);
  if (job) {
    Object.assign(job, update);
    const clients = wsClients.get(jobId);
    if (clients) {
      const message = JSON.stringify(job);
      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }
  }
}

// API Routes

// POST /api/crawl - Start a new crawl job
app.post("/api/crawl", async (req: Request, res: Response) => {
  try {
    const { site, target, limit } = req.body;

    if (!site || !target || !limit) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const jobId = uuidv4();
    const job: JobStatus = {
      jobId,
      status: "pending",
      progress: { crawled: 0, total: limit },
      message: "Job queued",
    };

    jobs.set(jobId, job);
    res.json({ jobId });

    // Trigger scraping asynchronously
    setImmediate(async () => {
      try {
        broadcastProgress(jobId, {
          status: "crawling",
          message: "Starting crawl...",
        });

        let filePath: string;

        if (site === "cellphones") {
          filePath = await cellphonesCrawler(target, limit, (progress) => {
            broadcastProgress(jobId, {
              progress,
              message: `Crawled ${progress.crawled} / ${progress.total} products`,
            });
          });
        } else if (site === "gearvn") {
          filePath = await gearvnCrawler(target, limit, (progress) => {
            broadcastProgress(jobId, {
              progress,
              message: `Crawled ${progress.crawled} / ${progress.total} products`,
            });
          });
        } else {
          throw new Error("Unknown site");
        }

        broadcastProgress(jobId, {
          status: "completed",
          filePath,
          message: "Crawl completed successfully",
        });
      } catch (error) {
        console.error(`[Crawl Error] Job ${jobId}:`, error);
        broadcastProgress(jobId, {
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  } catch (error) {
    console.error("[API Error] POST /api/crawl:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/crawl/download/:jobId - Download CSV file
app.get("/api/crawl/download/:jobId", (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const job = jobs.get(jobId);

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    if (job.status !== "completed" || !job.filePath) {
      return res
        .status(400)
        .json({ error: "Job not completed or file not available" });
    }

    if (!fs.existsSync(job.filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    res.download(job.filePath, `crawl-${jobId}.csv`);
  } catch (error) {
    console.error("[API Error] GET /api/crawl/download:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/crawl/status/:jobId - Get job status
app.get("/api/crawl/status/:jobId", (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const job = jobs.get(jobId);

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.json(job);
  } catch (error) {
    console.error("[API Error] GET /api/crawl/status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
});
