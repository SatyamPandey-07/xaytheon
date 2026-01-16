/**
 * Fuzzy Search Service
 * Implements Levenshtein distance and other similarity algorithms
 */

class FuzzySearchService {
    /**
     * Calculate Levenshtein distance between two strings
     */
    levenshteinDistance(a, b) {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;

        const matrix = [];

        // Increment along the first column of each row
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }

        // Increment each column in the first row
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }

        // Fill in the rest of the matrix
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        Math.min(
                            matrix[i][j - 1] + 1, // insertion
                            matrix[i - 1][j] + 1  // deletion
                        )
                    );
                }
            }
        }

        return matrix[b.length][a.length];
    }

    /**
     * Calculate similarity score between 0 and 1
     */
    getSimilarity(a, b) {
        const distance = this.levenshteinDistance(a.toLowerCase(), b.toLowerCase());
        const maxLength = Math.max(a.length, b.length);
        if (maxLength === 0) return 1.0;
        return 1.0 - distance / maxLength;
    }

    /**
     * Filter and rank items based on fuzzy match
     */
    search(query, items, key, threshold = 0.4) {
        if (!query) return items;

        const results = items.map(item => {
            const target = typeof item === 'string' ? item : item[key];
            const score = this.getSimilarity(query, target);
            return { item, score };
        });

        return results
            .filter(res => res.score >= threshold)
            .sort((a, b) => b.score - a.score)
            .map(res => res.item);
    }
}

module.exports = new FuzzySearchService();
