const db = require("../config/db");

class SearchModel {
    /**
     * Log a search query for analytics
     */
    async logSearch(userId, query, resultsCount) {
        return new Promise((resolve, reject) => {
            db.run(
                "INSERT INTO search_logs (user_id, query, results_count) VALUES (?, ?, ?)",
                [userId || null, query, resultsCount],
                function (err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    /**
     * Add to search history for a user
     */
    async addToHistory(userId, query) {
        if (!userId) return;
        return new Promise((resolve, reject) => {
            // First check if query already exists for user to avoid duplicates
            db.get(
                "SELECT id FROM search_history WHERE user_id = ? AND query = ?",
                [userId, query],
                (err, row) => {
                    if (err) reject(err);
                    if (row) {
                        // Update timestamp for existing entry
                        db.run(
                            "UPDATE search_history SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                            [row.id],
                            err => err ? reject(err) : resolve(row.id)
                        );
                    } else {
                        // Insert new entry
                        db.run(
                            "INSERT INTO search_history (user_id, query) VALUES (?, ?)",
                            [userId, query],
                            function (err) {
                                if (err) reject(err);
                                else resolve(this.lastID);
                            }
                        );
                    }
                }
            );
        });
    }

    /**
     * Get recent search history for a user
     */
    async getHistory(userId, limit = 10) {
        return new Promise((resolve, reject) => {
            db.all(
                "SELECT id, query, updated_at FROM search_history WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?",
                [userId, limit],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    /**
     * Clear search history for a user
     */
    async clearHistory(userId) {
        return new Promise((resolve, reject) => {
            db.run(
                "DELETE FROM search_history WHERE user_id = ?",
                [userId],
                err => err ? reject(err) : resolve()
            );
        });
    }

    /**
     * Get trending searches (popular queries in last 7 days)
     */
    async getTrending(limit = 5) {
        return new Promise((resolve, reject) => {
            db.all(
                `SELECT query, COUNT(*) as count 
                 FROM search_logs 
                 WHERE created_at > datetime('now', '-7 days')
                 GROUP BY query 
                 ORDER BY count DESC 
                 LIMIT ?`,
                [limit],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }
}

module.exports = new SearchModel();
