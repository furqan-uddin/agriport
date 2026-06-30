import express from "express";
import helmet from "helmet";
import cors from "cors";
import mongoose from "mongoose";
import path from "path";

import env from "./config/env.js";
import requestLogger from "./middlewares/requestLogger.js";
import { globalLimiter } from "./middlewares/rateLimiter.js";
import errorHandler from "./middlewares/errorHandler.js";
import AppError from "./utils/AppError.js";
import { successResponse, errorResponse } from "./utils/apiResponse.js";
import authRouter from "./modules/auth/auth.routes.js";
import categoryRouter from "./modules/categories/category.routes.js";
import productRouter from "./modules/products/product.routes.js";
import orderRouter from "./modules/orders/order.routes.js";
import paymentRouter from "./modules/payments/payment.routes.js";
import storefrontRouter from "./modules/storefront/storefront.routes.js";
import userRouter from "./modules/users/user.routes.js";
import inventoryRouter from "./modules/inventory/inventory.routes.js";
import reportsRouter from "./modules/reports/reports.routes.js";
import crmRouter from "./modules/crm/crm.routes.js";
import salesRouter from "./modules/sales/sales.routes.js";
import notificationRouter from "./modules/notifications/notification.routes.js";

const app = express();

// Trust reverse proxies (Render, Railway, Nginx) for rate-limiting IP checking
app.set("trust proxy", 1);

// 1. Global Security Middlewares
app.use(
  helmet({
    contentSecurityPolicy: true,
    crossOriginEmbedderPolicy: true,
    hsts: { maxAge: 31536000, includeSubDomains: true },
    noSniff: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xssFilter: true,
  }),
);

// 2. CORS Config
const whitelist = [
  "https://agriport.vercel.app", // Production
  "https://agriport-pi.vercel.app",
  "http://localhost:5173", // Local Dev
  "http://localhost:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or postman)
      if (!origin || whitelist.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new AppError("Not allowed by CORS", 403));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// 3. Request Parsers & Sanitization
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Custom NoSQL query injection prevention (Express 5 safe)
app.use((req, res, next) => {
  const sanitize = (obj) => {
    if (obj && typeof obj === "object") {
      Object.keys(obj).forEach((key) => {
        if (key.startsWith("$")) {
          delete obj[key];
        } else if (typeof obj[key] === "object") {
          sanitize(obj[key]);
        }
      });
    }
  };
  sanitize(req.body);
  sanitize(req.query);
  sanitize(req.params);
  next();
});

// 4. Morgan Request Logging
app.use(requestLogger());

// 5. Global API Rate Limiting
app.use("/api", globalLimiter);

// 6. Base Routes
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/categories", categoryRouter);
app.use("/api/v1/products", productRouter);
app.use("/api/v1/orders", orderRouter);
app.use("/api/v1/payments", paymentRouter);
app.use("/api/v1/storefront", storefrontRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/inventory", inventoryRouter);
app.use("/api/v1/reports", reportsRouter);
app.use("/api/v1/crm", crmRouter);
app.use("/api/v1/sales", salesRouter);
app.use("/api/v1/notifications", notificationRouter);

app.get("/api/v1/health", (req, res) => {
  const dbState = mongoose.connection.readyState;
  let dbStatus = "connecting";

  if (dbState === 1) {
    dbStatus = "up";
  } else if (dbState === 0) {
    dbStatus = "down";
  } else if (dbState === 2) {
    dbStatus = "connecting";
  } else if (dbState === 3) {
    dbStatus = "disconnecting";
  }

  const healthData = {
    status: "healthy",
    timestamp: new Date(),
    uptime: `${Math.floor(process.uptime())}s`,
    environment: env.NODE_ENV,
    memory: {
      heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
      rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
    },
    database: dbStatus,
  };

  if (dbState !== 1) {
    return errorResponse(res, "Database connection is unhealthy", 500, "error");
  }

  return successResponse(
    res,
    healthData,
    200,
    "Agriport API health check successful",
  );
});

// 7. Handle Unmatched Routes
app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// 8. Global Centralised Error Handler
app.use(errorHandler);

export default app;
