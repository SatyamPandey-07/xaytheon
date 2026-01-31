/**
 * Bundle City - 3D Visualization Logic
 * Uses Three.js for rendering and GSAP for animations.
 */

class BundleCity {
    constructor() {
        this.container = document.getElementById('city-viewport');
        this.buildings = [];
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.selectedBuilding = null;

        this.init();
    }

    async init() {
        this.setupScene();
        this.setupLighting();
        this.addBasePlane();
        this.animate();

        window.addEventListener('resize', () => this.onWindowResize());
        this.container.addEventListener('click', (e) => this.onMouseClick(e));

        await this.loadCityData();
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0f);
        this.scene.fog = new THREE.FogExp2(0x0a0a0f, 0.002);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
        this.camera.position.set(150, 150, 150);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2.1; // Prevent going under the floor
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0x404040, 2);
        this.scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xffffff, 1);
        sunLight.position.set(100, 200, 100);
        this.scene.add(sunLight);

        const blueLight = new THREE.PointLight(0x3b82f6, 1, 500);
        blueLight.position.set(-100, 50, -100);
        this.scene.add(blueLight);
    }

    addBasePlane() {
        const grid = new THREE.GridHelper(1000, 100, 0x1e1e24, 0x1e1e24);
        this.scene.add(grid);

        const geometry = new THREE.PlaneGeometry(1000, 1000);
        const material = new THREE.MeshPhongMaterial({ color: 0x05050a, side: THREE.DoubleSide });
        const plane = new THREE.Mesh(geometry, material);
        plane.rotation.x = Math.PI / 2;
        plane.position.y = -0.1;
        this.scene.add(plane);
    }

    async loadCityData() {
        try {
            const response = await fetch('/api/bundle/city');
            const result = await response.json();

            if (result.success) {
                this.renderBuildings(result.data.layout.buildings);
                this.updateUI(result.data.layout.summary, result.data.suggestions);
            }
        } catch (error) {
            console.error('Failed to load bundle city:', error);
        }
    }

    renderBuildings(buildingData) {
        buildingData.forEach((data, index) => {
            const geometry = new THREE.BoxGeometry(data.width, data.height, data.depth);
            // Move pivot point to bottom
            geometry.translate(0, data.height / 2, 0);

            const material = new THREE.MeshPhongMaterial({
                color: data.color,
                transparent: true,
                opacity: 0.8,
                emissive: data.color,
                emissiveIntensity: 0.2
            });

            const building = new THREE.Mesh(geometry, material);
            building.position.set(data.x, 0, data.z);
            building.userData = data;

            // Animation entry
            building.scale.set(1, 0.01, 1);
            this.scene.add(building);
            this.buildings.push(building);

            gsap.to(building.scale, {
                y: 1,
                duration: 1.5,
                delay: index * 0.05,
                ease: "elastic.out(1, 0.5)"
            });
        });
    }

    updateUI(summary, suggestions) {
        document.getElementById('total-size').textContent = summary.totalSize;
        document.getElementById('total-buildings').textContent = summary.totalFiles;
        document.getElementById('bloat-factor').textContent = summary.bloatFactor;

        const suggestionsList = document.getElementById('ai-suggestions');
        suggestionsList.innerHTML = suggestions.map(s => `
            <div class="suggestion-item ${s.impact.toLowerCase()}">
                <div class="suggestion-header">
                    <span>${s.target}</span>
                    <span class="impact-badge">${s.impact} Impact</span>
                </div>
                <div class="suggestion-desc">${s.description}</div>
                <button class="btn btn-primary btn-sm" onclick="demolishBuilding('${s.target}')">
                    <i class="ri-hammer-line"></i> Run Action
                </button>
            </div>
        `).join('');
    }

    onMouseClick(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.buildings);

        if (intersects.length > 0) {
            const building = intersects[0].object;
            this.selectBuilding(building);
        } else {
            this.deselectBuilding();
        }
    }

    selectBuilding(building) {
        if (this.selectedBuilding) this.deselectBuilding();

        this.selectedBuilding = building;
        building.material.opacity = 1.0;
        building.material.emissiveIntensity = 0.8;

        const data = building.userData;
        const info = document.getElementById('selection-info');
        info.innerHTML = `
            <h4>${data.name}</h4>
            <div>Size: ${data.stats.size}</div>
            <div>Deps: ${data.stats.deps}</div>
            <div>Rent: <span style="color:#10b981">${data.stats.rent}</span></div>
            <button class="btn btn-danger btn-sm" style="margin-top:10px" onclick="openDemolitionModal()">
                <i class="ri-delete-bin-line"></i> Demolish
            </button>
        `;

        // Pulse effect
        gsap.to(building.scale, { x: 1.1, z: 1.1, duration: 0.2, yoyo: true, repeat: 1 });
    }

    deselectBuilding() {
        if (!this.selectedBuilding) return;

        this.selectedBuilding.material.opacity = 0.8;
        this.selectedBuilding.material.emissiveIntensity = 0.2;
        this.selectedBuilding = null;

        document.getElementById('selection-info').innerHTML = '<p>Select a building to view performance "Rent"</p>';
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

// Global functions for UI interaction
let cityApp;
document.addEventListener('DOMContentLoaded', () => {
    cityApp = new BundleCity();
});

function openDemolitionModal() {
    const modal = document.getElementById('demolition-modal');
    modal.classList.add('active');
}

document.getElementById('cancel-demo').addEventListener('click', () => {
    document.getElementById('demolition-modal').classList.remove('active');
});

document.getElementById('confirm-demo').addEventListener('click', async () => {
    if (!cityApp.selectedBuilding) return;

    const target = cityApp.selectedBuilding.userData.id;
    const res = await fetch('/api/bundle/demolish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buildingId: target })
    });

    const data = await res.json();
    if (data.success) {
        // Demolition animation
        gsap.to(cityApp.selectedBuilding.scale, {
            y: 0, x: 0, z: 0,
            duration: 0.5,
            onComplete: () => {
                cityApp.scene.remove(cityApp.selectedBuilding);
            }
        });
        document.getElementById('demolition-modal').classList.remove('active');
        cityApp.deselectBuilding();
    }
});

async function demolishBuilding(targetName) {
    // Helper for AI suggestion buttons
    alert(`AI Agent running demolition protocol for: ${targetName}\nTriggering "npm prune" simulation...`);
}
