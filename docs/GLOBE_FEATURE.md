# 🌍 Hyper-Scale 3D Geospatial Activity Globe

## Overview

The **Global Pulse** feature is a stunning, high-performance 3D visualization system that displays live GitHub activity on an interactive globe. Built with Three.js and WebSocket technology, it can handle 1,000+ simultaneous events using GPU-accelerated rendering.

## ✨ Features

### Core Capabilities
- **3D Interactive Globe**: Fully rotatable and zoomable Earth representation
- **Live Event Arcs**: Visual arcs and pulses showing real-time GitHub activity
- **Global Heatmap**: Toggleable layer showing regional activity intensity
- **Event Filtering**: Real-time filtering by event type, language, and region
- **Supersonic Performance**: GPU-accelerated particle system handles massive event volumes
- **Real-time WebSocket**: Live streaming of GitHub events with sub-second latency

### Visualization Elements
- Event arcs connecting geographic locations
- Pulsing indicators at event origins
- GPU-accelerated particle effects (5,000+ particles)
- Atmospheric glow effects
- Dynamic starfield background
- Color-coded event types

## 🏗️ Architecture

### Backend Components

#### 1. **Geospatial Socket Service** (`backend/src/services/geospatial.socket.service.js`)
- Manages WebSocket connections for globe clients
- Maps IP addresses to geographic locations
- Broadcasts events to filtered clients
- Maintains location cache for performance
- Supports weighted random location generation

**Key Methods:**
```javascript
processGitHubEvent(event)    // Process and broadcast GitHub event
updateClientFilters(filters) // Update client filter preferences
getStatistics()              // Get service statistics
```

#### 2. **Event Aggregator** (`backend/src/services/event-aggregator.js`)
- Batches high-frequency GitHub webhooks
- Deduplicates events
- Rate limiting (1,000 events/second)
- Priority-based event processing
- Event enrichment with trending scores

**Key Methods:**
```javascript
addEvent(event)              // Add event to processing queue
processBatch()               // Process batched events
simulateLiveEvents(config)   // Simulate events for demo
```

#### 3. **Globe Controller** (`backend/src/controllers/globe.controller.js`)
- REST API endpoints for globe data
- Statistics and heatmap generation
- Regional analytics
- Event simulation controls

**API Endpoints:**
- `GET /api/globe/statistics` - Get current statistics
- `GET /api/globe/events` - Get buffered events
- `GET /api/globe/heatmap` - Get heatmap data
- `GET /api/globe/regional-stats` - Get regional statistics
- `POST /api/globe/simulate` - Start event simulation
- `POST /api/globe/webhook` - Process GitHub webhook

### Frontend Components

#### 1. **GlobeEngine.js** (`GlobeEngine.js`)
High-performance Three.js engine for 3D visualization.

**Key Features:**
- Custom shaders for globe rendering
- GPU-accelerated particle system (5,000 particles)
- Arc and pulse visualization
- Atmospheric effects with glow shaders
- Starfield background
- Performance monitoring

**Key Methods:**
```javascript
addEvent(event)              // Add event visualization
queueEvent(event)            // Queue event for batch processing
latLonToVector3(lat, lon)    // Convert coordinates to 3D position
getStatistics()              // Get rendering statistics
```

**Performance Optimizations:**
- Geometry instancing for particles
- Custom shaders for effects
- Event queue batching (10 events/frame)
- Object pooling for arcs and pulses
- Automatic cleanup of old visualizations

#### 2. **Global Pulse UI** (`global-pulse.html`)
Full-featured web interface with controls and live feed.

**UI Components:**
- Real-time event feed
- Filter controls (event types, languages, regions)
- Live statistics panel
- Event simulation controls
- Performance indicators

## 🚀 Setup & Installation

### Prerequisites
```bash
# Backend dependencies
cd backend
npm install socket.io axios

# Frontend uses CDN imports (no installation needed)
```

### Backend Integration

1. **Routes are already registered** in `backend/src/app.js`:
```javascript
const globeRoutes = require("./routes/globe.routes");
app.use("/api/globe", globeRoutes);
```

