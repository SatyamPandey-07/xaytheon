/**
 * Expertise Extraction Service
 * NLP analysis of commits and PRs to rank developer proficiency
 */

const axios = require('axios');

class ExpertiseExtractionService {
    constructor() {
        this.expertiseCache = new Map();
        this.techKeywords = this.initializeTechKeywords();
        this.proficiencyLevels = ['Novice', 'Intermediate', 'Advanced', 'Expert', 'Guru'];
    }

    /**
     * Initialize technology keywords for NLP analysis
     */
    initializeTechKeywords() {
        return {
            javascript: ['javascript', 'js', 'node', 'nodejs', 'npm', 'yarn', 'es6', 'async', 'promise'],
            react: ['react', 'jsx', 'hooks', 'component', 'props', 'state', 'redux'],
            vue: ['vue', 'vuex', 'nuxt', 'composition', 'directive'],
            angular: ['angular', 'typescript', 'ng', 'rxjs', 'observable'],
            backend: ['api', 'server', 'express', 'fastify', 'rest', 'graphql', 'endpoint'],
            database: ['sql', 'postgres', 'mysql', 'mongodb', 'redis', 'orm', 'query', 'migration'],
            devops: ['docker', 'kubernetes', 'ci/cd', 'pipeline', 'deploy', 'aws', 'azure', 'gcp'],
            websocket: ['websocket', 'socket.io', 'realtime', 'ws', 'connection', 'emit'],
            testing: ['test', 'jest', 'mocha', 'chai', 'vitest', 'unit', 'integration', 'e2e'],
            security: ['security', 'auth', 'jwt', 'oauth', 'encrypt', 'hash', 'vulnerability'],
            performance: ['performance', 'optimize', 'cache', 'latency', 'throughput', 'bottleneck'],
            ui: ['ui', 'css', 'style', 'responsive', 'design', 'layout', 'animation'],
            algorithm: ['algorithm', 'complexity', 'optimization', 'data structure', 'search', 'sort'],
            architecture: ['architecture', 'design pattern', 'microservice', 'monolith', 'refactor']
        };
    }

    /**
     * Analyze developer expertise from commit history
     */
    async analyzeExpertise(owner, repo, username) {
        try {
            const cacheKey = `${owner}/${repo}/${username}`;
            if (this.expertiseCache.has(cacheKey)) {
                return this.expertiseCache.get(cacheKey);
            }

            // Fetch commit history for user
            const commits = await this.fetchUserCommits(owner, repo, username);
            
            // Fetch PR discussions
            const prDiscussions = await this.fetchUserPRDiscussions(owner, repo, username);

            // Analyze technical content
            const expertise = this.analyzeContent(commits, prDiscussions);

            // Calculate proficiency scores
            const proficiency = this.calculateProficiency(expertise);

            const result = {
                username,
                expertise: proficiency,
                totalCommits: commits.length,
                totalPRComments: prDiscussions.length,
                analyzedAt: Date.now()
            };

            this.expertiseCache.set(cacheKey, result);
            return result;

        } catch (error) {
            console.error('Expertise analysis error:', error.message);
            return {
                username,
                expertise: {},
                totalCommits: 0,
                totalPRComments: 0,
                error: error.message
            };
        }
    }

    /**
     * Fetch commits for specific user
     */
    async fetchUserCommits(owner, repo, username) {
        try {
            const response = await axios.get(
                `https://api.github.com/repos/${owner}/${repo}/commits`,
                {
                    params: {
                        author: username,
                        per_page: 100
                    },
                    headers: this.getAuthHeaders()
                }
            );

            return response.data || [];
        } catch (error) {
            console.error('Commit fetch error:', error.message);
            return [];
        }
    }

    /**
     * Fetch PR discussions for user
     */
    async fetchUserPRDiscussions(owner, repo, username) {
        try {
            // Get all PRs
            const prsResponse = await axios.get(
                `https://api.github.com/repos/${owner}/${repo}/pulls`,
                {
                    params: {
                        state: 'all',
                        per_page: 50
                    },
                    headers: this.getAuthHeaders()
                }
            );

            const allComments = [];

            // Fetch comments for each PR
            for (const pr of prsResponse.data || []) {
                const commentsResponse = await axios.get(pr.comments_url, {
                    headers: this.getAuthHeaders()
                });

                const userComments = (commentsResponse.data || []).filter(
                    comment => comment.user.login === username
                );

                allComments.push(...userComments);
            }

            return allComments;
        } catch (error) {
            console.error('PR discussion fetch error:', error.message);
            return [];
        }
    }

    /**
     * Analyze content for technical expertise
     */
    analyzeContent(commits, prDiscussions) {
        const techScores = {};

        // Initialize scores
        Object.keys(this.techKeywords).forEach(tech => {
            techScores[tech] = {
                mentions: 0,
                complexity: 0,
                recentActivity: 0
            };
        });

        // Analyze commit messages
        commits.forEach((commit, index) => {
            const message = commit.commit?.message?.toLowerCase() || '';
            const files = commit.files || [];
            const age = commits.length - index; // Newer commits have higher age value

            Object.entries(this.techKeywords).forEach(([tech, keywords]) => {
                keywords.forEach(keyword => {
                    if (message.includes(keyword)) {
                        techScores[tech].mentions += 1;
                        techScores[tech].recentActivity += age / commits.length;
                    }
                });

                // Check file extensions for tech indicators
                files.forEach(file => {
                    if (this.matchesTech(file.filename, tech)) {
                        techScores[tech].complexity += file.changes || 0;
                    }
                });
            });
        });

        // Analyze PR discussions
        prDiscussions.forEach(comment => {
            const body = comment.body?.toLowerCase() || '';
            const length = body.length;

            Object.entries(this.techKeywords).forEach(([tech, keywords]) => {
                keywords.forEach(keyword => {
                    if (body.includes(keyword)) {
                        techScores[tech].mentions += 2; // PR comments worth 2x
                        techScores[tech].complexity += length / 100; // Longer comments = deeper knowledge
                    }
                });
            });
        });

        return techScores;
    }

