/**
 * XAYTHEON - Geo-Routing Utility
 * 
 * Calculated geographic distances and provides nearest-neighbor 
 * selection for global traffic distribution.
 */

const REGIONS = {
    'na-east': { name: 'North America (East)', lat: 39.0438, lon: -77.4874 },
    'na-west': { name: 'North America (West)', lat: 45.5231, lon: -122.6765 },
    'eu-central': { name: 'Europe (Central)', lat: 50.1109, lon: 8.6821 },
    'ap-south': { name: 'Asia Pacific (South)', lat: 1.3521, lon: 103.8198 },
    'sa-east': { name: 'South America (East)', lat: -23.5505, lon: -46.6333 }
};

/**
 * Calculate Euclidean distance (simplified for load balancing)
 */
function getDistance(lat1, lon1, lat2, lon2) {
    return Math.sqrt(Math.pow(lat1 - lat2, 2) + Math.pow(lon1 - lon2, 2));
}

/**
 * Find the closest region based on user coordinates
 */
exports.findNearestRegion = (userLat, userLon) => {
    let nearest = null;
    let minDistance = Infinity;

    for (const [id, region] of Object.entries(REGIONS)) {
        const d = getDistance(userLat, userLon, region.lat, region.lon);
        if (d < minDistance) {
            minDistance = d;
            nearest = id;
        }
    }

    return nearest;
};

exports.REGIONS = REGIONS;
