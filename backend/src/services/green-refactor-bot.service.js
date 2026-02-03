/**
 * Green Refactor Bot Service
 * Automatically suggests energy-efficient code refactors
 */

const complexityAnalyzer = require('./complexity-analyzer.service');

// Green refactoring patterns with code transformations
const REFACTOR_PATTERNS = {
  // Replace moment with date-fns
  MOMENT_TO_DATEFNS: {
    pattern: /import\s+moment\s+from\s+['"]moment['"]/g,
    replacement: "import { format, parseISO } from 'date-fns'",
    description: "Replace moment.js with date-fns",
    carbonSavings: 0.138, // kg CO2/month per 1000 users
    confidence: "high",
    examples: [
      {
        before: "moment(date).format('YYYY-MM-DD')",
        after: "format(parseISO(date), 'yyyy-MM-dd')",
      },
      {
        before: "moment().add(7, 'days')",
        after: "import { addDays } from 'date-fns'; addDays(new Date(), 7)",
      },
    ],
  },

  // Replace lodash with native methods
  LODASH_TO_NATIVE: {
    pattern: /import\s+_\s+from\s+['"]lodash['"]/g,
    replacement: "// Use native Array methods instead",
    description: "Replace lodash with native JavaScript",
    carbonSavings: 0.028,
    confidence: "medium",
    examples: [
      {
        before: "_.map(array, fn)",
        after: "array.map(fn)",
      },
      {
        before: "_.filter(array, fn)",
        after: "array.filter(fn)",
      },
      {
        before: "_.find(array, fn)",
        after: "array.find(fn)",
      },
    ],
  },

  // Replace jQuery with vanilla JS
  JQUERY_TO_VANILLA: {
    pattern: /import\s+\$\s+from\s+['"]jquery['"]/g,
    replacement: "// Use native DOM APIs",
    description: "Replace jQuery with vanilla JavaScript",
    carbonSavings: 0.044,
    confidence: "high",
    examples: [
      {
        before: "$('#id')",
        after: "document.getElementById('id')",
      },
      {
        before: "$('.class')",
        after: "document.querySelectorAll('.class')",
      },
      {
        before: "$.ajax()",
        after: "fetch()",
      },
    ],
  },

  // Optimize nested loops to hash maps
  NESTED_LOOP_TO_HASHMAP: {
    pattern: /for\s*\([^)]*\)\s*\{[^}]*for\s*\([^)]*\)\s*\{[^}]*if\s*\([^)]*===\s*[^)]*\)/gs,
    replacement: null, // Context-dependent
    description: "Convert O(n²) nested loops to O(n) hash map lookup",
    carbonSavings: 0.05, // per optimization
    confidence: "medium",
    examples: [
      {
        before: `for (let i = 0; i < arr1.length; i++) {
  for (let j = 0; j < arr2.length; j++) {
    if (arr1[i].id === arr2[j].id) { /* match */ }
  }
}`,
        after: `const map = new Map(arr2.map(item => [item.id, item]));
for (let item of arr1) {
  if (map.has(item.id)) { /* match */ }
}`,
      },
    ],
  },

  // Move RegExp outside loop
  REGEX_OUTSIDE_LOOP: {
    pattern: /for\s*\([^)]*\)\s*\{[^}]*new\s+RegExp\(/gs,
    replacement: null,
    description: "Move RegExp compilation outside loop",
    carbonSavings: 0.01,
    confidence: "high",
    examples: [
      {
        before: `for (let str of strings) {
  const regex = new RegExp(pattern);
  if (regex.test(str)) { /* ... */ }
}`,
        after: `const regex = new RegExp(pattern);
for (let str of strings) {
  if (regex.test(str)) { /* ... */ }
}`,
      },
    ],
  },

  // Use array.push instead of concat in loops
  CONCAT_TO_PUSH: {
    pattern: /for\s*\([^)]*\)\s*\{[^}]*=\s*[^.]+\.concat\(/gs,
    replacement: null,
    description: "Use push() instead of concat() in loops",
    carbonSavings: 0.02,
    confidence: "high",
    examples: [
      {
        before: `for (let item of items) {
  result = result.concat([item]);
}`,
        after: `for (let item of items) {
  result.push(item);
}`,
      },
    ],
  },

  // Cache DOM queries
  CACHE_DOM_QUERIES: {
    pattern: /(document\.querySelector|document\.getElementById)[^;]*;[^]*\1/gs,
    replacement: null,
    description: "Cache repeated DOM queries",
    carbonSavings: 0.005,
    confidence: "medium",
    examples: [
      {
        before: `document.getElementById('btn').addEventListener('click', fn);
document.getElementById('btn').style.color = 'red';`,
        after: `const btn = document.getElementById('btn');
btn.addEventListener('click', fn);
btn.style.color = 'red';`,
      },
    ],
  },

  // Use async file operations
  ASYNC_FILE_OPS: {
    pattern: /fs\.(readFileSync|writeFileSync)/g,
    replacement: null,
    description: "Replace sync file operations with async",
    carbonSavings: 0.03,
    confidence: "high",
    examples: [
      {
        before: "const data = fs.readFileSync('file.txt', 'utf8');",
        after: "const data = await fs.promises.readFile('file.txt', 'utf8');",
      },
    ],
  },
};

