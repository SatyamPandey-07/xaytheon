/**
 * Knowledge Graph Service
 * Builds "who knows what" graph from file history
 */

const axios = require('axios');

class KnowledgeGraphService {
    constructor() {
        this.graphCache = new Map();
    }

    /**
     * Build knowledge graph for repository
     */
    async buildKnowledgeGraph(owner, repo) {
        try {
            const cacheKey = `${owner}/${repo}`;
            if (this.graphCache.has(cacheKey)) {
                return this.graphCache.get(cacheKey);
            }

            // Fetch all files in repository
            const files = await this.fetchRepositoryFiles(owner, repo);

            // Build file-author relationships
            const graph = {
                nodes: [],
                edges: [],
                files: [],
                authors: [],
                metadata: {
                    owner,
                    repo,
                    totalFiles: 0,
                    totalAuthors: 0,
                    generatedAt: Date.now()
                }
            };

            // Analyze each file
            for (const file of files) {
                const fileNode = await this.analyzeFile(owner, repo, file.path);
                if (fileNode) {
                    graph.files.push(fileNode);
                    graph.nodes.push({
                        id: file.path,
                        type: 'file',
                        label: this.getFileName(file.path),
                        path: file.path,
                        size: file.size,
                        complexity: fileNode.complexity
                    });
                }
            }

            // Extract unique authors
            const authorMap = new Map();
            graph.files.forEach(file => {
                file.contributors.forEach(contributor => {
                    if (!authorMap.has(contributor.author)) {
                        authorMap.set(contributor.author, {
                            username: contributor.author,
                            files: [],
                            totalCommits: 0,
                            totalChanges: 0
                        });
                    }
                    
                    const author = authorMap.get(contributor.author);
                    author.files.push(file.path);
                    author.totalCommits += contributor.commits;
                    author.totalChanges += contributor.changes;
                });
            });

            // Add author nodes
            authorMap.forEach((authorData, username) => {
                graph.authors.push(authorData);
                graph.nodes.push({
                    id: `author:${username}`,
                    type: 'author',
                    label: username,
                    username,
                    fileCount: authorData.files.length,
                    totalCommits: authorData.totalCommits
                });

                // Create edges between authors and files
                authorData.files.forEach(filePath => {
                    const file = graph.files.find(f => f.path === filePath);
                    if (file) {
                        const contributor = file.contributors.find(c => c.author === username);
                        
                        graph.edges.push({
                            source: `author:${username}`,
                            target: filePath,
                            weight: contributor.ownership,
                            commits: contributor.commits,
                            changes: contributor.changes
                        });
                    }
                });
            });

            graph.metadata.totalFiles = graph.files.length;
            graph.metadata.totalAuthors = graph.authors.length;

            this.graphCache.set(cacheKey, graph);
            return graph;

        } catch (error) {
            console.error('Knowledge graph build error:', error.message);
            return {
                nodes: [],
                edges: [],
                files: [],
                authors: [],
                error: error.message
            };
        }
    }

    /**
     * Fetch repository file tree
     */
    async fetchRepositoryFiles(owner, repo) {
        try {
            const response = await axios.get(
                `https://api.github.com/repos/${owner}/${repo}/git/trees/main`,
                {
                    params: { recursive: 1 },
                    headers: this.getAuthHeaders()
                }
            );

            // Filter only code files
            return (response.data.tree || [])
                .filter(item => 
                    item.type === 'blob' && 
                    this.isCodeFile(item.path)
                )
                .slice(0, 100); // Limit to 100 files for performance

        } catch (error) {
            console.error('Repository files fetch error:', error.message);
            return [];
        }
    }

    /**
     * Check if file is a code file
     */
    isCodeFile(path) {
        const codeExtensions = [
            '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.cs',
            '.go', '.rs', '.rb', '.php', '.swift', '.kt', '.scala', '.vue'
        ];
        
        return codeExtensions.some(ext => path.endsWith(ext));
    }

    /**
     * Analyze file to determine contributors and ownership
     */
    async analyzeFile(owner, repo, filePath) {
        try {
            // Fetch commit history for file
            const response = await axios.get(
                `https://api.github.com/repos/${owner}/${repo}/commits`,
                {
                    params: {
                        path: filePath,
                        per_page: 100
                    },
                    headers: this.getAuthHeaders()
                }
            );

            const commits = response.data || [];
            if (commits.length === 0) return null;

            // Count contributions per author
            const contributorMap = new Map();
            let totalChanges = 0;

            for (const commit of commits) {
                const author = commit.commit.author.name;
                const stats = commit.stats || { additions: 0, deletions: 0 };
                const changes = stats.additions + stats.deletions;
                totalChanges += changes;

                if (!contributorMap.has(author)) {
                    contributorMap.set(author, {
                        author,
                        commits: 0,
                        changes: 0,
                        firstCommit: commit.commit.author.date,
                        lastCommit: commit.commit.author.date
                    });
                }

                const contributor = contributorMap.get(author);
                contributor.commits += 1;
                contributor.changes += changes;
            }

            // Calculate ownership percentage
            const contributors = Array.from(contributorMap.values()).map(c => ({
                ...c,
                ownership: totalChanges > 0 ? (c.changes / totalChanges * 100).toFixed(2) : 0
            }));

            // Sort by ownership
            contributors.sort((a, b) => b.ownership - a.ownership);

            return {
                path: filePath,
                name: this.getFileName(filePath),
                totalCommits: commits.length,
                totalChanges,
                contributors,
                primaryOwner: contributors[0]?.author,
                primaryOwnership: parseFloat(contributors[0]?.ownership || 0),
                complexity: this.estimateComplexity(filePath, totalChanges, commits.length)
            };

        } catch (error) {
            console.error(`File analysis error for ${filePath}:`, error.message);
            return null;
        }
    }

