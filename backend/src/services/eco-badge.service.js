/**
 * Eco-Badge System Service
 * Generates real-time sustainability ratings (A+ to F) for repositories
 */

const complexityAnalyzer = require('./complexity-analyzer.service');
const carbonCalculator = require('./carbon-calculator.service');

// Sustainability rating thresholds
const RATING_THRESHOLDS = {
  "A+": { min: 90, max: 100, color: "#00c853", icon: "🌟" },
  A: { min: 80, max: 89, color: "#64dd17", icon: "⭐" },
  "B+": { min: 70, max: 79, color: "#aeea00", icon: "🌿" },
  B: { min: 60, max: 69, color: "#cddc39", icon: "🍃" },
  "C+": { min: 50, max: 59, color: "#ffeb3b", icon: "🌾" },
  C: { min: 40, max: 49, color: "#ffc107", icon: "⚠️" },
  "D+": { min: 30, max: 39, color: "#ff9800", icon: "🔶" },
  D: { min: 20, max: 29, color: "#ff5722", icon: "🔸" },
  F: { min: 0, max: 19, color: "#d32f2f", icon: "❌" },
};

// Scoring weights (total = 100)
const SCORING_WEIGHTS = {
  codeComplexity: 30, // Algorithm efficiency
  bundleSize: 20, // Library choices
  antiPatterns: 15, // Code quality
  carbonIntensity: 20, // CI/CD region choice
  refactorability: 15, // How easy to improve
};

// Badge achievements
const ACHIEVEMENTS = {
  CARBON_NEUTRAL: {
    name: "Carbon Neutral Champion",
    description: "Running CI/CD in 100% renewable energy regions",
    icon: "🌱",
    criteria: (data) => data.region.renewablePercent >= 95,
  },
  LIGHTWEIGHT: {
    name: "Lightweight Build",
    description: "Bundle size under 50KB",
    icon: "🪶",
    criteria: (data) => data.bundleSize < 50,
  },
  EFFICIENT_ALGORITHMS: {
    name: "Algorithm Optimizer",
    description: "No files with O(n²) or worse complexity",
    icon: "⚡",
    criteria: (data) => data.worstComplexity.score < 5,
  },
  ZERO_ANTIPATTERNS: {
    name: "Clean Code Master",
    description: "Zero high-severity anti-patterns",
    icon: "✨",
    criteria: (data) => data.highSeverityAntiPatterns === 0,
  },
  GREEN_REFACTOR: {
    name: "Green Refactored",
    description: "Implemented at least 5 green refactors",
    icon: "♻️",
    criteria: (data) => data.refactorsImplemented >= 5,
  },
  ECO_WARRIOR: {
    name: "Eco Warrior",
    description: "Sustainability rating A or higher",
    icon: "🏆",
    criteria: (data) => data.rating === "A+" || data.rating === "A",
  },
  TREE_PLANTER: {
    name: "Virtual Tree Planter",
    description: "Saved enough CO2 to plant 100 trees equivalent",
    icon: "🌳",
    criteria: (data) => data.treesEquivalent >= 100,
  },
};

class EcoBadgeService {
  /**
   * Generate complete sustainability rating
   */
  async generateRating(owner, repo, config = {}) {
    try {
      // Get complexity analysis
      const complexityAnalysis = await complexityAnalyzer.analyzeRepository(
        owner,
        repo
      );

      // Calculate carbon footprint
      const carbonFootprint = carbonCalculator.calculateRepositoryFootprint(
        complexityAnalysis,
        {
          avgExecutions: config.avgExecutions || 1000000,
          region: config.region || "us-east-1",
          instanceType: config.instanceType || "m5.large",
          pipelineSize: config.pipelineSize || "medium",
        }
      );

      // Calculate individual scores
      const scores = this.calculateScores(complexityAnalysis, carbonFootprint);

      // Calculate overall score
      const overallScore = this.calculateOverallScore(scores);

      // Determine rating
      const rating = this.determineRating(overallScore);

      // Check achievements
      const achievements = this.checkAchievements({
        ...complexityAnalysis.summary,
        ...carbonFootprint,
        rating: rating.grade,
        region: carbonFootprint.region,
        worstComplexity: complexityAnalysis.files.reduce(
          (worst, f) =>
            f.complexity.score > worst.score ? f.complexity : worst,
          { score: 0 }
        ),
        highSeverityAntiPatterns: complexityAnalysis.files.filter(
          (f) => f.antiPatterns.some((ap) => ap.severity === "high")
        ).length,
        refactorsImplemented: 0, // Would track from user actions
        treesEquivalent:
          carbonFootprint.equivalents.treesNeeded,
        bundleSize: complexityAnalysis.summary.estimatedBundleSize,
      });

      // Generate improvement roadmap
      const roadmap = this.generateImprovementRoadmap(
        scores,
        complexityAnalysis
      );

      return {
        repository: `${owner}/${repo}`,
        timestamp: new Date().toISOString(),
        rating: {
          ...rating,
          score: overallScore,
        },
        scores,
        achievements: achievements.filter((a) => a.earned),
        potentialAchievements: achievements.filter((a) => !a.earned),
        carbonFootprint: {
          yearly: carbonFootprint.emissions.total.yearly,
          monthly: carbonFootprint.emissions.total.monthly,
          equivalents: carbonFootprint.equivalents,
        },
        summary: {
          files: complexityAnalysis.summary.totalFiles,
          lines: complexityAnalysis.summary.totalLines,
          bundleSize: complexityAnalysis.summary.estimatedBundleSize,
          region: carbonFootprint.region.name,
          renewableEnergy: `${carbonFootprint.region.renewablePercent}%`,
        },
        roadmap,
        badge: this.generateBadgeSVG(rating, overallScore),
      };
    } catch (error) {
      console.error("Error generating eco-badge rating:", error);
      throw error;
    }
  }