// Algorithm optimization suggestions
const ALGORITHM_OPTIMIZATIONS = {
  "O(n²)": {
    alternatives: [
      {
        name: "Hash Map Lookup",
        complexity: "O(n)",
        description: "Use Map or Set for O(1) lookups instead of nested loops",
        speedup: "100x for n=10000",
        carbonSavings: "95%",
      },
      {
        name: "Sort + Two Pointers",
        complexity: "O(n log n)",
        description: "Sort array once, then use two-pointer technique",
        speedup: "10x for n=10000",
        carbonSavings: "90%",
      },
    ],
  },
  "O(2^n)": {
    alternatives: [
      {
        name: "Dynamic Programming",
        complexity: "O(n²) or O(n)",
        description: "Cache subproblem results to avoid recomputation",
        speedup: "1000x for n=20",
        carbonSavings: "99.9%",
      },
      {
        name: "Memoization",
        complexity: "O(n)",
        description: "Store previously computed values",
        speedup: "exponential improvement",
        carbonSavings: "99%",
      },
    ],
  },
  "O(n!)": {
    alternatives: [
      {
        name: "Greedy Algorithm",
        complexity: "O(n log n)",
        description: "Make locally optimal choices (if applicable)",
        speedup: "factorial improvement",
        carbonSavings: "99.99%",
      },
      {
        name: "Dynamic Programming",
        complexity: "O(n²)",
        description: "Build solution incrementally with memoization",
        speedup: "factorial improvement",
        carbonSavings: "99.9%",
      },
    ],
  },
};

class GreenRefactorBotService {
  /**
   * Generate comprehensive refactoring suggestions
   */
  async generateRefactorSuggestions(owner, repo) {
    try {
      // Get complexity analysis
      const analysis = await complexityAnalyzer.analyzeRepository(owner, repo);

      // Generate different types of suggestions
      const librarySuggestions = this.generateLibrarySuggestions(analysis);
      const algorithmSuggestions = this.generateAlgorithmSuggestions(analysis);
      const patternSuggestions = this.generatePatternSuggestions(analysis);
      const antiPatternFixes = this.generateAntiPatternFixes(analysis);

      // Calculate total impact
      const totalImpact = this.calculateTotalImpact([
        ...librarySuggestions,
        ...algorithmSuggestions,
        ...patternSuggestions,
        ...antiPatternFixes,
      ]);

      return {
        repository: `${owner}/${repo}`,
        timestamp: new Date().toISOString(),
        suggestions: {
          library: librarySuggestions,
          algorithm: algorithmSuggestions,
          pattern: patternSuggestions,
          antiPattern: antiPatternFixes,
        },
        summary: {
          totalSuggestions:
            librarySuggestions.length +
            algorithmSuggestions.length +
            patternSuggestions.length +
            antiPatternFixes.length,
          highPriority: this.countByPriority(
            [...librarySuggestions, ...algorithmSuggestions, ...patternSuggestions, ...antiPatternFixes],
            "high"
          ),
          estimatedCarbonSavings: totalImpact.carbonSavings,
          estimatedSpeedup: totalImpact.speedup,
        },
        quickWins: this.identifyQuickWins([
          ...librarySuggestions,
          ...patternSuggestions,
          ...antiPatternFixes,
        ]),
      };
    } catch (error) {
      console.error("Error generating refactor suggestions:", error);
      throw error;
    }
  }

