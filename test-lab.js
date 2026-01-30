/**
 * AI Test Lab - 3D Interface
 * Handles logic tree rendering and AI interaction.
 */

class TestLab {
    constructor() {
        this.container = document.getElementById('logic-tree-viewport');
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.nodes = [];
        this.links = [];
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.selectedNode = null;

        this.init();
    }

    init() {
        this.setupScene();
        this.setupLights();
        this.animate();

        window.addEventListener('resize', () => this.onWindowResize());
        this.container.addEventListener('click', (e) => this.onMouseClick(e));
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x05050a);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(100, 100, 100);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
    }

    setupLights() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambient);

        const point = new THREE.PointLight(0x3b82f6, 1, 500);
        point.position.set(50, 50, 50);
        this.scene.add(point);
    }

    async analyze(filePath) {
        try {
            const res = await fetch(`/api/test-lab/analyze?filePath=${filePath}`);
            const result = await res.json();
            if (result.success) {
                this.renderTree(result.data.logicTree);
            }
        } catch (e) {
            console.error(e);
        }
    }

    renderTree(treeData) {
        // Clear previous tree
        this.nodes.forEach(n => this.scene.remove(n));
        this.links.forEach(l => this.scene.remove(l));
        this.nodes = [];
        this.links = [];

        // Root Node
        const rootGeo = new THREE.SphereGeometry(4, 32, 32);
        const rootMat = new THREE.MeshPhongMaterial({ color: 0x3b82f6, emissive: 0x3b82f6, emissiveIntensity: 0.5 });
        const root = new THREE.Mesh(rootGeo, rootMat);
        root.position.set(0, 0, 0);
        this.scene.add(root);

        // Branch Nodes
        treeData.nodes.forEach((node) => {
            const geo = new THREE.SphereGeometry(3, 32, 32);
            const color = node.status === 'tested' ? 0x10b981 : 0xef4444;
            const mat = new THREE.MeshPhongMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: 0.5,
                transparent: true,
                opacity: 0.8
            });

            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(node.x, node.y, node.z);
            mesh.userData = node;
            this.scene.add(mesh);
            this.nodes.push(mesh);

            // Line from root to node
            const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(node.x, node.y, node.z)];
            const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
            const lineMat = new THREE.LineBasicMaterial({ color: 0x1e293b, transparent: true, opacity: 0.3 });
            const line = new THREE.Line(lineGeo, lineMat);
            this.scene.add(line);
            this.links.push(line);

            // Animation entry
            mesh.scale.set(0, 0, 0);
            gsap.to(mesh.scale, { x: 1, y: 1, z: 1, duration: 1, ease: 'elastic.out(1, 0.5)' });
        });
    }

    onMouseClick(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.nodes);

        if (intersects.length > 0) {
            const node = intersects[0].object;
            this.selectNode(node);
        }
    }

    selectNode(node) {
        if (this.selectedNode) {
            this.selectedNode.material.emissiveIntensity = 0.5;
            this.selectedNode.scale.set(1, 1, 1);
        }

        this.selectedNode = node;
        node.material.emissiveIntensity = 1.0;
        gsap.to(node.scale, { x: 1.3, y: 1.3, z: 1.3, duration: 0.3 });

        // Update UI
        const data = node.userData;
        document.getElementById('branch-card').classList.remove('hidden');
        document.getElementById('branch-condition').innerText = data.metadata.condition;

        const badge = document.getElementById('coverage-status');
        badge.innerText = data.status.toUpperCase();
        badge.className = `status-badge ${data.status}`;

        this.renderBoundaries(data.metadata.boundaries);

        // Zoom camera
        gsap.to(this.camera.position, {
            x: node.position.x + 40,
            y: node.position.y + 40,
            z: node.position.z + 40,
            duration: 1,
            ease: 'expo.inOut'
        });
    }

    renderBoundaries(boundaries) {
        const list = document.getElementById('boundary-list');
        list.innerHTML = boundaries.map(b => `
            <div class="boundary-item">
                <span class="type">${b.type}</span>
                <span class="value">Value: ${b.value}</span>
                <span class="reason">${b.reason}</span>
            </div>
        `).join('');
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        if (this.controls) this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

// Global integration
let lab;
document.addEventListener('DOMContentLoaded', () => {
    lab = new TestLab();
});

async function analyzeCode() {
    const filePath = document.getElementById('file-input').value;
    await lab.analyze(filePath);
}

async function generateTest() {
    if (!lab.selectedNode) return;

    const filePath = document.getElementById('file-input').value;
    const branch = lab.selectedNode.userData.metadata;

    const res = await fetch('/api/test-lab/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, branches: [branch] })
    });

    const result = await res.json();
    if (result.success) {
        document.getElementById('test-results').classList.remove('hidden');
        document.getElementById('generated-code').innerText = result.data[0].code;
    }
}

function hideResults() {
    document.getElementById('test-results').classList.add('hidden');
}

function copyCode() {
    const code = document.getElementById('generated-code').innerText;
    navigator.clipboard.writeText(code);
    alert('Code copied to clipboard!');
}
