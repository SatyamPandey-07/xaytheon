/**
 * XAYTHEON - Real-Time Collaborative Incident War Room
 * 
 * 3D multiplayer coordination space with WebSocket synchronization
 * for cursor positions, camera views, and incident pins.
 */

class IncidentWarRoom {
    constructor() {
        this.canvas = document.getElementById('war-room-canvas');
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.socket = null;
        this.incidentId = 'INCIDENT-2026-001';
        this.userId = this.generateUserId();

        // Collaborative state
        this.remoteCursors = new Map();
        this.incidentPins = new Map();
        this.participants = new Set();
        this.cameraSyncEnabled = false;
        this.cursorSyncEnabled = true;

        // 3D Objects
        this.nodes = [];
        this.links = [];

        // Mock topology
        this.topology = [
            { id: 'gateway', name: 'API Gateway', pos: [0, 40, 0], type: 'core', status: 'healthy' },
            { id: 'auth', name: 'Auth Service', pos: [-40, 10, -20], type: 'service', status: 'degraded' },
            { id: 'user', name: 'User Service', pos: [40, 10, -20], type: 'service', status: 'healthy' },
            { id: 'payment', name: 'Payment Engine', pos: [0, 10, 40], type: 'critical', status: 'down' },
            { id: 'db', name: 'DB Master', pos: [0, -30, 0], type: 'data', status: 'healthy' },
            { id: 'redis', name: 'Redis Cache', pos: [50, -10, 50], type: 'cache', status: 'healthy' },
        ];

        this.connections = [
            ['gateway', 'auth'], ['gateway', 'user'], ['gateway', 'payment'],
            ['auth', 'db'], ['user', 'db'], ['payment', 'db'],
            ['user', 'redis']
        ];

        this.init();
    }

    generateUserId() {
        return `user_${Math.random().toString(36).substr(2, 9)}`;
    }

