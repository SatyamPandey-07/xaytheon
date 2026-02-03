/**
 * Code DNA Analyzer Frontend Logic
 * AST-Based Fingerprinting & Similarity Visualization
 */

const API_BASE = '/api/code-dna';
let currentMode = 'single';
let currentAnalysisData = null;
let repositoryList = [];
let simulation = null;

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
    // Mode selection
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', (e) => switchMode(e.target.dataset.mode));
    });
    
    // Single repo analysis
    document.getElementById('analyze-repo-btn').addEventListener('click', analyzeSingleRepo);
    document.getElementById('extract-libs-btn').addEventListener('click', suggestLibraryExtractions);
    
    // Similarity threshold
    const thresholdSlider = document.getElementById('similarity-threshold');
    thresholdSlider.addEventListener('input', (e) => {
        document.querySelector('.threshold-value').textContent = `${e.target.value}%`;
    });
    
    // Cross-repo analysis
    document.getElementById('add-repo-btn').addEventListener('click', addRepositoryField);
    document.getElementById('index-repos-btn').addEventListener('click', indexRepositories);
    document.getElementById('find-duplicates-btn').addEventListener('click', findCrossRepoDuplicates);
    
    // Snippet comparison
    document.getElementById('compare-snippets-btn').addEventListener('click', compareSnippets);
    
    // Visualization controls
    document.querySelectorAll('.viz-btn').forEach(btn => {
        if (btn.id !== 'reset-viz') {
            btn.addEventListener('click', (e) => filterVisualization(e.target.dataset.filter));
        }
    });
    document.getElementById('reset-viz')?.addEventListener('click', resetVisualization);
    
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => filterDuplicates(e.target.dataset.type));
    });
}

// Switch analysis mode
function switchMode(mode) {
    currentMode = mode;
    
    // Update active button
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    
    // Show/hide sections
    document.getElementById('single-repo-section').style.display = mode === 'single' ? 'block' : 'none';
    document.getElementById('cross-repo-section').style.display = mode === 'cross' ? 'block' : 'none';
    document.getElementById('snippet-section').style.display = mode === 'snippet' ? 'block' : 'none';
    
    // Hide results sections when switching modes
    hideResultSections();
}

// Hide result sections
function hideResultSections() {
    document.getElementById('stats-section').style.display = 'none';
    document.getElementById('viz-section').style.display = 'none';
    document.getElementById('duplicates-section').style.display = 'none';
    document.getElementById('extraction-section').style.display = 'none';
    document.getElementById('comparison-section').style.display = 'none';
}

