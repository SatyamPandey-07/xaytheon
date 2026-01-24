/**
 * Collaboration Service
 * Manages active sessions, room state, and basic OT/CRDT simulation.
 */
class CollaborationService {
    constructor() {
        this.rooms = new Map(); // roomId -> { viewers: Map, content: string, version: number }
    }

    joinRoom(roomId, userId, metadata) {
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, {
                viewers: new Map(),
                content: "",
                version: 0
            });
        }

        const room = this.rooms.get(roomId);
        room.viewers.set(userId, {
            id: userId,
            metadata,
            lastSeen: Date.now()
        });

        return room;
    }

    leaveRoom(roomId, userId) {
        if (this.rooms.has(roomId)) {
            const room = this.rooms.get(roomId);
            room.viewers.delete(userId);
            if (room.viewers.size === 0) {
                // Keep room for a while or cleanup
                // this.rooms.delete(roomId);
            }
        }
    }

    applyEdit(roomId, userId, change, clientVersion) {
        if (!this.rooms.has(roomId)) return null;

        const room = this.rooms.get(roomId);

        // Basic Conflict Resolution Simulation
        // In real OT, we would transform the change based on intervening edits
        room.version++;
        room.content = this.mockApplyChange(room.content, change);

        return {
            content: room.content,
            version: room.version
        };
    }

    mockApplyChange(current, change) {
        // Simplified: Change is just the new content for this demo
        return typeof change === 'string' ? change : current;
    }

    getPresence(roomId) {
        if (!this.rooms.has(roomId)) return [];
        return Array.from(this.rooms.get(roomId).viewers.values());
    }
}

module.exports = new CollaborationService();
