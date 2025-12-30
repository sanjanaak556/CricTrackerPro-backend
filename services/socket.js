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
        // Log current room members for debugging
        const roomSize = io.sockets.adapter.rooms.get(room)?.size || 0;
        console.log(`👥 Room ${room} now has ${roomSize} members`);
      });

      // ------------------------------------------------------
      // LEAVE MATCH ROOM
      // ------------------------------------------------------
      socket.on("leaveMatch", (matchId) => {
        const room = `match_${matchId}`;
        socket.leave(room);
        console.log(`🚪 ${socket.id} left ${room}`);
        const roomSize = io.sockets.adapter.rooms.get(room)?.size || 0;
        console.log(`👥 Room ${room} now has ${roomSize} members`);
      });

      // ------------------------------------------------------
      // LIVE SCORE BROADCAST
      // ------------------------------------------------------
      socket.on("scoreUpdate", ({ matchId, data }) => {
        const room = `match_${matchId}`;
        io.to(room).emit("scoreUpdated", data);
        console.log(`🏏 Score update sent to ${room}:`, data);
      });

      // ------------------------------------------------------
      // COMMENTARY BROADCAST
      // ------------------------------------------------------
      socket.on("commentaryUpdate", ({ matchId, message }) => {
        const room = `match_${matchId}`;
        io.to(room).emit("newCommentary", message);
        console.log(`✍ Commentary sent to ${room}:`, message);
      });

      // ------------------------------------------------------
      // IMPORTANT EVENTS
      // ------------------------------------------------------
      socket.on("eventUpdate", ({ matchId, event }) => {
        const room = `match_${matchId}`;
        io.to(room).emit("eventReceived", event);
        console.log(`⚡ Event sent to ${room}:`, event);
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
    return io;
  },
};
