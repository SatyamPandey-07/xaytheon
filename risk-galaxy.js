/**
 * Risk Galaxy Frontend Logic
 * Implements 3D star-map and predictive trend charts.
 */

class RiskGalaxy {
    constructor() {
        this.container = document.getElementById('galaxy-viewport');
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.stars = [];
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.trendChart = null;

        this.init();
    }

    async init() {
        this.setupScene();
        this.createStarField();
        this.animate();

        window.addEventListener('resize', () => this.onWindowResize());
        this.container.addEventListener('click', (e) => this.onMouseClick(e));

        await this.loadGalaxyData();
    }

    setupScene() {
        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 100;

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);
    }

    createStarField() {
        const geometry = new THREE.SphereGeometry(0.5, 12, 12);
        for (let i = 0; i < 200; i++) {
            const material = new THREE.MeshBasicMaterial({ color: 0x1e293b, transparent: true, opacity: 0.3 });
            const star = new THREE.Mesh(geometry, material);
            star.position.set(
                (Math.random() - 0.5) * 400,
                (Math.random() - 0.5) * 400,
                (Math.random() - 0.5) * 400
            );
            this.scene.add(star);
        }
    }

    async loadGalaxyData() {
        try {
            const response = await fetch('/api/risk/galaxy');
            const result = await response.json();

            if (result.success) {
                this.renderGalaxy(result.data);
            }
        } catch (error) {
            console.error('Failed to load risk galaxy:', error);
        }
    }

    renderGalaxy(data) {
        data.forEach((file) => {
            const size = Math.max(1, (file.score / 20));
            const geometry = new THREE.SphereGeometry(size, 32, 32);

            const color = this.getColorByScore(file.score);
            const material = new THREE.MeshPhongMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: 0.5,
                shininess: 100
            });

            const star = new THREE.Mesh(geometry, material);
            star.position.set(
                (Math.random() - 0.5) * 150,
                (Math.random() - 0.5) * 100,
                (Math.random() - 0.5) * 100
            );

            // Add custom point light per "Burning Sun"
            if (file.score > 70) {
                const light = new THREE.PointLight(color, 1, 50);
                light.position.copy(star.position);
                this.scene.add(light);
            }

            star.userData = file;
            this.scene.add(star);
            this.stars.push(star);

            // Animate entry
            star.scale.set(0.1, 0.1, 0.1);
            gsap.to(star.scale, { x: 1, y: 1, z: 1, duration: 1, ease: 'back.out' });
        });

        // Add ambient light
        const ambient = new THREE.AmbientLight(0xffffff, 0.1);
        this.scene.add(ambient);
    }

    getColorByScore(score) {
        if (score > 75) return 0xff3e3e; // Red
        if (score > 50) return 0xff9d00; // Orange
        if (score > 25) return 0xf7df1e; // Yellow
        return 0x10b981; // Green
    }

    onMouseClick(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.stars);

        if (intersects.length > 0) {
            this.showFilePanel(intersects[0].object.userData);
            this.animateCameraTo(intersects[0].object.position);
        }
    }

    showFilePanel(file) {
        const panel = document.getElementById('file-card');
        panel.classList.remove('hidden');

        document.getElementById('file-name').textContent = file.name;
        document.getElementById('file-path').textContent = file.path;

        const badge = document.getElementById('risk-badge');
        badge.textContent = file.status;
        badge.className = `badge ${file.status}`;

        document.getElementById('val-churn').textContent = `${file.metrics.churn}%`;
        document.getElementById('val-expertise').textContent = `${Math.round(file.metrics.expertise)}%`;
        document.getElementById('val-complexity').textContent = file.metrics.complexity;

        this.fetchPrediction(file.id);
        this.renderTrendChart(file.trend);
    }

    async fetchPrediction(id) {
        const res = await fetch(`/api/risk/predict/${id}`);
        const result = await res.json();
        if (result.success) {
            document.getElementById('prediction-text').textContent = result.data.prediction;
        }
    }

    renderTrendChart(trendData) {
        const ctx = document.getElementById('trendChart').getContext('2d');
        if (this.trendChart) this.trendChart.destroy();

        this.trendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: trendData.map(d => d.month),
                datasets: [{
                    label: 'Risk Velocity',
                    data: trendData.map(d => d.value),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { min: 0, max: 100, ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    x: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { display: false } }
                }
            }
        });
    }

    animateCameraTo(targetPos) {
        gsap.to(this.camera.position, {
            x: targetPos.x,
            y: targetPos.y,
            z: targetPos.z + 50,
            duration: 1.2,
            ease: 'expo.inOut'
        });
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        this.stars.forEach(star => {
            star.rotation.y += 0.01;
        });

        this.renderer.render(this.scene, this.camera);
    }
}

let galaxyApp;
document.addEventListener('DOMContentLoaded', () => {
    galaxyApp = new RiskGalaxy();
});

function resetView() {
    gsap.to(galaxyApp.camera.position, { x: 0, y: 0, z: 100, duration: 1.5, ease: 'expo.inOut' });
    document.getElementById('file-card').classList.add('hidden');
}

function runScrub() {
    alert("AI Scrub initialized. Analyzing NLP patterns in commit 'fix' history...");
}