  /**
   * Calculate individual category scores
   */
  calculateScores(complexityAnalysis, carbonFootprint) {
    // Code Complexity Score (0-100, higher is better)
    const avgComplexityScore = complexityAnalysis.summary.averageEnergyScore;
    const complexityScore = Math.max(0, 100 - avgComplexityScore);

    // Bundle Size Score (0-100)
    const bundleSize = complexityAnalysis.summary.estimatedBundleSize;
    const bundleSizeScore = Math.max(
      0,
      100 - Math.min(100, (bundleSize / 500) * 100)
    ); // 500KB = 0 score

    // Anti-Patterns Score (0-100)
    const antiPatternCount = complexityAnalysis.summary.totalAntiPatterns;
    const antiPatternsScore = Math.max(0, 100 - antiPatternCount * 5);

    // Carbon Intensity Score (0-100)
    const carbonIntensity = carbonFootprint.region.carbonIntensity;
    const carbonIntensityScore = Math.max(
      0,
      100 - Math.min(100, (carbonIntensity / 700) * 100)
    ); // 700 gCO2/kWh = 0 score

    // Refactorability Score (0-100)
    const potentialSavings = complexityAnalysis.summary.potentialSavings;
    const hasOptimizations = complexityAnalysis.recommendations.length > 0;
    const refactorabilityScore = hasOptimizations
      ? Math.min(100, 50 + (potentialSavings / 10) * 5) // Higher savings = easier to improve
      : 90; // Already optimized

    return {
      codeComplexity: {
        score: Math.round(complexityScore),
        weight: SCORING_WEIGHTS.codeComplexity,
        details: {
          avgEnergyScore: avgComplexityScore,
          worstComplexity: complexityAnalysis.worstOffenders[0]?.complexity,
        },
      },
      bundleSize: {
        score: Math.round(bundleSizeScore),
        weight: SCORING_WEIGHTS.bundleSize,
        details: {
          currentSize: bundleSize,
          potentialSavings: complexityAnalysis.summary.potentialSavings,
        },
      },
      antiPatterns: {
        score: Math.round(antiPatternsScore),
        weight: SCORING_WEIGHTS.antiPatterns,
        details: {
          count: antiPatternCount,
          highSeverity: complexityAnalysis.files.filter((f) =>
            f.antiPatterns.some((ap) => ap.severity === "high")
          ).length,
        },
      },
      carbonIntensity: {
        score: Math.round(carbonIntensityScore),
        weight: SCORING_WEIGHTS.carbonIntensity,
        details: {
          region: carbonFootprint.region.name,
          intensity: carbonIntensity,
          renewablePercent: carbonFootprint.region.renewablePercent,
        },
      },
      refactorability: {
        score: Math.round(refactorabilityScore),
        weight: SCORING_WEIGHTS.refactorability,
        details: {
          recommendations: complexityAnalysis.recommendations.length,
          potentialSavings: potentialSavings,
        },
      },
    };
  }

  /**
   * Calculate weighted overall score
   */
  calculateOverallScore(scores) {
    let weightedSum = 0;
    let totalWeight = 0;

    Object.values(scores).forEach((category) => {
      weightedSum += category.score * (category.weight / 100);
      totalWeight += category.weight;
    });

    return Math.round((weightedSum / totalWeight) * 100);
  }

  /**
   * Determine rating grade from score
   */
  determineRating(score) {
    for (const [grade, threshold] of Object.entries(RATING_THRESHOLDS)) {
      if (score >= threshold.min && score <= threshold.max) {
        return {
          grade,
          ...threshold,
          description: this.getRatingDescription(grade),
        };
      }
    }
    return { grade: "F", ...RATING_THRESHOLDS.F };
  }

  /**
   * Get description for rating
   */
  getRatingDescription(grade) {
    const descriptions = {
      "A+": "Exemplary sustainability! Your code is a model for green software.",
      A: "Excellent! Your codebase is highly sustainable with minimal environmental impact.",
      "B+": "Very Good! Minor improvements could make this even greener.",
      B: "Good! Solid sustainability practices with room for optimization.",
      "C+": "Fair. Several improvements needed to reduce carbon footprint.",
      C: "Average. Significant optimizations would improve sustainability.",
      "D+": "Below Average. Major changes needed to reduce environmental impact.",
      D: "Poor. This codebase has substantial sustainability issues.",
      F: "Critical. Immediate action required to address environmental concerns.",
    };
    return descriptions[grade] || "";
  }

