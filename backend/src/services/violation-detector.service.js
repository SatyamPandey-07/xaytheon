const archDependencyParser = require("./arch-dependency-parser.service");

/**
 * Architectural Violation Detector Service
 * Detects layer violations, criminal connections, and architectural drift
 */

// Standard architecture patterns
const ARCHITECTURE_PATTERNS = {
  mvc: {
    name: "Model-View-Controller (MVC)",
    layers: ["view", "controller", "model"],
    allowedConnections: [
      { from: "view", to: "controller" },
      { from: "controller", to: "model" },
      { from: "controller", to: "service" },
      { from: "service", to: "model" },
    ],
    violations: [
      { from: "view", to: "model", severity: "critical", description: "View bypassing Controller to access Model" },
      { from: "view", to: "service", severity: "high", description: "View directly accessing Service layer" },
    ],
  },
  cleanArchitecture: {
    name: "Clean Architecture",
    layers: ["view", "controller", "service", "model"],
    allowedConnections: [
      { from: "view", to: "controller" },
      { from: "controller", to: "service" },
      { from: "service", to: "model" },
    ],
    violations: [
      { from: "view", to: "service", severity: "critical", description: "View bypassing Controller" },
      { from: "view", to: "model", severity: "critical", description: "View directly accessing Domain" },
      { from: "controller", to: "model", severity: "high", description: "Controller bypassing Service layer" },
      { from: "model", to: "*", severity: "critical", description: "Domain layer has outward dependencies" },
    ],
  },
  hexagonal: {
    name: "Hexagonal Architecture (Ports & Adapters)",
    layers: ["controller", "service", "model"],
    allowedConnections: [
      { from: "controller", to: "service" },
      { from: "service", to: "model" },
    ],
    violations: [
      { from: "controller", to: "model", severity: "critical", description: "Adapter bypassing Application Port" },
      { from: "model", to: "controller", severity: "critical", description: "Domain depending on Infrastructure" },
    ],
  },
  layered: {
    name: "Layered Architecture",
    layers: ["view", "controller", "service", "model", "utils"],
    allowedConnections: [
      { from: "view", to: "controller" },
      { from: "controller", to: "service" },
      { from: "service", to: "model" },
      { from: "*", to: "utils" },
    ],
    violations: [
      { from: "view", to: "model", severity: "critical", description: "Skip-layer violation" },
      { from: "view", to: "service", severity: "high", description: "Skip-layer violation" },
      { from: "controller", to: "model", severity: "high", description: "Skip-layer violation" },
      { from: "model", to: "view", severity: "critical", description: "Reverse dependency" },
      { from: "model", to: "controller", severity: "critical", description: "Reverse dependency" },
      { from: "service", to: "view", severity: "critical", description: "Reverse dependency" },
    ],
  },
};

class ViolationDetectorService {
  constructor() {
    this.violationCache = new Map();
  }

