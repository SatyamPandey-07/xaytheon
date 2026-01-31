/**
 * Bundle Analyzer Service
 * Processes build metadata (Webpack/Vite stats) into a 3D coordinate map.
 */
class BundleAnalyzerService {
    /**
     * Generates a 3D layout for the bundle city.
     * @param {Object} stats - The build statistics JSON.
     */
    async generateCityLayout(stats = {}) {
        // In a real implementation, we would parse actual Stats JSON.
        // For now, we use high-fidelity mock data based on real project structures.
        const files = this.getMockFileStats();

        const citySize = Math.ceil(Math.sqrt(files.length)) * 10;
        const spacing = 12;
        const layout = [];

        files.forEach((file, index) => {
            const gridX = index % Math.ceil(Math.sqrt(files.length));
            const gridZ = Math.floor(index / Math.ceil(Math.sqrt(files.length)));

            layout.push({
                id: file.path,
                name: file.name,
                type: file.type,
                // Height based on size (KB)
                height: Math.max(2, Math.log10(file.size) * 5),
                // Width/Depth based on dependency count
                width: Math.max(2, file.deps * 1.5),
                depth: Math.max(2, file.deps * 1.5),
                x: gridX * spacing - (citySize / 2),
                z: gridZ * spacing - (citySize / 2),
                y: 0,
                color: this.getColorByType(file.type),
                stats: {
                    size: this.formatBytes(file.size),
                    deps: file.deps,
                    loadTime: `${(file.size / 102400).toFixed(2)}ms (3G)`,
                    rent: this.calculateRent(file.size, file.deps)
                }
            });
        });

        return {
            citySize,
            buildings: layout,
            summary: {
                totalSize: this.formatBytes(files.reduce((a, b) => a + b.size, 0)),
                totalFiles: files.length,
                bloatFactor: "12%"
            }
        };
    }

    getColorByType(type) {
        const colors = {
            'js': '#f7df1e',
            'css': '#264de4',
            'html': '#e34c26',
            'image': '#4caf50',
            'font': '#9c27b0',
            'json': '#ff9800'
        };
        return colors[type] || '#9e9e9e';
    }

    calculateRent(size, deps) {
        // Visualizing "cost" as currency
        const cost = (size / 1024) * 0.5 + (deps * 2);
        return `$${cost.toFixed(2)}/ms`;
    }

    formatBytes(bytes, decimals = 2) {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }

    getMockFileStats() {
        return [
            { name: 'app.js', path: 'src/app.js', size: 450000, deps: 24, type: 'js' },
            { name: 'vendor.js', path: 'node_modules/vendor.js', size: 1200000, deps: 80, type: 'js' },
            { name: 'index.html', path: 'public/index.html', size: 2500, deps: 2, type: 'html' },
            { name: 'global.css', path: 'src/styles/global.css', size: 85000, deps: 5, type: 'css' },
            { name: 'dashboard.js', path: 'src/components/dashboard.js', size: 120000, deps: 12, type: 'js' },
            { name: 'utils.js', path: 'src/utils/helpers.js', size: 15000, deps: 1, type: 'js' },
            { name: 'hero.png', path: 'public/assets/hero.png', size: 850000, deps: 0, type: 'image' },
            { name: 'chart.js', path: 'node_modules/chart.js/dist/chart.js', size: 550000, deps: 15, type: 'js' },
            { name: 'moment.js', path: 'node_modules/moment/moment.js', size: 280000, deps: 0, type: 'js' },
            { name: 'lodash.js', path: 'node_modules/lodash/lodash.js', size: 520000, deps: 0, type: 'js' },
            { name: 'react.production.min.js', path: 'node_modules/react/umd/react.js', size: 120000, deps: 0, type: 'js' },
            { name: 'font-awesome.css', path: 'node_modules/fa/css/fa.css', size: 35000, deps: 10, type: 'css' },
            { name: 'config.json', path: 'src/config.json', size: 1200, deps: 0, type: 'json' },
            { name: 'analytics.js', path: 'src/services/analytics.js', size: 45000, deps: 8, type: 'js' },
            { name: 'profile-icon.svg', path: 'assets/icons/profile.svg', size: 4500, deps: 0, type: 'image' }
        ];
    }
}

module.exports = new BundleAnalyzerService();
