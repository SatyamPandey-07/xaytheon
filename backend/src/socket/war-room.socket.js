/**
 * DevOps War-Room WebSocket Handlers
 * Real-time event broadcasting and incident management
 */

const eventStreamService = require('../services/event-stream.service');
const incidentService = require('../services/incident.service');
const aiRootCauseService = require('../services/ai-root-cause.service');

class WarRoomSocket {
    constructor(io) {
        this.io = io;
        this.warRoomNamespace = io.of('/war-room');
        this.connectedUsers = new Map();
        this.eventPollingInterval = null;
        this.setupHandlers();
        this.startEventPolling();
    }

    /**
     * Setup WebSocket handlers
     */
    setupHandlers() {
        this.warRoomNamespace.on('connection', (socket) => {
            console.log(`War-Room user connected: ${socket.id}`);
            
            // Store user info
            socket.on('register', (userData) => {
                this.connectedUsers.set(socket.id, {
                    ...userData,
                    socketId: socket.id,
                    connectedAt: Date.now()
                });
                
                // Send current state
                this.sendInitialState(socket);
                
                // Broadcast user joined
                this.broadcastUserList();
            });

            // Event stream handlers
            socket.on('subscribe:events', () => {
                socket.join('event-stream');
                const events = eventStreamService.getEvents(50);
                socket.emit('events:initial', events);
            });

            socket.on('unsubscribe:events', () => {
                socket.leave('event-stream');
            });

            socket.on('event:acknowledge', (data) => {
                const { eventId, userId } = data;
                eventStreamService.acknowledgeEvent(eventId, userId);
                this.warRoomNamespace.to('event-stream').emit('event:acknowledged', { eventId, userId });
            });

            // Incident management handlers
            socket.on('incident:create', async (data) => {
                try {
                    const { event, userId } = data;
                    const incident = incidentService.createIncident(event, userId);
                    
                    // Perform AI analysis
                    const analysis = await aiRootCauseService.analyzeIncident(incident);
                    incidentService.setRootCause(
                        incident.id,
                        analysis.rootCause,
                        analysis.hypothesis,
                        analysis.suggestedActions
                    );

                    this.warRoomNamespace.emit('incident:created', { incident, analysis });
                } catch (error) {
                    socket.emit('error', { message: error.message });
                }
            });

            socket.on('incident:pin', async (data) => {
                try {
                    const { incidentId, userId } = data;
                    const incident = await incidentService.pinIncident(incidentId, userId);
                    
                    // Get AI analysis
                    const analysis = await aiRootCauseService.analyzeIncident(incident);
                    
                    this.warRoomNamespace.emit('incident:pinned', { incident, analysis });
                } catch (error) {
                    socket.emit('error', { message: error.message });
                }
            });

            socket.on('incident:unpin', (data) => {
                try {
                    const { userId } = data;
                    const unpinned = incidentService.unpinIncident(userId);
                    this.warRoomNamespace.emit('incident:unpinned', { incident: unpinned });
                } catch (error) {
                    socket.emit('error', { message: error.message });
                }
            });

            socket.on('incident:status', (data) => {
                try {
                    const { incidentId, status, userId, notes } = data;
                    const incident = incidentService.updateStatus(incidentId, status, userId, notes);
                    this.warRoomNamespace.emit('incident:updated', { incident });
                } catch (error) {
                    socket.emit('error', { message: error.message });
                }
            });

            socket.on('incident:assign', (data) => {
                try {
                    const { incidentId, userIds, assignedBy } = data;
                    const incident = incidentService.assignIncident(incidentId, userIds, assignedBy);
                    this.warRoomNamespace.emit('incident:updated', { incident });
                } catch (error) {
                    socket.emit('error', { message: error.message });
                }
            });

            socket.on('incident:comment', (data) => {
                try {
                    const { incidentId, userId, comment } = data;
                    const incident = incidentService.addComment(incidentId, userId, comment);
                    this.warRoomNamespace.emit('incident:updated', { incident });
                } catch (error) {
                    socket.emit('error', { message: error.message });
                }
            });

            socket.on('incident:analyze', async (data) => {
                try {
                    const { incidentId } = data;
                    const incident = incidentService.getIncident(incidentId);
                    if (!incident) {
                        throw new Error('Incident not found');
                    }
                    
                    const analysis = await aiRootCauseService.analyzeIncident(incident);
                    const plan = aiRootCauseService.generateRemediationPlan(analysis);
                    
                    socket.emit('incident:analysis', { 
                        incidentId,
                        analysis,
                        remediationPlan: plan
                    });
                } catch (error) {
                    socket.emit('error', { message: error.message });
                }
            });

            // Statistics handlers
            socket.on('stats:request', () => {
                const stats = {
                    events: eventStreamService.getStatistics(),
                    incidents: incidentService.getStatistics()
                };
                socket.emit('stats:update', stats);
            });

            // Collaboration handlers
            socket.on('cursor:move', (data) => {
                socket.broadcast.emit('cursor:moved', {
                    userId: this.connectedUsers.get(socket.id)?.userId,
                    ...data
                });
            });

            socket.on('typing:start', (data) => {
                socket.broadcast.emit('user:typing', {
                    userId: this.connectedUsers.get(socket.id)?.userId,
                    ...data
                });
            });

            socket.on('typing:stop', (data) => {
                socket.broadcast.emit('user:stopped-typing', {
                    userId: this.connectedUsers.get(socket.id)?.userId,
                    ...data
                });
            });

            // Disconnect handler
            socket.on('disconnect', () => {
                console.log(`War-Room user disconnected: ${socket.id}`);
                this.connectedUsers.delete(socket.id);
                this.broadcastUserList();
            });
        });

        // Listen to event stream
        eventStreamService.on('event', (event) => {
            this.warRoomNamespace.to('event-stream').emit('event:new', event);
            
            // Check if critical event should trigger alert
            if (this.isCriticalEvent(event)) {
                this.warRoomNamespace.emit('alert:critical', event);
            }
        });
    }

