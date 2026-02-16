require("dotenv").config();

const express = require("express");
const cors = require("cors");
const sequelize = require("./src/config/database");

require("./src/models");

const authRoutes = require("./src/routes/authRoutes");
const locationRoutes = require("./src/routes/locationRoutes");
const adminRoutes = require("./src/routes/adminRoutes");
const userRoutes = require("./src/routes/userRoutes");
const doctorRoutes = require("./src/routes/doctorRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("DrLink server is running");
});

//routes
app.use("/api/auth", authRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/user", userRoutes);
app.use("/api/doctor", doctorRoutes);

app.use("/uploads", require("express").static("uploads"));

sequelize
  .authenticate()
  .then(() => {
    console.log("Database connected successfully");
    app.listen(process.env.PORT, () => {
      console.log(`Server running on port ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.error("Database connection error:", err.message);
  });
