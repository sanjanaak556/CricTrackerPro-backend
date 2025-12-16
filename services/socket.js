let io;

module.exports = {
  init: (server) => {
    const { Server } = require("socket.io");

    io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL || "*",
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    console.log("🔥 Socket.io initialized");

    // MAIN CONNECTION
    io.on("connection", (socket) => {
      console.log("🟢 User connected:", socket.id);

      // ------------------------------------------------------
      // JOIN MATCH ROOM
      // ------------------------------------------------------
      socket.on("joinMatch", (matchId) => {
        const room = `match_${matchId}`;
        socket.join(room);
        console.log(`📌 ${socket.id} joined ${room}`);
      });

      // ------------------------------------------------------
      // LEAVE MATCH ROOM
      // ------------------------------------------------------
      socket.on("leaveMatch", (matchId) => {
        const room = `match_${matchId}`;
        socket.leave(room);
        console.log(`🚪 ${socket.id} left ${room}`);
      });

      // ------------------------------------------------------
      // LIVE SCORE BROADCAST
      // ------------------------------------------------------
      socket.on("scoreUpdate", ({ matchId, data }) => {
        const room = `match_${matchId}`;
        io.to(room).emit("scoreUpdated", data);
        console.log(`🏏 Score update sent to ${room}`);
      });

      // ------------------------------------------------------
      // COMMENTARY BROADCAST
      // ------------------------------------------------------
      socket.on("commentaryUpdate", ({ matchId, message }) => {
        const room = `match_${matchId}`;
        io.to(room).emit("newCommentary", message);
        console.log(`✍ Commentary sent to ${room}`);
      });

      // ------------------------------------------------------
      // IMPORTANT EVENTS
      // ------------------------------------------------------
      socket.on("eventUpdate", ({ matchId, event }) => {
        const room = `match_${matchId}`;
        io.to(room).emit("eventReceived", event);
        console.log(`⚡ Event sent to ${room}`);
      });

      // ------------------------------------------------------
      // DISCONNECT
      // ------------------------------------------------------
      socket.on("disconnect", () => {
        console.log("🔴 User disconnected:", socket.id);
      });
    });

    return io;
  },

  getIO: () => {
    if (!io) {
      throw new Error("Socket.io not initialized yet!");
    }
    return io;
  },
};