    /**
     * Send initial state to newly connected user
     */
    sendInitialState(socket) {
        // Send recent events
        const events = eventStreamService.getEvents(50);
        socket.emit('events:initial', events);

        // Send pinned incident
        const pinnedIncident = incidentService.getPinnedIncident();
        if (pinnedIncident) {
            socket.emit('incident:pinned', { incident: pinnedIncident });
        }

        // Send all open incidents
        const openIncidents = incidentService.getAllIncidents({ status: 'open' });
        socket.emit('incidents:all', openIncidents);

        // Send statistics
        const stats = {
            events: eventStreamService.getStatistics(),
            incidents: incidentService.getStatistics()
        };
        socket.emit('stats:update', stats);
    }

    /**
     * Broadcast connected user list
     */
    broadcastUserList() {
        const users = Array.from(this.connectedUsers.values()).map(u => ({
            userId: u.userId,
            username: u.username,
            avatar: u.avatar,
            connectedAt: u.connectedAt
        }));
        
        this.warRoomNamespace.emit('users:list', users);
    }

    /**
     * Check if event is critical
     */
    isCriticalEvent(event) {
        return event.priority >= 9 || 
               (event.type === 'deployment_failure' && event.environment === 'production') ||
               (event.type === 'production_error' && event.severity === 'critical');
    }

    /**
     * Start event polling (simulated for demo)
     */
    startEventPolling() {
        // Poll GitHub Actions every 2 minutes
        this.eventPollingInterval = setInterval(() => {
            this.pollGitHubEvents();
        }, 120000);

        // Simulate production errors every 5 minutes
        setInterval(() => {
            if (Math.random() > 0.7) { // 30% chance
                const error = eventStreamService.simulateProductionError();
                // Event will be broadcast via the 'event' listener
            }
        }, 300000);
    }

    /**
     * Poll GitHub for new events
     */
    async pollGitHubEvents() {
        try {
            // This would use GitHub token from environment in production
            await eventStreamService.fetchGitHubActions('owner', 'repo');
            await eventStreamService.fetchCommits('owner', 'repo');
            await eventStreamService.fetchPullRequests('owner', 'repo');
        } catch (error) {
            console.error('GitHub polling error:', error.message);
        }
    }

    /**
     * Stop event polling
     */
    stopEventPolling() {
        if (this.eventPollingInterval) {
            clearInterval(this.eventPollingInterval);
            this.eventPollingInterval = null;
        }
    }

    /**
     * Broadcast message to all War-Room users
     */
    broadcast(event, data) {
        this.warRoomNamespace.emit(event, data);
    }

    /**
     * Send message to specific user
     */
    sendToUser(socketId, event, data) {
        this.warRoomNamespace.to(socketId).emit(event, data);
    }

    /**
     * Get connected users count
     */
    getConnectedUsersCount() {
        return this.connectedUsers.size;
    }

    /**
     * Cleanup
     */
    destroy() {
        this.stopEventPolling();
        this.connectedUsers.clear();
    }
}

module.exports = WarRoomSocket;