  /**
   * Generate library replacement suggestions
   */
  generateLibrarySuggestions(analysis) {
    const suggestions = [];
    const allLibraries = analysis.files.flatMap((f) => f.heavyLibraries);

    // Group by library
    const libraryGroups = {};
    allLibraries.forEach((lib) => {
      libraryGroups[lib.library] = lib;
    });

    Object.values(libraryGroups).forEach((lib) => {
      const refactorPattern = REFACTOR_PATTERNS[`${lib.library.toUpperCase()}_TO_${lib.alternative.split(' ')[0].toUpperCase()}`] 
        || REFACTOR_PATTERNS.MOMENT_TO_DATEFNS;

      suggestions.push({
        id: `lib-${lib.library}`,
        type: "library-replacement",
        priority: "high",
        title: `Replace ${lib.library} with ${lib.alternative}`,
        description: lib.reason,
        impact: {
          bundleSizeReduction: `${lib.savings} KB`,
          carbonSavings: `${lib.carbonSavings} kg CO2/month per 1000 users`,
          performance: "improved",
        },
        effort: "medium",
        confidence: "high",
        examples: refactorPattern?.examples || [],
        automatable: true,
      });
    });

    return suggestions;
  }

  /**
   * Generate algorithm optimization suggestions
   */
  generateAlgorithmSuggestions(analysis) {
    const suggestions = [];

    // Find files with poor complexity
    const poorComplexityFiles = analysis.files.filter(
      (f) => f.complexity.score >= 5
    );

    poorComplexityFiles.forEach((file) => {
      const complexity = file.complexity.level;
      const optimizations = ALGORITHM_OPTIMIZATIONS[complexity];

      if (optimizations) {
        optimizations.alternatives.forEach((alt, idx) => {
          suggestions.push({
            id: `algo-${file.path}-${idx}`,
            type: "algorithm-optimization",
            priority: file.complexity.score >= 6 ? "high" : "medium",
            title: `Optimize ${complexity} algorithm in ${file.path}`,
            description: `Replace ${complexity} with ${alt.complexity} using ${alt.name}`,
            impact: {
              speedup: alt.speedup,
              carbonSavings: alt.carbonSavings,
              complexity: `${complexity} → ${alt.complexity}`,
            },
            effort: "high",
            confidence: "medium",
            details: alt.description,
            file: file.path,
            currentComplexity: complexity,
            suggestedComplexity: alt.complexity,
            automatable: false,
          });
        });
      }
    });

    return suggestions;
  }

  /**
   * Generate pattern-based refactoring suggestions
   */
  generatePatternSuggestions(analysis) {
    const suggestions = [];

    // Check files for refactorable patterns
    analysis.files.forEach((file) => {
      // This would require actual file content analysis
      // For now, base on detected anti-patterns
      if (file.antiPatterns && file.antiPatterns.length > 0) {
        file.antiPatterns.forEach((ap) => {
          const refactorPattern = this.findMatchingRefactorPattern(ap.type);
          if (refactorPattern) {
            suggestions.push({
              id: `pattern-${file.path}-${ap.type}`,
              type: "pattern-refactor",
              priority: ap.severity === "high" ? "high" : "medium",
              title: refactorPattern.description,
              description: ap.suggestion,
              impact: {
                carbonSavings: `${refactorPattern.carbonSavings} kg CO2/month`,
                performance: "improved",
              },
              effort: "low",
              confidence: refactorPattern.confidence,
              file: file.path,
              occurrences: ap.count,
              examples: refactorPattern.examples,
              automatable: true,
            });
          }
        });
      }
    });

    return suggestions;
  }

  /**
   * Generate anti-pattern fix suggestions
   */
  generateAntiPatternFixes(analysis) {
    const fixes = [];

    analysis.files.forEach((file) => {
      if (file.antiPatterns && file.antiPatterns.length > 0) {
        file.antiPatterns.forEach((ap) => {
          fixes.push({
            id: `fix-${file.path}-${ap.type}`,
            type: "anti-pattern-fix",
            priority: ap.severity,
            title: `Fix ${ap.type} in ${file.path}`,
            description: ap.suggestion,
            impact: {
              carbonImpact: ap.carbonImpact,
              performance: ap.severity === "high" ? "significant" : "moderate",
            },
            effort: "low",
            confidence: "high",
            file: file.path,
            occurrences: ap.count,
            automatable: false,
          });
        });
      }
    });

    return fixes;
  }