// Analyze single repository
async function analyzeSingleRepo() {
    const repoPath = document.getElementById('repo-path').value.trim();
    const threshold = parseInt(document.getElementById('similarity-threshold').value) / 100;
    
    if (!repoPath) {
        alert('Please enter a repository path');
        return;
    }
    
    const analyzeBtn = document.getElementById('analyze-repo-btn');
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = '🔄 Analyzing...';
    
    try {
        const response = await fetch(`${API_BASE}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repositoryPath: repoPath, threshold })
        });
        
        if (!response.ok) throw new Error('Analysis failed');
        
        const result = await response.json();
        currentAnalysisData = result.data;
        
        // Save to localStorage
        localStorage.setItem('lastCodeDNAAnalysis', JSON.stringify({
            data: result.data,
            timestamp: Date.now(),
            repoPath
        }));
        
        displayAnalysisResults(result.data);
        
        // Enable extraction button
        document.getElementById('extract-libs-btn').disabled = false;
        
    } catch (error) {
        console.error('Analysis error:', error);
        alert('Failed to analyze repository: ' + error.message);
    } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = '🔍 Analyze Repository';
    }
}

// Display analysis results
function displayAnalysisResults(data) {
    // Show sections
    document.getElementById('stats-section').style.display = 'block';
    document.getElementById('viz-section').style.display = 'block';
    document.getElementById('duplicates-section').style.display = 'block';
    
    // Update statistics
    updateStatistics(data.statistics);
    
    // Display duplicates
    displayDuplicates(data.duplicates);
    
    // Create visualization
    createSimilarityVisualization(data);
}

// Update statistics
function updateStatistics(stats) {
    document.getElementById('stat-files').textContent = stats.totalFiles || 0;
    document.getElementById('stat-duplicates').textContent = stats.duplicatePairs || 0;
    document.getElementById('stat-similar').textContent = stats.similarPairsCount || 0;
    document.getElementById('stat-savings').textContent = 
        stats.potentialSavings?.duplicateLines || 0;
}

// Display duplicates
function displayDuplicates(duplicates) {
    const container = document.getElementById('duplicates-list');
    container.innerHTML = '';
    
    if (!duplicates || duplicates.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#6c757d;padding:2rem;">No duplicates detected ✓</p>';
        return;
    }
    
    duplicates.forEach((dup, idx) => {
        const type = dup.similarity >= 95 ? 'exact-duplicate' :
                     dup.similarity >= 85 ? 'near-duplicate' : 'similar';
        const badgeClass = dup.similarity >= 95 ? 'exact' :
                          dup.similarity >= 85 ? 'near' : 'similar';
        
        const dupCard = document.createElement('div');
        dupCard.className = `duplicate-item ${type}`;
        dupCard.dataset.type = type;
        
        dupCard.innerHTML = `
            <div class="duplicate-header">
                <h3>Duplicate #${idx + 1}</h3>
                <span class="similarity-badge ${badgeClass}">${dup.similarity}% Similar</span>
            </div>
            <div class="file-info">
                <div class="file-label">File 1:</div>
                <div>${dup.file1}</div>
            </div>
            <div class="file-info">
                <div class="file-label">File 2:</div>
                <div>${dup.file2}</div>
            </div>
            <div style="margin-top:1rem;display:flex;gap:1rem;font-size:0.9rem;color:#6c757d;">
                <span>📊 Complexity: ${dup.features1?.complexity || 'N/A'}</span>
                <span>🎯 Functions: ${dup.features1?.functionCount || 'N/A'}</span>
                <span>📄 Nodes: ${dup.features1?.nodeCount || 'N/A'}</span>
            </div>
        `;
        
        container.appendChild(dupCard);
    });
}

// Create similarity visualization with D3.js
function createSimilarityVisualization(data) {
    const container = document.getElementById('similarity-graph');
    container.innerHTML = '';
    
    if (!data.duplicates || data.duplicates.length === 0) {
        container.innerHTML = '<div style="color:#fff;text-align:center;padding-top:250px;">No similarity data to visualize</div>';
        return;
    }
    
    // Prepare graph data
    const graphData = prepareGraphData(data);
    
    // Create D3 force-directed graph
    const width = container.clientWidth;
    const height = 600;
    
    const svg = d3.select('#similarity-graph')
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    // Create force simulation
    simulation = d3.forceSimulation(graphData.nodes)
        .force('link', d3.forceLink(graphData.links).id(d => d.id).distance(150))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(30));
    
    // Create links
    const link = svg.append('g')
        .selectAll('line')
        .data(graphData.links)
        .join('line')
        .attr('class', d => `link ${d.type}`)
        .attr('stroke-width', d => d.type === 'exact-duplicate' ? 3 : 
                                   d.type === 'near-duplicate' ? 2 : 1.5);
    
    // Create nodes
    const node = svg.append('g')
        .selectAll('circle')
        .data(graphData.nodes)
        .join('circle')
        .attr('class', 'node')
        .attr('r', d => 8 + (d.duplicates * 2))
        .attr('fill', d => d.color)
        .call(drag(simulation));
    
    // Add labels
    const label = svg.append('g')
        .selectAll('text')
        .data(graphData.nodes)
        .join('text')
        .attr('class', 'node-label')
        .text(d => d.name)
        .attr('dx', 12)
        .attr('dy', 4);
    
    // Add tooltips
    node.append('title')
        .text(d => `${d.path}\nDuplicates: ${d.duplicates}`);
    
    // Update positions on tick
    simulation.on('tick', () => {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
        
        node
            .attr('cx', d => d.x)
            .attr('cy', d => d.y);
        
        label
            .attr('x', d => d.x)
            .attr('y', d => d.y);
    });
}

// Prepare graph data from duplicates
function prepareGraphData(data) {
    const nodeMap = new Map();
    const links = [];
    
    // Create nodes from duplicates
    data.duplicates.forEach(dup => {
        // Add file1 node
        if (!nodeMap.has(dup.file1)) {
            nodeMap.set(dup.file1, {
                id: dup.file1,
                name: extractFileName(dup.file1),
                path: dup.file1,
                duplicates: 0,
                color: '#667eea'
            });
        }
        nodeMap.get(dup.file1).duplicates++;
        
        // Add file2 node
        if (!nodeMap.has(dup.file2)) {
            nodeMap.set(dup.file2, {
                id: dup.file2,
                name: extractFileName(dup.file2),
                path: dup.file2,
                duplicates: 0,
                color: '#667eea'
            });
        }
        nodeMap.get(dup.file2).duplicates++;
        
        // Add link
        const type = dup.similarity >= 95 ? 'exact-duplicate' :
                     dup.similarity >= 85 ? 'near-duplicate' : 'similar';
        
        links.push({
            source: dup.file1,
            target: dup.file2,
            type: type,
            similarity: dup.similarity
        });
    });
    
    // Update node colors based on duplicate count
    nodeMap.forEach(node => {
        if (node.duplicates >= 5) {
            node.color = '#dc3545'; // Red for high duplicates
        } else if (node.duplicates >= 3) {
            node.color = '#fd7e14'; // Orange for medium
        } else if (node.duplicates >= 2) {
            node.color = '#ffc107'; // Yellow for low
        }
    });
    
    return {
        nodes: Array.from(nodeMap.values()),
        links: links
    };
}

// Extract file name from path
function extractFileName(path) {
    return path.split(/[\\/]/).pop();
}

// Drag behavior
function drag(simulation) {
    function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
    }
    
    function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
    }
    
    function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
    }
    
    return d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended);
}

// Filter visualization
function filterVisualization(filter) {
    document.querySelectorAll('.viz-btn').forEach(btn => {
        if (btn.dataset.filter) {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        }
    });
    
    const links = document.querySelectorAll('.link');
    links.forEach(link => {
        if (filter === 'all') {
            link.style.display = '';
        } else if (filter === 'duplicate') {
            link.style.display = link.classList.contains('exact-duplicate') ? '' : 'none';
        } else if (filter === 'similar') {
            link.style.display = !link.classList.contains('exact-duplicate') ? '' : 'none';
        }
    });
}

// Reset visualization
function resetVisualization() {
    if (simulation) {
        simulation.alpha(1).restart();
    }
}

// Filter duplicates
function filterDuplicates(type) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });
    
    document.querySelectorAll('.duplicate-item').forEach(item => {
        if (type === 'all' || item.dataset.type === type) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// Add repository field
function addRepositoryField() {
    const repoList = document.getElementById('repo-list');
    const repoIndex = repositoryList.length;
    
    const repoItem = document.createElement('div');
    repoItem.className = 'repo-item';
    repoItem.innerHTML = `
        <input type="text" placeholder="Repository Name" class="repo-name" data-index="${repoIndex}">
        <input type="text" placeholder="Repository Path" class="repo-path" data-index="${repoIndex}">
        <button onclick="removeRepository(${repoIndex})">Remove</button>
    `;
    
    repoList.appendChild(repoItem);
    repositoryList.push({ name: '', path: '' });
}

// Remove repository
function removeRepository(index) {
    repositoryList.splice(index, 1);
    renderRepositoryList();
}

// Render repository list
function renderRepositoryList() {
    const repoList = document.getElementById('repo-list');
    repoList.innerHTML = '';
    
    repositoryList.forEach((repo, idx) => {
        const repoItem = document.createElement('div');
        repoItem.className = 'repo-item';
        repoItem.innerHTML = `
            <input type="text" placeholder="Repository Name" class="repo-name" 
                value="${repo.name}" data-index="${idx}">
            <input type="text" placeholder="Repository Path" class="repo-path" 
                value="${repo.path}" data-index="${idx}">
            <button onclick="removeRepository(${idx})">Remove</button>
        `;
        repoList.appendChild(repoItem);
    });
}

// Index repositories
async function indexRepositories() {
    // Collect repository data
    const repos = [];
    document.querySelectorAll('.repo-item').forEach(item => {
        const name = item.querySelector('.repo-name').value.trim();
        const path = item.querySelector('.repo-path').value.trim();
        if (name && path) {
            repos.push({ name, path });
        }
    });
    
    if (repos.length < 2) {
        alert('Please add at least 2 repositories for cross-repo analysis');
        return;
    }
    
    const indexBtn = document.getElementById('index-repos-btn');
    indexBtn.disabled = true;
    indexBtn.textContent = '🔄 Indexing...';
    
    try {
        const response = await fetch(`${API_BASE}/cross-repo/index`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repositories: repos })
        });
        
        if (!response.ok) throw new Error('Indexing failed');
        
        const result = await response.json();
        
        alert(`Successfully indexed ${result.data.total} repositories`);
        document.getElementById('find-duplicates-btn').disabled = false;
        
    } catch (error) {
        console.error('Indexing error:', error);
        alert('Failed to index repositories: ' + error.message);
    } finally {
        indexBtn.disabled = false;
        indexBtn.textContent = '📊 Index Repositories';
    }
}

// Find cross-repo duplicates
async function findCrossRepoDuplicates() {
    const findBtn = document.getElementById('find-duplicates-btn');
    findBtn.disabled = true;
    findBtn.textContent = '🔄 Finding...';
    
    try {
        const response = await fetch(`${API_BASE}/cross-repo/duplicates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ threshold: 0.75 })
        });
        
        if (!response.ok) throw new Error('Analysis failed');
        
        const result = await response.json();
        displayCrossRepoDuplicates(result.data);
        
    } catch (error) {
        console.error('Cross-repo analysis error:', error);
        alert('Failed to find duplicates: ' + error.message);
    } finally {
        findBtn.disabled = false;
        findBtn.textContent = '🔍 Find Duplicates';
    }
}

