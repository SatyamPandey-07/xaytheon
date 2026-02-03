const axios = require("axios");

/**
 * Complexity Analyzer Service
 * Analyzes code to detect algorithmic complexity patterns (Big O notation)
 * and estimates computational cost
 */

// Complexity patterns with regex detection and severity scores
const COMPLEXITY_PATTERNS = {
  // O(1) - Constant time
  CONSTANT: {
    level: "O(1)",
    score: 1,
    patterns: [
      /^\s*(return|const|let|var)\s+\w+\s*=\s*[^;]+;?\s*$/gm,
      /\w+\[\d+\]/g, // Direct array access
      /\w+\.\w+/g, // Property access
    ],
    description: "Constant time operations",
    energyMultiplier: 1,
  },

  // O(log n) - Logarithmic time
  LOGARITHMIC: {
    level: "O(log n)",
    score: 2,
    patterns: [
      /while\s*\([^)]*\/=\s*2/g, // Division by 2
      /for\s*\([^)]*\*=\s*2/g, // Multiplication by 2
      /binarySearch|binary_search/gi,
      /Math\.log/g,
    ],
    description: "Logarithmic time operations (binary search, divide-and-conquer)",
    energyMultiplier: 1.5,
  },

  // O(n) - Linear time
  LINEAR: {
    level: "O(n)",
    score: 3,
    patterns: [
      /for\s*\([^)]*\)\s*\{/g, // Single loop
      /while\s*\([^)]*\)\s*\{/g, // Single while loop
      /\.forEach\(/g,
      /\.map\(/g,
      /\.filter\(/g,
      /\.reduce\(/g,
      /\.find\(/g,
    ],
    description: "Linear time operations (single loop)",
    energyMultiplier: 5,
  },

  // O(n log n) - Linearithmic time
  LINEARITHMIC: {
    level: "O(n log n)",
    score: 4,
    patterns: [
      /\.sort\(/g, // Most sort algorithms
      /mergeSort|merge_sort/gi,
      /quickSort|quick_sort/gi,
      /heapSort|heap_sort/gi,
    ],
    description: "Linearithmic time operations (efficient sorting)",
    energyMultiplier: 8,
  },

  // O(n²) - Quadratic time
  QUADRATIC: {
    level: "O(n²)",
    score: 5,
    patterns: [
      /for\s*\([^)]*\)\s*\{[^}]*for\s*\([^)]*\)\s*\{/gs, // Nested loops
      /\.map\([^)]*\.map\(/g, // Nested map
      /\.forEach\([^)]*\.forEach\(/g, // Nested forEach
    ],
    description: "Quadratic time operations (nested loops)",
    energyMultiplier: 25,
  },

  // O(2^n) - Exponential time
  EXPONENTIAL: {
    level: "O(2^n)",
    score: 6,
    patterns: [
      /fibonacci|fib\(/gi,
      /recursive.*recursive/gi,
      /Math\.pow\(2/g,
    ],
    description: "Exponential time operations (naive recursion)",
    energyMultiplier: 100,
  },

  // O(n!) - Factorial time
  FACTORIAL: {
    level: "O(n!)",
    score: 7,
    patterns: [
      /permutation|permute/gi,
      /factorial/gi,
      /travelingSalesman|traveling_salesman/gi,
    ],
    description: "Factorial time operations (brute force combinations)",
    energyMultiplier: 500,
  },
};

// Heavy library patterns that impact bundle size and runtime
const HEAVY_LIBRARIES = {
  "moment": {
    size: 289, // KB (minified + gzipped)
    alternative: "date-fns",
    alternativeSize: 13,
    savings: 276,
    reason: "date-fns is tree-shakeable and 95% smaller",
    carbonSavings: 0.138, // kg CO2 per 1000 users per month
  },
  "lodash": {
    size: 71,
    alternative: "lodash-es (tree-shaken)",
    alternativeSize: 15,
    savings: 56,
    reason: "Import only needed functions instead of entire library",
    carbonSavings: 0.028,
  },
  "axios": {
    size: 13,
    alternative: "fetch API",
    alternativeSize: 0,
    savings: 13,
    reason: "Native fetch API has no bundle cost",
    carbonSavings: 0.007,
  },
  "jquery": {
    size: 87,
    alternative: "vanilla JavaScript",
    alternativeSize: 0,
    savings: 87,
    reason: "Modern browsers have built-in DOM APIs",
    carbonSavings: 0.044,
  },
  "ramda": {
    size: 53,
    alternative: "native Array methods",
    alternativeSize: 0,
    savings: 53,
    reason: "Native methods are JIT-optimized",
    carbonSavings: 0.027,
  },
};

// Inefficient code patterns
const ANTI_PATTERNS = {
  NESTED_LOOPS: {
    pattern: /for\s*\([^)]*\)\s*\{[^}]*for\s*\([^)]*\)\s*\{/gs,
    severity: "high",
    suggestion: "Consider using hash maps or Set data structures to reduce O(n²) to O(n)",
    carbonImpact: "high",
  },
  ARRAY_CONCAT_IN_LOOP: {
    pattern: /for\s*\([^)]*\)\s*\{[^}]*\.concat\(/gs,
    severity: "medium",
    suggestion: "Use array.push() instead of concat() in loops to avoid O(n²) behavior",
    carbonImpact: "medium",
  },
  REGEX_IN_LOOP: {
    pattern: /for\s*\([^)]*\)\s*\{[^}]*new\s+RegExp\(/gs,
    severity: "medium",
    suggestion: "Move RegExp creation outside the loop to avoid repeated compilation",
    carbonImpact: "low",
  },
  MULTIPLE_DOM_QUERIES: {
    pattern: /(document\.querySelector|document\.getElementById|document\.getElementsBy)[^;]*;[^]*\1/gs,
    severity: "low",
    suggestion: "Cache DOM queries in variables to reduce browser reflow operations",
    carbonImpact: "low",
  },
  SYNC_FILE_OPERATIONS: {
    pattern: /fs\.readFileSync|fs\.writeFileSync/g,
    severity: "high",
    suggestion: "Use async file operations to prevent blocking the event loop",
    carbonImpact: "medium",
  },
};

class ComplexityAnalyzerService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 3600000; // 1 hour
  }

  /**
   * Analyze repository for algorithmic complexity
   */
  async analyzeRepository(owner, repo) {
    const cacheKey = `complexity:${owner}/${repo}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Fetch repository files
      const files = await this.fetchRepositoryFiles(owner, repo);

      // Analyze each file
      const fileAnalyses = [];
      for (const file of files) {
        if (this.isAnalyzableFile(file.path)) {
          const analysis = await this.analyzeFile(owner, repo, file.path);
          if (analysis) {
            fileAnalyses.push(analysis);
          }
        }
      }

      // Calculate repository-wide metrics
      const result = {
        repository: `${owner}/${repo}`,
        timestamp: new Date().toISOString(),
        files: fileAnalyses,
        summary: this.calculateSummary(fileAnalyses),
        worstOffenders: this.findWorstOffenders(fileAnalyses, 10),
        recommendations: this.generateRecommendations(fileAnalyses),
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error("Error analyzing repository:", error);
      throw error;
    }
  }

  /**
   * Analyze individual file for complexity
   */
  async analyzeFile(owner, repo, filePath) {
    try {
      const content = await this.fetchFileContent(owner, repo, filePath);
      if (!content) return null;

      const complexityMatches = this.detectComplexity(content);
      const antiPatterns = this.detectAntiPatterns(content);
      const libraries = this.detectHeavyLibraries(content);

      const worstComplexity = complexityMatches.reduce(
        (worst, current) =>
          current.score > worst.score ? current : worst,
        { score: 0, level: "O(1)" }
      );

      return {
        path: filePath,
        lines: content.split("\n").length,
        complexity: worstComplexity,
        complexityDetails: complexityMatches,
        antiPatterns: antiPatterns,
        heavyLibraries: libraries,
        energyScore: this.calculateEnergyScore(
          complexityMatches,
          antiPatterns,
          libraries
        ),
      };
    } catch (error) {
      console.error(`Error analyzing file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Detect complexity patterns in code
   */
  detectComplexity(code) {
    const matches = [];

    for (const [key, complexity] of Object.entries(COMPLEXITY_PATTERNS)) {
      let totalMatches = 0;
      for (const pattern of complexity.patterns) {
        const patternMatches = (code.match(pattern) || []).length;
        totalMatches += patternMatches;
      }

      if (totalMatches > 0) {
        matches.push({
          type: key,
          level: complexity.level,
          score: complexity.score,
          count: totalMatches,
          description: complexity.description,
          energyMultiplier: complexity.energyMultiplier,
        });
      }
    }

    return matches.sort((a, b) => b.score - a.score);
  }

  /**
   * Detect anti-patterns in code
   */
  detectAntiPatterns(code) {
    const detected = [];

    for (const [key, pattern] of Object.entries(ANTI_PATTERNS)) {
      const matches = (code.match(pattern.pattern) || []).length;
      if (matches > 0) {
        detected.push({
          type: key,
          severity: pattern.severity,
          count: matches,
          suggestion: pattern.suggestion,
          carbonImpact: pattern.carbonImpact,
        });
      }
    }

    return detected;
  }

  /**
   * Detect heavy libraries in imports
   */
  detectHeavyLibraries(code) {
    const detected = [];

    for (const [lib, details] of Object.entries(HEAVY_LIBRARIES)) {
      const importPattern = new RegExp(
        `(import|require)\\s*.*['"]${lib}['"]`,
        "g"
      );
      if (importPattern.test(code)) {
        detected.push({
          library: lib,
          ...details,
        });
      }
    }

    return detected;
  }

  /**
   * Calculate energy score for a file (0-100, higher is worse)
   */
  calculateEnergyScore(complexityMatches, antiPatterns, libraries) {
    let score = 0;

    // Complexity contribution (0-40 points)
    const maxComplexity = complexityMatches.reduce(
      (max, c) => Math.max(max, c.score),
      0
    );
    score += (maxComplexity / 7) * 40;

    // Anti-patterns contribution (0-30 points)
    const severityScores = { high: 10, medium: 5, low: 2 };
    const antiPatternScore = antiPatterns.reduce(
      (sum, ap) => sum + severityScores[ap.severity] * ap.count,
      0
    );
    score += Math.min(antiPatternScore, 30);

    // Heavy libraries contribution (0-30 points)
    const libraryScore = libraries.reduce((sum, lib) => sum + lib.size / 10, 0);
    score += Math.min(libraryScore, 30);

    return Math.min(Math.round(score), 100);
  }

  /**
   * Calculate repository-wide summary
   */
  calculateSummary(fileAnalyses) {
    const totalFiles = fileAnalyses.length;
    const totalLines = fileAnalyses.reduce((sum, f) => sum + f.lines, 0);

    const complexityDistribution = {};
    const totalAntiPatterns = [];
    const totalLibraries = [];

    fileAnalyses.forEach((file) => {
      // Complexity distribution
      const level = file.complexity.level;
      complexityDistribution[level] = (complexityDistribution[level] || 0) + 1;

      // Aggregate anti-patterns
      totalAntiPatterns.push(...file.antiPatterns);

      // Aggregate libraries
      totalLibraries.push(...file.heavyLibraries);
    });

    const avgEnergyScore =
      fileAnalyses.reduce((sum, f) => sum + f.energyScore, 0) / totalFiles;

    return {
      totalFiles,
      totalLines,
      averageEnergyScore: Math.round(avgEnergyScore),
      complexityDistribution,
      totalAntiPatterns: totalAntiPatterns.length,
      totalHeavyLibraries: totalLibraries.length,
      estimatedBundleSize: totalLibraries.reduce(
        (sum, lib) => sum + lib.size,
        0
      ),
      potentialSavings: totalLibraries.reduce(
        (sum, lib) => sum + lib.savings,
        0
      ),
    };
  }

  /**
   * Find worst offending files
   */
  findWorstOffenders(fileAnalyses, limit = 10) {
    return fileAnalyses
      .sort((a, b) => b.energyScore - a.energyScore)
      .slice(0, limit)
      .map((f) => ({
        path: f.path,
        energyScore: f.energyScore,
        complexity: f.complexity.level,
        issues: {
          antiPatterns: f.antiPatterns.length,
          heavyLibraries: f.heavyLibraries.length,
        },
      }));
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations(fileAnalyses) {
    const recommendations = [];

    // Library replacement recommendations
    const allLibraries = fileAnalyses.flatMap((f) => f.heavyLibraries);
    const uniqueLibraries = Array.from(
      new Set(allLibraries.map((l) => l.library))
    ).map((lib) => allLibraries.find((l) => l.library === lib));

    uniqueLibraries.forEach((lib) => {
      recommendations.push({
        priority: "high",
        type: "library-replacement",
        title: `Replace ${lib.library} with ${lib.alternative}`,
        description: lib.reason,
        impact: {
          sizeSavings: `${lib.savings} KB`,
          carbonSavings: `${lib.carbonSavings} kg CO2/month per 1000 users`,
        },
        effort: "medium",
      });
    });

    // Anti-pattern recommendations
    const allAntiPatterns = fileAnalyses.flatMap((f) => f.antiPatterns);
    const antiPatternGroups = {};
    allAntiPatterns.forEach((ap) => {
      antiPatternGroups[ap.type] = antiPatternGroups[ap.type] || {
        ...ap,
        count: 0,
      };
      antiPatternGroups[ap.type].count += ap.count;
    });

    Object.values(antiPatternGroups).forEach((ap) => {
      recommendations.push({
        priority: ap.severity,
        type: "anti-pattern",
        title: `Fix ${ap.type.replace(/_/g, " ").toLowerCase()} (${
          ap.count
        } occurrences)`,
        description: ap.suggestion,
        impact: {
          carbonImpact: ap.carbonImpact,
        },
        effort: "low",
      });
    });

    // Complexity recommendations
    const highComplexityFiles = fileAnalyses.filter(
      (f) => f.complexity.score >= 5
    );
    if (highComplexityFiles.length > 0) {
      recommendations.push({
        priority: "high",
        type: "complexity-reduction",
        title: `Optimize ${highComplexityFiles.length} files with O(n²) or worse complexity`,
        description:
          "Consider using more efficient algorithms or data structures",
        impact: {
          carbonImpact: "high",
          performanceGain: "significant",
        },
        effort: "high",
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Fetch repository files from GitHub
   */
  async fetchRepositoryFiles(owner, repo) {
    const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`;
    const response = await axios.get(url, {
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
    });

    return response.data.tree.filter((item) => item.type === "blob");
  }

  /**
   * Fetch file content from GitHub
   */
  async fetchFileContent(owner, repo, filePath) {
    try {
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
      const response = await axios.get(url, {
        headers: {
          Accept: "application/vnd.github.v3.raw",
        },
      });

      return response.data;
    } catch (error) {
      console.error(`Error fetching file ${filePath}:`, error.message);
      return null;
    }
  }

  /**
   * Check if file should be analyzed
   */
  isAnalyzableFile(path) {
    const extensions = [
      ".js",
      ".jsx",
      ".ts",
      ".tsx",
      ".py",
      ".java",
      ".cpp",
      ".c",
      ".go",
      ".rb",
      ".php",
    ];
    return extensions.some((ext) => path.endsWith(ext));
  }

  /**
   * Cache management
   */
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  clearCache() {
    this.cache.clear();
  }
}

module.exports = new ComplexityAnalyzerService();