2. **Socket.IO initialization** in `backend/src/socket/socket.server.js`:
```javascript
const globeController = require("../controllers/globe.controller");
globeController.initializeServices(io);
```

### Running the Application

1. **Start the backend:**
```bash
cd backend
npm start
```

2. **Access the globe:**
Open `global-pulse.html` in a browser or navigate to your deployed URL.

## 🎮 Usage

### Basic Usage

1. **View Live Events**: Open the page and events will start appearing automatically
2. **Filter Events**: Click filter buttons to show/hide specific event types, languages, or regions
3. **Simulate Events**: Click "Start Simulation" to generate demo events
4. **Interact with Globe**: 
   - Rotate: Click and drag
   - Zoom: Scroll wheel
   - Pan: Right-click and drag

### WebSocket Connection

The client automatically connects to the WebSocket server:

```javascript
const socket = io('http://localhost:5000');

// Subscribe to all events
socket.emit('globe:subscribe', ['all']);

// Listen for events
socket.on('globe:event', (event) => {
    console.log('New event:', event);
});

// Update filters
socket.emit('globe:filter', {
    eventTypes: ['PushEvent', 'PullRequestEvent'],
    languages: ['JavaScript', 'Python'],
    regions: ['USA', 'Europe']
});
```

### Event Simulation

```javascript
// Via API
fetch('/api/globe/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        eventsPerSecond: 10,
        duration: 60000 // 1 minute
    })
});
```

## 📊 Event Types

Supported GitHub event types with color coding:

| Event Type | Color | Description |
|------------|-------|-------------|
| PushEvent | 🟢 Green | Code commits |
| PullRequestEvent | 🔵 Blue | Pull requests |
| IssuesEvent | 🟠 Orange | Issues |
| StarEvent | 🟡 Yellow | Repository stars |
| ReleaseEvent | 🟣 Purple | Version releases |

## 🎨 Customization

### Globe Appearance

Modify `GlobeEngine.js` constructor options:

```javascript
const globe = new GlobeEngine(container, {
    globeRadius: 100,           // Globe size
    cameraDistance: 300,        // Initial camera position
    rotationSpeed: 0.001,       // Auto-rotation speed
    maxArcs: 1000,             // Maximum simultaneous arcs
    maxPulses: 500,            // Maximum simultaneous pulses
    particleCount: 5000,       // Particle system capacity
    enableGlow: true,          // Atmospheric glow
    enableHeatmap: true        // Heatmap overlay
});
```

### Event Colors

Modify the `getEventColor()` method in `GlobeEngine.js`:

```javascript
getEventColor(eventType) {
    const colors = {
        PushEvent: 0x00ff88,
        PullRequestEvent: 0x4488ff,
        IssuesEvent: 0xff8844,
        // Add custom colors
    };
    return colors[eventType] || colors.default;
}
```

### Filtering Logic

Extend filter capabilities in `geospatial.socket.service.js`:

```javascript
shouldSendToClient(connection, eventData) {
    // Add custom filtering logic
    if (customCondition) {
        return false;
    }
    return true;
}
```

## 🔧 Configuration

### Environment Variables

```bash
# Backend
PORT=5000
FRONTEND_URL=http://localhost:8080
NODE_ENV=production

# Socket.IO
SOCKET_TIMEOUT=60000
MAX_CONNECTIONS=1000
```

### Performance Tuning

#### Backend
```javascript
// event-aggregator.js
{
    batchInterval: 100,        // Batch processing interval (ms)
    maxBatchSize: 50,         // Events per batch
    eventTTL: 60000,          // Event cache lifetime (ms)
    maxEvents: 1000           // Rate limit (events/second)
}
```

#### Frontend
```javascript
// GlobeEngine.js
{
    maxArcs: 1000,            // Reduce for lower-end devices
    maxPulses: 500,
    particleCount: 5000,      // Reduce for better performance
}
```

## 🐛 Troubleshooting

### Common Issues

**1. Events not appearing:**
- Check WebSocket connection in browser console
- Verify backend is running
- Check filter settings (may be filtering all events)

