/**
 * Pruning Engine
 * AI logic for identifying oversized or redundant packages.
 */
class PruningEngine {
    /**
     * Analyzes buildings and provides pruning recommendations.
     * @param {Array} buildings - List of building objects from BundleAnalyzer.
     */
    async getPruningSuggestions(buildings) {
        const suggestions = [];

        // 1. Detect Large Singletons (Like Moment.js)
        const moment = buildings.find(b => b.name.toLowerCase().includes('moment'));
        if (moment) {
            suggestions.push({
                target: moment.name,
                type: 'Redundant Library',
                impact: 'High',
                description: 'Moment.js is legacy and heavy. Replace with date-fns or Day.js.',
                action: 'npm uninstall moment && npm install date-fns'
            });
        }

        // 2. Detect Duplicate Libraries (Example: Lodash)
        const lodash = buildings.filter(b => b.name.toLowerCase().includes('lodash'));
        if (lodash.length > 0) {
            suggestions.push({
                target: 'lodash',
                type: 'Bundle Bloat',
                impact: 'Medium',
                description: 'Full lodash build detected. Use tree-shakable imports or lodash-es.',
                action: 'Import from "lodash/map" instead of "lodash"'
            });
        }

        // 3. Detect Heavy Assets
        const heavyImages = buildings.filter(b => b.type === 'image' && parseFloat(b.stats.size) > 500);
        heavyImages.forEach(img => {
            suggestions.push({
                target: img.name,
                type: 'Unoptimized Asset',
                impact: 'Critical',
                description: `${img.name} is over 500KB. Use WebP or AVIF format.`,
                action: `Convert ${img.name} to WebP (-85% size)`
            });
        });

        // 4. Polyfill Audit
        suggestions.push({
            target: 'core-js',
            type: 'Polyfill Overlap',
            impact: 'Low',
            description: 'Many modern browsers support ES6+. Prune legacy polyfills.',
            action: 'Update browserslist to exclude IE11'
        });

        return suggestions;
    }
}

module.exports = new PruningEngine();
