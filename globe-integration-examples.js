/**
 * Globe Integration Examples
 * How to integrate the Global Pulse globe into other pages
 */

// ============================================================
// EXAMPLE 1: Embed Globe in Existing Page
// ============================================================

// Add this to your HTML:
/*
<div id="mini-globe" style="width: 400px; height: 400px;"></div>
<script type="module">
    import GlobeEngine from './GlobeEngine.js';
    
    const container = document.getElementById('mini-globe');
    const globe = new GlobeEngine(container, {
        globeRadius: 80,
        cameraDistance: 200,
        rotationSpeed: 0.002
    });
</script>
*/

// ============================================================
// EXAMPLE 2: Connect to WebSocket Programmatically
// ============================================================

import { io } from 'https://cdn.socket.io/4.5.4/socket.io.esm.min.js';

class GlobeIntegration {
    constructor(globeEngine) {
        this.globe = globeEngine;
        this.socket = null;
    }

    connect() {
        this.socket = io('http://localhost:5000');

        this.socket.on('connect', () => {
            console.log('Connected to globe service');
            
            // Subscribe to specific repositories
            this.socket.emit('globe:subscribe', [
                'facebook/react',
                'microsoft/vscode',
                'torvalds/linux'
            ]);
            
            // Set filters
            this.socket.emit('globe:filter', {
                eventTypes: ['PushEvent', 'PullRequestEvent'],
                languages: ['JavaScript', 'TypeScript']
            });
        });

        this.socket.on('globe:event', (event) => {
            this.globe.queueEvent(event);
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

// Usage:
// const integration = new GlobeIntegration(globeEngine);
// integration.connect();

// ============================================================
// EXAMPLE 3: Fetch and Display Events from REST API
// ============================================================

async function displayRecentEvents(globeEngine) {
    try {
        const response = await fetch('/api/globe/events?limit=50');
        const data = await response.json();
        
        if (data.success) {
            data.data.events.forEach(event => {
                globeEngine.queueEvent(event);
            });
        }
    } catch (error) {
        console.error('Failed to fetch events:', error);
    }
}

// ============================================================
// EXAMPLE 4: Custom Event Handling
// ============================================================

class CustomGlobeHandler {
    constructor(globeEngine) {
        this.globe = globeEngine;
        this.eventCallbacks = [];
    }

    onEvent(callback) {
        this.eventCallbacks.push(callback);
    }

    processEvent(event) {
        // Add to globe
        this.globe.queueEvent(event);
        
        // Notify callbacks
        this.eventCallbacks.forEach(cb => cb(event));
        
        // Custom logic
        if (event.type === 'ReleaseEvent') {
            console.log(`🎉 New release: ${event.repo}`);
            this.showNotification(`New release: ${event.repo}`);
        }
    }

    showNotification(message) {
        // Your notification logic here
        console.log(message);
    }
}

// ============================================================
// EXAMPLE 5: Dashboard Widget
// ============================================================

class GlobeDashboardWidget {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.globe = null;
        this.stats = {
            eventsToday: 0,
            topLanguage: '',
            topRegion: ''
        };
    }

    async init() {
        // Create compact globe
        this.globe = new GlobeEngine(this.container, {
            globeRadius: 60,
            cameraDistance: 150,
            rotationSpeed: 0.003,
            maxArcs: 100,
            particleCount: 1000
        });

        // Fetch initial stats
        await this.updateStats();
        
        // Update every 30 seconds
        setInterval(() => this.updateStats(), 30000);
    }

    async updateStats() {
        try {
            const response = await fetch('/api/globe/statistics');
            const data = await response.json();
            
            if (data.success) {
                this.stats = {
                    eventsToday: data.data.aggregator?.totalProcessed || 0,
                    activeEvents: data.data.aggregator?.pendingEvents || 0
                };
                
                this.renderStats();
            }
        } catch (error) {
            console.error('Failed to update stats:', error);
        }
    }

    renderStats() {
        // Update your UI with stats
        console.log('Stats updated:', this.stats);
    }
}

// ============================================================
// EXAMPLE 6: Repository-Specific Globe
// ============================================================

class RepoGlobe {
    constructor(container, repoFullName) {
        this.repoFullName = repoFullName;
        this.globe = new GlobeEngine(container);
        this.socket = null;
    }

    connect() {
        this.socket = io('http://localhost:5000');

        this.socket.on('connect', () => {
            // Only subscribe to this specific repo
            this.socket.emit('globe:subscribe', [this.repoFullName]);
        });

        this.socket.on('globe:event', (event) => {
            // Only show events for our repo
            if (event.repo === this.repoFullName) {
                this.globe.queueEvent(event);
            }
        });
    }
}

// Usage:
// const repoGlobe = new RepoGlobe(container, 'facebook/react');
// repoGlobe.connect();

// ============================================================
// EXAMPLE 7: Heatmap Visualization
// ============================================================

async function displayHeatmap(globeEngine) {
    try {
        const response = await fetch('/api/globe/heatmap?timeRange=3600000');
        const data = await response.json();
        
        if (data.success) {
            const heatmap = data.data.heatmap;
            
            // Add heatmap points to globe
            heatmap.forEach(point => {
                // Convert to event format
                const event = {
                    location: {
                        lat: point.lat,
                        lon: point.lon
                    },
                    type: 'HeatmapPoint',
                    intensity: point.intensity
                };
                
                globeEngine.queueEvent(event);
            });
        }
    } catch (error) {
        console.error('Failed to display heatmap:', error);
    }
}

// ============================================================
// EXAMPLE 8: Event Filtering UI
// ============================================================

class GlobeFilterPanel {
    constructor(socket) {
        this.socket = socket;
        this.filters = {
            eventTypes: [],
            languages: [],
            regions: []
        };
    }

    setupEventListeners() {
        // Event type checkboxes
        document.querySelectorAll('.event-filter').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.filters.eventTypes.push(e.target.value);
                } else {
                    this.filters.eventTypes = this.filters.eventTypes.filter(
                        t => t !== e.target.value
                    );
                }
                this.updateFilters();
            });
        });
    }

    updateFilters() {
        this.socket.emit('globe:filter', this.filters);
    }
}