// Display cross-repo duplicates
function displayCrossRepoDuplicates(data) {
    // Similar to displayDuplicates but with repo info
    document.getElementById('duplicates-section').style.display = 'block';
    const container = document.getElementById('duplicates-list');
    container.innerHTML = '';
    
    const duplicates = data.fileDuplicates || [];
    
    duplicates.forEach((dup, idx) => {
        const dupCard = document.createElement('div');
        dupCard.className = 'duplicate-item';
        
        dupCard.innerHTML = `
            <div class="duplicate-header">
                <h3>Cross-Repo Duplicate #${idx + 1}</h3>
                <span class="similarity-badge">${dup.similarity}% Similar</span>
            </div>
            <div class="file-info">
                <div class="file-label">Repo 1: ${dup.repo1}</div>
                <div>${dup.file1}</div>
            </div>
            <div class="file-info">
                <div class="file-label">Repo 2: ${dup.repo2}</div>
                <div>${dup.file2}</div>
            </div>
        `;
        
        container.appendChild(dupCard);
    });
}

// Compare snippets
async function compareSnippets() {
    const code1 = document.getElementById('snippet1').value.trim();
    const code2 = document.getElementById('snippet2').value.trim();
    
    if (!code1 || !code2) {
        alert('Please enter both code snippets');
        return;
    }
    
    const compareBtn = document.getElementById('compare-snippets-btn');
    compareBtn.disabled = true;
    compareBtn.textContent = '🔄 Comparing...';
    
    try {
        const response = await fetch(`${API_BASE}/snippet/compare`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code1, code2 })
        });
        
        if (!response.ok) throw new Error('Comparison failed');
        
        const result = await response.json();
        displayComparisonResult(result.data);
        
    } catch (error) {
        console.error('Comparison error:', error);
        alert('Failed to compare snippets: ' + error.message);
    } finally {
        compareBtn.disabled = false;
        compareBtn.textContent = '⚖️ Compare Snippets';
    }
}

