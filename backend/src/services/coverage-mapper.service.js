/**
 * Coverage Mapper Service
 * Maps files and branches to 3D logic tree coordinates.
 */
class CoverageMapperService {
    /**
     * Generates a 3D Logic Tree for a specific file.
     */
    async mapLogicTree(filePath, branches) {
        const tree = {
            id: filePath,
            root: { x: 0, y: 0, z: 0, name: filePath.split('/').pop() },
            nodes: []
        };

        // Create a branching structure
        branches.forEach((branch, index) => {
            const angle = (index / branches.length) * Math.PI * 2;
            const radius = 40;

            tree.nodes.push({
                id: branch.id,
                name: branch.condition,
                x: Math.cos(angle) * radius,
                z: Math.sin(angle) * radius,
                y: (index + 1) * 20,
                status: branch.status, // tested (green) or untested (red)
                metadata: branch
            });
        });

        return tree;
    }
}

module.exports = new CoverageMapperService();
