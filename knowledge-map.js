/**
 * Knowledge Mind-Map JavaScript
 * 3D Expertise Galaxy Visualization
 */

class KnowledgeMapVisualization {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.nodes = [];
        this.lines = [];
        this.labels = [];
        this.knowledgeGraph = null;
        this.silos = null;
        this.teamExpertise = null;
        this.showLabels = true;
        this.showConnections = true;
        this.filterSilos = false;
        
        this.init();
    }

    /**
     * Initialize visualization
     */
    init() {
        this.setupEventListeners();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        document.getElementById('analyze-btn')?.addEventListener('click', () => {
            this.analyze();
        });

        document.getElementById('reset-camera')?.addEventListener('click', () => {
            this.resetCamera();
        });

        document.getElementById('toggle-labels')?.addEventListener('click', (e) => {
            this.showLabels = !this.showLabels;
            e.target.classList.toggle('active', this.showLabels);
            this.updateLabels();
        });

        document.getElementById('toggle-connections')?.addEventListener('click', (e) => {
            this.showConnections = !this.showConnections;
            e.target.classList.toggle('active', this.showConnections);
            this.updateConnections();
        });

        document.getElementById('filter-silos')?.addEventListener('click', (e) => {
            this.filterSilos = !this.filterSilos;
            e.target.classList.toggle('active', this.filterSilos);
            this.filterVisualization();
        });

        // Modal close
        document.querySelector('.modal-close')?.addEventListener('click', () => {
            document.getElementById('expertise-modal').classList.add('hidden');
        });
    }

    /**
     * Analyze repository
     */
    async analyze() {
        const owner = document.getElementById('owner-input').value.trim();
        const repo = document.getElementById('repo-input').value.trim();

        if (!owner || !repo) {
            alert('Please enter both owner and repository name');
            return;
        }

        this.showLoading(true, 'Analyzing knowledge graph...');

        try {
            // Fetch all data in parallel
            const [graphRes, silosRes, expertiseRes] = await Promise.all([
                fetch(`http://localhost:3000/api/knowledge-map/graph/${owner}/${repo}`),
                fetch(`http://localhost:3000/api/knowledge-map/silos/${owner}/${repo}`),
                fetch(`http://localhost:3000/api/knowledge-map/expertise/${owner}/${repo}`)
            ]);

            const graphData = await graphRes.json();
            const silosData = await silosRes.json();
            const expertiseData = await expertiseRes.json();

            if (graphData.success) {
                this.knowledgeGraph = graphData.graph;
                this.silos = silosData.silos;
                this.teamExpertise = expertiseData.teamExpertise;

                // Update UI
                this.updateStats();
                this.renderSilosList();
                this.renderExpertsList();
                this.render3DGalaxy();
                this.generateRecommendations();
            } else {
                alert('Error: ' + (graphData.error || 'Failed to analyze repository'));
            }

        } catch (error) {
            console.error('Analysis error:', error);
            alert('Failed to analyze repository: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Update statistics
     */
    updateStats() {
        if (!this.knowledgeGraph || !this.silos) return;

        const busFactor = this.knowledgeGraph.metadata?.busFactor || 0;
        const busFactorRisk = busFactor <= 2 ? 'critical' : busFactor <= 4 ? 'high' : 'medium';

        document.getElementById('bus-factor').textContent = busFactor;
        const riskBadge = document.getElementById('bus-factor-risk');
        riskBadge.textContent = busFactorRisk.toUpperCase();
        riskBadge.className = `stat-badge ${busFactorRisk}`;

        document.getElementById('silo-count').textContent = this.silos.totalSilos || 0;
        document.getElementById('critical-silos').textContent = this.silos.criticalSilos || 0;
        document.getElementById('contributor-count').textContent = this.knowledgeGraph.metadata?.totalAuthors || 0;
        document.getElementById('file-count').textContent = this.knowledgeGraph.metadata?.totalFiles || 0;
    }

    /**
     * Render silos list
     */
    renderSilosList() {
        const container = document.getElementById('silos-list');
        if (!container || !this.silos) return;

        const criticalSilos = this.silos.silos.filter(s => s.risk === 'critical' || s.risk === 'high').slice(0, 5);

        container.innerHTML = criticalSilos.map(silo => `
            <div class="silo-item" onclick="knowledgeMap.showFileDetails('${silo.path}')">
                <div class="silo-item-title">${this.escapeHtml(silo.name)}</div>
                <div class="silo-item-meta">
                    <span class="stat-badge ${silo.risk}">${silo.risk}</span>
                    ${silo.ownership.toFixed(2)}% by ${this.escapeHtml(silo.primaryOwner)}
                </div>
            </div>
        `).join('');
    }

    /**
     * Render experts list
     */
    renderExpertsList() {
        const container = document.getElementById('experts-list');
        if (!container || !this.teamExpertise) return;

        const topExperts = this.teamExpertise.contributors
            .sort((a, b) => b.totalCommits - a.totalCommits)
            .slice(0, 5);

        container.innerHTML = topExperts.map(expert => `
            <div class="expert-item" onclick="knowledgeMap.showExpertiseProfile('${expert.username}')">
                <div class="expert-item-title">${this.escapeHtml(expert.username)}</div>
                <div class="expert-item-meta">
                    ${expert.totalCommits} commits • ${Object.keys(expert.expertise || {}).length} technologies
                </div>
            </div>
        `).join('');
    }

    /**
     * Render 3D Galaxy
     */
    render3DGalaxy() {
        const container = document.getElementById('galaxy-container');
        if (!container) return;

        // Clear existing
        container.innerHTML = '';
        this.nodes = [];
        this.lines = [];

        // Setup Three.js
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0e1a);

        this.camera = new THREE.PerspectiveCamera(
            75,
            container.clientWidth / container.clientHeight,
            0.1,
            2000
        );
        this.camera.position.set(0, 0, 300);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(this.renderer.domElement);

        // Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0xffffff, 1);
        pointLight.position.set(100, 100, 100);
        this.scene.add(pointLight);

        // Generate 3D coordinates
        const nodes3D = this.generate3DCoordinates();

        // Create nodes
        nodes3D.forEach(nodeData => {
            this.createNode(nodeData);
        });

        // Create connections
        if (this.showConnections) {
            this.createConnections();
        }

        // Animation loop
        this.animate();

        // Mouse interaction
        this.setupMouseInteraction(container);
    }

    /**
     * Generate 3D coordinates
     */
    generate3DCoordinates() {
        const nodes = [];

        // Position authors in a sphere (stars)
        const authorCount = this.knowledgeGraph.authors.length;
        const radius = 150;

        this.knowledgeGraph.authors.forEach((author, index) => {
            const phi = Math.acos(-1 + (2 * index) / authorCount);
            const theta = Math.sqrt(authorCount * Math.PI) * phi;

            nodes.push({
                id: `author:${author.username}`,
                type: 'author',
                label: author.username,
                x: radius * Math.cos(theta) * Math.sin(phi),
                y: radius * Math.sin(theta) * Math.sin(phi),
                z: radius * Math.cos(phi),
                size: Math.log(author.totalCommits + 1) * 3,
                data: author
            });
        });

        // Position files based on contributors
        this.knowledgeGraph.files.forEach(file => {
            let x = 0, y = 0, z = 0;
            let totalWeight = 0;

            file.contributors.forEach(contrib => {
                const authorNode = nodes.find(n => n.id === `author:${contrib.author}`);
                if (authorNode) {
                    const weight = parseFloat(contrib.ownership) / 100;
                    x += authorNode.x * weight;
                    y += authorNode.y * weight;
                    z += authorNode.z * weight;
                    totalWeight += weight;
                }
            });

            if (totalWeight > 0) {
                // Check if file is a silo
                const isSilo = this.silos?.silos.some(s => s.path === file.path);

                nodes.push({
                    id: file.path,
                    type: 'file',
                    label: file.name,
                    x: x / totalWeight,
                    y: y / totalWeight,
                    z: z / totalWeight,
                    size: file.complexity * 1.5,
                    isSilo,
                    data: file
                });
            }
        });

        return nodes;
    }

    /**
     * Create node in 3D space
     */
    createNode(nodeData) {
        const geometry = new THREE.SphereGeometry(nodeData.size, 16, 16);
        
        let color;
        if (nodeData.type === 'author') {
            color = 0xffd700; // Gold for authors
        } else if (nodeData.isSilo) {
            color = 0xdc3545; // Red for silos
        } else {
            color = 0x4a90e2; // Blue for normal files
        }

        const material = new THREE.MeshPhongMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.2,
            shininess: 30
        });

        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(nodeData.x, nodeData.y, nodeData.z);
        sphere.userData = nodeData;

        this.scene.add(sphere);
        this.nodes.push(sphere);

        // Add glow for silos
        if (nodeData.isSilo) {
            const glowGeometry = new THREE.SphereGeometry(nodeData.size * 1.5, 16, 16);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: 0xdc3545,
                transparent: true,
                opacity: 0.3
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            glow.position.copy(sphere.position);
            this.scene.add(glow);
        }
    }

    /**
     * Create connections between nodes
     */
    createConnections() {
        this.knowledgeGraph.edges.forEach(edge => {
            const sourceNode = this.nodes.find(n => n.userData.id === edge.source);
            const targetNode = this.nodes.find(n => n.userData.id === edge.target);

            if (sourceNode && targetNode) {
                const points = [
                    sourceNode.position,
                    targetNode.position
                ];

                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                const material = new THREE.LineBasicMaterial({
                    color: 0x2a3d5a,
                    transparent: true,
                    opacity: Math.min(edge.weight / 100, 0.5)
                });

                const line = new THREE.Line(geometry, material);
                this.scene.add(line);
                this.lines.push(line);
            }
        });
    }

    /**
     * Animation loop
     */
    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.controls) {
            this.controls.update();
        }

        // Rotate nodes slightly
        this.nodes.forEach(node => {
            node.rotation.y += 0.001;
        });

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    /**
     * Setup mouse interaction
     */
    setupMouseInteraction(container) {
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        const tooltip = document.getElementById('node-tooltip');

        container.addEventListener('mousemove', (event) => {
            const rect = container.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouse, this.camera);
            const intersects = raycaster.intersectObjects(this.nodes);

            if (intersects.length > 0) {
                const nodeData = intersects[0].object.userData;
                tooltip.classList.remove('hidden');
tooltip.style.left = event.clientX + 10 + 'px';
                tooltip.style.top = event.clientY + 10 + 'px';
                tooltip.innerHTML = this.generateTooltip(nodeData);
            } else {
                tooltip.classList.add('hidden');
            }
        });

        container.addEventListener('click', (event) => {
            const rect = container.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouse, this.camera);
            const intersects = raycaster.intersectObjects(this.nodes);

            if (intersects.length > 0) {
                const nodeData = intersects[0].object.userData;
                this.showNodeDetails(nodeData);
            }
        });
    }

    /**
     * Generate tooltip HTML
     */
    generateTooltip(nodeData) {
        if (nodeData.type === 'author') {
            return `
                <div class="tooltip-title">⭐ ${this.escapeHtml(nodeData.label)}</div>
                <div class="tooltip-content">
                    Commits: ${nodeData.data.totalCommits}<br>
                    Files: ${nodeData.data.files.length}
                </div>
            `;
        } else {
            return `
                <div class="tooltip-title">🌍 ${this.escapeHtml(nodeData.label)}</div>
                <div class="tooltip-content">
                    Complexity: ${nodeData.data.complexity}/10<br>
                    Contributors: ${nodeData.data.contributors.length}<br>
                    ${nodeData.isSilo ? '<strong style="color: #dc3545;">⚠️ SILO</strong>' : ''}
                </div>
            `;
        }
    }

    /**
     * Show node details in sidebar
     */
    showNodeDetails(nodeData) {
        const container = document.getElementById('selection-details');
        if (!container) return;

        if (nodeData.type === 'author') {
            container.innerHTML = `
                <div class="detail-section">
                    <div class="detail-label">Developer</div>
                    <div class="detail-value">${this.escapeHtml(nodeData.label)}</div>
                </div>
                <div class="detail-section">
                    <div class="detail-label">Total Commits</div>
                    <div class="detail-value">${nodeData.data.totalCommits}</div>
                </div>
                <div class="detail-section">
                    <div class="detail-label">Files Contributed To</div>
                    <div class="detail-value">${nodeData.data.files.length}</div>
                </div>
                <div class="detail-section">
                    <div class="detail-label">Top Files</div>
                    <ul class="detail-list">
                        ${nodeData.data.files.slice(0, 5).map(f => `<li>${this.escapeHtml(f)}</li>`).join('')}
                    </ul>
                </div>
            `;
        } else {
            const siloData = this.silos?.silos.find(s => s.path === nodeData.id);
            
            container.innerHTML = `
                <div class="detail-section">
                    <div class="detail-label">File</div>
                    <div class="detail-value">${this.escapeHtml(nodeData.label)}</div>
                </div>
                ${siloData ? `
                    <div class="detail-section">
                        <div class="detail-label">Silo Risk</div>
                        <div class="detail-value">
                            <span class="stat-badge ${siloData.risk}">${siloData.risk}</span>
                        </div>
                    </div>
                ` : ''}
                <div class="detail-section">
                    <div class="detail-label">Complexity</div>
                    <div class="detail-value">${nodeData.data.complexity}/10</div>
                </div>
                <div class="detail-section">
                    <div class="detail-label">Primary Owner</div>
                    <div class="detail-value">${this.escapeHtml(nodeData.data.primaryOwner)} (${nodeData.data.primaryOwnership.toFixed(2)}%)</div>
                </div>
                <div class="detail-section">
                    <div class="detail-label">Contributors</div>
                    <ul class="detail-list">
                        ${nodeData.data.contributors.map(c => `
                            <li>${this.escapeHtml(c.author)} - ${c.ownership}%</li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }
    }

    /**
     * Show file details
     */
    showFileDetails(filePath) {
        const fileNode = this.nodes.find(n => n.userData.id === filePath);
        if (fileNode) {
            this.showNodeDetails(fileNode.userData);
        }
    }

    /**
     * Show expertise profile modal
     */
    showExpertiseProfile(username) {
        const expert = this.teamExpertise?.contributors.find(c => c.username === username);
        if (!expert) return;

        const modal = document.getElementById('expertise-modal');
        const title = document.getElementById('modal-title');
        const body = document.getElementById('modal-body');

        title.textContent = `${username} - Expertise Profile`;

        body.innerHTML = Object.entries(expert.expertise || {}).map(([tech, data]) => `
            <div class="expertise-tech">
                <div class="expertise-tech-header">
                    <strong>${tech}</strong>
                    <span class="expertise-level ${data.level}">${data.level}</span>
                </div>
                <div class="expertise-progress">
                    <div class="expertise-progress-bar" style="width: ${data.score}%"></div>
                </div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">
                    Score: ${data.score}/100 • Mentions: ${data.mentions}
                </div>
            </div>
        `).join('');

        modal.classList.remove('hidden');
    }

    /**
     * Generate recommendations
     */
    generateRecommendations() {
        const container = document.getElementById('recommendations-list');
        if (!container || !this.silos) return;

        const recommendations = [];

        this.silos.silos.slice(0, 5).forEach(silo => {
            silo.recommendations?.forEach(rec => {
                recommendations.push({
                    ...rec,
                    file: silo.name
                });
            });
        });

        container.innerHTML = recommendations.map(rec => `
            <div class="recommendation-item">
                <div class="recommendation-title">${this.escapeHtml(rec.action)}</div>
                <div class="recommendation-description">${this.escapeHtml(rec.description)}</div>
                <span class="recommendation-priority ${rec.priority}">${rec.priority}</span>
            </div>
        `).join('');
    }

    /**
     * Reset camera
     */
    resetCamera() {
        if (this.camera && this.controls) {
            this.camera.position.set(0, 0, 300);
            this.controls.target.set(0, 0, 0);
            this.controls.update();
        }
    }

    /**
     * Update labels visibility
     */
    updateLabels() {
        // Placeholder - would toggle text sprites
    }

    /**
     * Update connections visibility
     */
    updateConnections() {
        this.lines.forEach(line => {
            line.visible = this.showConnections;
        });
    }

    /**
     * Filter visualization
     */
    filterVisualization() {
        this.nodes.forEach(node => {
            if (this.filterSilos) {
                node.visible = node.userData.type === 'author' || node.userData.isSilo;
            } else {
                node.visible = true;
            }
        });
    }

    /**
     * Show/hide loading overlay
     */
    showLoading(show, status = '') {
        const overlay = document.getElementById('loading-overlay');
        const statusEl = document.getElementById('loading-status');

        if (show) {
            overlay.classList.remove('hidden');
            if (statusEl) statusEl.textContent = status;
        } else {
            overlay.classList.add('hidden');
        }
    }

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize
let knowledgeMap;
document.addEventListener('DOMContentLoaded', () => {
    knowledgeMap = new KnowledgeMapVisualization();
});
