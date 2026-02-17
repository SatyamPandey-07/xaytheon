const violationDetector = require("./violation-detector.service");

/**
 * Architecture-as-Code Validator Service
 * Validates repository against user-defined JSON architecture rules
 */

class ArchitectureValidatorService {
  constructor() {
    this.definitionCache = new Map();
  }

  /**
   * Validate repository against architecture definition
   */
  async validateArchitecture(owner, repo, architectureDefinition) {
    try {
      // Parse and validate definition
      const definition = this.parseDefinition(architectureDefinition);

      // Detect violations using the defined rules
      const violations = await violationDetector.detectViolations(
        owner,
        repo,
        definition.pattern || "layered"
      );

      // Apply custom rules
      const customViolations = this.applyCustomRules(violations, definition);

      // Analyze Architecture Drift
      const driftAnalysis = this.analyzeArchitectureDrift(violations, definition);

      // Generate validation report
      const report = this.generateReport(violations, customViolations, definition, driftAnalysis);

      return report;
    } catch (error) {
      console.error("Error validating architecture:", error);
      throw error;
    }
  }

  /**
   * Parse architecture definition
   */
  parseDefinition(definition) {
    if (typeof definition === "string") {
      definition = JSON.parse(definition);
    }

    // Validate required fields
    if (!definition.name) {
      throw new Error("Architecture definition must have a name");
    }

    // Set defaults
    return {
      name: definition.name,
      version: definition.version || "1.0",
      pattern: definition.pattern || "layered",
      layers: definition.layers || [],
      rules: definition.rules || [],
      allowedDependencies: definition.allowedDependencies || [],
      forbiddenDependencies: definition.forbiddenDependencies || [],
      customConstraints: definition.customConstraints || [],
    };
  }

  /**
   * Apply custom rules from definition
   */
  applyCustomRules(violations, definition) {
    const customViolations = [];

    // Check forbidden dependencies
    definition.forbiddenDependencies.forEach((forbidden) => {
      violations.graph.edges.forEach((edge) => {
        if (
          this.matchesPattern(edge.sourceLayer, forbidden.from) &&
          this.matchesPattern(edge.targetLayer, forbidden.to)
        ) {
          customViolations.push({
            id: `custom-${edge.source}->${edge.target}`,
            source: edge.source,
            target: edge.target,
            sourceLayer: edge.sourceLayer,
            targetLayer: edge.targetLayer,
            severity: forbidden.severity || "high",
            description: forbidden.reason || "Forbidden dependency",
            rule: forbidden.name || "Custom Rule",
            type: "forbidden",
          });
        }
      });
    });

    // Check custom constraints
    definition.customConstraints.forEach((constraint) => {
      const constraintViolations = this.evaluateConstraint(constraint, violations);
      customViolations.push(...constraintViolations);
    });

    return customViolations;
  }

  /**
   * Analyze Architecture Drift
   * Calculates how much the actual implementation has deviated from the blueprint
   */
  analyzeArchitectureDrift(violations, definition) {
    const totalNodes = violations.graph.nodes.length;
    const totalEdges = violations.graph.edges.length;

    // Identify "Corrupted" nodes (nodes involved in multiple critical violations)
    const nodeViolationCount = {};
    violations.violations.forEach(v => {
      nodeViolationCount[v.source] = (nodeViolationCount[v.source] || 0) + 1;
    });

    const corruptedNodes = Object.entries(nodeViolationCount)
      .filter(([id, count]) => count >= 2)
      .map(([id, count]) => ({
        id,
        driftMagnitude: Math.min(10, count * 2), // Max spike intensity
        reason: "Multiple structural violations detected"
      }));

    // Calculate structural entropy
    const skipLayerViolations = violations.violations.filter(v => v.type === "skip-layer").length;
    const reverseViolations = violations.violations.filter(v => v.type === "reverse").length;

    // Higher entropy means more "spontaneous" unstructured links
    const structuralEntropy = totalEdges > 0
      ? (skipLayerViolations * 1.5 + reverseViolations * 2.5) / totalEdges
      : 0;

    return {
      driftScore: Math.round(structuralEntropy * 100),
      corruptedNodes,
      entropy: parseFloat(structuralEntropy.toFixed(3)),
      driftLevel: structuralEntropy > 0.4 ? "SEVERE" : (structuralEntropy > 0.15 ? "MODERATE" : "LOW")
    };
  }

