const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const userRoleRoutes = require("./routes/userRoleRoutes");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const teamRoutes = require("./routes/teamRoutes");
const playerRoutes = require("./routes/playerRoutes");
const matchRoutes = require("./routes/matchRoutes");
const inningsRoutes = require("./routes/inningsRoutes");
const overRoutes = require("./routes/overRoutes");
const ballRoutes = require("./routes/ballRoutes");
const scoreEventRoutes = require("./routes/scoreEventRoutes");
const commentaryRoutes = require("./routes/commentaryRoutes");
const matchSummaryRoutes = require("./routes/matchSummaryRoutes");
const viewerRoutes = require("./routes/viewerRoutes");

const app = express();

// Middleware
app.use(express.json());

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

// Serve static files for uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Connect DB
connectDB();

// Test route
app.get("/", (req, res) => {
  res.send("CricTrackerPro Server Running...");
});

app.use("/api/auth", authRoutes);
app.use("/api/roles", userRoleRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/players", playerRoutes);
app.use("/api/innings", inningsRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/overs", overRoutes);
app.use("/api/balls", ballRoutes);
app.use("/api/score-events", scoreEventRoutes);
app.use("/api/commentary", commentaryRoutes);
app.use("/api/match-summary", matchSummaryRoutes);
app.use("/api/viewer", viewerRoutes);

module.exports = app;