    async init() {
        this.setupScene();
        this.createTopology();
        this.setupLighting();
        this.setupControls();
        this.animate();

        await this.connectWebSocket();
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050508);
        this.scene.fog = new THREE.FogExp2(0x050508, 0.003);

        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            2000
        );
        this.camera.position.set(120, 100, 120);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        window.addEventListener('resize', () => this.onWindowResize());
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0x3b82f6, 1, 500);
        pointLight.position.set(50, 100, 50);
        this.scene.add(pointLight);

        const redLight = new THREE.PointLight(0xef4444, 0.8, 300);
        redLight.position.set(-50, -50, -50);
        this.scene.add(redLight);
    }

    createTopology() {
        const nodeGeometry = new THREE.SphereGeometry(3, 32, 32);

        // Create nodes
        this.topology.forEach(data => {
            const color = this.getStatusColor(data.status);
            const material = new THREE.MeshPhongMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: 0.6,
                shininess: 100
            });

            const node = new THREE.Mesh(nodeGeometry, material);
            node.position.set(...data.pos);
            node.userData = data;

            this.scene.add(node);
            this.nodes.push(node);

            // Add pulsing animation for down nodes
            if (data.status === 'down') {
                gsap.to(node.scale, {
                    x: 1.5,
                    y: 1.5,
                    z: 1.5,
                    duration: 0.8,
                    repeat: -1,
                    yoyo: true,
                    ease: 'power2.inOut'
                });
            }
        });

        // Create connections
        this.connections.forEach(([sourceId, targetId]) => {
            const source = this.topology.find(n => n.id === sourceId);
            const target = this.topology.find(n => n.id === targetId);

            if (source && target) {
                const points = [
                    new THREE.Vector3(...source.pos),
                    new THREE.Vector3(...target.pos)
                ];

                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                const material = new THREE.LineBasicMaterial({
                    color: 0x3b82f6,
                    transparent: true,
                    opacity: 0.3
                });

                const line = new THREE.Line(geometry, material);
                this.scene.add(line);
                this.links.push(line);
            }
        });
    }

    getStatusColor(status) {
        const colors = {
            'healthy': 0x10b981,
            'degraded': 0xfbbf24,
            'down': 0xef4444
        };
        return colors[status] || 0x64748b;
    }

    setupControls() {
        // Create pin button
        document.getElementById('create-pin-btn').addEventListener('click', () => {
            this.createIncidentPin();
        });

        // Camera sync toggle
        document.getElementById('toggle-camera-sync').addEventListener('click', (e) => {
            this.cameraSyncEnabled = !this.cameraSyncEnabled;
            e.target.classList.toggle('active');
        });

        // Cursor sync toggle
        document.getElementById('toggle-cursor-sync').addEventListener('click', (e) => {
            this.cursorSyncEnabled = !this.cursorSyncEnabled;
            e.target.classList.toggle('active');
        });

        // Status input
        document.getElementById('send-status-btn').addEventListener('click', () => {
            this.sendStatusUpdate();
        });

        document.getElementById('status-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendStatusUpdate();
        });

        // Mouse move for cursor sync
        let lastCursorUpdate = 0;
        window.addEventListener('mousemove', (e) => {
            if (this.cursorSyncEnabled && Date.now() - lastCursorUpdate > 50) {
                this.broadcastCursorPosition(e);
                lastCursorUpdate = Date.now();
            }
        });

        // Camera change for sync
        let lastCameraUpdate = 0;
        this.controls.addEventListener('change', () => {
            if (this.cameraSyncEnabled && Date.now() - lastCameraUpdate > 100) {
                this.broadcastCameraPosition();
                lastCameraUpdate = Date.now();
            }
        });
    }

    async connectWebSocket() {
        try {
            // Get auth token (mock for demo)
            const token = localStorage.getItem('auth_token') || 'demo_token';

            this.socket = io('http://localhost:3000', {
                auth: { token }
            });

            this.socket.on('connect', () => {
                console.log('✅ Connected to War Room');
                this.updateConnectionStatus('connected');
                this.socket.emit('join_war_room', this.incidentId);
            });

            this.socket.on('disconnect', () => {
                console.log('❌ Disconnected from War Room');
                this.updateConnectionStatus('disconnected');
            });

            // War Room events
            this.socket.on('war_room_user_joined', (data) => {
                this.onUserJoined(data);
            });

            this.socket.on('war_room_user_left', (data) => {
                this.onUserLeft(data);
            });

            this.socket.on('war_room_participants', (data) => {
                this.updateParticipants(data);
            });

            this.socket.on('war_room_cursor_update', (data) => {
                this.updateRemoteCursor(data);
            });

            this.socket.on('war_room_camera_update', (data) => {
                this.updateRemoteCamera(data);
            });

            this.socket.on('war_room_pin_created', (pin) => {
                this.renderIncidentPin(pin);
            });

            this.socket.on('war_room_pin_removed', (data) => {
                this.removeIncidentPin(data.pinId);
            });

            this.socket.on('war_room_status_broadcast', (data) => {
                this.addStatusMessage(data);
            });

        } catch (error) {
            console.error('Failed to connect to War Room:', error);
            this.updateConnectionStatus('disconnected');
        }
    }

    broadcastCursorPosition(e) {
        if (!this.socket) return;

        const x = (e.clientX / window.innerWidth) * 2 - 1;
        const y = -(e.clientY / window.innerHeight) * 2 + 1;

        this.socket.emit('war_room_cursor_move', {
            position: { x, y },
            color: '#60a5fa'
        });
    }

    broadcastCameraPosition() {
        if (!this.socket) return;

        this.socket.emit('war_room_camera_move', {
            position: this.camera.position.toArray(),
            target: this.controls.target.toArray()
        });
    }

    updateRemoteCursor(data) {
        if (!this.cursorSyncEnabled) return;

        let cursor = this.remoteCursors.get(data.userId);

        if (!cursor) {
            // Create new cursor orb
            const geometry = new THREE.SphereGeometry(2, 16, 16);
            const material = new THREE.MeshBasicMaterial({
                color: data.color,
                transparent: true,
                opacity: 0.6
            });
            cursor = new THREE.Mesh(geometry, material);
            this.scene.add(cursor);
            this.remoteCursors.set(data.userId, cursor);
        }

        // Update position (convert 2D screen to 3D world)
        const vector = new THREE.Vector3(data.position.x, data.position.y, 0.5);
        vector.unproject(this.camera);
        const dir = vector.sub(this.camera.position).normalize();
        const distance = 50;
        const pos = this.camera.position.clone().add(dir.multiplyScalar(distance));

        gsap.to(cursor.position, {
            x: pos.x,
            y: pos.y,
            z: pos.z,
            duration: 0.1,
            ease: 'none'
        });
    }

    updateRemoteCamera(data) {
        // Visual indicator only (don't force camera movement)
        console.log(`User ${data.userId} moved camera to:`, data.position);
    }

    createIncidentPin() {
        // For demo, pin the first down node
        const downNode = this.topology.find(n => n.status === 'down');
        if (!downNode) return;

        const message = prompt('Enter pin message:');
        if (!message) return;

        this.socket.emit('war_room_create_pin', {
            position: downNode.pos,
            nodeId: downNode.id,
            message: message,
            severity: 'critical'
        });
    }

    renderIncidentPin(pin) {
        // Create 3D pin marker
        const geometry = new THREE.ConeGeometry(2, 8, 8);
        const material = new THREE.MeshPhongMaterial({
            color: this.getPinColor(pin.severity),
            emissive: this.getPinColor(pin.severity),
            emissiveIntensity: 0.8
        });

        const pinMesh = new THREE.Mesh(geometry, material);
        pinMesh.position.set(...pin.position);
        pinMesh.position.y += 10; // Offset above node
        pinMesh.userData = pin;

        this.scene.add(pinMesh);
        this.incidentPins.set(pin.id, pinMesh);

        // Animate
        gsap.from(pinMesh.scale, {
            x: 0,
            y: 0,
            z: 0,
            duration: 0.5,
            ease: 'back.out'
        });

        // Add to UI
        this.addPinToList(pin);
    }

    getPinColor(severity) {
        const colors = {
            'critical': 0xef4444,
            'high': 0xf97316,
            'medium': 0xfbbf24,
            'low': 0x3b82f6
        };
        return colors[severity] || 0x64748b;
    }

    addPinToList(pin) {
        const list = document.getElementById('pins-list');

        // Remove empty state
        const emptyState = list.querySelector('.empty-state');
        if (emptyState) emptyState.remove();

        const pinEl = document.createElement('div');
        pinEl.className = `pin-item ${pin.severity}`;
        pinEl.innerHTML = `
            <div class="pin-header">
                <span class="pin-user">User ${pin.userId.substr(-4)}</span>
                <span class="pin-time">${new Date(pin.timestamp).toLocaleTimeString()}</span>
            </div>
            <div class="pin-message">${pin.message}</div>
            <div class="pin-node">📍 ${pin.nodeId}</div>
            <button class="pin-remove" onclick="warRoom.removePin('${pin.id}')">Remove</button>
        `;

        list.prepend(pinEl);
    }

    removePin(pinId) {
        this.socket.emit('war_room_remove_pin', pinId);
    }

    removeIncidentPin(pinId) {
        const pin = this.incidentPins.get(pinId);
        if (pin) {
            this.scene.remove(pin);
            this.incidentPins.delete(pinId);
        }

        // Remove from UI
        const list = document.getElementById('pins-list');
        const pinEls = list.querySelectorAll('.pin-item');
        pinEls.forEach(el => {
            if (el.querySelector('.pin-remove').onclick.toString().includes(pinId)) {
                el.remove();
            }
        });
    }

    sendStatusUpdate() {
        const input = document.getElementById('status-input');
        const message = input.value.trim();
        if (!message) return;

        this.socket.emit('war_room_status_update', {
            status: 'info',
            message: message
        });

        input.value = '';
    }

    addStatusMessage(data) {
        const messages = document.getElementById('status-messages');
        const msgEl = document.createElement('div');
        msgEl.className = `status-msg ${data.status}`;

        const time = new Date(data.timestamp).toLocaleTimeString();
        msgEl.innerHTML = `
            <span class="timestamp">${time}</span>
            <span class="user-name">User ${data.userId.substr(-4)}:</span>
            <span class="message">${data.message}</span>
        `;

        messages.appendChild(msgEl);
        messages.scrollTop = messages.scrollHeight;
    }

    onUserJoined(data) {
        this.participants.add(data.userId);
        this.updateParticipantCount();

        this.addStatusMessage({
            status: 'system',
            userId: 'SYSTEM',
            message: `User ${data.userId.substr(-4)} joined the war room`,
            timestamp: data.timestamp
        });
    }

    onUserLeft(data) {
        this.participants.delete(data.userId);
        this.updateParticipantCount();

        // Remove cursor
        const cursor = this.remoteCursors.get(data.userId);
        if (cursor) {
            this.scene.remove(cursor);
            this.remoteCursors.delete(data.userId);
        }

        this.addStatusMessage({
            status: 'system',
            userId: 'SYSTEM',
            message: `User ${data.userId.substr(-4)} left the war room`,
            timestamp: data.timestamp
        });
    }

    updateParticipants(data) {
        document.getElementById('participant-count').textContent = data.count;
    }

    updateParticipantCount() {
        document.getElementById('participant-count').textContent = this.participants.size + 1;
    }

    updateConnectionStatus(status) {
        const statusEl = document.getElementById('connection-status');
        const dot = statusEl.querySelector('.status-dot');
        const text = statusEl.querySelector('span');

        dot.className = `status-dot ${status}`;

        const messages = {
            'connecting': 'Connecting...',
            'connected': 'Connected',
            'disconnected': 'Disconnected'
        };

        text.textContent = messages[status] || status;
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        this.controls.update();

        // Rotate cursor orbs
        this.remoteCursors.forEach(cursor => {
            cursor.rotation.y += 0.05;
        });

        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize
let warRoom;
document.addEventListener('DOMContentLoaded', () => {
    warRoom = new IncidentWarRoom();
});