  /**
   * Detect all violations in repository
   */
  async detectViolations(owner, repo, architecturePattern = "layered") {
    const cacheKey = `violations:${owner}/${repo}:${architecturePattern}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Parse repository dependencies
      const depData = await archDependencyParser.parseRepository(owner, repo);

      // Get architecture rules
      const architecture = ARCHITECTURE_PATTERNS[architecturePattern];
      if (!architecture) {
        throw new Error(`Unknown architecture pattern: ${architecturePattern}`);
      }

      // Detect violations
      const violations = this.analyzeViolations(depData.graph, architecture);

      // Generate heatmap data
      const heatmap = this.generateHeatmapData(violations, depData.layers);

      // Calculate violation metrics
      const metrics = this.calculateViolationMetrics(violations, depData.graph);

      const result = {
        repository: `${owner}/${repo}`,
        architecture: architecture.name,
        timestamp: new Date().toISOString(),
        violations,
        heatmap,
        metrics,
        layers: depData.layers,
        graph: depData.graph,
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error("Error detecting violations:", error);
      throw error;
    }
  }

  /**
   * Analyze graph for violations
   */
  analyzeViolations(graph, architecture) {
    const violations = [];

    graph.edges.forEach((edge) => {
      // Check if connection is allowed
      const isAllowed = this.isConnectionAllowed(
        edge.sourceLayer,
        edge.targetLayer,
        architecture
      );

      if (!isAllowed) {
        // Find matching violation pattern
        const violationPattern = architecture.violations.find(
          (v) =>
            (v.from === edge.sourceLayer && v.to === edge.targetLayer) ||
            (v.from === edge.sourceLayer && v.to === "*") ||
            (v.from === "*" && v.to === edge.targetLayer)
        );

        if (violationPattern) {
          violations.push({
            id: `${edge.source}->${edge.target}`,
            source: edge.source,
            target: edge.target,
            sourceLayer: edge.sourceLayer,
            targetLayer: edge.targetLayer,
            severity: violationPattern.severity,
            description: violationPattern.description,
            line: edge.line,
            type: this.categorizeViolation(edge.sourceLayer, edge.targetLayer),
            driftImpact: this.calculateDriftImpact(edge, violationPattern)
          });
        } else {
          // Generic violation
          violations.push({
            id: `${edge.source}->${edge.target}`,
            source: edge.source,
            target: edge.target,
            sourceLayer: edge.sourceLayer,
            targetLayer: edge.targetLayer,
            severity: "medium",
            description: `Unexpected connection from ${edge.sourceLayer} to ${edge.targetLayer}`,
            line: edge.line,
            type: "unexpected",
            driftImpact: 0.1
          });
        }
      }
    });

    // Deep Analysis for "Architecture Drift"
    this.injectDriftSignals(violations, graph);

    // Sort by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    violations.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return violations;
  }

  /**
   * Calculate how much a single violation contributes to drift
   */
  calculateDriftImpact(edge, pattern) {
    const baseImpact = pattern.severity === "critical" ? 0.8 : (pattern.severity === "high" ? 0.5 : 0.2);

    // Add logic for distance skipped in layers
    const layerOrder = ["view", "controller", "service", "model"];
    const fromIdx = layerOrder.indexOf(edge.sourceLayer);
    const toIdx = layerOrder.indexOf(edge.targetLayer);

    if (fromIdx !== -1 && toIdx !== -1) {
      const skipDistance = Math.abs(toIdx - fromIdx);
      return baseImpact * (1 + skipDistance * 0.2);
    }

    return baseImpact;
  }

  /**
   * Inject deeper drift signals into the violations list
   */
  injectDriftSignals(violations, graph) {
    // Detect "Bypass Patterns" - e.g. Controller using both Service and Model for the same feature
    const sourceNodeUsage = {};
    graph.edges.forEach(edge => {
      if (!sourceNodeUsage[edge.source]) sourceNodeUsage[edge.source] = new Set();
      sourceNodeUsage[edge.source].add(edge.targetLayer);
    });

    Object.entries(sourceNodeUsage).forEach(([source, layers]) => {
      if (layers.has('controller') && layers.has('model') && !layers.has('service')) {
        // This is a strong signal of skipping the service layer
        violations.push({
          id: `drift-bypass-${source}`,
          source: source,
          severity: "high",
          description: "Module directly accesses data model while bypassing application services",
          type: "drift-bypass",
          driftImpact: 0.7
        });
      }
    });
  }

  /**
   * Check if connection is allowed
   */
  isConnectionAllowed(fromLayer, toLayer, architecture) {
    // Utils layer is always accessible
    if (toLayer === "utils" || toLayer === "config") {
      return true;
    }

    // Check explicit allowed connections
    return architecture.allowedConnections.some(
      (conn) =>
        (conn.from === fromLayer && conn.to === toLayer) ||
        (conn.from === "*" && conn.to === toLayer) ||
        (conn.from === fromLayer && conn.to === "*")
    );
  }

  /**
   * Categorize violation type
   */
  categorizeViolation(fromLayer, toLayer) {
    const layerOrder = ["view", "controller", "service", "model"];
    const fromIndex = layerOrder.indexOf(fromLayer);
    const toIndex = layerOrder.indexOf(toLayer);

    if (fromIndex === -1 || toIndex === -1) {
      return "unexpected";
    }

    if (fromIndex < toIndex) {
      // Forward dependency (potentially OK)
      if (toIndex - fromIndex > 1) {
        return "skip-layer"; // Skipping intermediate layers
      }
      return "forward";
    } else {
      // Reverse dependency (bad)
      return "reverse";
    }
  }

  /**
   * Generate heatmap data for 3D visualization
   */
  generateHeatmapData(violations, layers) {
    // Create layer stack
    const layerStack = layers.map((layer, index) => ({
      name: layer.name,
      level: index,
      fileCount: layer.count,
      files: layer.files,
      violations: [],
    }));

    // Add violations to layers
    violations.forEach((violation) => {
      const sourceLayerIndex = layers.findIndex((l) => l.name === violation.sourceLayer);
      const targetLayerIndex = layers.findIndex((l) => l.name === violation.targetLayer);

      if (sourceLayerIndex !== -1) {
        layerStack[sourceLayerIndex].violations.push({
          target: violation.target,
          targetLayer: violation.targetLayer,
          targetLevel: targetLayerIndex,
          severity: violation.severity,
          type: violation.type,
        });
      }
    });

    // Generate violation beams (connections between layers)
    const beams = violations.map((violation) => {
      const sourceLayerIndex = layers.findIndex((l) => l.name === violation.sourceLayer);
      const targetLayerIndex = layers.findIndex((l) => l.name === violation.targetLayer);

      return {
        id: violation.id,
        sourceFile: violation.source,
        targetFile: violation.target,
        sourceLayer: violation.sourceLayer,
        targetLayer: violation.targetLayer,
        sourceLevel: sourceLayerIndex,
        targetLevel: targetLayerIndex,
        severity: violation.severity,
        color: this.getSeverityColor(violation.severity),
        intensity: this.getSeverityIntensity(violation.severity),
      };
    });

    return {
      layers: layerStack,
      beams,
      dimensions: {
        width: 800,
        height: 600,
        layerHeight: 100,
        layerSpacing: 50,
      },
    };
  }

  /**
   * Get color for severity level
   */
  getSeverityColor(severity) {
    const colors = {
      critical: "#ff0000", // Bright red
      high: "#ff6600", // Orange-red
      medium: "#ffaa00", // Orange
      low: "#ffff00", // Yellow
    };
    return colors[severity] || "#ffffff";
  }

  /**
   * Get intensity for severity level
   */
  getSeverityIntensity(severity) {
    const intensities = {
      critical: 1.0,
      high: 0.75,
      medium: 0.5,
      low: 0.25,
    };
    return intensities[severity] || 0.1;
  }

  /**
   * Calculate violation metrics
   */
  calculateViolationMetrics(violations, graph) {
    const totalEdges = graph.edges.length;
    const violationCount = violations.length;
    const violationRate = totalEdges > 0 ? (violationCount / totalEdges) * 100 : 0;

    // Count by severity
    const bySeverity = {
      critical: violations.filter((v) => v.severity === "critical").length,
      high: violations.filter((v) => v.severity === "high").length,
      medium: violations.filter((v) => v.severity === "medium").length,
      low: violations.filter((v) => v.severity === "low").length,
    };

    // Count by type
    const byType = {
      "skip-layer": violations.filter((v) => v.type === "skip-layer").length,
      reverse: violations.filter((v) => v.type === "reverse").length,
      unexpected: violations.filter((v) => v.type === "unexpected").length,
    };

    // Most violated layers
    const layerViolations = {};
    violations.forEach((v) => {
      layerViolations[v.sourceLayer] = (layerViolations[v.sourceLayer] || 0) + 1;
    });

    const mostViolatedLayers = Object.entries(layerViolations)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([layer, count]) => ({ layer, count }));

    // Health score (0-100)
    const healthScore = Math.max(0, 100 - violationRate * 2);

    // Risk level
    let riskLevel = "low";
    if (bySeverity.critical > 0) riskLevel = "critical";
    else if (bySeverity.high > 3) riskLevel = "high";
    else if (bySeverity.high > 0 || bySeverity.medium > 5) riskLevel = "medium";

    return {
      totalEdges,
      violationCount,
      violationRate: Math.round(violationRate * 10) / 10,
      healthScore: Math.round(healthScore),
      riskLevel,
      bySeverity,
      byType,
      mostViolatedLayers,
    };
  }

  /**
   * Get violation details
   */
  getViolationDetails(violationId, owner, repo) {
    // Placeholder for detailed analysis
    return {
      id: violationId,
      explanation: "Detailed explanation of why this is a violation",
      impact: "Potential impact on system architecture",
      suggestions: ["Suggestion 1", "Suggestion 2"],
    };
  }

  /**
   * Cache management
   */
  getFromCache(key) {
    const cached = this.violationCache.get(key);
    if (cached && Date.now() - cached.timestamp < 3600000) {
      return cached.data;
    }
    return null;
  }

  setCache(key, data) {
    this.violationCache.set(key, { data, timestamp: Date.now() });
  }

  clearCache() {
    this.violationCache.clear();
  }
}

module.exports = new ViolationDetectorService();
