/**
 * XAYTHEON - Semantic Knowledge Graph Engine
 * 
 * Manages relationships between code modules, team expertise, and project 
 * contexts to enable high-fidelity semantic discovery.
 */

class KnowledgeGraphDB {
    constructor() {
        this.nodes = new Map(); // id -> nodeData
        this.edges = []; // Array of { source, target, type, weight }
        this.schema = {
            NODE_TYPES: ['MODULE', 'FUNCTION', 'CONTRIBUTOR', 'DOC', 'ISSUE'],
            RELATION_TYPES: ['DEPENDS_ON', 'OWNS', 'IMPLEMENTS', 'DOCUMENTS', 'RELATED_TO']
        };

        // Initializing with core architecture nodes
        this.initBaseGraph();
    }

    initBaseGraph() {
        this.addNode('core-api', { name: 'Core API Layer', type: 'MODULE', tags: ['express', 'routing', 'auth'] });
        this.addNode('auth-service', { name: 'Authentication Service', type: 'MODULE', tags: ['jwt', 'security'] });
        this.addNode('db-sync', { name: 'Database Sync', type: 'MODULE', tags: ['persistent', 'queue'] });

        this.addEdge('core-api', 'auth-service', 'DEPENDS_ON', 0.9);
        this.addEdge('core-api', 'db-sync', 'DEPENDS_ON', 0.7);
    }

    addNode(id, data) {
        this.nodes.set(id, {
            id,
            ...data,
            lastIndexed: new Date(),
            rank: 0.5
        });
    }

    addEdge(source, target, type, weight = 1.0) {
        this.edges.push({ source, target, type, weight });
    }

    /**
     * Find related nodes using a basic graph traversal (BFS-based resonance)
     */
    findRelated(nodeId, depth = 2) {
        const results = new Set();
        const queue = [{ id: nodeId, d: 0 }];
        const visited = new Set([nodeId]);

        while (queue.length > 0) {
            const { id, d } = queue.shift();
            if (d > 0) results.add(this.nodes.get(id));
            if (d >= depth) continue;

            this.edges.forEach(edge => {
                let neighbor = null;
                if (edge.source === id) neighbor = edge.target;
                else if (edge.target === id) neighbor = edge.source;

                if (neighbor && !visited.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push({ id: neighbor, d: d + 1 });
                }
            });
        }
        return Array.from(results);
    }

    /**
     * Perform a semantic match based on tags and metadata
     */
    semanticSearch(queryTokens) {
        const matchedNodes = [];
        this.nodes.forEach(node => {
            let score = 0;
            const content = `${node.name} ${node.tags ? node.tags.join(' ') : ''} ${node.type}`.toLowerCase();

            queryTokens.forEach(token => {
                if (content.includes(token.toLowerCase())) score += 1.0;
            });

            if (score > 0) {
                matchedNodes.push({ ...node, semanticScore: score });
            }
        });

        // Boost score based on graph connectivity (centrality)
        return matchedNodes.map(node => {
            const connectivity = this.edges.filter(e => e.source === node.id || e.target === node.id).length;
            return { ...node, totalScore: node.semanticScore + (connectivity * 0.1) };
        }).sort((a, b) => b.totalScore - a.totalScore);
    }

    getGraphStats() {
        return {
            nodes: this.nodes.size,
            edges: this.edges.length,
            density: this.edges.length / (this.nodes.size * (this.nodes.size - 1)) || 0
        };
    }
}

module.exports = new KnowledgeGraphDB();
