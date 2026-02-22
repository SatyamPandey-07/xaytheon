/**
 * XAYTHEON - 3D Forensic Canvas Renderer
 * 
 * Renders the infrastructure state in 3D using Three.js.
 * Capable of visualizing historical snapshots with smooth transitions.
 */

class ForensicRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });

        this.nodes = new Map(); // id -> THREE.Object3D
        this.links = [];

        this.init();
    }

    init() {
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        this.camera.position.set(0, 40, 60);
        this.camera.lookAt(0, 0, 0);

        // Lighting
        const ambient = new THREE.AmbientLight(0x404040, 2);
        this.scene.add(ambient);

        const directional = new THREE.DirectionalLight(0xffffff, 1);
        directional.position.set(10, 20, 10);
        this.scene.add(directional);

        // Grid helper
        const grid = new THREE.GridHelper(200, 20, 0xfbbf24, 0x1e293b);
        grid.position.y = -10;
        grid.material.opacity = 0.2;
        grid.material.transparent = true;
        this.scene.add(grid);

        this.animate();
    }

    /**
     * Build the 3D topology
     */
    createTopology(topology) {
        const geometry = new THREE.SphereGeometry(2, 32, 32);

        topology.forEach(node => {
            const material = new THREE.MeshPhongMaterial({
                color: 0x3b82f6,
                emissive: 0x3b82f6,
                emissiveIntensity: 0.5
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(node.pos[0], node.pos[1], node.pos[2]);
            this.scene.add(mesh);
            this.nodes.set(node.id, mesh);
        });
    }

    /**
     * Update node visuals based on a historical snapshot
     */
    applySnapshot(snapshot) {
        Object.entries(snapshot).forEach(([id, load]) => {
            const mesh = this.nodes.get(id);
            if (mesh) {
                // Color mapping: Blue (cool) to Red (hot)
                const hue = (1 - (load / 100)) * 0.6; // 0.6 is blue, 0.0 is red
                mesh.material.color.setHSL(hue, 1, 0.5);
                mesh.material.emissive.setHSL(hue, 1, 0.2);

                // Scale mapping
                const scale = 1 + (load / 100);
                gsap.to(mesh.scale, { x: scale, y: scale, z: scale, duration: 0.1 });
            }
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Orbit nodes slowly
        this.nodes.forEach((mesh, id) => {
            mesh.rotation.y += 0.01;
        });

        this.renderer.render(this.scene, this.camera);
    }

    onResize() {
        this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    }
}

window.ForensicRenderer = ForensicRenderer;
