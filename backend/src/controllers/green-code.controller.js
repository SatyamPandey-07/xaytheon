const complexityAnalyzer = require("../services/complexity-analyzer.service");
const carbonCalculator = require("../services/carbon-calculator.service");
const greenRefactorBot = require("../services/green-refactor-bot.service");
const ecoBadgeService = require("../services/eco-badge.service");

/**
 * Green Code Optimizer Controller
 * Handles requests for carbon footprint analysis and green refactoring
 */

class GreenCodeController {
  /**
   * Analyze repository complexity
   */
  async analyzeComplexity(req, res) {
    try {
      const { owner, repo } = req.params;
      const analysis = await complexityAnalyzer.analyzeRepository(owner, repo);

      res.json({
        success: true,
        data: analysis,
      });
    } catch (error) {
      console.error("Error analyzing complexity:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Calculate carbon footprint
   */
  async calculateFootprint(req, res) {
    try {
      const { owner, repo } = req.params;
      const config = {
        avgExecutions: parseInt(req.query.executions) || 1000000,
        region: req.query.region || "us-east-1",
        instanceType: req.query.instanceType || "m5.large",
        pipelineSize: req.query.pipelineSize || "medium",
      };

      // Get complexity analysis first
      const complexityAnalysis = await complexityAnalyzer.analyzeRepository(
        owner,
        repo
      );

      // Calculate footprint
      const footprint = carbonCalculator.calculateRepositoryFootprint(
        complexityAnalysis,
        config
      );

      res.json({
        success: true,
        data: {
          ...footprint,
          complexity: complexityAnalysis.summary,
        },
      });
    } catch (error) {
      console.error("Error calculating footprint:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Compare cloud regions
   */
  async compareRegions(req, res) {
    try {
      const pipelineSize = req.query.pipelineSize || "medium";
      const comparison = carbonCalculator.compareRegions(pipelineSize);

      res.json({
        success: true,
        data: comparison,
      });
    } catch (error) {
      console.error("Error comparing regions:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get regions by category
   */
  async getRegionsByCategory(req, res) {
    try {
      const regions = carbonCalculator.getRegionsByCategory();

      res.json({
        success: true,
        data: regions,
      });
    } catch (error) {
      console.error("Error getting regions:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Generate refactoring suggestions
   */
  async generateRefactors(req, res) {
    try {
      const { owner, repo } = req.params;
      const suggestions = await greenRefactorBot.generateRefactorSuggestions(
        owner,
        repo
      );

      res.json({
        success: true,
        data: suggestions,
      });
    } catch (error) {
      console.error("Error generating refactors:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Generate refactoring plan
   */
  async generatePlan(req, res) {
    try {
      const { owner, repo } = req.params;

      // Get suggestions first
      const suggestions = await greenRefactorBot.generateRefactorSuggestions(
        owner,
        repo
      );

      // Flatten suggestions
      const allSuggestions = [
        ...suggestions.suggestions.library,
        ...suggestions.suggestions.algorithm,
        ...suggestions.suggestions.pattern,
        ...suggestions.suggestions.antiPattern,
      ];

      // Generate plan
      const plan = greenRefactorBot.generateRefactoringPlan(allSuggestions);

      res.json({
        success: true,
        data: plan,
      });
    } catch (error) {
      console.error("Error generating plan:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Generate sustainability rating
   */
  async generateRating(req, res) {
    try {
      const { owner, repo } = req.params;
      const config = {
        avgExecutions: parseInt(req.query.executions) || 1000000,
        region: req.query.region || "us-east-1",
        instanceType: req.query.instanceType || "m5.large",
        pipelineSize: req.query.pipelineSize || "medium",
      };

      const rating = await ecoBadgeService.generateRating(owner, repo, config);

      res.json({
        success: true,
        data: rating,
      });
    } catch (error) {
      console.error("Error generating rating:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get historical ratings
   */
  async getHistoricalRatings(req, res) {
    try {
      const { owner, repo } = req.params;
      const days = parseInt(req.query.days) || 30;

      const history = await ecoBadgeService.getHistoricalRatings(
        owner,
        repo,
        days
      );

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      console.error("Error getting historical ratings:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Compare with peer repositories
   */
  async compareWithPeers(req, res) {
    try {
      const { owner, repo } = req.params;
      const category = req.query.category || "javascript";

      // Get rating first
      const rating = await ecoBadgeService.generateRating(owner, repo);

      // Compare with peers
      const comparison = await ecoBadgeService.compareWithPeers(
        rating,
        category
      );

      res.json({
        success: true,
        data: comparison,
      });
    } catch (error) {
      console.error("Error comparing with peers:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Calculate optimization savings
   */
  async calculateSavings(req, res) {
    try {
      const { owner, repo } = req.params;
      const config = {
        avgExecutions: parseInt(req.query.executions) || 1000000,
        region: req.query.region || "us-east-1",
        instanceType: req.query.instanceType || "m5.large",
        pipelineSize: req.query.pipelineSize || "medium",
      };

      // Get complexity analysis
      const complexityAnalysis = await complexityAnalyzer.analyzeRepository(
        owner,
        repo
      );

      // Calculate current footprint
      const currentFootprint = carbonCalculator.calculateRepositoryFootprint(
        complexityAnalysis,
        config
      );

      // Calculate optimization savings
      const savings = carbonCalculator.calculateOptimizationSavings(
        currentFootprint,
        complexityAnalysis,
        {}
      );

      res.json({
        success: true,
        data: savings,
      });
    } catch (error) {
      console.error("Error calculating savings:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get comprehensive analysis (all-in-one endpoint)
   */
  async getComprehensiveAnalysis(req, res) {
    try {
      const { owner, repo } = req.params;
      const config = {
        avgExecutions: parseInt(req.query.executions) || 1000000,
        region: req.query.region || "us-east-1",
        instanceType: req.query.instanceType || "m5.large",
        pipelineSize: req.query.pipelineSize || "medium",
      };

      // Run all analyses in parallel
      const [rating, refactors, regionComparison] = await Promise.all([
        ecoBadgeService.generateRating(owner, repo, config),
        greenRefactorBot.generateRefactorSuggestions(owner, repo),
        carbonCalculator.compareRegions(config.pipelineSize),
      ]);

      res.json({
        success: true,
        data: {
          rating,
          refactors,
          regionComparison,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Error in comprehensive analysis:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Clear all caches
   */
  async clearCaches(req, res) {
    try {
      complexityAnalyzer.clearCache();

      res.json({
        success: true,
        message: "All caches cleared successfully",
      });
    } catch (error) {
      console.error("Error clearing caches:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}

module.exports = new GreenCodeController();
