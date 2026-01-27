/**
 * Geospatial Globe Controller
 * Handles API endpoints for the 3D globe visualization
 */

const GeospatialSocketService = require('../services/geospatial.socket.service');
const EventAggregator = require('../services/event-aggregator');

class GlobeController {
    constructor() {
        this.geospatialService = null;
        this.eventAggregator = null;
    }

    /**
     * Initialize services with Socket.IO instance
     */
    initializeServices(io) {
        this.geospatialService = new GeospatialSocketService(io);
        this.eventAggregator = new EventAggregator(this.geospatialService);
        
        console.log('Globe services initialized');
    }

    /**
     * Get globe statistics
     */
    async getStatistics(req, res) {
        try {
            const stats = {
                geospatial: this.geospatialService?.getStatistics() || {},
                aggregator: this.eventAggregator?.getStatistics() || {},
                timestamp: Date.now()
            };

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('Error getting globe statistics:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve statistics'
            });
        }
    }

    /**
     * Get current buffered events
     */
    async getBufferedEvents(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 100;
            const events = this.geospatialService?.eventBuffer?.slice(-limit) || [];

            res.json({
                success: true,
                data: {
                    events,
                    count: events.length,
                    timestamp: Date.now()
                }
            });
        } catch (error) {
            console.error('Error getting buffered events:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve events'
            });
        }
    }

    /**
     * Get activity heatmap data
     */
    async getHeatmapData(req, res) {
        try {
            const timeRange = parseInt(req.query.timeRange) || 3600000; // Default 1 hour
            const now = Date.now();
            
            const events = this.geospatialService?.eventBuffer || [];
            const recentEvents = events.filter(e => 
                now - new Date(e.timestamp).getTime() < timeRange
            );

            // Aggregate by location
            const heatmap = this.aggregateEventsByLocation(recentEvents);

            res.json({
                success: true,
                data: {
                    heatmap,
                    timeRange,
                    eventCount: recentEvents.length,
                    timestamp: now
                }
            });
        } catch (error) {
            console.error('Error generating heatmap:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to generate heatmap'
            });
        }
    }

    /**
     * Aggregate events by location for heatmap
     */
    aggregateEventsByLocation(events) {
        const locationMap = new Map();

        events.forEach(event => {
            if (!event.location) return;

            const key = `${Math.round(event.location.lat * 10) / 10},${Math.round(event.location.lon * 10) / 10}`;
            
            if (!locationMap.has(key)) {
                locationMap.set(key, {
                    lat: event.location.lat,
                    lon: event.location.lon,
                    count: 0,
                    events: []
                });
            }

            const location = locationMap.get(key);
            location.count++;
            location.events.push({
                type: event.type,
                repo: event.repo,
                timestamp: event.timestamp
            });
        });

        return Array.from(locationMap.values()).map(loc => ({
            lat: loc.lat,
            lon: loc.lon,
            intensity: Math.min(loc.count / 10, 1), // Normalize to 0-1
            count: loc.count
        }));
    }

    /**
     * Get regional statistics
     */
    async getRegionalStats(req, res) {
        try {
            const events = this.geospatialService?.eventBuffer || [];
            const stats = this.calculateRegionalStats(events);

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('Error calculating regional stats:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to calculate regional statistics'
            });
        }
    }

    /**
     * Calculate statistics by region
     */
    calculateRegionalStats(events) {
        const regionMap = new Map();

        events.forEach(event => {
            if (!event.location?.country) return;

            const country = event.location.country;
            
            if (!regionMap.has(country)) {
                regionMap.set(country, {
                    country,
                    countryCode: event.location.countryCode,
                    totalEvents: 0,
                    eventTypes: {},
                    languages: {},
                    topRepos: {}
                });
            }

            const region = regionMap.get(country);
            region.totalEvents++;

            // Count event types
            region.eventTypes[event.type] = (region.eventTypes[event.type] || 0) + 1;

            // Count languages
            if (event.language) {
                region.languages[event.language] = (region.languages[event.language] || 0) + 1;
            }

            // Count repos
            if (event.repo) {
                region.topRepos[event.repo] = (region.topRepos[event.repo] || 0) + 1;
            }
        });

        return Array.from(regionMap.values()).map(region => ({
            ...region,
            topEventType: this.getTopKey(region.eventTypes),
            topLanguage: this.getTopKey(region.languages),
            topRepo: this.getTopKey(region.topRepos)
        }));
    }

    /**
     * Get key with highest value from object
     */
    getTopKey(obj) {
        if (Object.keys(obj).length === 0) return null;
        return Object.entries(obj).reduce((a, b) => b[1] > a[1] ? b : a)[0];
    }

    /**
     * Simulate events for demo/testing
     */
    async simulateEvents(req, res) {
        try {
            const {
                eventsPerSecond = 10,
                duration = 60000,
                eventTypes
            } = req.body;

            if (!this.eventAggregator) {
                return res.status(503).json({
                    success: false,
                    error: 'Event aggregator not initialized'
                });
            }

            this.eventAggregator.simulateLiveEvents({
                eventsPerSecond,
                duration,
                eventTypes
            });

            res.json({
                success: true,
                message: 'Event simulation started',
                config: { eventsPerSecond, duration }
            });
        } catch (error) {
            console.error('Error starting simulation:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to start simulation'
            });
        }
    }

    /**
     * Process GitHub webhook event
     */
    async processWebhook(req, res) {
        try {
            const event = req.body;
            
            if (!this.eventAggregator) {
                return res.status(503).json({
                    success: false,
                    error: 'Event aggregator not initialized'
                });
            }

            const processed = await this.eventAggregator.addEvent(event);

            res.json({
                success: true,
                processed,
                message: processed ? 'Event queued for processing' : 'Event filtered or rate limited'
            });
        } catch (error) {
            console.error('Error processing webhook:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to process webhook'
            });
        }
    }

    /**
     * Get available filters
     */
    async getAvailableFilters(req, res) {
        try {
            const events = this.geospatialService?.eventBuffer || [];
            
            const filters = {
                eventTypes: [...new Set(events.map(e => e.type))],
                languages: [...new Set(events.map(e => e.language).filter(Boolean))],
                countries: [...new Set(events.map(e => e.location?.country).filter(Boolean))],
                repos: [...new Set(events.map(e => e.repo).filter(Boolean))]
            };

            res.json({
                success: true,
                data: filters
            });
        } catch (error) {
            console.error('Error getting filters:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve filters'
            });
        }
    }

    /**
     * Clean up resources
     */
    cleanup() {
        if (this.eventAggregator) {
            this.eventAggregator.stop();
        }
        if (this.geospatialService) {
            this.geospatialService.cleanCache();
        }
    }
}

module.exports = new GlobeController();
