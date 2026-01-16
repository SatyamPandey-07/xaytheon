const SearchModel = require("../models/search.model");
const FuzzySearch = require("../services/fuzzy-search.service");
// In a real app, these would come from databases/external APIs
// For now, we'll use some mock data to demonstrate fuzzy search
const mockData = {
    repositories: [
        { id: 1, name: "xaytheon-core", description: "The core engine of Xaytheon platform", stars: 1200, language: "JavaScript" },
        { id: 2, name: "three-orbit-viewer", description: "3D visualization component using Three.js", stars: 450, language: "TypeScript" },
        { id: 3, name: "awesome-webgl", description: "Curated list of WebGL resources", stars: 8900, language: "Markdown" },
        { id: 4, name: "react-dynamic-dashboard", description: "A high-performance dashboard framework", stars: 2300, language: "JavaScript" },
        { id: 5, name: "python-ml-toolkit", description: "Machine learning tools for data scientists", stars: 15600, language: "Python" },
        { id: 6, name: "rust-warp-api", description: "Blazing fast API server built with Rust", stars: 3400, language: "Rust" },
        { id: 7, name: "vue-vibe-ui", description: "Stunning UI components for Vue.js", stars: 800, language: "Vue" },
        { id: 8, name: "go-microservices", description: "Microservices boilerplate in Go", stars: 5600, language: "Go" }
    ],
    users: [
        { id: 1, username: "satyam07", name: "Satyam Pandey", bio: "Full Stack Developer | AI Enthusiast" },
        { id: 2, username: "alison_dev", name: "Alison Spark", bio: "Open Source Contributor | Three.js Expert" },
        { id: 3, username: "tech_guru", name: "Guru Prasad", bio: "Cloud Architect | Tech Blogger" },
        { id: 4, username: "web_wizard", name: "Sarah Jenkins", bio: "Frontend Artist | UX Designer" }
    ],
    highlights: [
        { id: 1, title: "Revolutionizing 3D Web", category: "Technology", date: "2026-01-10" },
        { id: 2, title: "Scaling Microservices with Go", category: "Architecture", date: "2026-01-08" },
        { id: 3, title: "The Rise of Rust in System Programming", category: "Language", date: "2026-01-05" }
    ]
};

exports.search = async (req, res) => {
    try {
        const { q, type, lang, stars, dateRange } = req.query;
        const userId = req.user?.id;

        if (!q) {
            return res.json({ results: { repositories: [], users: [], highlights: [] } });
        }

        // 1. Perform fuzzy search across different categories
        let repos = mockData.repositories;
        let users = mockData.users;
        let highlights = mockData.highlights;

        // Filtering logic (Advanced Filters)
        if (lang) {
            repos = repos.filter(r => r.language.toLowerCase() === lang.toLowerCase());
        }
        if (stars) {
            const minStars = parseInt(stars, 10);
            repos = repos.filter(r => r.stars >= minStars);
        }
        // ... more filters could be added

        // Fuzzy Matching
        const matchedRepos = FuzzySearch.search(q, repos, 'name', 0.3);
        const matchedUsers = FuzzySearch.search(q, users, 'username', 0.3);
        const matchedHighlights = FuzzySearch.search(q, highlights, 'title', 0.3);

        const results = {
            repositories: matchedRepos,
            users: matchedUsers,
            highlights: matchedHighlights
        };

        const totalResults = matchedRepos.length + matchedUsers.length + matchedHighlights.length;

        // 2. Log search for analytics
        await SearchModel.logSearch(userId, q, totalResults);

        // 3. Add to User's search history
        if (userId) {
            await SearchModel.addToHistory(userId, q);
        }

        res.json({ results, query: q });
    } catch (error) {
        console.error("[Search] Error:", error);
        res.status(500).json({ message: "Search failed" });
    }
};

exports.getSuggestions = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 2) return res.json({ suggestions: [] });

        // Aggregate names for autocomplete
        const allTargets = [
            ...mockData.repositories.map(r => r.name),
            ...mockData.users.map(u => u.username),
            ...mockData.highlights.map(h => h.title)
        ];

        const suggestions = FuzzySearch.search(q, allTargets, null, 0.4).slice(0, 8);
        res.json({ suggestions });
    } catch (error) {
        res.status(500).json({ message: "Failed to get suggestions" });
    }
};

exports.getHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const history = await SearchModel.getHistory(userId);
        res.json({ history });
    } catch (error) {
        res.status(500).json({ message: "Failed to get history" });
    }
};

exports.clearHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        await SearchModel.clearHistory(userId);
        res.json({ message: "History cleared" });
    } catch (error) {
        res.status(500).json({ message: "Failed to clear history" });
    }
};

exports.getTrending = async (req, res) => {
    try {
        const trending = await SearchModel.getTrending();
        res.json({ trending });
    } catch (error) {
        res.status(500).json({ message: "Failed to get trending searches" });
    }
};
