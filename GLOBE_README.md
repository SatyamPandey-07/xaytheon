# 🌍 Global Pulse - Quick Start Guide

## What is Global Pulse?

A stunning 3D visualization of live GitHub activity on an interactive globe. Watch commits, pull requests, and issues light up the world in real-time!

![Demo](https://img.shields.io/badge/Status-Ready-brightgreen) ![Performance](https://img.shields.io/badge/Performance-1000%2B%20events%2Fs-blue) ![GPU](https://img.shields.io/badge/GPU-Accelerated-orange)

## 🚀 Quick Start (2 minutes)

### 1. Start the Backend
```bash
cd backend
npm install  # If not already installed
npm start    # Server runs on http://localhost:5000
```

### 2. Open the Globe
Open `global-pulse.html` in your browser or visit:
```
http://localhost:5000/global-pulse.html
```

### 3. Start Demo Events
Click the **"Start Simulation"** button in the top-right corner!

## 🎮 Controls

| Action | Control |
|--------|---------|
| Rotate Globe | Click + Drag |
| Zoom | Scroll Wheel |
| Auto-Rotate | Enabled by default |

## 🎨 Features

✅ **3D Interactive Globe** - Rotate, zoom, explore  
✅ **Live Event Arcs** - See activity connections  
✅ **GPU Acceleration** - Handles 1,000+ events/sec  
✅ **Real-time Filtering** - Filter by type, language, region  
✅ **Event Feed** - Live activity stream  
✅ **Statistics** - Real-time metrics  

## 🎯 Event Types

| Type | Color | Icon |
|------|-------|------|
| Push | 🟢 Green | Commits |
| Pull Request | 🔵 Blue | PRs |
| Issues | 🟠 Orange | Issues |
| Stars | 🟡 Yellow | Stars |
| Releases | 🟣 Purple | Releases |

## 🔧 Configuration

### Adjust Performance

Edit `global-pulse.html`:
```javascript
this.globe = new GlobeEngine(container, {
    globeRadius: 100,           // Globe size
    cameraDistance: 300,        // Camera zoom
    rotationSpeed: 0.001,       // Rotation speed
    particleCount: 5000,        // Particles (reduce for performance)
    maxArcs: 1000,             // Max simultaneous arcs
});
```

### Connect to Real GitHub Events

Add webhook in your GitHub repo:
- URL: `https://your-domain.com/api/globe/webhook`
- Content type: `application/json`
- Events: Push, Pull Request, Issues, Stars

## 📊 API Endpoints

```bash
# Get current statistics
GET /api/globe/statistics

# Get buffered events
GET /api/globe/events?limit=100

# Get heatmap data
GET /api/globe/heatmap?timeRange=3600000

# Start simulation
POST /api/globe/simulate
{
    "eventsPerSecond": 10,
    "duration": 60000
}
```

## 🐛 Troubleshooting

**Nothing appearing on the globe?**
- Check browser console for errors
- Verify backend is running
- Click "Start Simulation" button

**Performance issues?**
- Reduce `particleCount` to 2000
- Lower `maxArcs` to 500
- Disable glow: `enableGlow: false`

**WebSocket connection failed?**
- Check if port 5000 is accessible
- Verify CORS settings in backend

## 📁 File Structure

```
xaytheon/
├── global-pulse.html              # Main UI
├── GlobeEngine.js                 # Three.js engine
├── globe.css                      # Styles
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   └── globe.controller.js
│   │   ├── services/
│   │   │   ├── geospatial.socket.service.js
│   │   │   └── event-aggregator.js
│   │   └── routes/
│   │       └── globe.routes.js
└── docs/
    └── GLOBE_FEATURE.md          # Full documentation
```

## 🎓 Learn More

- **Full Documentation**: [docs/GLOBE_FEATURE.md](docs/GLOBE_FEATURE.md)
- **Three.js**: https://threejs.org/docs/
- **Socket.IO**: https://socket.io/docs/

## 🤝 Contributing

This feature was built for Issue #365 - SWoC26

**Developer**: [@SatyamPandey-07](https://github.com/SatyamPandey-07)

## 📝 License

Part of the Xaytheon project - see LICENSE.md

---

**Enjoy watching the world code! 🌍💻**
