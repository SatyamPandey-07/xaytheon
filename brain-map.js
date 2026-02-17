/**
 * XAYTHEON - Semantic Knowledge Brain & Code Intent Mapper
 * 
 * Logic for 3D Vector Space Visualization, Semantic Clustering,
 * and Intent-based Goal Search.
 */

class SemanticBrain {
    constructor() {
        this.canvas = document.getElementById('nebula-canvas');
        this.nodes = [];
        this.points = null; // Points cloud
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.hoveredNode = null;
        this.intentLines = [];
        this.driftSpikes = new THREE.Group();

        // Simulated Semantic Categories (Clusters)
        this.clusters = [
            { id: 'auth', name: 'Authentication', color: 0x0ea5e9, center: [-50, 20, -50], range: 30 },
            { id: 'crypto', name: 'Encryption & Security', color: 0xef4444, center: [60, -10, 20], range: 25 },
            { id: 'ui', name: 'UI Components', color: 0x10b981, center: [0, 40, 50], range: 35 },
            { id: 'data', name: 'Data Processing', color: 0x8b5cf6, center: [-20, -40, -10], range: 40 },
            { id: 'storage', name: 'File Storage', color: 0xf59e0b, center: [40, 30, -30], range: 30 }
        ];

        this.init();
    }

    init() {
        this.setupScene();
        this.createNebula();
        this.setupLighting();
        this.animate();
        this.scene.add(this.driftSpikes);

        window.addEventListener('resize', () => this.onWindowResize());
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('click', () => this.onNodeClick());

        document.getElementById('search-intent-btn').addEventListener('click', () => this.mapIntent());
        document.getElementById('intent-search').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.mapIntent();
        });
        document.getElementById('scan-drift-btn').addEventListener('click', () => this.visualizeArchitectureDrift());
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x020205);
        this.scene.fog = new THREE.FogExp2(0x020205, 0.003);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 3000);
        this.camera.position.set(0, 50, 250);

        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 0.2;
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        // Multi-colored rim lights for nebula feel
        const blueLight = new THREE.PointLight(0x0ea5e9, 1, 1000);
        blueLight.position.set(200, 200, 200);
        this.scene.add(blueLight);

        const purpleLight = new THREE.PointLight(0xa855f7, 1, 1000);
        purpleLight.position.set(-200, -200, -200);
        this.scene.add(purpleLight);
    }

    createNebula() {
        const nodeCount = 2000;
        const positions = new Float32Array(nodeCount * 3);
        const colors = new Float32Array(nodeCount * 3);
        const sizes = new Float32Array(nodeCount);

        for (let i = 0; i < nodeCount; i++) {
            // Assign to a random cluster
            const cluster = this.clusters[Math.floor(Math.random() * this.clusters.length)];

            // Random position around cluster center
            const x = cluster.center[0] + (Math.random() - 0.5) * cluster.range * 3;
            const y = cluster.center[1] + (Math.random() - 0.5) * cluster.range * 3;
            const z = cluster.center[2] + (Math.random() - 0.5) * cluster.range * 3;

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            // Cluster color
            const color = new THREE.Color(cluster.color);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;

            sizes[i] = Math.random() * 2 + 1;

            this.nodes.push({
                index: i,
                position: new THREE.Vector3(x, y, z),
                cluster: cluster,
                name: `${cluster.name} Logic Unit #${i}`,
                lang: Math.random() > 0.5 ? 'JavaScript' : 'TypeScript',
                similarity: 0.8 + Math.random() * 0.2
            });
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            size: 3,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            map: this.createCircleTexture(), // Round points
            alphaTest: 0.5
        });

        this.points = new THREE.Points(geometry, material);
        this.scene.add(this.points);

        document.getElementById('node-count').textContent = `${nodeCount} nodes indexed`;
    }

    createCircleTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.arc(32, 32, 30, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    onMouseMove(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        this.raycaster.params.Points.threshold = 2;

        const intersects = this.raycaster.intersectObject(this.points);

        if (intersects.length > 0) {
            const index = intersects[0].index;
            const node = this.nodes[index];
            this.showTooltip(event, node);
            this.hoveredNode = node;
        } else {
            this.hideTooltip();
            this.hoveredNode = null;
        }
    }

    showTooltip(e, node) {
        const tooltip = document.getElementById('brain-tooltip');
        tooltip.style.display = 'block';
        tooltip.innerHTML = `
            <div style="color: ${new THREE.Color(node.cluster.color).getStyle()}">${node.cluster.name}</div>
            <div style="font-size: 0.6rem; opacity: 0.8">${node.lang} | Similarity: ${(node.similarity * 100).toFixed(1)}%</div>
        `;
        tooltip.style.left = (e.clientX + 15) + 'px';
        tooltip.style.top = (e.clientY + 15) + 'px';
    }

    hideTooltip() {
        document.getElementById('brain-tooltip').style.display = 'none';
    }

    onNodeClick() {
        if (!this.hoveredNode) return;

        // Clear previous intent lines if clicking a node (manual focus)
        this.intentLines.forEach(l => this.scene.remove(l));
        this.intentLines = [];

        const sidebar = document.getElementById('info-sidebar');
        sidebar.classList.add('active');

        // Find a "Twin" node (Cross-lingual mapping demo)
        const twin = this.nodes.find(n => n.cluster.id === this.hoveredNode.cluster.id && n.lang !== this.hoveredNode.lang);

        if (twin) {
            const material = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, dashSize: 3, gapSize: 1 });
            const points = [this.hoveredNode.position, twin.position];
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, material);
            this.scene.add(line);
            this.intentLines.push(line);

            // Text for twin
            document.getElementById('node-description').innerHTML = `
                Semantic cluster detected: <strong>${this.hoveredNode.cluster.name}</strong>.<br><br>
                <div style="color:var(--nebula-blue); border-left: 2px solid; padding-left: 8px; margin-bottom: 8px;">
                    <strong>CROSS-LINGUAL TWIN DETECTED</strong><br>
                    Identical logic found in ${twin.lang} module. Semantic identity: 99.4%
                </div>
                This module contains logic for ${this.hoveredNode.cluster.name.toLowerCase()}.
            `;
        } else {
            document.getElementById('node-description').innerHTML = `
                Semantic cluster detected: <strong>${this.hoveredNode.cluster.name}</strong>.<br><br>
                This module contains logic for ${this.hoveredNode.cluster.name.toLowerCase()}. 
                Cross-lingual analysis suggests high identity matching with patterns in 
                ${this.hoveredNode.lang === 'JavaScript' ? 'TypeScript' : 'JavaScript'} backend services.
            `;
        }

        document.getElementById('node-title').textContent = this.hoveredNode.name;

        const tags = [this.hoveredNode.lang, 'Async', 'Semantic Match', this.hoveredNode.cluster.id];
        document.getElementById('node-tags').innerHTML = tags.map(t => `<span class="tag">${t}</span>`).join('');

        document.getElementById('node-links').innerHTML = `
            <h4 style="font-size: 0.75rem; margin-bottom: 0.5rem; color: var(--text-primary);">KNOWLEDGE GRAPH</h4>
            <a href="#" class="external-link"><i class="ri-book-read-line"></i> Internal Wiki: ${this.hoveredNode.cluster.name} Architecture</a>
            <a href="https://stackoverflow.com/search?q=${this.hoveredNode.cluster.name.toLowerCase()}" target="_blank" class="external-link"><i class="ri-stack-overflow-line"></i> StackOverflow Solutions</a>
            <a href="#" class="external-link"><i class="ri-git-branch-line"></i> PR #1245: Optimize ${this.hoveredNode.cluster.name} flow</a>
        `;

        // Focus camera on node
        gsap.to(this.camera.position, {
            x: this.hoveredNode.position.x * 1.5,
            y: this.hoveredNode.position.y * 1.5,
            z: this.hoveredNode.position.z * 1.5,
            duration: 1.5,
            ease: "power2.inOut"
        });
    }

    mapIntent() {
        const query = document.getElementById('intent-search').value.toLowerCase();
        if (!query) return;

        // Clear previous lines
        this.intentLines.forEach(l => this.scene.remove(l));
        this.intentLines = [];

        // Pick a relevant cluster
        const cluster = this.clusters.find(c => query.includes(c.id) || query.includes(c.name.toLowerCase().split(' ')[0])) || this.clusters[0];

        // Find a path of nodes within that cluster
        const pathNodes = this.nodes
            .filter(n => n.cluster.id === cluster.id)
            .sort(() => 0.5 - Math.random())
            .slice(0, 5);

        // Draw path lines
        const material = new THREE.LineBasicMaterial({ color: cluster.color, transparent: true, opacity: 0.6 });

        for (let i = 0; i < pathNodes.length - 1; i++) {
            const points = [pathNodes[i].position, pathNodes[i + 1].position];
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, material);
            this.scene.add(line);
            this.intentLines.push(line);
        }

        // Show path UI
        const container = document.getElementById('intent-path-container');
        container.classList.add('active');
        const title = window.i18n ? window.i18n.t('brain.goalPath') : 'GOAL PATH DETECTED';
        container.innerHTML = `
            <h3 style="font-size: 0.8rem; margin: 1rem 0 0.5rem; color: var(--nebula-blue);">${title}</h3>
            ${pathNodes.map((n, i) => `
                <div class="step-card">
                    <h4>Step ${i + 1}: ${n.name}</h4>
                    <p>Executing semantic intent in ${n.lang}. Match confidence: ${(n.similarity * 100).toFixed(1)}%</p>
                </div>
            `).join('')}
        `;

        // Pulse the path nodes (visual effect via scale/glow simulator)
        this.controls.autoRotate = false;
        gsap.to(this.camera.position, {
            x: cluster.center[0] * 2,
            y: cluster.center[1] * 2,
            z: cluster.center[2] * 2,
            duration: 2,
            ease: "expo.out"
        });
    }

    /**
     * VISUALIZE ARCHITECTURE DRIFT
     * Renders "Corrupted Nodes" as glitching red spikes
     */
    async visualizeArchitectureDrift() {
        // Clear previous spikes
        while (this.driftSpikes.children.length > 0) {
            this.driftSpikes.remove(this.driftSpikes.children[0]);
        }

        try {
            // Fetch drift data from backend
            const response = await fetch('/api/arch-drift/violations/facebook/react?architecture=layered');
            const result = await response.json();

            if (!result.success) return;

            const violations = result.data.violations;

            // Filter nodes that have high drift impact
            violations.forEach(v => {
                if (v.severity === 'critical' || v.severity === 'high') {
                    // Pick a random node in the nebula to represent this violation (for demo)
                    const nodeIndex = Math.floor(Math.random() * this.nodes.length);
                    const node = this.nodes[nodeIndex];
                    this.createDriftSpike(node, v);
                }
            });

            this.showDriftStatus(result.data.metrics);

        } catch (error) {
            console.error("Failed to visualize drift:", error);
        }
    }

    createDriftSpike(node, violation) {
        const spikeCount = 5 + Math.floor(Math.random() * 10);
        const group = new THREE.Group();
        group.position.copy(node.position);

        for (let i = 0; i < spikeCount; i++) {
            const length = 10 + Math.random() * 20;
            const geometry = new THREE.ConeGeometry(0.5, length, 4);
            const material = new THREE.MeshPhongMaterial({
                color: 0xff0000,
                emissive: 0xff0000,
                emissiveIntensity: 2,
                transparent: true,
                opacity: 0.8
            });

            const spike = new THREE.Mesh(geometry, material);

            // Random orientation
            spike.rotation.x = Math.random() * Math.PI * 2;
            spike.rotation.z = Math.random() * Math.PI * 2;

            // Offset so base is at node center
            spike.translateY(length / 2);

            group.add(spike);

            // Glitch animation
            gsap.to(spike.scale, {
                y: 1.5,
                x: 2,
                z: 2,
                duration: 0.1 + Math.random() * 0.2,
                repeat: -1,
                yoyo: true,
                ease: "none"
            });

            gsap.to(material, {
                opacity: 0.2,
                duration: 0.05,
                repeat: -1,
                yoyo: true,
                delay: Math.random()
            });
        }

        this.driftSpikes.add(group);

        // Add point light for corruption glow
        const light = new THREE.PointLight(0xff0000, 1, 50);
        group.add(light);
    }

    showDriftStatus(metrics) {
        const statusEl = document.createElement('div');
        statusEl.className = 'drift-status-overlay glass';
        statusEl.innerHTML = `
            <div class="drift-header">
                <i class="ri-error-warning-fill" style="color:#ef4444"></i>
                <span>ARCHITECTURE DRIFT DETECTED</span>
            </div>
            <div class="drift-metrics">
                <div class="metric">Score: <span style="color:#ef4444">${metrics.healthScore}%</span></div>
                <div class="metric">Violations: ${metrics.violationCount}</div>
                <div class="metric">Risk: ${metrics.riskLevel.toUpperCase()}</div>
            </div>
            <button onclick="this.parentElement.remove()" class="close-drift">Dismiss</button>
        `;
        document.body.appendChild(statusEl);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();

        // Subtle nebula drift
        if (this.points) {
            this.points.rotation.y += 0.0005;
            this.points.rotation.z += 0.0002;
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new SemanticBrain();
});
