import express from "express";
import dotenv from "dotenv";
import cron from "node-cron";
import userRoutes from "./routes/user.js";
import invoiceRoutes from "./routes/invoice.js";
import poolRoutes from "./routes/pool.js"; // Import pool routes
import relayerService from "./services/relayer.js";
import oracleService from "./services/oracle.js";
import eventListenerService from "./services/eventListener.js";
import logger from "./utils/logger.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
app.use("/api/users", userRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/pools", poolRoutes); // Use pool routes

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Start Event Listener (optional - disable in development if RPC doesn't support subscriptions)
if (process.env.ENABLE_EVENT_LISTENER !== "false") {
  eventListenerService.startListening().catch((error) => {
    logger.error("Failed to start event listener", { error: error.message });
    logger.warn("Event listener disabled - set ENABLE_EVENT_LISTENER=false to suppress this warning");
  });
} else {
  logger.info("Event listener disabled (ENABLE_EVENT_LISTENER=false)");
}

// Scheduled task: Monitor Relayer balance (hourly)
cron.schedule("0 * * * *", async () => {
  try {
    await relayerService.checkBalance();
  } catch (error) {
    logger.error("Relayer balance check failed", { error: error.message });
  }
});

// Scheduled task: Process lottery results (daily at 2 AM)
cron.schedule("0 2 * * *", async () => {
  try {
    // Process yesterday's lottery
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const lotteryDate = yesterday.toISOString().split("T")[0];

    await oracleService.processLotteryResults(lotteryDate);
  } catch (error) {
    logger.error("Lottery processing failed", { error: error.message });
  }
});

// Error handling
app.use((error, req, res, next) => {
  logger.error("Unhandled error", { error: error.message, stack: error.stack });
  res.status(500).json({ error: "Internal server error" });
});

// Start server
app.listen(PORT, () => {
  logger.info(`ROFL backend started on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  logger.info(`Relayer address: ${process.env.RELAYER_ADDRESS}`);
  logger.info(`Oracle address: ${process.env.ORACLE_ADDRESS}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  eventListenerService.stopListening();
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  eventListenerService.stopListening();
  process.exit(0);
});
