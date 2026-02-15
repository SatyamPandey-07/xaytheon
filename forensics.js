/**
 * Forensic Time-Travel Analytics
 * 3D Time-Slicer with temporal scrubbing and morphing visualization
 */

class ForensicTimeSlicer {
    constructor() {
        this.container = document.getElementById('time-slicer-viewport');
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.healthSpheres = [];
        this.snapshots = [];
        this.currentIndex = 0;
        this.isPlaying = false;
        this.playbackSpeed = 1;

        this.init();
    }

    async init() {
        this.setupScene();
        this.createStarField();
        this.setupControls();
        this.animate();

        await this.loadTimelineData();
    }

    setupScene() {
        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 30, 80);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0x60a5fa, 1, 200);
        pointLight.position.set(0, 50, 50);
        this.scene.add(pointLight);

        window.addEventListener('resize', () => this.onWindowResize());
    }

    createStarField() {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];

        for (let i = 0; i < 500; i++) {
            vertices.push(
                (Math.random() - 0.5) * 500,
                (Math.random() - 0.5) * 500,
                (Math.random() - 0.5) * 500
            );
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

        const material = new THREE.PointsMaterial({
            color: 0x94a3b8,
            size: 0.5,
            transparent: true,
            opacity: 0.6
        });

        const stars = new THREE.Points(geometry, material);
        this.scene.add(stars);
    }

    async loadTimelineData() {
        try {
            const response = await fetch('/api/analytics/forensic/timeline?weeksBack=26');
            const result = await response.json();

            if (result.success) {
                this.snapshots = result.data.snapshots;
                this.renderTimeline();
                this.updateSummaryStats(result.data.summary);
                this.setupTimelineMarkers(result.data.timeRange);

                // Show latest snapshot
                this.scrubToIndex(this.snapshots.length - 1);
            }
        } catch (error) {
            console.error('Failed to load timeline:', error);
        }
    }

    renderTimeline() {
        // Create 3D health spheres along a timeline path
        const spacing = 6;
        const totalWidth = this.snapshots.length * spacing;
        const startX = -totalWidth / 2;

        this.snapshots.forEach((snapshot, index) => {
            const x = startX + (index * spacing);
            const y = (snapshot.healthScore / 100) * 20 - 10; // Map health to Y position
            const z = 0;

            const sphere = this.createHealthSphere(snapshot, x, y, z);
            this.healthSpheres.push(sphere);
            this.scene.add(sphere);

            // Connect spheres with lines
            if (index > 0) {
                this.createConnectionLine(
                    this.healthSpheres[index - 1].position,
                    sphere.position,
                    snapshot.status
                );
            }
        });

        // Animate camera to show full timeline
        gsap.to(this.camera.position, {
            x: 0,
            y: 30,
            z: 80,
            duration: 2,
            ease: 'power2.out'
        });
    }

    createHealthSphere(snapshot, x, y, z) {
        const size = 1.5 + (snapshot.healthScore / 100) * 1.5;
        const geometry = new THREE.SphereGeometry(size, 32, 32);

        const color = this.getHealthColor(snapshot.status);
        const material = new THREE.MeshPhongMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.4,
            transparent: true,
            opacity: 0.8
        });

        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(x, y, z);
        sphere.userData = snapshot;

        // Initial scale animation
        sphere.scale.set(0.1, 0.1, 0.1);
        gsap.to(sphere.scale, {
            x: 1,
            y: 1,
            z: 1,
            duration: 0.8,
            delay: snapshot.week * 0.02,
            ease: 'back.out'
        });

        return sphere;
    }

    createConnectionLine(start, end, status) {
        const points = [start, end];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);

        const color = this.getHealthColor(status);
        const material = new THREE.LineBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.3
        });

        const line = new THREE.Line(geometry, material);
        this.scene.add(line);
    }

    getHealthColor(status) {
        const colors = {
            'EXCELLENT': 0x10b981,
            'GOOD': 0x3b82f6,
            'FAIR': 0xfbbf24,
            'POOR': 0xf97316,
            'CRITICAL': 0xef4444
        };
        return colors[status] || 0x64748b;
    }

    setupControls() {
        const slider = document.getElementById('time-slider');
        const playBtn = document.getElementById('play-btn');
        const pauseBtn = document.getElementById('pause-btn');
        const resetBtn = document.getElementById('reset-btn');
        const speedSelect = document.getElementById('speed-select');

        slider.addEventListener('input', (e) => {
            const percentage = parseFloat(e.target.value);
            const index = Math.floor((percentage / 100) * (this.snapshots.length - 1));
            this.scrubToIndex(index);
        });

        playBtn.addEventListener('click', () => this.play());
        pauseBtn.addEventListener('click', () => this.pause());
        resetBtn.addEventListener('click', () => this.reset());
        speedSelect.addEventListener('change', (e) => {
            this.playbackSpeed = parseFloat(e.target.value);
        });
    }

    scrubToIndex(index) {
        if (index < 0 || index >= this.snapshots.length) return;

        this.currentIndex = index;
        const snapshot = this.snapshots[index];

        // Update UI
        document.getElementById('current-date').textContent = snapshot.date;
        document.getElementById('health-score-display').textContent = `${snapshot.healthScore} - ${snapshot.status}`;
        document.getElementById('health-score-display').className = `health-badge ${snapshot.status}`;

        // Update metrics
        document.getElementById('metric-complexity').textContent = snapshot.metrics.complexity;
        document.getElementById('metric-risk').textContent = snapshot.metrics.riskScore;
        document.getElementById('metric-build').textContent = `${snapshot.metrics.buildSpeed}s`;
        document.getElementById('metric-coverage').textContent = `${Math.round(snapshot.metrics.testCoverage)}%`;
        document.getElementById('metric-churn').textContent = snapshot.metrics.codeChurn;
        document.getElementById('metric-debt').textContent = snapshot.metrics.technicalDebt;

        // Update slider
        const percentage = (index / (this.snapshots.length - 1)) * 100;
        document.getElementById('time-slider').value = percentage;

        // Morph 3D visualization
        this.morphVisualization(index);
    }

    morphVisualization(index) {
        // Highlight current sphere
        this.healthSpheres.forEach((sphere, i) => {
            if (i === index) {
                gsap.to(sphere.scale, {
                    x: 2,
                    y: 2,
                    z: 2,
                    duration: 0.5,
                    ease: 'back.out'
                });
                gsap.to(sphere.material, {
                    emissiveIntensity: 0.8,
                    duration: 0.5
                });
            } else {
                gsap.to(sphere.scale, {
                    x: 1,
                    y: 1,
                    z: 1,
                    duration: 0.5
                });
                gsap.to(sphere.material, {
                    emissiveIntensity: 0.4,
                    duration: 0.5
                });
            }
        });

        // Move camera to focus on current sphere
        const targetSphere = this.healthSpheres[index];
        gsap.to(this.camera.position, {
            x: targetSphere.position.x,
            y: targetSphere.position.y + 10,
            z: targetSphere.position.z + 40,
            duration: 1,
            ease: 'power2.inOut'
        });
    }

    play() {
        this.isPlaying = true;
        document.getElementById('play-btn').classList.add('hidden');
        document.getElementById('pause-btn').classList.remove('hidden');
        this.playbackLoop();
    }

    pause() {
        this.isPlaying = false;
        document.getElementById('play-btn').classList.remove('hidden');
        document.getElementById('pause-btn').classList.add('hidden');
    }

    reset() {
        this.pause();
        this.scrubToIndex(this.snapshots.length - 1);
    }

    playbackLoop() {
        if (!this.isPlaying) return;

        this.currentIndex++;
        if (this.currentIndex >= this.snapshots.length) {
            this.currentIndex = 0;
        }

        this.scrubToIndex(this.currentIndex);

        setTimeout(() => {
            this.playbackLoop();
        }, 1000 / this.playbackSpeed);
    }

    updateSummaryStats(summary) {
        document.getElementById('avg-health').textContent = summary.averageHealth;
        document.getElementById('critical-weeks').textContent = summary.criticalWeeks;

        const trend = summary.healthTrend;
        const trendText = trend > 0 ? `+${trend} ↑` : `${trend} ↓`;
        const trendColor = trend > 0 ? '#10b981' : '#ef4444';
        const trendEl = document.getElementById('health-trend');
        trendEl.textContent = trendText;
        trendEl.style.color = trendColor;
    }

    setupTimelineMarkers(timeRange) {
        const markersContainer = document.getElementById('timeline-markers');
        markersContainer.innerHTML = `
            <span>${timeRange.start}</span>
            <span>6 Months Ago</span>
            <span>${timeRange.end}</span>
        `;
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Gentle camera rotation
        this.camera.position.x += Math.sin(Date.now() * 0.0001) * 0.01;
        this.camera.lookAt(0, 0, 0);

        // Rotate health spheres
        this.healthSpheres.forEach(sphere => {
            sphere.rotation.y += 0.005;
        });

        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize on page load
let forensicApp;
document.addEventListener('DOMContentLoaded', () => {
    forensicApp = new ForensicTimeSlicer();
});