    /**
     * Match filename to technology
     */
    matchesTech(filename, tech) {
        const techFilePatterns = {
            javascript: ['.js', '.mjs', '.cjs'],
            react: ['.jsx', '.tsx'],
            vue: ['.vue'],
            angular: ['.component.ts', '.service.ts'],
            backend: ['server.js', 'app.js', 'api/', 'routes/'],
            database: ['migration', 'schema', '.sql'],
            devops: ['Dockerfile', 'docker-compose', '.yml', '.yaml', 'k8s/'],
            websocket: ['socket', 'websocket'],
            testing: ['.test.', '.spec.', '__tests__/'],
            security: ['auth', 'security', 'jwt'],
            ui: ['.css', '.scss', '.sass', 'style'],
            algorithm: ['algorithm', 'sort', 'search'],
            architecture: ['service', 'controller', 'model']
        };

        const patterns = techFilePatterns[tech] || [];
        return patterns.some(pattern => filename.toLowerCase().includes(pattern));
    }

    /**
     * Calculate proficiency levels
     */
    calculateProficiency(techScores) {
        const proficiency = {};

        Object.entries(techScores).forEach(([tech, scores]) => {
            const totalScore = 
                scores.mentions * 1.0 + 
                scores.complexity * 0.1 + 
                scores.recentActivity * 5.0;

            let level = 'Novice';
            let score = 0;

            if (totalScore >= 100) {
                level = 'Guru';
                score = Math.min(100, totalScore / 2);
            } else if (totalScore >= 50) {
                level = 'Expert';
                score = Math.min(90, totalScore * 1.2);
            } else if (totalScore >= 20) {
                level = 'Advanced';
                score = Math.min(75, totalScore * 2);
            } else if (totalScore >= 5) {
                level = 'Intermediate';
                score = Math.min(60, totalScore * 5);
            } else if (totalScore > 0) {
                level = 'Novice';
                score = Math.min(40, totalScore * 10);
            }

            if (totalScore > 0) {
                proficiency[tech] = {
                    level,
                    score: Math.round(score),
                    mentions: scores.mentions,
                    complexity: Math.round(scores.complexity),
                    recentActivity: scores.recentActivity.toFixed(2)
                };
            }
        });

        // Sort by score
        return Object.fromEntries(
            Object.entries(proficiency).sort((a, b) => b[1].score - a[1].score)
        );
    }

    /**
     * Analyze team-wide expertise
     */
    async analyzeTeamExpertise(owner, repo) {
        try {
            // Get all contributors
            const contributors = await this.fetchContributors(owner, repo);

            const teamExpertise = [];

            // Analyze each contributor
            for (const contributor of contributors.slice(0, 20)) { // Limit to top 20
                const expertise = await this.analyzeExpertise(owner, repo, contributor.login);
                teamExpertise.push(expertise);
            }

            // Calculate tech coverage
            const techCoverage = this.calculateTechCoverage(teamExpertise);

            return {
                contributors: teamExpertise,
                techCoverage,
                totalContributors: contributors.length,
                analyzedAt: Date.now()
            };

        } catch (error) {
            console.error('Team expertise analysis error:', error.message);
            return {
                contributors: [],
                techCoverage: {},
                error: error.message
            };
        }
    }

    /**
     * Fetch repository contributors
     */
    async fetchContributors(owner, repo) {
        try {
            const response = await axios.get(
                `https://api.github.com/repos/${owner}/${repo}/contributors`,
                {
                    params: { per_page: 100 },
                    headers: this.getAuthHeaders()
                }
            );

            return response.data || [];
        } catch (error) {
            console.error('Contributors fetch error:', error.message);
            return [];
        }
    }

    /**
     * Calculate technology coverage across team
     */
    calculateTechCoverage(teamExpertise) {
        const coverage = {};

        Object.keys(this.techKeywords).forEach(tech => {
            const experts = teamExpertise.filter(
                member => member.expertise[tech] && 
                        ['Expert', 'Guru'].includes(member.expertise[tech].level)
            );

            const advanced = teamExpertise.filter(
                member => member.expertise[tech] && 
                        member.expertise[tech].level === 'Advanced'
            );

            coverage[tech] = {
                experts: experts.length,
                advanced: advanced.length,
                total: experts.length + advanced.length,
                expertNames: experts.map(e => e.username),
                risk: experts.length === 0 ? 'high' : experts.length === 1 ? 'medium' : 'low'
            };
        });

        return coverage;
    }

    /**
     * Find top experts for specific technology
     */
    findExperts(teamExpertise, technology) {
        return teamExpertise
            .filter(member => member.expertise[technology])
            .sort((a, b) => 
                b.expertise[technology].score - a.expertise[technology].score
            )
            .slice(0, 5);
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
        this.expertiseCache.clear();
    }
}

module.exports = new ExpertiseExtractionService();
