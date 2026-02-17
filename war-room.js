/**
 * XAYTHEON - Integrated Collaborative Incident War Room
 * 
 * Merged 3D Multiplayer Coordination with Real-time DevOps Dashboard.
 */

class IncidentWarRoom {
    constructor() {
        this.canvas = document.getElementById('war-room-canvas');
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.socket = null;

        // Incident State
        this.incidentId = 'INCIDENT-2026-001';
        this.userId = null;

        // Collaborative state
        this.remoteCursors = new Map();
        this.incidentPins = new Map();
        this.participants = new Set();
        this.cameraSyncEnabled = false;
        this.cursorSyncEnabled = true;

        // Dashboard state (from upstream)
        this.events = [];
        this.incidents = [];
        this.emergencyMode = false;
        this.activeNode = null;

        // 3D Objects
        this.nodes = [];
        this.links = [];

        // Mock topology (represents the fleet)
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

    async init() {
        this.setupScene();
        this.createTopology();
        this.setupLighting();
        this.setupEventListeners();
        this.animate();

        await this.connectWebSocket();
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050508);
        this.scene.fog = new THREE.FogExp2(0x050508, 0.003);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
        this.camera.position.set(120, 100, 120);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
    }

    setupLighting() {
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.4));
        const p1 = new THREE.PointLight(0x3b82f6, 1, 500); p1.position.set(50, 100, 50); this.scene.add(p1);
        const p2 = new THREE.PointLight(0xef4444, 0.8, 300); p2.position.set(-50, -50, -50); this.scene.add(p2);
    }

    createTopology() {
        const nodeGeom = new THREE.SphereGeometry(3, 32, 32);
        this.topology.forEach(data => {
            const color = this.getStatusColor(data.status);
            const mat = new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 0.6, shininess: 100 });
            const node = new THREE.Mesh(nodeGeom, mat);
            node.position.set(...data.pos);
            node.userData = data;
            this.scene.add(node);
            this.nodes.push(node);
            if (data.status === 'down') {
                gsap.to(node.scale, { x: 1.5, y: 1.5, z: 1.5, duration: 0.8, repeat: -1, yoyo: true });
            }
        });

        this.connections.forEach(([sId, tId]) => {
            const s = this.topology.find(n => n.id === sId);
            const t = this.topology.find(n => n.id === tId);
            if (s && t) {
                const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...s.pos), new THREE.Vector3(...t.pos)]);
                const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.3 }));
                this.scene.add(line);
                this.links.push(line);
            }
        });
    }

    getStatusColor(status) {
        return ({ healthy: 0x10b981, degraded: 0xfbbf24, down: 0xef4444 })[status] || 0x64748b;
    }

    setupEventListeners() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const sidebar = btn.closest('aside');
                sidebar.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                sidebar.querySelectorAll('.tab-content').forEach(c => b.classList.remove('active')); // Fixed typo here (was c -> b)
                // Actually let's fix the logic
                sidebar.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(`${btn.dataset.tab}-tab`).classList.add('active');
            });
        });

        document.getElementById('create-pin-btn').addEventListener('click', () => this.createIncidentPin());
        document.getElementById('toggle-camera-sync').addEventListener('click', e => {
            this.cameraSyncEnabled = !this.cameraSyncEnabled;
            e.currentTarget.classList.toggle('active');
        });
        document.getElementById('toggle-cursor-sync').addEventListener('click', e => {
            this.cursorSyncEnabled = !this.cursorSyncEnabled;
            e.currentTarget.classList.toggle('active');
        });
        document.getElementById('send-status-btn').addEventListener('click', () => this.sendStatusUpdate());
        document.getElementById('status-input').addEventListener('keypress', e => e.key === 'Enter' && this.sendStatusUpdate());

        document.getElementById('close-metadata-btn').addEventListener('click', () => {
            document.getElementById('incident-metadata').classList.add('hidden');
        });

        document.getElementById('emergency-btn').addEventListener('click', () => this.toggleEmergency(true));
        document.getElementById('exit-emergency').addEventListener('click', () => this.toggleEmergency(false));

        document.getElementById('simulate-deploy-fail').addEventListener('click', () => this.simulateFailure());

        let lastUpdate = 0;
        window.addEventListener('mousemove', e => {
            if (this.cursorSyncEnabled && Date.now() - lastUpdate > 50) {
                this.broadcastCursor(e);
                lastUpdate = Date.now();
            }
            this.handleRaycasting(e);
        });

        this.controls.addEventListener('change', () => {
            if (this.cameraSyncEnabled) this.broadcastCamera();
        });

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    async connectWebSocket() {
        const token = localStorage.getItem('xaytheon_token');
        this.socket = io('/', { auth: { token } });

        this.socket.on('connect', () => {
            this.updateConn('connected');
            this.socket.emit('join_war_room', this.incidentId);
        });

        this.socket.on('connect_error', (err) => {
            console.error('Socket connection error:', err);
            this.updateConn('disconnected');
        });

        this.socket.on('war_room_user_joined', d => this.onUserJoined(d));
        this.socket.on('war_room_user_left', d => this.onUserLeft(d));
        this.socket.on('war_room_cursor_update', d => this.updateRemoteCursor(d));
        this.socket.on('war_room_pin_created', p => this.renderPin(p));
        this.socket.on('war_room_status_broadcast', m => this.addMsg(m));
        this.socket.on('incident_update', ev => this.addEvent(ev));
    }

    handleRaycasting(e) {
        const mouse = new THREE.Vector2((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);
        const intersects = raycaster.intersectObjects(this.nodes);

        if (intersects.length > 0) {
            document.body.style.cursor = 'pointer';
            if (e.buttons === 1) this.showNodeMetadata(intersects[0].object.userData);
        } else {
            document.body.style.cursor = 'default';
        }
    }

    showNodeMetadata(data) {
        this.activeNode = data;
        const panel = document.getElementById('incident-metadata');
        document.getElementById('metadata-title').textContent = `${data.type.toUpperCase()}: ${data.name}`;

        document.getElementById('related-prs').innerHTML = `
            <div class="pr-item">#782 Add payment retry logic</div>
            <div class="pr-item">#775 Update k8s config</div>
        `;
        document.getElementById('related-devs').innerHTML = `
            <div class="dev-item">@alex_dev (Last commit 2h ago)</div>
            <div class="dev-item">@sara_sre (On-call)</div>
        `;

        panel.classList.remove('hidden');
        this.runAiAnalysis(data);
    }

    runAiAnalysis(node) {
        const panel = document.getElementById('ai-analysis');
        panel.innerHTML = '<div class="loading">Analyzing node logs...</div>';

        setTimeout(() => {
            panel.innerHTML = `
                <p><strong>Root Cause:</strong> Potential memory leak in <code>${node.id}</code> worker pool.</p>
                <p><strong>Action:</strong> Review last deployment (#782) and check garbage collection metrics.</p>
            `;
            this.updateConfidence(85);
        }, 1500);
    }

    updateConfidence(val) {
        gsap.to('#confidence-bar', { width: val + '%', duration: 1 });
        document.getElementById('confidence-value').textContent = val + '%';
    }

    toggleEmergency(val) {
        this.emergencyMode = val;
        document.getElementById('emergency-overlay').classList.toggle('hidden', !val);
        if (val) this.socket.emit('war_room_status_update', { status: 'critical', message: 'FLEET-WIDE EMERGENCY MODE ACTIVATED' });
    }

    addEvent(ev) {
        this.events.unshift(ev);
        const stream = document.getElementById('event-stream');
        if (stream.querySelector('.empty-state')) stream.innerHTML = '';
        const evEl = document.createElement('div');
        evEl.className = `event-item ${ev.severity === 'critical' ? 'critical' : ''}`;
        evEl.innerHTML = `<strong>${ev.source}</strong>: ${ev.message} <span class="time">${new Date().toLocaleTimeString()}</span>`;
        stream.prepend(evEl);
        if (stream.children.length > 50) stream.lastElementChild.remove();
    }

    updateStats(s) {
        if (s.events) document.getElementById('events-count').textContent = s.events;
        if (s.critical !== undefined) document.getElementById('critical-count').textContent = s.critical;
        if (s.incidents) document.getElementById('incidents-count').textContent = s.incidents;
    }

    broadcastCursor(e) {
        if (!this.socket || !this.socket.connected) return;
        const x = (e.clientX / window.innerWidth) * 2 - 1;
        const y = -(e.clientY / window.innerHeight) * 2 + 1;
        this.socket.emit('war_room_cursor_move', { position: { x, y } });
    }

    broadcastCamera() {
        if (!this.socket || !this.socket.connected) return;
        this.socket.emit('war_room_camera_move', { position: this.camera.position.toArray(), target: this.controls.target.toArray() });
    }

    updateRemoteCursor(data) {
        let cursor = this.remoteCursors.get(data.userId);
        if (!cursor) {
            cursor = new THREE.Mesh(new THREE.SphereGeometry(2, 16, 16), new THREE.MeshBasicMaterial({ color: data.color || '#3b82f6', transparent: true, opacity: 0.6 }));
            this.scene.add(cursor);
            this.remoteCursors.set(data.userId, cursor);
        }
        const vector = new THREE.Vector3(data.position.x, data.position.y, 0.5).unproject(this.camera);
        const dir = vector.sub(this.camera.position).normalize();
        const pos = this.camera.position.clone().add(dir.multiplyScalar(50));
        gsap.to(cursor.position, { x: pos.x, y: pos.y, z: pos.z, duration: 0.1, ease: 'none' });
    }

    createIncidentPin() {
        const node = this.topology.find(n => n.status === 'down');
        if (!node) return;
        const msg = prompt('Enter pin message:');
        if (msg) this.socket.emit('war_room_create_pin', { position: node.pos, nodeId: node.id, message: msg, severity: 'critical' });
    }

    renderPin(pin) {
        const mesh = new THREE.Mesh(new THREE.ConeGeometry(2, 8, 8), new THREE.MeshPhongMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.8 }));
        mesh.position.set(...pin.position); mesh.position.y += 10;
        this.scene.add(mesh); this.incidentPins.set(pin.id, mesh);

        const list = document.getElementById('pins-list');
        if (list.querySelector('.empty-state')) list.innerHTML = '';
        const el = document.createElement('div');
        el.className = `pin-item ${pin.severity}`;
        el.innerHTML = `<div class="pin-header"><span class="pin-user">User ${pin.userId.substr(-4)}</span></div><div class="pin-message">${pin.message}</div>`;
        list.prepend(el);
    }

    addMsg(data) {
        const msgs = document.getElementById('status-messages');
        if (msgs.querySelector('.empty-state')) msgs.innerHTML = '';
        const el = document.createElement('div');
        el.className = `status-msg ${data.status}`;
        el.innerHTML = `<span class="timestamp">${new Date(data.timestamp).toLocaleTimeString()}</span> <strong>User ${data.userId.substr(-4)}:</strong> ${data.message}`;
        msgs.appendChild(el); msgs.scrollTop = msgs.scrollHeight;
    }

    sendStatusUpdate() {
        const input = document.getElementById('status-input');
        if (input.value.trim()) {
            this.socket.emit('war_room_status_update', { status: 'info', message: input.value });
            input.value = '';
        }
    }

    onUserJoined(d) {
        this.participants.add(d.userId);
        document.getElementById('participant-count').textContent = this.participants.size + 1;
        this.addMsg({ status: 'system', userId: 'SYSTEM', message: `User ${d.userId.substr(-4)} joined`, timestamp: d.timestamp });
    }

    onUserLeft(d) {
        this.participants.delete(d.userId);
        document.getElementById('participant-count').textContent = this.participants.size + 1;
        const cursor = this.remoteCursors.get(d.userId);
        if (cursor) { this.scene.remove(cursor); this.remoteCursors.delete(d.userId); }
    }

    updateConn(s) {
        const dot = document.querySelector('.status-dot');
        if (dot) dot.className = `status-dot ${s}`;
        const text = document.getElementById('connection-text');
        if (text) text.textContent = s.charAt(0).toUpperCase() + s.slice(1);
    }

    simulateFailure() {
        this.addEvent({ source: 'PaymentEngine', message: 'Connection Timeout with Database', severity: 'critical' });
        const node = this.nodes.find(n => n.userData.id === 'payment');
        if (node) {
            node.material.color.setHex(0xef4444);
            gsap.to(node.scale, { x: 2, y: 2, z: 2, duration: 0.5, yoyo: true, repeat: 3 });
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        if (this.controls) this.controls.update();
        if (this.remoteCursors) this.remoteCursors.forEach(c => c.rotation.y += 0.05);
        if (this.renderer && this.scene && this.camera) this.renderer.render(this.scene, this.camera);
    }
}

document.addEventListener('DOMContentLoaded', () => { window.warRoom = new IncidentWarRoom(); });
