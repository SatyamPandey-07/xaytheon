/**
 * GlobeEngine.js
 * High-performance 3D Globe visualization using Three.js
 * Handles 1,000+ simultaneous events with GPU acceleration
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';

class GlobeEngine {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            globeRadius: options.globeRadius || 100,
            cameraDistance: options.cameraDistance || 300,
            rotationSpeed: options.rotationSpeed || 0.001,
            maxArcs: options.maxArcs || 1000,
            maxPulses: options.maxPulses || 500,
            particleCount: options.particleCount || 5000,
            enableGlow: options.enableGlow !== false,
            enableHeatmap: options.enableHeatmap !== false,
            ...options
        };

        // Core components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.globe = null;
        
        // Event visualization
        this.arcs = [];
        this.pulses = [];
        this.particles = null;
        this.heatmapLayer = null;
        
        // Animation state
        this.animationId = null;
        this.clock = new THREE.Clock();
        this.isAnimating = false;
        
        // Event tracking
        this.activeEvents = new Map();
        this.eventQueue = [];
        
        // Performance monitoring
        this.stats = {
            fps: 0,
            drawCalls: 0,
            triangles: 0,
            activeArcs: 0,
            activePulses: 0
        };

        this.initialize();
    }

    /**
     * Initialize the 3D globe engine
     */
    initialize() {
        this.createScene();
        this.createCamera();
        this.createRenderer();
        this.createControls();
        this.createGlobe();
        this.createAtmosphere();
        this.createStarfield();
        this.createParticleSystem();
        this.createLights();
        this.setupEventListeners();
        this.startAnimation();
        
        console.log('GlobeEngine initialized');
    }

    /**
     * Create Three.js scene
     */
    createScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000510);
        this.scene.fog = new THREE.Fog(0x000510, 400, 2000);
    }

    /**
     * Create camera
     */
    createCamera() {
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(45, aspect, 1, 10000);
        this.camera.position.z = this.options.cameraDistance;
    }

    /**
     * Create WebGL renderer
     */
    createRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
        });
        
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        this.container.appendChild(this.renderer.domElement);
    }

    /**
     * Create orbit controls
     */
    createControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 150;
        this.controls.maxDistance = 800;
        this.controls.enablePan = false;
    }

    /**
     * Create the Earth globe
     */
    createGlobe() {
        const geometry = new THREE.SphereGeometry(this.options.globeRadius, 64, 64);
        
        // Custom shaders for enhanced visuals
        const material = new THREE.ShaderMaterial({
            uniforms: {
                globeTexture: { value: this.createEarthTexture() },
                time: { value: 0 },
                glowColor: { value: new THREE.Color(0x4444ff) },
                glowStrength: { value: 0.3 }
            },
            vertexShader: this.getGlobeVertexShader(),
            fragmentShader: this.getGlobeFragmentShader(),
            transparent: false
        });

        this.globe = new THREE.Mesh(geometry, material);
        this.globe.rotation.y = -Math.PI / 2; // Start with Prime Meridian facing forward
        this.scene.add(this.globe);
    }

    /**
     * Create procedural Earth texture
     */
    createEarthTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Ocean
        const oceanGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        oceanGradient.addColorStop(0, '#0a1128');
        oceanGradient.addColorStop(1, '#001242');
        ctx.fillStyle = oceanGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Simplified continents (artistic representation)
        ctx.fillStyle = '#1a3a1a';
        this.drawSimplifiedContinents(ctx, canvas.width, canvas.height);

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    /**
     * Draw simplified continent shapes
     */
    drawSimplifiedContinents(ctx, width, height) {
        // This is a simplified artistic representation
        // In production, load actual Earth texture
        
        // North America
        ctx.beginPath();
        ctx.ellipse(width * 0.2, height * 0.35, width * 0.1, height * 0.15, 0.3, 0, Math.PI * 2);
        ctx.fill();

        // South America
        ctx.beginPath();
        ctx.ellipse(width * 0.25, height * 0.65, width * 0.06, height * 0.12, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Europe
        ctx.beginPath();
        ctx.ellipse(width * 0.5, height * 0.3, width * 0.05, height * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();

        // Africa
        ctx.beginPath();
        ctx.ellipse(width * 0.52, height * 0.55, width * 0.08, height * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();

        // Asia
        ctx.beginPath();
        ctx.ellipse(width * 0.7, height * 0.35, width * 0.15, height * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Australia
        ctx.beginPath();
        ctx.ellipse(width * 0.8, height * 0.7, width * 0.05, height * 0.06, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Globe vertex shader
     */
    getGlobeVertexShader() {
        return `
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            void main() {
                vUv = uv;
                vNormal = normalize(normalMatrix * normal);
                vPosition = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;
    }

    /**
     * Globe fragment shader
     */
    getGlobeFragmentShader() {
        return `
            uniform sampler2D globeTexture;
            uniform float time;
            uniform vec3 glowColor;
            uniform float glowStrength;
            
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            void main() {
                vec4 texColor = texture2D(globeTexture, vUv);
                
                // Calculate lighting
                vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
                float diffuse = max(dot(vNormal, lightDir), 0.0);
                
                // Add subtle glow at edges
                float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
                vec3 glow = glowColor * intensity * glowStrength;
                
                vec3 finalColor = texColor.rgb * (0.3 + diffuse * 0.7) + glow;
                
                gl_FragColor = vec4(finalColor, 1.0);
            }
        `;
    }

    /**
     * Create atmospheric glow effect
     */
    createAtmosphere() {
        if (!this.options.enableGlow) return;

        const geometry = new THREE.SphereGeometry(this.options.globeRadius * 1.15, 64, 64);
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                color: { value: new THREE.Color(0x4488ff) }
            },
            vertexShader: `
                varying vec3 vNormal;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                varying vec3 vNormal;
                
                void main() {
                    float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
                    gl_FragColor = vec4(color, 1.0) * intensity;
                }
            `,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide,
            transparent: true
        });

        const atmosphere = new THREE.Mesh(geometry, material);
        this.scene.add(atmosphere);
    }

    /**
     * Create starfield background
     */
    createStarfield() {
        const starGeometry = new THREE.BufferGeometry();
        const starVertices = [];
        
        for (let i = 0; i < 10000; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            const radius = 1500 + Math.random() * 500;
            
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = radius * Math.cos(phi);
            
            starVertices.push(x, y, z);
        }
        
        starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
        
        const starMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 1.5,
            transparent: true,
            opacity: 0.8
        });
        
        const stars = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(stars);
    }

    /**
     * Create GPU-accelerated particle system for event visualization
     */
    createParticleSystem() {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.options.particleCount * 3);
        const colors = new Float32Array(this.options.particleCount * 3);
        const sizes = new Float32Array(this.options.particleCount);
        const lifetimes = new Float32Array(this.options.particleCount);
        
        for (let i = 0; i < this.options.particleCount; i++) {
            positions[i * 3] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;
            
            colors[i * 3] = 1;
            colors[i * 3 + 1] = 1;
            colors[i * 3 + 2] = 1;
            
            sizes[i] = 0;
            lifetimes[i] = 0;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
        
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                pixelRatio: { value: window.devicePixelRatio }
            },
            vertexShader: this.getParticleVertexShader(),
            fragmentShader: this.getParticleFragmentShader(),
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }

    /**
     * Particle vertex shader
     */
    getParticleVertexShader() {
        return `
            attribute float size;
            attribute float lifetime;
            attribute vec3 color;
            
            varying vec3 vColor;
            varying float vLifetime;
            
            uniform float time;
            uniform float pixelRatio;
            
            void main() {
                vColor = color;
                vLifetime = lifetime;
                
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * (300.0 / -mvPosition.z) * pixelRatio;
                gl_Position = projectionMatrix * mvPosition;
            }
        `;
    }

    /**
     * Particle fragment shader
     */
    getParticleFragmentShader() {
        return `
            varying vec3 vColor;
            varying float vLifetime;
            
            void main() {
                // Circular particle shape
                vec2 center = gl_PointCoord - vec2(0.5);
                float dist = length(center);
                
                if (dist > 0.5) discard;
                
                float alpha = (1.0 - dist * 2.0) * vLifetime;
                gl_FragColor = vec4(vColor, alpha);
            }
        `;
    }

    /**
     * Create lights
     */
    createLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        // Directional light (sun)
        const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
        sunLight.position.set(200, 100, 200);
        this.scene.add(sunLight);

        // Point light for highlights
        const pointLight = new THREE.PointLight(0x4488ff, 0.5);
        pointLight.position.set(-100, 50, 100);
        this.scene.add(pointLight);
    }

    /**
     * Convert lat/lon to 3D coordinates
     */
    latLonToVector3(lat, lon, radius = this.options.globeRadius) {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);

        const x = -radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);

        return new THREE.Vector3(x, y, z);
    }

    /**
     * Add event visualization (arc from location)
     */
    addEvent(event) {
        if (!event.location) return;

        const { lat, lon } = event.location;
        const startPos = this.latLonToVector3(lat, lon);
        
        // Randomize end position (simulates data flow)
        const endPos = this.latLonToVector3(
            lat + (Math.random() - 0.5) * 40,
            lon + (Math.random() - 0.5) * 40
        );

        // Create arc
        this.createArc(startPos, endPos, event);

        // Create pulse at origin
        this.createPulse(startPos, event);

        // Update particle system
        this.triggerParticles(startPos, event);
    }

    /**
     * Create arc between two points
     */
    createArc(start, end, event) {
        if (this.arcs.length >= this.options.maxArcs) {
            const oldArc = this.arcs.shift();
            this.scene.remove(oldArc.mesh);
        }

        const curve = new THREE.QuadraticBezierCurve3(
            start,
            start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(this.options.globeRadius * 1.5),
            end
        );

        const points = curve.getPoints(50);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);

        const color = this.getEventColor(event.type);
        const material = new THREE.LineBasicMaterial({
            color,
            transparent: true,
            opacity: 0.8,
            linewidth: 2
        });

        const arc = new THREE.Line(geometry, material);
        
        this.scene.add(arc);
        this.arcs.push({
            mesh: arc,
            createdAt: Date.now(),
            lifetime: 2000
        });
    }

    /**
     * Create pulse effect at location
     */
    createPulse(position, event) {
        if (this.pulses.length >= this.options.maxPulses) {
            const oldPulse = this.pulses.shift();
            this.scene.remove(oldPulse.mesh);
        }

        const geometry = new THREE.RingGeometry(0.5, 1, 32);
        const color = this.getEventColor(event.type);
        const material = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 1,
            side: THREE.DoubleSide
        });

        const pulse = new THREE.Mesh(geometry, material);
        pulse.position.copy(position);
        pulse.lookAt(new THREE.Vector3(0, 0, 0));

        this.scene.add(pulse);
        this.pulses.push({
            mesh: pulse,
            createdAt: Date.now(),
            lifetime: 1000,
            startScale: 0.1,
            endScale: 3
        });
    }

    /**
     * Trigger particle effect
     */
    triggerParticles(position, event) {
        const particleCount = 20;
        const positions = this.particles.geometry.attributes.position.array;
        const colors = this.particles.geometry.attributes.color.array;
        const sizes = this.particles.geometry.attributes.size.array;
        const lifetimes = this.particles.geometry.attributes.lifetime.array;

        const color = new THREE.Color(this.getEventColor(event.type));

        for (let i = 0; i < particleCount; i++) {
            // Find inactive particle
            let index = -1;
            for (let j = 0; j < this.options.particleCount; j++) {
                if (lifetimes[j] <= 0) {
                    index = j;
                    break;
                }
            }

            if (index === -1) continue;

            // Set particle properties
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            );

            positions[index * 3] = position.x + offset.x;
            positions[index * 3 + 1] = position.y + offset.y;
            positions[index * 3 + 2] = position.z + offset.z;

            colors[index * 3] = color.r;
            colors[index * 3 + 1] = color.g;
            colors[index * 3 + 2] = color.b;

            sizes[index] = 4 + Math.random() * 4;
            lifetimes[index] = 1;
        }

        this.particles.geometry.attributes.position.needsUpdate = true;
        this.particles.geometry.attributes.color.needsUpdate = true;
        this.particles.geometry.attributes.size.needsUpdate = true;
        this.particles.geometry.attributes.lifetime.needsUpdate = true;
    }

    /**
     * Get color based on event type
     */
    getEventColor(eventType) {
        const colors = {
            PushEvent: 0x00ff88,
            PullRequestEvent: 0x4488ff,
            IssuesEvent: 0xff8844,
            StarEvent: 0xffff00,
            ReleaseEvent: 0xff00ff,
            default: 0x88ff88
        };

        return colors[eventType] || colors.default;
    }

    /**
     * Update animations
     */
    update() {
        const delta = this.clock.getDelta();
        const time = this.clock.getElapsedTime();

        // Auto-rotate globe
        if (this.globe) {
            this.globe.rotation.y += this.options.rotationSpeed;
            if (this.globe.material.uniforms) {
                this.globe.material.uniforms.time.value = time;
            }
        }

        // Update controls
        if (this.controls) {
            this.controls.update();
        }

        // Update arcs
        this.updateArcs();

        // Update pulses
        this.updatePulses();

        // Update particles
        this.updateParticles(delta);

        // Process event queue
        this.processEventQueue();
    }

    /**
     * Update arc animations
     */
    updateArcs() {
        const now = Date.now();
        
        for (let i = this.arcs.length - 1; i >= 0; i--) {
            const arc = this.arcs[i];
            const age = now - arc.createdAt;
            
            if (age > arc.lifetime) {
                this.scene.remove(arc.mesh);
                this.arcs.splice(i, 1);
            } else {
                const progress = age / arc.lifetime;
                arc.mesh.material.opacity = 1 - progress;
            }
        }
    }

    /**
     * Update pulse animations
     */
    updatePulses() {
        const now = Date.now();
        
        for (let i = this.pulses.length - 1; i >= 0; i--) {
            const pulse = this.pulses[i];
            const age = now - pulse.createdAt;
            
            if (age > pulse.lifetime) {
                this.scene.remove(pulse.mesh);
                this.pulses.splice(i, 1);
            } else {
                const progress = age / pulse.lifetime;
                const scale = pulse.startScale + (pulse.endScale - pulse.startScale) * progress;
                pulse.mesh.scale.set(scale, scale, scale);
                pulse.mesh.material.opacity = 1 - progress;
            }
        }
    }

    /**
     * Update particle system
     */
    updateParticles(delta) {
        const lifetimes = this.particles.geometry.attributes.lifetime.array;
        
        for (let i = 0; i < this.options.particleCount; i++) {
            if (lifetimes[i] > 0) {
                lifetimes[i] -= delta;
                if (lifetimes[i] < 0) lifetimes[i] = 0;
            }
        }
        
        this.particles.geometry.attributes.lifetime.needsUpdate = true;
        
        if (this.particles.material.uniforms) {
            this.particles.material.uniforms.time.value = this.clock.getElapsedTime();
        }
    }

    /**
     * Process queued events
     */
    processEventQueue() {
        const batchSize = 10; // Process 10 events per frame
        const batch = this.eventQueue.splice(0, batchSize);
        
        batch.forEach(event => this.addEvent(event));
    }

    /**
     * Queue event for visualization
     */
    queueEvent(event) {
        this.eventQueue.push(event);
    }

    /**
     * Start animation loop
     */
    startAnimation() {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        this.animate();
    }

    /**
     * Animation loop
     */
    animate() {
        if (!this.isAnimating) return;

        this.animationId = requestAnimationFrame(() => this.animate());
        
        this.update();
        this.renderer.render(this.scene, this.camera);

        // Update stats
        this.stats.activeArcs = this.arcs.length;
        this.stats.activePulses = this.pulses.length;
    }

    /**
     * Stop animation
     */
    stopAnimation() {
        this.isAnimating = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }

    /**
     * Handle window resize
     */
    handleResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        window.addEventListener('resize', () => this.handleResize());
    }

    /**
     * Clean up resources
     */
    dispose() {
        this.stopAnimation();
        
        // Dispose geometries and materials
        this.scene.traverse((object) => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });

        this.renderer.dispose();
        this.controls.dispose();
        
        this.container.removeChild(this.renderer.domElement);
    }

    /**
     * Get current statistics
     */
    getStatistics() {
        return {
            ...this.stats,
            queuedEvents: this.eventQueue.length
        };
    }
}

export default GlobeEngine;
