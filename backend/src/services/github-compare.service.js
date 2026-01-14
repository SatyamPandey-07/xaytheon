const axios = require('axios');

class GitHubCompareService {
    constructor() {
        this.baseUrl = 'https://api.github.com';
        this.token = process.env.GITHUB_TOKEN;
    }

    async getRepoData(repoPath) {
        try {
            const headers = this.token ? { Authorization: `token ${this.token}` } : {};

            const [repoRes, languagesRes, contributorsRes] = await Promise.all([
                axios.get(`${this.baseUrl}/repos/${repoPath}`, { headers }),
                axios.get(`${this.baseUrl}/repos/${repoPath}/languages`, { headers }),
                axios.get(`${this.baseUrl}/repos/${repoPath}/contributors?per_page=1`, { headers })
            ]);

            // Note: Getting actual stats over time (like stars history) requires a lot of calls 
            // or using specialized APIs. For this implementation, we'll provide the current snapshots 
            // and some derived health metrics.

            return {
                name: repoRes.data.name,
                fullName: repoRes.data.full_name,
                description: repoRes.data.description,
                stars: repoRes.data.stargazers_count,
                forks: repoRes.data.forks_count,
                openIssues: repoRes.data.open_issues_count,
                watchers: repoRes.data.subscribers_count,
                language: repoRes.data.language,
                languages: languagesRes.data,
                license: repoRes.data.license ? repoRes.data.license.spdx_id : 'N/A',
                createdAt: repoRes.data.created_at,
                updatedAt: repoRes.data.updated_at,
                pushedAt: repoRes.data.pushed_at,
                size: repoRes.data.size,
                owner: {
                    login: repoRes.data.owner.login,
                    avatarUrl: repoRes.data.owner.avatar_url,
                    htmlUrl: repoRes.data.owner.html_url
                }
            };
        } catch (error) {
            console.error(`Error fetching repo data for ${repoPath}:`, error.message);
            throw new Error(`Repository not found: ${repoPath}`);
        }
    }

    async compareRepositories(repoPaths) {
        const results = await Promise.all(repoPaths.map(path => this.getRepoData(path)));

        // Calculate relative metrics for charts
        const maxStars = Math.max(...results.map(r => r.stars));
        const maxForks = Math.max(...results.map(r => r.forks));
        const maxIssues = Math.max(...results.map(r => r.openIssues));

        return results.map(repo => ({
            ...repo,
            healthScore: this.calculateHealthScore(repo),
            normalizedMetrics: {
                stars: (repo.stars / maxStars) * 100,
                forks: (repo.forks / maxForks) * 100,
                openIssues: (repo.openIssues / maxIssues) * 100, // Note: More issues might be bad, but for radar we treat it as activity
                activity: this.calculateActivityScore(repo)
            }
        }));
    }

    calculateHealthScore(repo) {
        // Basic health score calculation
        let score = 0;
        if (repo.stars > 1000) score += 30;
        else score += (repo.stars / 1000) * 30;

        if (repo.forks > 100) score += 20;
        else score += (repo.forks / 100) * 20;

        const lastUpdate = new Date(repo.pushedAt);
        const monthsSinceUpdate = (new Date() - lastUpdate) / (1000 * 60 * 60 * 24 * 30);
        if (monthsSinceUpdate < 1) score += 30;
        else if (monthsSinceUpdate < 6) score += 15;

        if (repo.license !== 'N/A') score += 20;

        return Math.min(100, Math.round(score));
    }

    calculateActivityScore(repo) {
        const lastPush = new Date(repo.pushedAt);
        const now = new Date();
        const daysSincePush = (now - lastPush) / (1000 * 60 * 60 * 24);

        if (daysSincePush < 7) return 100;
        if (daysSincePush < 30) return 70;
        if (daysSincePush < 90) return 40;
        return 10;
    }
}

module.exports = new GitHubCompareService();
