const http = require("http");
const app = require("./index");   // use your existing express app
const socketService = require("./services/socket");

// Create HTTP server from express app
const server = http.createServer(app);

// Initialize socket.io
socketService.init(server);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server + Socket.io running on port ${PORT}`);
});
