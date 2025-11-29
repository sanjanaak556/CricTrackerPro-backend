const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const userRoleRoutes = require("./routes/userRoleRoutes");
const userRoutes = require("./routes/userRoutes");
const teamRoutes = require("./routes/teamRoutes");
const playerRoutes = require("./routes/playerRoutes");
const matchRoutes = require("./routes/matchRoutes");
const inningsRoutes = require("./routes/inningsRoutes");
const overRoutes = require("./routes/overRoutes");
const ballRoutes = require("./routes/ballRoutes");
const scoreEventRoutes = require("./routes/scoreEventRoutes");
const commentaryRoutes = require("./routes/commentaryRoutes")
const matchSummaryRoutes = require("./routes/matchSummaryRoutes");

const app = express();

// Middleware
app.use(express.json());

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
  }));
  

// Connect DB
connectDB();

// Test route
app.get("/", (req, res) => {
    res.send("CricTrackerPro Server Running...");
});

app.use("/api/auth", authRoutes);
app.use("/api/roles", userRoleRoutes);
app.use("/api/users", userRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/players", playerRoutes);
app.use("/api/innings", inningsRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/overs", overRoutes);
app.use("/api/balls", ballRoutes);
app.use("/api/score-events", scoreEventRoutes);
app.use("/api/commentary", commentaryRoutes);
app.use("/api/match-summary", matchSummaryRoutes);


module.exports = app; 