  /**
   * Find matching refactor pattern for anti-pattern
   */
  findMatchingRefactorPattern(antiPatternType) {
    const mapping = {
      NESTED_LOOPS: REFACTOR_PATTERNS.NESTED_LOOP_TO_HASHMAP,
      REGEX_IN_LOOP: REFACTOR_PATTERNS.REGEX_OUTSIDE_LOOP,
      ARRAY_CONCAT_IN_LOOP: REFACTOR_PATTERNS.CONCAT_TO_PUSH,
      MULTIPLE_DOM_QUERIES: REFACTOR_PATTERNS.CACHE_DOM_QUERIES,
      SYNC_FILE_OPERATIONS: REFACTOR_PATTERNS.ASYNC_FILE_OPS,
    };

    return mapping[antiPatternType] || null;
  }

  /**
   * Calculate total impact of all suggestions
   */
  calculateTotalImpact(suggestions) {
    let totalCarbonSavings = 0;
    const speedups = [];

    suggestions.forEach((s) => {
      // Extract carbon savings
      if (s.impact.carbonSavings) {
        const match = s.impact.carbonSavings.match(/[\d.]+/);
        if (match) {
          totalCarbonSavings += parseFloat(match[0]);
        }
      }

      // Extract speedup
      if (s.impact.speedup) {
        speedups.push(s.impact.speedup);
      }
    });

    return {
      carbonSavings: `${totalCarbonSavings.toFixed(2)} kg CO2/month`,
      speedup: speedups.length > 0 ? "significant" : "moderate",
    };
  }

  /**
   * Count suggestions by priority
   */
  countByPriority(suggestions, priority) {
    return suggestions.filter((s) => s.priority === priority).length;
  }

  /**
   * Identify quick wins (high impact, low effort)
   */
  identifyQuickWins(suggestions) {
    return suggestions
      .filter((s) => {
        const highImpact =
          s.priority === "high" ||
          (s.impact.carbonSavings && parseFloat(s.impact.carbonSavings) > 0.02);
        const lowEffort = s.effort === "low" || s.effort === "medium";
        return highImpact && lowEffort && s.automatable;
      })
      .slice(0, 5)
      .map((s) => ({
        id: s.id,
        title: s.title,
        impact: s.impact,
        effort: s.effort,
        automatable: s.automatable,
      }));
  }

  /**
   * Generate detailed refactoring plan
   */
  generateRefactoringPlan(suggestions) {
    const plan = {
      immediate: [],
      shortTerm: [],
      longTerm: [],
    };

    suggestions.forEach((s) => {
      const item = {
        ...s,
        estimatedTime: this.estimateImplementationTime(s),
      };

      if (s.priority === "high" && s.effort === "low") {
        plan.immediate.push(item);
      } else if (s.priority === "high" || s.effort === "medium") {
        plan.shortTerm.push(item);
      } else {
        plan.longTerm.push(item);
      }
    });

    return {
      ...plan,
      summary: {
        immediateActions: plan.immediate.length,
        shortTermActions: plan.shortTerm.length,
        longTermActions: plan.longTerm.length,
        totalEstimatedTime: this.calculateTotalTime(plan),
      },
    };
  }

  /**
   * Estimate implementation time
   */
  estimateImplementationTime(suggestion) {
    const baseTime = {
      low: 1, // 1 hour
      medium: 4, // 4 hours
      high: 16, // 2 days
    };

    const time = baseTime[suggestion.effort] || 4;
    return `${time} hour${time > 1 ? "s" : ""}`;
  }

  /**
   * Calculate total implementation time
   */
  calculateTotalTime(plan) {
    const parseTime = (timeStr) => parseInt(timeStr.match(/\d+/)[0]);

    const immediate = plan.immediate.reduce(
      (sum, item) => sum + parseTime(item.estimatedTime),
      0
    );
    const shortTerm = plan.shortTerm.reduce(
      (sum, item) => sum + parseTime(item.estimatedTime),
      0
    );
    const longTerm = plan.longTerm.reduce(
      (sum, item) => sum + parseTime(item.estimatedTime),
      0
    );

    const total = immediate + shortTerm + longTerm;
    return `${total} hours (${Math.ceil(total / 8)} days)`;
  }
}

module.exports = new GreenRefactorBotService();