// ============================================================
// EXAMPLE 9: Analytics Integration
// ============================================================

class GlobeAnalytics {
    constructor(globeEngine) {
        this.globe = globeEngine;
        this.analytics = {
            totalEvents: 0,
            eventsByType: {},
            eventsByRegion: {},
            peakTime: null
        };
    }

    trackEvent(event) {
        this.analytics.totalEvents++;
        
        // Track by type
        this.analytics.eventsByType[event.type] = 
            (this.analytics.eventsByType[event.type] || 0) + 1;
        
        // Track by region
        if (event.location?.country) {
            this.analytics.eventsByRegion[event.location.country] = 
                (this.analytics.eventsByRegion[event.location.country] || 0) + 1;
        }
        
        // Add to globe
        this.globe.queueEvent(event);
    }

    getReport() {
        return {
            summary: {
                total: this.analytics.totalEvents,
                types: Object.keys(this.analytics.eventsByType).length,
                regions: Object.keys(this.analytics.eventsByRegion).length
            },
            topType: this.getTopKey(this.analytics.eventsByType),
            topRegion: this.getTopKey(this.analytics.eventsByRegion)
        };
    }

    getTopKey(obj) {
        return Object.entries(obj)
            .sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';
    }
}

// ============================================================
// EXAMPLE 10: Performance Monitoring
// ============================================================

class GlobePerformanceMonitor {
    constructor(globeEngine) {
        this.globe = globeEngine;
        this.metrics = {
            fps: 0,
            memory: 0,
            latency: 0
        };
    }

    startMonitoring() {
        let lastTime = performance.now();
        let frames = 0;

        const monitor = () => {
            frames++;
            const now = performance.now();
            
            if (now >= lastTime + 1000) {
                this.metrics.fps = Math.round(frames * 1000 / (now - lastTime));
                frames = 0;
                lastTime = now;
                
                // Get globe stats
                const stats = this.globe.getStatistics();
                
                // Display metrics
                this.displayMetrics({
                    fps: this.metrics.fps,
                    activeArcs: stats.activeArcs,
                    activePulses: stats.activePulses,
                    queuedEvents: stats.queuedEvents
                });
            }
            
            requestAnimationFrame(monitor);
        };
        
        monitor();
    }

    displayMetrics(metrics) {
        console.log('Performance:', metrics);
    }
}

// ============================================================
// USAGE EXAMPLES SUMMARY
// ============================================================

/*
1. Basic Integration:
   import GlobeEngine from './GlobeEngine.js';
   const globe = new GlobeEngine(container);

2. With WebSocket:
   const integration = new GlobeIntegration(globe);
   integration.connect();

3. Dashboard Widget:
   const widget = new GlobeDashboardWidget('globe-widget');
   widget.init();

4. Repository-Specific:
   const repoGlobe = new RepoGlobe(container, 'owner/repo');
   repoGlobe.connect();

5. With Analytics:
   const analytics = new GlobeAnalytics(globe);
   socket.on('globe:event', e => analytics.trackEvent(e));

6. Performance Monitoring:
   const monitor = new GlobePerformanceMonitor(globe);
   monitor.startMonitoring();
*/

export {
    GlobeIntegration,
    CustomGlobeHandler,
    GlobeDashboardWidget,
    RepoGlobe,
    GlobeFilterPanel,
    GlobeAnalytics,
    GlobePerformanceMonitor
};
