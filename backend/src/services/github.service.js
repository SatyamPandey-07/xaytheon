const axios = require('axios');

class GithubService {
    constructor() {
        this.baseUrl = 'https://api.github.com';
        this.headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Xaytheon-Analytics-Worker'
        };
    }

    async fetchUserData(username) {
        try {
            const response = await axios.get(`${this.baseUrl}/users/${username}`, { headers: this.headers });
            return response.data;
        } catch (error) {
            console.error(`Error fetching user data for ${username}:`, error.message);
            throw error;
        }
    }

    async fetchUserRepos(username) {
        try {
            // Fetch top 100 repos sorted by updated
            const response = await axios.get(`${this.baseUrl}/users/${username}/repos?per_page=100&sort=updated`, { headers: this.headers });
            return response.data;
        } catch (error) {
            console.error(`Error fetching repos for ${username}:`, error.message);
            throw error;
        }
    }

    async getAnalyticsData(username) {
        const [user, repos] = await Promise.all([
            this.fetchUserData(username),
            this.fetchUserRepos(username)
        ]);

        const stars = repos.reduce((acc, repo) => acc + repo.stargazers_count, 0);
        const forkCount = repos.reduce((acc, repo) => acc + repo.forks_count, 0);
        
        // Calculate language stats
        const languages = {};
        repos.forEach(repo => {
            if (repo.language) {
                languages[repo.language] = (languages[repo.language] || 0) + 1;
            }
        });

        return {
            stars,
            followers: user.followers,
            following: user.following,
            publicRepos: user.public_repos,
            totalCommits: 0, // Requires more complex fetching (events or individual repo commits), setting 0 for now
            languageStats: languages,
            contributionCount: 0 // Requires GraphQL or scraping, setting 0 for now
        };
    }
}

module.exports = new GithubService();