**2. Performance issues:**
- Reduce `particleCount` in GlobeEngine options
- Lower `maxArcs` and `maxPulses`
- Disable glow effects: `enableGlow: false`

**3. WebSocket connection failed:**
- Verify CORS settings in backend
- Check `socketUrl` in `global-pulse.html`
- Ensure backend port matches configuration

### Debug Mode

Enable performance monitoring:

```javascript
// In global-pulse.html
.performance-indicator.show {
    display: block;
}
```

View console logs:
```javascript
console.log('Globe stats:', globe.getStatistics());
console.log('Socket connected:', socket.connected);
```

## 📈 Performance Metrics

### Target Performance
- **60 FPS**: Stable frame rate with 1,000+ events
- **<50ms latency**: Event-to-visualization time
- **<100MB memory**: Client-side memory footprint
- **1,000 events/sec**: Backend processing capacity

### Monitoring

The system provides real-time statistics:

```javascript
// Get statistics
const stats = globe.getStatistics();
console.log('Active arcs:', stats.activeArcs);
console.log('Active pulses:', stats.activePulses);
console.log('Queued events:', stats.queuedEvents);
```

## 🔒 Security

### Rate Limiting
- 1,000 events/second maximum
- Automatic event deduplication
- Client connection limits

### WebSocket Security
- Optional JWT authentication (configure in socket.server.js)
- CORS protection
- Input validation on all endpoints

## 🌐 Browser Compatibility

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 90+ | ✅ Full |
| Firefox | 88+ | ✅ Full |
| Safari | 14+ | ✅ Full |
| Edge | 90+ | ✅ Full |

**Requirements:**
- WebGL 2.0 support
- WebSocket support
- ES6 module support

## 📝 API Reference

### WebSocket Events

#### Client → Server

```javascript
// Subscribe to repositories
socket.emit('globe:subscribe', ['facebook/react', 'microsoft/vscode']);

// Update filters
socket.emit('globe:filter', {
    eventTypes: ['PushEvent'],
    languages: ['JavaScript'],
    regions: ['USA']
});

// Unsubscribe
socket.emit('globe:unsubscribe', ['facebook/react']);
```

#### Server → Client

```javascript
// Single event
socket.on('globe:event', (event) => {
    // Process event
});

// Batch events
socket.on('globe:events:batch', (data) => {
    data.events.forEach(event => {
        // Process event
    });
});
```

### REST API

All endpoints return JSON:

```javascript
{
    "success": true,
    "data": { /* response data */ },
    "timestamp": 1234567890
}
```

## 🚢 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure CORS for production domain
- [ ] Enable HTTPS for WebSocket connections
- [ ] Set up CDN for Three.js (optional)
- [ ] Configure rate limiting
- [ ] Enable monitoring and logging
- [ ] Test with production GitHub webhook
- [ ] Optimize asset delivery

### Docker Deployment

```dockerfile
FROM node:18
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --production
COPY backend/ ./
EXPOSE 5000
CMD ["npm", "start"]
```

## 🤝 Contributing

When contributing to the globe feature:

1. Test performance with 1,000+ events
2. Ensure WebSocket reconnection works
3. Test on multiple browsers
4. Update documentation for API changes
5. Follow existing code style

## 📄 License

This feature is part of the Xaytheon project. See main LICENSE.md for details.

## 🎯 Future Enhancements

- [ ] Real GitHub webhook integration
- [ ] Historical event replay
- [ ] Custom heatmap overlays
- [ ] VR/AR globe view
- [ ] Event clustering for dense regions
- [ ] Predictive analytics overlay
- [ ] Multi-globe comparison view
- [ ] Export visualization as video
- [ ] Real IP geolocation API integration
- [ ] Enhanced shaders for aurora effects

## 📞 Support

For issues or questions:
- GitHub Issues: [Issue #365](https://github.com/Saatvik-GT/xaytheon/issues/365)
- Documentation: This file
- Code Examples: See `global-pulse.html` for integration examples

---

**Built with ❤️ by [@SatyamPandey-07](https://github.com/SatyamPandey-07) for SWoC26**