    /**
     * Estimate file complexity
     */
    estimateComplexity(filePath, totalChanges, totalCommits) {
        let score = 0;

        // High churn = higher complexity
        if (totalChanges > 1000) score += 3;
        else if (totalChanges > 500) score += 2;
        else if (totalChanges > 100) score += 1;

        // Many commits = frequently touched
        if (totalCommits > 50) score += 2;
        else if (totalCommits > 20) score += 1;

        // File type complexity
        if (filePath.includes('service') || filePath.includes('controller')) score += 1;
        if (filePath.includes('model') || filePath.includes('schema')) score += 1;
        if (filePath.includes('test')) score -= 1;

        return Math.max(1, Math.min(10, score)); // Scale 1-10
    }

    /**
     * Get file name from path
     */
    getFileName(path) {
        return path.split('/').pop();
    }

    /**
     * Find knowledge overlaps between developers
     */
    findKnowledgeOverlap(graph, developer1, developer2) {
        const dev1Files = graph.files.filter(f => 
            f.contributors.some(c => c.author === developer1)
        );

        const dev2Files = graph.files.filter(f => 
            f.contributors.some(c => c.author === developer2)
        );

        const sharedFiles = dev1Files.filter(f1 => 
            dev2Files.some(f2 => f2.path === f1.path)
        );

        return {
            developer1,
            developer2,
            sharedFiles: sharedFiles.length,
            sharedFilePaths: sharedFiles.map(f => f.path),
            overlapScore: sharedFiles.length / Math.max(dev1Files.length, dev2Files.length) * 100
        };
    }

    /**
     * Calculate "isolation score" for each file
     */
    calculateIsolationScores(graph) {
        return graph.files.map(file => {
            const contributorCount = file.contributors.length;
            const primaryOwnership = file.primaryOwnership;

            // High isolation = few contributors + high primary ownership
            const isolationScore = (primaryOwnership / 100) * (1 / contributorCount) * 100;

            return {
                path: file.path,
                name: file.name,
                isolationScore: isolationScore.toFixed(2),
                contributorCount,
                primaryOwner: file.primaryOwner,
                primaryOwnership: file.primaryOwnership,
                risk: isolationScore > 80 ? 'critical' : isolationScore > 60 ? 'high' : 'medium'
            };
        }).sort((a, b) => b.isolationScore - a.isolationScore);
    }

    /**
     * Generate 3D coordinates for visualization
     */
    generate3DCoordinates(graph) {
        const nodes = [];

        // Position authors in a circle (stars)
        const authorCount = graph.authors.length;
        const radius = 100;

        graph.authors.forEach((author, index) => {
            const angle = (index / authorCount) * 2 * Math.PI;
            nodes.push({
                id: `author:${author.username}`,
                type: 'author',
                label: author.username,
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius,
                z: 50,
                size: Math.log(author.totalCommits + 1) * 5
            });
        });

        // Position files based on their relationship to authors
        graph.files.forEach(file => {
            // Calculate center of mass based on contributors
            let x = 0, y = 0, z = 0;
            let totalWeight = 0;

            file.contributors.forEach(contrib => {
                const authorNode = nodes.find(n => n.id === `author:${contrib.author}`);
                if (authorNode) {
                    const weight = parseFloat(contrib.ownership) / 100;
                    x += authorNode.x * weight;
                    y += authorNode.y * weight;
                    z += authorNode.z * weight;
                    totalWeight += weight;
                }
            });

            if (totalWeight > 0) {
                nodes.push({
                    id: file.path,
                    type: 'file',
                    label: file.name,
                    x: x / totalWeight,
                    y: y / totalWeight,
                    z: z / totalWeight,
                    size: file.complexity * 2,
                    complexity: file.complexity,
                    contributors: file.contributors.length
                });
            }
        });

        return nodes;
    }

    /**
     * Get authentication headers
     */
    getAuthHeaders() {
        const token = process.env.GITHUB_TOKEN;
        return token ? { Authorization: `token ${token}` } : {};
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.graphCache.clear();
    }
}

module.exports = new KnowledgeGraphService();
