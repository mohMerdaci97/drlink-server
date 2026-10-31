require("dotenv").config();

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const morgan = require("morgan");

const sequelize = require("./src/config/database");
require("./src/models");

const authRoutes = require("./src/routes/auth.routes");
const locationRoutes = require("./src/routes/location.routes");
const adminRoutes = require("./src/routes/admin.routes");
const doctorRoutes = require("./src/routes/doctor.routes");
const patientAuthRoutes = require("./src/routes/patientAuth.routes");
const patientRoutes = require("./src/routes/patient.routes");
const assistantRoutes = require("./src/routes/assistant.routes");

const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === "production";

const app = express();

// No ETag: avoids 304 responses on the JSON API
app.set("etag", false);

// Security headers
app.use(helmet());

// Logger (dev only)
if (!isProduction) {
  app.use(morgan("dev"));
}

app.use(cookieParser());

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Global rate limiter
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProduction ? 100 : 500,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// clients never cache API responses 
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// Static files 
app.use("/uploads", express.static("uploads"));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/patient/auth", patientAuthRoutes);
app.use("/api/patient", patientRoutes);
app.use("/api/assistant", assistantRoutes);

app.get("/", (req, res) => {
  res.send("DrLink API is running");
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Error handler must be last
app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err);
  res.status(500).json({ message: "Internal server error" });
});


(async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connected");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("DB connection failed:", err.message);
    process.exit(1);
  }
})();
