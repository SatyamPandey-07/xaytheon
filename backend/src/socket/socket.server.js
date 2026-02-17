const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { startRealTimeSimulation } = require("../services/analytics.socket.service");
const WarRoomSocket = require("./war-room.socket");
const globeController = require("../controllers/globe.controller");

let io;
let warRoomSocketHandler;
const userSockets = new Map(); // userId -> Set of socket IDs
const watchlistRooms = new Map(); // watchlistId -> Set of userIds

function initializeSocket(server) {
    io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || "http://localhost:8080",
            credentials: true,
        },
    });

    // Initialize War-Room socket handler
   // warRoomSocketHandler = new WarRoomSocket(io);

    // Authentication middleware for main namespace
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

        // WAR ROOM: Join incident war room
        socket.on("join_war_room", (incidentId) => {
            const roomName = `war_room:${incidentId}`;
            socket.join(roomName);
            socket.currentWarRoom = incidentId;

            console.log(`🚨 User ${socket.userId} joined War Room: ${incidentId}`);

            // Notify others of new participant
            socket.to(roomName).emit("war_room_user_joined", {
                userId: socket.userId,
                incidentId,
                timestamp: Date.now()
            });

            // Send current participants
            io.in(roomName).allSockets().then(sockets => {
                socket.emit("war_room_participants", {
                    incidentId,
                    count: sockets.size,
                    participants: Array.from(sockets)
                });
            });
        });

        // WAR ROOM: Leave war room
        socket.on("leave_war_room", (incidentId) => {
            const roomName = `war_room:${incidentId}`;
            socket.leave(roomName);
            socket.currentWarRoom = null;

            socket.to(roomName).emit("war_room_user_left", {
                userId: socket.userId,
                incidentId,
                timestamp: Date.now()
            });
        });

        // WAR ROOM: Sync 3D cursor position
        socket.on("war_room_cursor_move", (data) => {
            if (socket.currentWarRoom) {
                const roomName = `war_room:${socket.currentWarRoom}`;
                socket.to(roomName).emit("war_room_cursor_update", {
                    userId: socket.userId,
                    position: data.position,
                    color: data.color || '#60a5fa',
                    timestamp: Date.now()
                });
            }
        });

        // WAR ROOM: Sync camera position
        socket.on("war_room_camera_move", (data) => {
            if (socket.currentWarRoom) {
                const roomName = `war_room:${socket.currentWarRoom}`;
                socket.to(roomName).emit("war_room_camera_update", {
                    userId: socket.userId,
                    position: data.position,
                    target: data.target,
                    timestamp: Date.now()
                });
            }
        });

        // WAR ROOM: Create incident pin
        socket.on("war_room_create_pin", (data) => {
            if (socket.currentWarRoom) {
                const roomName = `war_room:${socket.currentWarRoom}`;
                const pin = {
                    id: `pin_${Date.now()}_${socket.userId}`,
                    userId: socket.userId,
                    position: data.position,
                    nodeId: data.nodeId,
                    message: data.message,
                    severity: data.severity || 'medium',
                    timestamp: Date.now()
                };

                // Broadcast to all in room (including sender)
                io.to(roomName).emit("war_room_pin_created", pin);
            }
        });

        // WAR ROOM: Remove incident pin
        socket.on("war_room_remove_pin", (pinId) => {
            if (socket.currentWarRoom) {
                const roomName = `war_room:${socket.currentWarRoom}`;
                io.to(roomName).emit("war_room_pin_removed", {
                    pinId,
                    userId: socket.userId,
                    timestamp: Date.now()
                });
            }
        });

        // WAR ROOM: Broadcast status update
        socket.on("war_room_status_update", (data) => {
            if (socket.currentWarRoom) {
                const roomName = `war_room:${socket.currentWarRoom}`;
                io.to(roomName).emit("war_room_status_broadcast", {
                    userId: socket.userId,
                    status: data.status,
                    message: data.message,
                    timestamp: Date.now()
                });
            }
        });

        // Handle disconnect
        socket.on("disconnect", () => {
            console.log(`❌ User ${socket.userId} disconnected: ${socket.id}`);

            // Leave war room if in one
            if (socket.currentWarRoom) {
                const roomName = `war_room:${socket.currentWarRoom}`;
                socket.to(roomName).emit("war_room_user_left", {
                    userId: socket.userId,
                    incidentId: socket.currentWarRoom,
                    timestamp: Date.now()
                });
            }

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

    // Initialize globe services with Socket.IO
    //globeController.initializeServices(io);

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
