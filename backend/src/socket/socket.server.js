const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { startRealTimeSimulation } = require("../services/analytics.socket.service");

let io;
const userSockets = new Map(); // userId -> Set of socket IDs
const watchlistRooms = new Map(); // watchlistId -> Set of userIds

function initializeSocket(server) {
    io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || "http://localhost:8080",
            credentials: true,
        },
    });

    // Authentication middleware
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error("Authentication error"));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.id;
            next();
        } catch (err) {
            next(new Error("Invalid token"));
        }
    });

    io.on("connection", (socket) => {
        console.log(`✅ User ${socket.userId} connected: ${socket.id}`);

        // Track user socket
        if (!userSockets.has(socket.userId)) {
            userSockets.set(socket.userId, new Set());
        }
        userSockets.get(socket.userId).add(socket.id);

        // Join collaboration room (e.g., specific watchlist or page)
        socket.on("join_collab", ({ roomId, userMetadata }) => {
            socket.join(`collab:${roomId}`);
            socket.userMetadata = userMetadata || { name: `User ${socket.userId.slice(-4)}` };

            if (!watchlistRooms.has(roomId)) {
                watchlistRooms.set(roomId, new Set());
            }
            watchlistRooms.get(roomId).add(socket.userId);

            // Broadcast join with metadata
            socket.to(`collab:${roomId}`).emit("user_joined_collab", {
                userId: socket.userId,
                metadata: socket.userMetadata
            });

            // Send current presence list to the new user
            const viewers = Array.from(watchlistRooms.get(roomId)).map(id => ({
                userId: id,
                // In a real app, you'd fetch metadata from a service/DB
                metadata: { name: `User ${id.slice(-4)}` }
            }));
            socket.emit("presence_update", { roomId, viewers });
        });

        // Live Cursor Tracking
        socket.on("cursor_move", ({ roomId, x, y }) => {
            socket.to(`collab:${roomId}`).emit("cursor_update", {
                userId: socket.userId,
                x,
                y,
                metadata: socket.userMetadata
            });
        });

        // Typing Indicators
        socket.on("typing_status", ({ roomId, isTyping }) => {
            socket.to(`collab:${roomId}`).emit("user_typing", {
                userId: socket.userId,
                isTyping,
                metadata: socket.userMetadata
            });
        });

        // Real-time Edits (Conflict Resolution Placeholder)
        socket.on("edit_content", ({ roomId, change, version }) => {
            // In a real app, apply OT/CRDT logic here via collabService
            socket.to(`collab:${roomId}`).emit("content_synced", {
                userId: socket.userId,
                change,
                version
            });
        });

        // Leave collaboration
        socket.on("leave_collab", (roomId) => {
            socket.leave(`collab:${roomId}`);
            if (watchlistRooms.has(roomId)) {
                watchlistRooms.get(roomId).delete(socket.userId);
            }
            socket.to(`collab:${roomId}`).emit("user_left_collab", { userId: socket.userId });
        });

        // Handle disconnect
        socket.on("disconnect", () => {
            console.log(`❌ User ${socket.userId} disconnected: ${socket.id}`);

            if (userSockets.has(socket.userId)) {
                userSockets.get(socket.userId).delete(socket.id);
                if (userSockets.get(socket.userId).size === 0) {
                    userSockets.delete(socket.userId);
                }
            }

            // Remove from all collaborative rooms
            watchlistRooms.forEach((viewers, roomId) => {
                if (viewers.has(socket.userId)) {
                    viewers.delete(socket.userId);
                    io.to(`collab:${roomId}`).emit("user_left_collab", { userId: socket.userId });
                }
            });
        });
    });

    console.log("🔌 WebSocket server initialized");

    // Start analytics simulation
    startRealTimeSimulation(io);

    return io;
}

function getIO() {
    if (!io) {
        throw new Error("Socket.io not initialized");
    }
    return io;
}

// Emit notification to specific user
function emitToUser(userId, event, data) {
    if (userSockets.has(userId)) {
        userSockets.get(userId).forEach((socketId) => {
            io.to(socketId).emit(event, data);
        });
    }
}

// Emit to all users in a watchlist
function emitToWatchlist(watchlistId, event, data) {
    io.to(`watchlist:${watchlistId}`).emit(event, data);
}

module.exports = {
    initializeSocket,
    getIO,
    emitToUser,
    emitToWatchlist,
};
