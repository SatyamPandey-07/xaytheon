/**
 * XAYTHEON | Semantic Discovery Engine Dashboard Logic
 * 
 * Orchestrates smart searches, knowledge graph interaction,
 * and multi-language discovery flows.
 */

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const searchInput = document.getElementById('smart-search-input');
    const searchBtn = document.getElementById('search-trigger');
    const langSelector = document.getElementById('lang-selector');
    const resultsContainer = document.getElementById('search-results-list');
    const loadingState = document.getElementById('loading-state');
    const intentBox = document.getElementById('intent-box');
    const intentBadge = document.getElementById('detected-intent');

    // Graph Stats Elements
    const statNodes = document.getElementById('stat-nodes');
    const statEdges = document.getElementById('stat-edges');
    const statDensity = document.getElementById('stat-density');

    // Mini Graph Placeholder
    const miniGraph = document.getElementById('mini-graph');

    // Initial Load
    fetchGraphStats();

    /**
     * Fetch metadata about the Knowledge Graph
     */
    async function fetchGraphStats() {
        try {
            const res = await fetch('/api/search/graph-stats');
            const data = await res.json();
            if (data.success) {
                statNodes.textContent = data.stats.nodes;
                statEdges.textContent = data.stats.edges;
                statDensity.textContent = (data.stats.density * 100).toFixed(2) + '%';
            }
        } catch (err) {
            console.error("Graph API unreachable.");
        }
    }

    /**
     * Execute Semantic Search
     */
    async function performSearch() {
        const query = searchInput.value.trim();
        const lang = langSelector.value;

        if (!query) return;

        // UI Feedback
        loadingState.classList.remove('hidden');
        resultsContainer.innerHTML = '';
        intentBox.classList.add('hidden');

        try {
            const res = await fetch(`/api/search/smart?q=${encodeURIComponent(query)}&lang=${lang}`);
            const data = await res.json();

            if (data.success) {
                renderResults(data.results);
                intentBadge.textContent = data.intent;
                intentBox.classList.remove('hidden');
            }
        } catch (err) {
            resultsContainer.innerHTML = '<p class="error">Semantic engine offline. Try again later.</p>';
        } finally {
            loadingState.classList.add('hidden');
        }
    }

    /**
     * Render results with Resonance scoring and context
     */
    function renderResults(results) {
        if (results.length === 0) {
            resultsContainer.innerHTML = '<div class="empty-results"><h3>No resonance found.</h3><p>Try rephrasing your search or checking another language.</p></div>';
            return;
        }

        resultsContainer.innerHTML = results.map(node => `
            <div class="result-card" data-id="${node.id}">
                <div class="result-header">
                    <span class="result-type">${node.type}</span>
                    <span class="resonance-score">Peak Resonance: ${node.totalScore.toFixed(2)}</span>
                </div>
                <h4 class="result-name">${node.name}</h4>
                <div class="result-tags">
                    ${node.tags.map(t => `<span class="tag">#${t}</span>`).join('')}
                </div>
            </div>
        `).join('');

        // Add interaction listeners
        document.querySelectorAll('.result-card').forEach(card => {
            card.addEventListener('click', () => exploreNode(card.dataset.id, card.querySelector('.result-name').textContent));
        });

        // Animations
        gsap.from('.result-card', {
            opacity: 0,
            x: -20,
            stagger: 0.1,
            duration: 0.5,
            ease: 'power2.out'
        });
    }

    /**
     * Traverse Knowledge Graph relationships for a selected node
     */
    async function exploreNode(nodeId, nodeName) {
        miniGraph.innerHTML = `<p class="loading">Loading connections for ${nodeName}...</p>`;

        try {
            const res = await fetch(`/api/search/relationships/${nodeId}`);
            const data = await res.json();

            if (data.success && data.relationships.length > 0) {
                renderMiniGraph(nodeName, data.relationships);
            } else {
                miniGraph.innerHTML = `<p class="placeholder">No direct relationships found for ${nodeName}.</p>`;
            }
        } catch (err) {
            miniGraph.innerHTML = '<p class="error">Failed to fetch relationships.</p>';
        }
    }

    function renderMiniGraph(rootName, relationships) {
        miniGraph.innerHTML = `
            <div class="resonance-map">
                <div class="root-node">${rootName}</div>
                <div class="connections">
                    ${relationships.map(rel => `
                        <div class="connected-node glass">
                            <span class="rel-type">Link</span>
                            <strong>${rel.name}</strong>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        gsap.from('.connected-node', { scale: 0.5, opacity: 0, stagger: 0.1 });
    }

    // Input Listeners
    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => e.key === 'Enter' && performSearch());

    // Hint interaction
    document.querySelectorAll('.hint').forEach(hint => {
        hint.addEventListener('click', () => {
            searchInput.value = hint.textContent.replace(/"/g, '');
            performSearch();
        });
    });
});