  /**
   * Match layer pattern (supports wildcards)
   */
  matchesPattern(layer, pattern) {
    if (pattern === "*") return true;
    if (pattern === layer) return true;
    if (pattern.includes("*")) {
      const regex = new RegExp("^" + pattern.replace("*", ".*") + "$");
      return regex.test(layer);
    }
    return false;
  }

  /**
   * Evaluate custom constraint
   */
  evaluateConstraint(constraint, violations) {
    const constraintViolations = [];

    switch (constraint.type) {
      case "max-dependencies":
        this.checkMaxDependencies(constraint, violations, constraintViolations);
        break;
      case "max-complexity":
        this.checkMaxComplexity(constraint, violations, constraintViolations);
        break;
      case "no-circular":
        this.checkCircularDependencies(constraint, violations, constraintViolations);
        break;
      case "layer-naming":
        this.checkLayerNaming(constraint, violations, constraintViolations);
        break;
      default:
        console.warn(`Unknown constraint type: ${constraint.type}`);
    }

    return constraintViolations;
  }

  /**
   * Check max dependencies constraint
   */
  checkMaxDependencies(constraint, violations, results) {
    const { maxDependencies, layer } = constraint;

    violations.graph.nodes.forEach((node) => {
      if (this.matchesPattern(node.layer, layer)) {
        const dependencies = violations.graph.edges.filter((e) => e.source === node.id);
        if (dependencies.length > maxDependencies) {
          results.push({
            id: `max-deps-${node.id}`,
            source: node.id,
            severity: "medium",
            description: `File has ${dependencies.length} dependencies, exceeds limit of ${maxDependencies}`,
            rule: constraint.name || "Max Dependencies",
            type: "max-dependencies",
          });
        }
      }
    });
  }

  /**
   * Check max complexity constraint
   */
  checkMaxComplexity(constraint, violations, results) {
    const { maxComplexity, layer } = constraint;

    violations.graph.nodes.forEach((node) => {
      if (this.matchesPattern(node.layer, layer)) {
        if (node.complexity > maxComplexity) {
          results.push({
            id: `max-complexity-${node.id}`,
            source: node.id,
            severity: "medium",
            description: `File complexity (${node.complexity}) exceeds limit of ${maxComplexity}`,
            rule: constraint.name || "Max Complexity",
            type: "max-complexity",
          });
        }
      }
    });
  }

  /**
   * Check circular dependencies
   */
  checkCircularDependencies(constraint, violations, results) {
    const { layer } = constraint;
    const visited = new Set();
    const recursionStack = new Set();

    const detectCycle = (nodeId, path = []) => {
      if (recursionStack.has(nodeId)) {
        // Cycle detected
        results.push({
          id: `circular-${nodeId}`,
          source: nodeId,
          severity: "high",
          description: `Circular dependency detected: ${path.join(" → ")} → ${nodeId}`,
          rule: constraint.name || "No Circular Dependencies",
          type: "circular",
          path: [...path, nodeId],
        });
        return;
      }

      if (visited.has(nodeId)) return;

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const outgoing = violations.graph.edges.filter((e) => e.source === nodeId);
      outgoing.forEach((edge) => {
        const node = violations.graph.nodes.find((n) => n.id === edge.target);
        if (node && (!layer || this.matchesPattern(node.layer, layer))) {
          detectCycle(edge.target, [...path, nodeId]);
        }
      });

      recursionStack.delete(nodeId);
    };

    violations.graph.nodes.forEach((node) => {
      if (!layer || this.matchesPattern(node.layer, layer)) {
        detectCycle(node.id);
      }
    });
  }

  /**
   * Check layer naming convention
   */
  checkLayerNaming(constraint, violations, results) {
    const { layer, pattern } = constraint;
    const regex = new RegExp(pattern);

    violations.graph.nodes.forEach((node) => {
      if (this.matchesPattern(node.layer, layer)) {
        const filename = node.id.split("/").pop();
        if (!regex.test(filename)) {
          results.push({
            id: `naming-${node.id}`,
            source: node.id,
            severity: "low",
            description: `File name "${filename}" does not match pattern "${pattern}"`,
            rule: constraint.name || "Layer Naming Convention",
            type: "naming",
          });
        }
      }
    });
  }