// Display comparison result
function displayComparisonResult(data) {
    document.getElementById('comparison-section').style.display = 'block';
    const container = document.getElementById('comparison-result');
    
    container.innerHTML = `
        <div class="similarity-score">${data.similarity}%</div>
        <div class="verdict">${data.verdict}</div>
        <div class="comparison-details">
            <div class="detail-card">
                <h3>Snippet 1</h3>
                <p><strong>Hash:</strong> ${data.fingerprint1.hash.substring(0, 16)}...</p>
                <p><strong>Complexity:</strong> ${data.fingerprint1.features.complexity}</p>
                <p><strong>Functions:</strong> ${data.fingerprint1.features.functionCount}</p>
            </div>
            <div class="detail-card">
                <h3>Snippet 2</h3>
                <p><strong>Hash:</strong> ${data.fingerprint2.hash.substring(0, 16)}...</p>
                <p><strong>Complexity:</strong> ${data.fingerprint2.features.complexity}</p>
                <p><strong>Functions:</strong> ${data.fingerprint2.features.functionCount}</p>
            </div>
        </div>
    `;
    
    // Scroll to result
    container.scrollIntoView({ behavior: 'smooth' });
}

// Suggest library extractions
async function suggestLibraryExtractions() {
    if (!currentAnalysisData) {
        alert('Please analyze a repository first');
        return;
    }
    
    const repoPath = document.getElementById('repo-path').value.trim();
    const extractBtn = document.getElementById('extract-libs-btn');
    extractBtn.disabled = true;
    extractBtn.textContent = '🔄 Analyzing...';
    
    try {
        const response = await fetch(`${API_BASE}/extract/suggestions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repositoryPath: repoPath, threshold: 0.7 })
        });
        
        if (!response.ok) throw new Error('Extraction analysis failed');
        
        const result = await response.json();
        displayExtractionSuggestions(result.data);
        
    } catch (error) {
        console.error('Extraction error:', error);
        alert('Failed to generate extraction suggestions: ' + error.message);
    } finally {
        extractBtn.disabled = false;
        extractBtn.textContent = '📦 Suggest Library Extractions';
    }
}

// Display extraction suggestions
function displayExtractionSuggestions(data) {
    document.getElementById('extraction-section').style.display = 'block';
    
    // Display summary
    const summary = document.getElementById('extraction-summary');
    summary.innerHTML = `
        <h3>📦 Library Extraction Summary</h3>
        <div class="extraction-stats">
            <div class="extraction-stat">
                <div class="extraction-stat-value">${data.summary.totalSuggestions}</div>
                <div class="extraction-stat-label">Total Suggestions</div>
            </div>
            <div class="extraction-stat">
                <div class="extraction-stat-value">${data.summary.byPriority.critical}</div>
                <div class="extraction-stat-label">Critical Priority</div>
            </div>
            <div class="extraction-stat">
                <div class="extraction-stat-value">${data.summary.potentialImpact.totalLinesReduced}</div>
                <div class="extraction-stat-label">Lines Saved</div>
            </div>
            <div class="extraction-stat">
                <div class="extraction-stat-value">${data.summary.potentialImpact.estimatedEffort}</div>
                <div class="extraction-stat-label">Estimated Effort</div>
            </div>
        </div>
    `;
    
    // Display suggestions
    const container = document.getElementById('extraction-list');
    container.innerHTML = '';
    
    data.suggestions.forEach(suggestion => {
        const suggestionCard = document.createElement('div');
        suggestionCard.className = 'extraction-item';
        
        suggestionCard.innerHTML = `
            <div class="extraction-header">
                <div class="extraction-title">${suggestion.suggestedLibraryName}</div>
                <span class="priority-badge ${suggestion.recommendation.level}">
                    ${suggestion.recommendation.level}
                </span>
            </div>
            <p>${suggestion.description}</p>
            
            <div class="extraction-metrics">
                <div class="metric">
                    <div class="metric-value">${suggestion.metrics.occurrences}</div>
                    <div class="metric-label">Occurrences</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${suggestion.metrics.avgSimilarity}%</div>
                    <div class="metric-label">Similarity</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${suggestion.metrics.avgComplexity}</div>
                    <div class="metric-label">Complexity</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${suggestion.impact.codeReduction.lines}</div>
                    <div class="metric-label">Lines Saved</div>
                </div>
            </div>
            
            <div class="affected-files">
                <h4>Affected Files (${suggestion.affectedFiles.length})</h4>
                ${suggestion.affectedFiles.map(f => 
                    `<span class="file-tag">${f.basename}</span>`
                ).join('')}
            </div>
            
            <div class="extraction-plan">
                <strong>💡 Recommendation:</strong> ${suggestion.recommendation.reasoning}
            </div>
        `;
        
        container.appendChild(suggestionCard);
    });
    
    // Scroll to section
    document.getElementById('extraction-section').scrollIntoView({ behavior: 'smooth' });
}

// Load saved analysis
function loadSavedAnalysis() {
    const saved = localStorage.getItem('lastCodeDNAAnalysis');
    if (saved) {
        try {
            const { data, timestamp, repoPath } = JSON.parse(saved);
            const age = Date.now() - timestamp;
            
            // Show saved data if less than 1 hour old
            if (age < 3600000) {
                document.getElementById('repo-path').value = repoPath;
                currentAnalysisData = data;
                displayAnalysisResults(data);
            }
        } catch (error) {
            console.error('Failed to load saved analysis:', error);
        }
    }
}

// Window resize handler
window.addEventListener('resize', () => {
    if (simulation) {
        const container = document.getElementById('similarity-graph');
        const width = container.clientWidth;
        const height = 600;
        
        d3.select('#similarity-graph svg')
            .attr('width', width)
            .attr('height', height);
        
        simulation.force('center', d3.forceCenter(width / 2, height / 2));
        simulation.alpha(0.3).restart();
    }
});
