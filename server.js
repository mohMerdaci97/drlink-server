require("dotenv").config();

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const morgan = require("morgan");

const sequelize = require("./src/config/database");
require("./src/models");

const authRoutes = require("./src/routes/authRoutes");
const locationRoutes = require("./src/routes/locationRoutes");
const adminRoutes = require("./src/routes/adminRoutes");
const userRoutes = require("./src/routes/userRoutes");
const doctorRoutes = require("./src/routes/doctorRoutes");
const patientAuthRoutes = require("./src/routes/patientAuthRoutes");

const app = express();

//  Security headers
app.use(helmet());

//  Logger (dev only)
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

//  Cookies
app.use(cookieParser());

//  CORS
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

//  Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

//  Global rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 100 : 500,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", limiter);

app.use("/uploads", express.static("uploads"));

//  Routes
app.use("/api/auth", authRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/user", userRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/patient/auth", patientAuthRoutes);

// Health check
app.get("/", (req, res) => {
  res.send("DrLink API is running 🚀");
});

//  404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

//  Global error handling
app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err);
  res.status(500).json({ message: "Internal server error" });
});

// start server
(async () => {
  try {
    await sequelize.authenticate();
    console.log(" Database connected");

    app.listen(process.env.PORT || 5000, "0.0.0.0", () => {
      console.log(`Server running on port ${process.env.PORT || 5000}`);
    });
  } catch (err) {
    console.error("❌ DB connection failed:", err.message);
  }
})();
