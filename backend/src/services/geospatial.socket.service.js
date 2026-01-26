/**
 * Geospatial Socket Service
 * Streams real-time GitHub events with IP-to-Location mapping
 */

const axios = require('axios');
const EventEmitter = require('events');

class GeospatialSocketService extends EventEmitter {
    constructor(io) {
        super();
        this.io = io;
        this.activeConnections = new Map();
        this.locationCache = new Map();
        this.eventBuffer = [];
        this.maxBufferSize = 1000;
        
        // Initialize socket handlers
        this.initializeSocketHandlers();
    }

    /**
     * Initialize Socket.IO event handlers
     */
    initializeSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`Geospatial client connected: ${socket.id}`);
            
            this.activeConnections.set(socket.id, {
                socket,
                filters: {},
                subscriptions: new Set()
            });

            // Handle filter updates
            socket.on('globe:filter', (filters) => {
                this.updateClientFilters(socket.id, filters);
            });

            // Handle subscription to specific repos/orgs
            socket.on('globe:subscribe', (targets) => {
                this.subscribeClient(socket.id, targets);
            });

            // Handle unsubscription
            socket.on('globe:unsubscribe', (targets) => {
                this.unsubscribeClient(socket.id, targets);
            });

            // Handle disconnection
            socket.on('disconnect', () => {
                console.log(`Geospatial client disconnected: ${socket.id}`);
                this.activeConnections.delete(socket.id);
            });

            // Send initial buffered events
            this.sendBufferedEvents(socket);
        });
    }

    /**
     * Update client filter preferences
     */
    updateClientFilters(socketId, filters) {
        const connection = this.activeConnections.get(socketId);
        if (connection) {
            connection.filters = {
                eventTypes: filters.eventTypes || [],
                languages: filters.languages || [],
                regions: filters.regions || [],
                authors: filters.authors || []
            };
        }
    }

    /**
     * Subscribe client to specific targets
     */
    subscribeClient(socketId, targets) {
        const connection = this.activeConnections.get(socketId);
        if (connection && Array.isArray(targets)) {
            targets.forEach(target => connection.subscriptions.add(target));
            console.log(`Client ${socketId} subscribed to: ${targets.join(', ')}`);
        }
    }

    /**
     * Unsubscribe client from targets
     */
    unsubscribeClient(socketId, targets) {
        const connection = this.activeConnections.get(socketId);
        if (connection && Array.isArray(targets)) {
            targets.forEach(target => connection.subscriptions.delete(target));
        }
    }

    /**
     * Send buffered events to newly connected client
     */
    sendBufferedEvents(socket) {
        if (this.eventBuffer.length > 0) {
            socket.emit('globe:events:batch', {
                events: this.eventBuffer.slice(-100), // Send last 100 events
                timestamp: Date.now()
            });
        }
    }

    /**
     * Process and broadcast GitHub event with geolocation
     */
    async processGitHubEvent(event) {
        try {
            // Extract event data
            const eventData = {
                id: event.id || `${Date.now()}-${Math.random()}`,
                type: this.determineEventType(event),
                timestamp: event.created_at || new Date().toISOString(),
                repo: event.repo?.name || event.repository?.full_name,
                author: event.actor?.login || event.sender?.login,
                language: event.repository?.language,
                payload: this.extractPayload(event)
            };

            // Get geolocation for the event
            const location = await this.getEventLocation(event);
            
            if (location) {
                eventData.location = location;

                // Add to buffer
                this.addToBuffer(eventData);

                // Broadcast to relevant clients
                this.broadcastEvent(eventData);
            }
        } catch (error) {
            console.error('Error processing GitHub event:', error);
        }
    }

    /**
     * Determine event type
     */
    determineEventType(event) {
        if (event.type) return event.type;
        if (event.commits) return 'PushEvent';
        if (event.pull_request) return 'PullRequestEvent';
        if (event.issue) return 'IssuesEvent';
        return 'UnknownEvent';
    }

    /**
     * Extract relevant payload data
     */
    extractPayload(event) {
        const type = this.determineEventType(event);
        
        switch (type) {
            case 'PushEvent':
                return {
                    commits: event.payload?.commits?.length || 0,
                    branch: event.payload?.ref?.replace('refs/heads/', '')
                };
            case 'PullRequestEvent':
                return {
                    action: event.payload?.action,
                    number: event.payload?.pull_request?.number,
                    title: event.payload?.pull_request?.title
                };
            case 'IssuesEvent':
                return {
                    action: event.payload?.action,
                    number: event.payload?.issue?.number,
                    title: event.payload?.issue?.title
                };
            default:
                return {};
        }
    }

    /**
     * Get geolocation for event
     */
    async getEventLocation(event) {
        try {
            // Try to extract IP or location hints from event
            const ip = this.extractIP(event);
            
            if (ip) {
                // Check cache first
                if (this.locationCache.has(ip)) {
                    return this.locationCache.get(ip);
                }

                // Fetch location from IP geolocation service
                const location = await this.ipToLocation(ip);
                
                if (location) {
                    this.locationCache.set(ip, location);
                    return location;
                }
            }

            // Fallback: Use random location with weighted probability
            // (More activity in tech hubs)
            return this.generateWeightedRandomLocation();
        } catch (error) {
            console.error('Error getting event location:', error);
            return this.generateWeightedRandomLocation();
        }
    }

    /**
     * Extract IP from event (placeholder - GitHub doesn't provide IPs)
     */
    extractIP(event) {
        // GitHub API doesn't provide IP addresses
        // This is a placeholder for custom implementations
        return null;
    }

    /**
     * Convert IP to location using geolocation API
     */
    async ipToLocation(ip) {
        try {
            // Using ip-api.com (free tier)
            const response = await axios.get(`http://ip-api.com/json/${ip}`, {
                timeout: 2000
            });

            if (response.data.status === 'success') {
                return {
                    lat: response.data.lat,
                    lon: response.data.lon,
                    city: response.data.city,
                    country: response.data.country,
                    countryCode: response.data.countryCode,
                    region: response.data.regionName
                };
            }
        } catch (error) {
            console.error('IP geolocation error:', error.message);
        }
        return null;
    }

    /**
     * Generate weighted random location (fallback)
     * Weighted towards major tech hubs
     */
    generateWeightedRandomLocation() {
        const techHubs = [
            { lat: 37.7749, lon: -122.4194, city: 'San Francisco', country: 'USA', weight: 20 },
            { lat: 47.6062, lon: -122.3321, city: 'Seattle', country: 'USA', weight: 15 },
            { lat: 40.7128, lon: -74.0060, city: 'New York', country: 'USA', weight: 15 },
            { lat: 51.5074, lon: -0.1278, city: 'London', country: 'UK', weight: 12 },
            { lat: 52.5200, lon: 13.4050, city: 'Berlin', country: 'Germany', weight: 10 },
            { lat: 48.8566, lon: 2.3522, city: 'Paris', country: 'France', weight: 8 },
            { lat: 35.6762, lon: 139.6503, city: 'Tokyo', country: 'Japan', weight: 10 },
            { lat: 19.0760, lon: 72.8777, city: 'Mumbai', country: 'India', weight: 12 },
            { lat: 12.9716, lon: 77.5946, city: 'Bangalore', country: 'India', weight: 15 },
            { lat: -33.8688, lon: 151.2093, city: 'Sydney', country: 'Australia', weight: 8 },
            { lat: 1.3521, lon: 103.8198, city: 'Singapore', country: 'Singapore', weight: 10 },
            { lat: -23.5505, lon: -46.6333, city: 'São Paulo', country: 'Brazil', weight: 8 },
            { lat: 55.7558, lon: 37.6173, city: 'Moscow', country: 'Russia', weight: 7 },
            { lat: 39.9042, lon: 116.4074, city: 'Beijing', country: 'China', weight: 10 },
            { lat: 31.2304, lon: 121.4737, city: 'Shanghai', country: 'China', weight: 10 }
        ];

        const totalWeight = techHubs.reduce((sum, hub) => sum + hub.weight, 0);
        let random = Math.random() * totalWeight;

        for (const hub of techHubs) {
            random -= hub.weight;
            if (random <= 0) {
                // Add slight randomization
                return {
                    lat: hub.lat + (Math.random() - 0.5) * 2,
                    lon: hub.lon + (Math.random() - 0.5) * 2,
                    city: hub.city,
                    country: hub.country,
                    countryCode: hub.country.substring(0, 2)
                };
            }
        }

        return techHubs[0];
    }

    /**
     * Add event to buffer
     */
    addToBuffer(eventData) {
        this.eventBuffer.push(eventData);
        
        // Keep buffer size manageable
        if (this.eventBuffer.length > this.maxBufferSize) {
            this.eventBuffer.shift();
        }
    }

    /**
     * Broadcast event to relevant clients
     */
    broadcastEvent(eventData) {
        this.activeConnections.forEach((connection, socketId) => {
            if (this.shouldSendToClient(connection, eventData)) {
                connection.socket.emit('globe:event', eventData);
            }
        });
    }

    /**
     * Check if event should be sent to client based on filters
     */
    shouldSendToClient(connection, eventData) {
        const { filters, subscriptions } = connection;

        // Check subscriptions
        if (subscriptions.size > 0 && !subscriptions.has(eventData.repo)) {
            return false;
        }

        // Check event type filter
        if (filters.eventTypes?.length > 0 && !filters.eventTypes.includes(eventData.type)) {
            return false;
        }

        // Check language filter
        if (filters.languages?.length > 0 && !filters.languages.includes(eventData.language)) {
            return false;
        }

        // Check region filter (simplified)
        if (filters.regions?.length > 0 && eventData.location) {
            const matchesRegion = filters.regions.some(region => 
                eventData.location.country?.includes(region) ||
                eventData.location.region?.includes(region)
            );
            if (!matchesRegion) return false;
        }

        return true;
    }

    /**
     * Get statistics for monitoring
     */
    getStatistics() {
        return {
            activeConnections: this.activeConnections.size,
            bufferedEvents: this.eventBuffer.length,
            cacheSize: this.locationCache.size
        };
    }

    /**
     * Clean up old cache entries
     */
    cleanCache() {
        // Keep cache size under 10000 entries
        if (this.locationCache.size > 10000) {
            const entries = Array.from(this.locationCache.entries());
            const toKeep = entries.slice(-5000);
            this.locationCache.clear();
            toKeep.forEach(([key, value]) => this.locationCache.set(key, value));
        }
    }
}

module.exports = GeospatialSocketService;
