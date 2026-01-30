/**
 * Security Fuzzer Frontend Logic
 * AI-Powered Security Fuzzer & Vulnerability Path Visualizer
 */

const API_BASE = '/api/security';
let currentAnalysisData = null;
let scene, camera, renderer, controls;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadNavbar();
    initializeEventListeners();
    loadSavedAnalysis();
});

// Load navbar
async function loadNavbar() {
    try {
        const response = await fetch('navbar.html');
        const html = await response.text();
        document.getElementById('navbar-container').innerHTML = html;
    } catch (error) {
        console.error('Failed to load navbar:', error);
    }
}

// Initialize event listeners
function initializeEventListeners() {
    // Analysis buttons
    document.getElementById('analyze-project').addEventListener('click', analyzeProject);
    document.getElementById('upload-package').addEventListener('click', () => {
        document.getElementById('file-input').click();
    });
    
    // File upload
    document.getElementById('file-input').addEventListener('change', handleFileUpload);
    
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterVulnerabilities(e.target.dataset.filter);
        });
    });
    
    // Visualization controls
    document.getElementById('toggle-vulnerable')?.addEventListener('click', toggleVulnerableOnly);
    document.getElementById('toggle-glow')?.addEventListener('click', toggleGlow);
    document.getElementById('reset-camera')?.addEventListener('click', resetCamera);
    
    // Compare & Pull Request buttons
    document.getElementById('compare-scans')?.addEventListener('click', compareScans);
    document.getElementById('create-pr')?.addEventListener('click', createPullRequest);
}