  /**
   * Check which achievements have been earned
   */
  checkAchievements(data) {
    return Object.entries(ACHIEVEMENTS).map(([key, achievement]) => ({
      id: key,
      ...achievement,
      earned: achievement.criteria(data),
    }));
  }

  /**
   * Generate improvement roadmap
   */
  generateImprovementRoadmap(scores, complexityAnalysis) {
    const improvements = [];

    // Sort categories by score (lowest first = highest priority)
    const sortedCategories = Object.entries(scores).sort(
      (a, b) => a[1].score - b[1].score
    );

    sortedCategories.forEach(([category, data]) => {
      if (data.score < 70) {
        improvements.push({
          category,
          currentScore: data.score,
          targetScore: 80,
          priority:
            data.score < 50 ? "high" : data.score < 70 ? "medium" : "low",
          actions: this.getImprovementActions(category, data),
          estimatedImpact: `+${Math.min(30, 80 - data.score)} points`,
        });
      }
    });

    return {
      improvements,
      nextRating: this.calculateNextRating(scores),
      estimatedEffort: this.estimateImprovementEffort(improvements),
    };
  }

  /**
   * Get specific improvement actions for category
   */
  getImprovementActions(category, data) {
    const actions = {
      codeComplexity: [
        "Optimize O(n²) algorithms to O(n log n) or O(n)",
        "Replace recursive algorithms with iterative solutions",
        "Use memoization for repeated calculations",
      ],
      bundleSize: [
        `Replace heavy libraries (save ${data.details.potentialSavings} KB)`,
        "Enable tree-shaking in build configuration",
        "Use dynamic imports for code splitting",
      ],
      antiPatterns: [
        "Fix nested loops by using hash maps",
        "Move RegExp compilation outside loops",
        "Replace sync operations with async",
      ],
      carbonIntensity: [
        "Move CI/CD to renewable energy regions (EU North, US West)",
        "Schedule builds during low-carbon-intensity hours",
        "Reduce build frequency for non-critical branches",
      ],
      refactorability: [
        "Implement automated refactoring suggestions",
        "Break down monolithic files into modules",
        "Add comprehensive test coverage",
      ],
    };

    return actions[category] || [];
  }

  /**
   * Calculate next achievable rating
   */
  calculateNextRating(scores) {
    const currentScore = this.calculateOverallScore(scores);
    const nextThreshold = Object.values(RATING_THRESHOLDS).find(
      (t) => t.min > currentScore
    );

    if (nextThreshold) {
      const pointsNeeded = nextThreshold.min - currentScore;
      return {
        grade: Object.keys(RATING_THRESHOLDS).find(
          (k) => RATING_THRESHOLDS[k] === nextThreshold
        ),
        pointsNeeded,
        achievable: pointsNeeded <= 20,
      };
    }

    return null;
  }

  /**
   * Estimate effort to implement improvements
   */
  estimateImprovementEffort(improvements) {
    const effortMap = { high: 16, medium: 8, low: 4 };
    const totalHours = improvements.reduce(
      (sum, imp) => sum + (effortMap[imp.priority] || 8),
      0
    );

    return {
      totalHours,
      totalDays: Math.ceil(totalHours / 8),
      breakdown: improvements.map((imp) => ({
        category: imp.category,
        hours: effortMap[imp.priority],
      })),
    };
  }

  /**
   * Generate badge SVG
   */
  generateBadgeSVG(rating, score) {
    const width = 200;
    const height = 40;

    return {
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="${rating.color}" rx="5"/>
  <text x="10" y="25" font-family="Arial, sans-serif" font-size="20" fill="white">${rating.icon}</text>
  <text x="45" y="28" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="white">
    Sustainability: ${rating.grade} (${score}/100)
  </text>
</svg>`,
      markdown: `![Sustainability Rating](https://img.shields.io/badge/Sustainability-${rating.grade}-${rating.color.slice(
        1
      )}?style=for-the-badge)`,
      url: `https://img.shields.io/badge/Sustainability-${rating.grade}-${rating.color.slice(
        1
      )}?style=for-the-badge`,
    };
  }

  /**
   * Get historical ratings (would integrate with database)
   */
  async getHistoricalRatings(owner, repo, days = 30) {
    // Placeholder for historical data
    // In production, this would query a database
    return {
      repository: `${owner}/${repo}`,
      period: `${days} days`,
      ratings: [],
      trend: "stable",
      improvement: 0,
    };
  }

  /**
   * Compare with similar repositories
   */
  async compareWithPeers(rating, category = "javascript") {
    // Placeholder for peer comparison
    // Would use aggregated data from other repos
    return {
      percentile: Math.round(rating.rating.score / 100 * 99),
      averageScore: 65,
      topScore: 95,
      category,
    };
  }
}

module.exports = new EcoBadgeService();