  /**
   * Generate validation report
   */
  generateReport(violations, customViolations, definition, driftAnalysis) {
    const allViolations = [...violations.violations, ...customViolations];

    // Group by rule/type
    const byRule = {};
    allViolations.forEach((v) => {
      const rule = v.rule || v.type || "Standard";
      if (!byRule[rule]) {
        byRule[rule] = [];
      }
      byRule[rule].push(v);
    });

    // Calculate compliance score
    const totalConnections = violations.graph.edges.length;
    const violationCount = allViolations.length;
    const complianceScore = totalConnections > 0
      ? Math.max(0, 100 - (violationCount / totalConnections) * 100)
      : 100;

    return {
      repository: violations.repository,
      architecture: {
        name: definition.name,
        pattern: definition.pattern,
        version: definition.version,
      },
      timestamp: new Date().toISOString(),
      isValid: violationCount === 0,
      complianceScore: Math.round(complianceScore),
      violations: allViolations,
      summary: {
        total: violationCount,
        byRule: Object.keys(byRule).map((rule) => ({
          rule,
          count: byRule[rule].length,
          severity: this.calculateRuleSeverity(byRule[rule]),
        })),
        bySeverity: {
          critical: allViolations.filter((v) => v.severity === "critical").length,
          high: allViolations.filter((v) => v.severity === "high").length,
          medium: allViolations.filter((v) => v.severity === "medium").length,
          low: allViolations.filter((v) => v.severity === "low").length,
        },
      },
      drift: driftAnalysis,
      recommendations: this.generateValidationRecommendations(allViolations, definition),
    };
  }

  /**
   * Calculate rule severity
   */
  calculateRuleSeverity(violations) {
    if (violations.some((v) => v.severity === "critical")) return "critical";
    if (violations.some((v) => v.severity === "high")) return "high";
    if (violations.some((v) => v.severity === "medium")) return "medium";
    return "low";
  }

  /**
   * Generate recommendations for validation
   */
  generateValidationRecommendations(violations, definition) {
    const recommendations = [];

    // Group by severity
    const critical = violations.filter((v) => v.severity === "critical");
    const high = violations.filter((v) => v.severity === "high");

    if (critical.length > 0) {
      recommendations.push({
        priority: 1,
        title: "Address Critical Violations",
        description: `Fix ${critical.length} critical architectural violations immediately`,
        violations: critical.slice(0, 5).map((v) => v.id),
      });
    }

    if (high.length > 0) {
      recommendations.push({
        priority: 2,
        title: "Address High-Priority Violations",
        description: `Refactor ${high.length} high-priority violations`,
        violations: high.slice(0, 5).map((v) => v.id),
      });
    }

    // Check if architecture definition needs updates
    if (violations.length > violations.length * 0.3) {
      recommendations.push({
        priority: 3,
        title: "Review Architecture Definition",
        description: "Consider updating architecture rules to match actual codebase structure",
      });
    }

    return recommendations;
  }

  /**
   * Get example architecture definitions
   */
  getExampleDefinitions() {
    return {
      mvc: {
        name: "MVC Architecture",
        version: "1.0",
        pattern: "mvc",
        layers: ["view", "controller", "model"],
        allowedDependencies: [
          { from: "view", to: "controller" },
          { from: "controller", to: "model" },
        ],
        forbiddenDependencies: [
          { from: "view", to: "model", severity: "critical", reason: "Views must not access models directly" },
        ],
      },
      clean: {
        name: "Clean Architecture",
        version: "1.0",
        pattern: "cleanArchitecture",
        layers: ["view", "controller", "service", "model"],
        allowedDependencies: [
          { from: "view", to: "controller" },
          { from: "controller", to: "service" },
          { from: "service", to: "model" },
        ],
        forbiddenDependencies: [
          { from: "model", to: "*", severity: "critical", reason: "Domain must have no outward dependencies" },
        ],
        customConstraints: [
          { type: "max-dependencies", layer: "controller", maxDependencies: 5, name: "Controller Dependency Limit" },
          { type: "no-circular", layer: "*", name: "No Circular Dependencies" },
        ],
      },
    };
  }
}

module.exports = new ArchitectureValidatorService();