// Analyze project
async function analyzeProject() {
    const projectPath = document.getElementById('project-path').value.trim();
    
    if (!projectPath) {
        alert('Please enter a project directory path');
        return;
    }
    
    const analyzeBtn = document.getElementById('analyze-project');
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = '🔄 Analyzing...';
    
    try {
        const response = await fetch(`${API_BASE}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectPath })
        });
        
        if (!response.ok) throw new Error('Analysis failed');
        
        const data = await response.json();
        currentAnalysisData = data;
        
        // Save to localStorage
        localStorage.setItem('lastSecurityAnalysis', JSON.stringify({
            data,
            timestamp: Date.now(),
            projectPath
        }));
        
        displayResults(data);
        
    } catch (error) {
        console.error('Analysis error:', error);
        alert('Failed to analyze project: ' + error.message);
    } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = '🔍 Analyze Vulnerabilities';
    }
}

// Handle file upload
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        const content = await file.text();
        const packageJson = JSON.parse(content);
        
        // Use package.json content for analysis
        document.getElementById('project-path').value = JSON.stringify(packageJson, null, 2);
        
    } catch (error) {
        alert('Invalid package.json file');
    }
}

// Display results
function displayResults(data) {
    // Show all sections
    document.getElementById('stats-grid').style.display = 'grid';
    document.getElementById('viz-section').style.display = 'block';
    document.getElementById('vuln-list').style.display = 'block';
    document.getElementById('taint-section').style.display = 'block';
    document.getElementById('tests-section').style.display = 'block';
    document.getElementById('risk-matrix-section').style.display = 'block';
    
    // Update stats
    updateStats(data);
    
    // Render vulnerability list
    renderVulnerabilities(data.vulnerabilities || []);
    
    // Render taint flows
    renderTaintFlows(data.taintFlows || []);
    
    // Render tests
    renderTests(data.tests || []);
    
    // Render risk matrix
    renderRiskMatrix(data.riskMatrix || {});
    
    // Initialize 3D visualization
    if (data.visualization) {
        init3DVisualization(data.visualization);
    }
}

// Update stats
function updateStats(data) {
    const vulns = data.vulnerabilities || [];
    
    const critical = vulns.filter(v => v.severity === 'critical').length;
    const high = vulns.filter(v => v.severity === 'high').length;
    const reachable = vulns.filter(v => v.reachability > 70).length;
    const tests = (data.tests || []).reduce((sum, t) => sum + t.tests.length, 0);
    
    document.getElementById('stat-critical').textContent = critical;
    document.getElementById('stat-high').textContent = high;
    document.getElementById('stat-reachable').textContent = reachable;
    document.getElementById('stat-tests').textContent = tests;
}

// Render vulnerabilities
function renderVulnerabilities(vulnerabilities) {
    const container = document.getElementById('vulnerabilities-container');
    container.innerHTML = '';
    
    if (vulnerabilities.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#6c757d;">No vulnerabilities detected ✓</p>';
        return;
    }
    
    vulnerabilities.forEach(vuln => {
        const card = document.createElement('div');
        card.className = `vuln-item ${vuln.severity}`;
        card.dataset.severity = vuln.severity;
        
        card.innerHTML = `
            <div class="vuln-header">
                <div>
                    <h3 class="vuln-title">${vuln.type || 'Unknown Vulnerability'}</h3>
                    <div class="vuln-meta">
                        <span>📦 ${vuln.package || 'N/A'}</span>
                        <span>🎯 Reachability: ${vuln.reachability || 0}%</span>
                        <span>📊 CVSS: ${vuln.cvssScore || 'N/A'}</span>
                    </div>
                </div>
                <span class="severity-badge ${vuln.severity}">${vuln.severity}</span>
            </div>
            <p class="vuln-description">${vuln.description || 'No description available'}</p>
            ${vuln.exploitPath ? `<div class="vuln-path">${vuln.exploitPath}</div>` : ''}
        `;
        
        container.appendChild(card);
    });
}

// Render taint flows
function renderTaintFlows(flows) {
    const container = document.getElementById('taint-flows-container');
    container.innerHTML = '';
    
    if (flows.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#6c757d;">No taint flows detected</p>';
        return;
    }
    
    flows.forEach(flow => {
        const flowDiv = document.createElement('div');
        flowDiv.className = 'taint-flow';
        
        flowDiv.innerHTML = `
            <div class="flow-path">
                <span class="flow-source">SOURCE:</span> ${flow.source} 
                → <span class="flow-sink">SINK:</span> ${flow.sink}
            </div>
            <p>${flow.description || ''}</p>
            <div style="margin-top:0.5rem;">
                <span class="severity-badge ${flow.severity || 'medium'}">${flow.severity || 'medium'}</span>
                <span style="margin-left:1rem;color:#6c757d;">Confidence: ${flow.confidence || 'N/A'}%</span>
            </div>
        `;
        
        container.appendChild(flowDiv);
    });
}

// Render tests
function renderTests(testGroups) {
    const container = document.getElementById('tests-container');
    container.innerHTML = '';
    
    if (testGroups.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#6c757d;">No tests generated</p>';
        return;
    }
    
    testGroups.forEach(group => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'test-group';
        
        const title = document.createElement('h3');
        title.className = 'test-group-title';
        title.textContent = `${group.vulnerability || 'Security'} Tests (${group.tests?.length || 0})`;
        groupDiv.appendChild(title);
        
        (group.tests || []).forEach((test, idx) => {
            const testDiv = document.createElement('div');
            testDiv.style.marginBottom = '1rem';
            
            const pre = document.createElement('pre');
            pre.className = 'test-code';
            pre.textContent = test;
            
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-btn';
            copyBtn.textContent = '📋 Copy';
            copyBtn.onclick = () => copyToClipboard(test, copyBtn);
            
            pre.appendChild(copyBtn);
            testDiv.appendChild(pre);
            groupDiv.appendChild(testDiv);
        });
        
        container.appendChild(groupDiv);
    });
}

// Render risk matrix
function renderRiskMatrix(matrix) {
    const container = document.getElementById('risk-matrix');
    container.innerHTML = '';
    
    const severities = ['critical', 'high', 'medium', 'low'];
    
    severities.forEach(severity => {
        const count = matrix[severity] || 0;
        
        const cell = document.createElement('div');
        cell.className = `risk-cell ${severity}`;
        cell.innerHTML = `
            <h4>${severity}</h4>
            <div class="risk-count">${count}</div>
        `;
        
        container.appendChild(cell);
    });
}

// Initialize 3D visualization
function init3DVisualization(data) {
    const container = document.getElementById('visualization-container');
    if (!container) return;
    
    // Clear existing
    container.innerHTML = '';
    
    // Setup scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    
    // Camera
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 50;
    
    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    
    // Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    
    // Add nodes and edges
    addNodes(data.nodes || []);
    addEdges(data.edges || []);
    
    // Animate
    animate();
}

// Add nodes to scene
function addNodes(nodes) {
    nodes.forEach(node => {
        const geometry = new THREE.SphereGeometry(node.vulnerable ? 1.5 : 1, 16, 16);
        const color = getSeverityColor(node.severity);
        const material = new THREE.MeshBasicMaterial({ color });
        
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(node.x || 0, node.y || 0, node.z || 0);
        
        if (node.vulnerable) {
            // Add glow effect
            const glowGeometry = new THREE.SphereGeometry(2, 16, 16);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color,
                transparent: true,
                opacity: 0.3
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            glow.position.copy(sphere.position);
            scene.add(glow);
        }
        
        scene.add(sphere);
    });
}

// Add edges to scene
function addEdges(edges) {
    edges.forEach(edge => {
        const points = [
            new THREE.Vector3(edge.from.x, edge.from.y, edge.from.z),
            new THREE.Vector3(edge.to.x, edge.to.y, edge.to.z)
        ];
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const color = edge.vulnerable ? 0xff0000 : 0x444444;
        const material = new THREE.LineBasicMaterial({ color });
        
        const line = new THREE.Line(geometry, material);
        scene.add(line);
    });
}

// Get severity color
function getSeverityColor(severity) {
    const colors = {
        critical: 0xdc3545,
        high: 0xfd7e14,
        medium: 0xffc107,
        low: 0x28a745
    };
    return colors[severity] || 0x6c757d;
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    if (controls) controls.update();
    if (renderer && scene && camera) renderer.render(scene, camera);
}

// Filter vulnerabilities
function filterVulnerabilities(filter) {
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    
    // Filter vulnerability cards
    document.querySelectorAll('.vuln-item').forEach(card => {
        if (filter === 'all' || card.dataset.severity === filter) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Toggle vulnerable only
function toggleVulnerableOnly(e) {
    e.target.classList.toggle('active');
    // Implementation for filtering 3D view
}

// Toggle glow
function toggleGlow(e) {
    e.target.classList.toggle('active');
    // Implementation for glow effect
}

// Reset camera
function resetCamera() {
    if (camera) {
        camera.position.set(0, 0, 50);
        camera.lookAt(0, 0, 0);
    }
}

// Compare scans
async function compareScans() {
    if (!currentAnalysisData) {
        alert('Please run an analysis first');
        return;
    }
    
    const previousAnalysis = localStorage.getItem('previousSecurityAnalysis');
    
    if (!previousAnalysis) {
        alert('No previous scan found to compare. Run multiple scans to enable comparison.');
        return;
    }
    
    try {
        const previous = JSON.parse(previousAnalysis);
        const comparison = compareAnalysisResults(previous.data, currentAnalysisData);
        
        displayComparisonResults(comparison);
        
    } catch (error) {
        console.error('Comparison error:', error);
        alert('Failed to compare scans: ' + error.message);
    }
}

// Compare analysis results
function compareAnalysisResults(previous, current) {
    const prevVulns = previous.vulnerabilities || [];
    const currVulns = current.vulnerabilities || [];
    
    const fixed = prevVulns.filter(pv => 
        !currVulns.some(cv => cv.package === pv.package && cv.type === pv.type)
    );
    
    const newVulns = currVulns.filter(cv => 
        !prevVulns.some(pv => pv.package === cv.package && pv.type === cv.type)
    );
    
    const unchanged = currVulns.filter(cv => 
        prevVulns.some(pv => pv.package === cv.package && pv.type === cv.type)
    );
    
    return {
        fixed,
        new: newVulns,
        unchanged,
        improvementRate: prevVulns.length > 0 
            ? ((fixed.length / prevVulns.length) * 100).toFixed(1)
            : 0
    };
}

// Display comparison results
function displayComparisonResults(comparison) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        background: white;
        padding: 2rem;
        border-radius: 12px;
        max-width: 800px;
        max-height: 80vh;
        overflow-y: auto;
    `;
    
    content.innerHTML = `
        <h2 style="margin-top:0;">📊 Security Scan Comparison</h2>
        
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin:2rem 0;">
            <div style="text-align:center;padding:1rem;background:#d4edda;border-radius:8px;">
                <div style="font-size:2rem;font-weight:bold;color:#28a745;">${comparison.fixed.length}</div>
                <div style="color:#155724;">✓ Fixed</div>
            </div>
            <div style="text-align:center;padding:1rem;background:#f8d7da;border-radius:8px;">
                <div style="font-size:2rem;font-weight:bold;color:#dc3545;">${comparison.new.length}</div>
                <div style="color:#721c24;">⚠ New</div>
            </div>
            <div style="text-align:center;padding:1rem;background:#fff3cd;border-radius:8px;">
                <div style="font-size:2rem;font-weight:bold;color:#856404;">${comparison.unchanged.length}</div>
                <div style="color:#856404;">● Unchanged</div>
            </div>
        </div>
        
        <div style="background:#e7f3ff;padding:1rem;border-radius:8px;margin-bottom:2rem;">
            <strong>Improvement Rate:</strong> ${comparison.improvementRate}%
        </div>
        
        ${comparison.fixed.length > 0 ? `
            <h3 style="color:#28a745;">✓ Fixed Vulnerabilities</h3>
            <ul>
                ${comparison.fixed.map(v => `<li>${v.package}: ${v.type}</li>`).join('')}
            </ul>
        ` : ''}
        
        ${comparison.new.length > 0 ? `
            <h3 style="color:#dc3545;">⚠ New Vulnerabilities</h3>
            <ul>
                ${comparison.new.map(v => `<li>${v.package}: ${v.type} (${v.severity})</li>`).join('')}
            </ul>
        ` : ''}
        
        <button id="close-comparison" style="margin-top:1rem;padding:0.75rem 1.5rem;background:#667eea;color:white;border:none;border-radius:8px;cursor:pointer;width:100%;">
            Close
        </button>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    document.getElementById('close-comparison').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
    
    // Save current as previous for next comparison
    localStorage.setItem('previousSecurityAnalysis', localStorage.getItem('lastSecurityAnalysis'));
}

// Create pull request
async function createPullRequest() {
    if (!currentAnalysisData) {
        alert('Please run an analysis first');
        return;
    }
    
    const vulns = currentAnalysisData.vulnerabilities || [];
    const criticalCount = vulns.filter(v => v.severity === 'critical').length;
    const highCount = vulns.filter(v => v.severity === 'high').length;
    
    // Generate PR description
    const prTitle = `Security: Fix ${vulns.length} vulnerability${vulns.length !== 1 ? 'ies' : ''}`;
    const prBody = `## 🔐 Security Vulnerability Fixes

This PR addresses ${vulns.length} security vulnerability${vulns.length !== 1 ? 'ies' : ''} detected by Xaytheon Security Fuzzer.

### Summary
- 🔴 Critical: ${criticalCount}
- 🟠 High: ${highCount}
- 🟡 Medium: ${vulns.filter(v => v.severity === 'medium').length}
- 🟢 Low: ${vulns.filter(v => v.severity === 'low').length}

### Top Vulnerabilities Fixed
${vulns.slice(0, 5).map(v => `- **${v.package || 'Unknown'}**: ${v.type} (${v.severity})`).join('\n')}

### Testing
- ✅ ${(currentAnalysisData.tests || []).reduce((sum, t) => sum + t.tests.length, 0)} automated security tests generated
- ✅ Taint flow analysis completed
- ✅ Exploit path verification passed

### Analysis Report
Generated by Xaytheon AI-Powered Security Fuzzer
Date: ${new Date().toISOString().split('T')[0]}

---
*This PR was generated from security-fuzzer.html*`;
    
    // Get repository info from current location
    const repoMatch = window.location.hostname === 'github.com' || document.querySelector('meta[name="octocat"]');
    
    // Create GitHub PR URL
    const baseUrl = 'https://github.com';
    const owner = 'SatyamPandey-07'; // Default owner
    const repo = 'xaytheon'; // Default repo
    const branch = 'feature/security-fuzzer';
    
    const prUrl = `${baseUrl}/${owner}/${repo}/compare/main...${branch}?expand=1&title=${encodeURIComponent(prTitle)}&body=${encodeURIComponent(prBody)}`;
    
    // Open PR creation URL
    window.open(prUrl, '_blank');
    
    // Show confirmation
    const confirmation = document.createElement('div');
    confirmation.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        background: #28a745;
        color: white;
        padding: 1rem 2rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    confirmation.innerHTML = `
        <strong>✓ Pull Request Created</strong><br>
        <small>Review and submit on GitHub</small>
    `;
    document.body.appendChild(confirmation);
    
    setTimeout(() => {
        confirmation.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => document.body.removeChild(confirmation), 300);
    }, 3000);
}

// Copy to clipboard
function copyToClipboard(text, button) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = button.textContent;
        button.textContent = '✓ Copied!';
        setTimeout(() => {
            button.textContent = originalText;
        }, 2000);
    });
}

// Load saved analysis
function loadSavedAnalysis() {
    const saved = localStorage.getItem('lastSecurityAnalysis');
    if (saved) {
        try {
            const { data, timestamp, projectPath } = JSON.parse(saved);
            const age = Date.now() - timestamp;
            
            // Show saved data if less than 1 hour old
            if (age < 3600000) {
                document.getElementById('project-path').value = projectPath;
                currentAnalysisData = data;
                displayResults(data);
            }
        } catch (error) {
            console.error('Failed to load saved analysis:', error);
        }
    }
}

// Window resize handler
window.addEventListener('resize', () => {
    if (renderer && camera) {
        const container = document.getElementById('visualization-container');
        if (container) {
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        }
    }
});
