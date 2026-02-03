/**
 * Carbon Calculator Service
 * Maps algorithmic complexity and cloud infrastructure to carbon emissions
 * Based on real-world cloud provider energy metrics
 */

// Cloud provider regions with carbon intensity (gCO2/kWh)
// Source: Cloud Carbon Footprint, Electricity Maps, IEA data
const CLOUD_REGIONS = {
  // AWS Regions
  "us-east-1": {
    name: "US East (N. Virginia)",
    provider: "AWS",
    carbonIntensity: 415.755, // gCO2/kWh
    energySource: "mixed (fossil-heavy)",
    renewablePercent: 28,
    category: "high-carbon",
  },
  "us-west-2": {
    name: "US West (Oregon)",
    provider: "AWS",
    carbonIntensity: 90.874,
    energySource: "hydro + wind",
    renewablePercent: 85,
    category: "low-carbon",
  },
  "eu-west-1": {
    name: "EU (Ireland)",
    provider: "AWS",
    carbonIntensity: 316.305,
    energySource: "mixed (gas-heavy)",
    renewablePercent: 43,
    category: "medium-carbon",
  },
  "eu-north-1": {
    name: "EU (Stockholm)",
    provider: "AWS",
    carbonIntensity: 8.349,
    energySource: "hydro + nuclear",
    renewablePercent: 98,
    category: "low-carbon",
  },
  "ap-southeast-2": {
    name: "Asia Pacific (Sydney)",
    provider: "AWS",
    carbonIntensity: 689.363,
    energySource: "coal-heavy",
    renewablePercent: 21,
    category: "high-carbon",
  },

  // Azure Regions
  "eastus": {
    name: "Azure East US",
    provider: "Azure",
    carbonIntensity: 415.755,
    energySource: "mixed (fossil-heavy)",
    renewablePercent: 28,
    category: "high-carbon",
  },
  "westus2": {
    name: "Azure West US 2",
    provider: "Azure",
    carbonIntensity: 90.874,
    energySource: "hydro + wind",
    renewablePercent: 85,
    category: "low-carbon",
  },
  "northeurope": {
    name: "Azure North Europe (Ireland)",
    provider: "Azure",
    carbonIntensity: 316.305,
    energySource: "mixed (gas-heavy)",
    renewablePercent: 43,
    category: "medium-carbon",
  },
  "swedencentral": {
    name: "Azure Sweden Central",
    provider: "Azure",
    carbonIntensity: 8.349,
    energySource: "hydro + nuclear",
    renewablePercent: 98,
    category: "low-carbon",
  },

  // GCP Regions
  "us-central1": {
    name: "GCP US Central (Iowa)",
    provider: "GCP",
    carbonIntensity: 479.384,
    energySource: "coal + gas",
    renewablePercent: 32,
    category: "high-carbon",
  },
  "us-west1": {
    name: "GCP US West (Oregon)",
    provider: "GCP",
    carbonIntensity: 90.874,
    energySource: "hydro + wind",
    renewablePercent: 85,
    category: "low-carbon",
  },
  "europe-north1": {
    name: "GCP Finland",
    provider: "GCP",
    carbonIntensity: 92.604,
    energySource: "hydro + nuclear + wind",
    renewablePercent: 83,
    category: "low-carbon",
  },
  "asia-east1": {
    name: "GCP Taiwan",
    provider: "GCP",
    carbonIntensity: 554.211,
    energySource: "coal + gas",
    renewablePercent: 6,
    category: "high-carbon",
  },
};

// Compute instance types and power consumption
const INSTANCE_TYPES = {
  "t2.micro": { vCPU: 1, memory: 1, watts: 3.5 },
  "t2.small": { vCPU: 1, memory: 2, watts: 5 },
  "t2.medium": { vCPU: 2, memory: 4, watts: 10 },
  "m5.large": { vCPU: 2, memory: 8, watts: 15 },
  "m5.xlarge": { vCPU: 4, memory: 16, watts: 30 },
  "c5.xlarge": { vCPU: 4, memory: 8, watts: 28 },
  "c5.2xlarge": { vCPU: 8, memory: 16, watts: 56 },
};

// Complexity to execution time mapping (relative units)
// Based on n = 10,000 operations
const COMPLEXITY_EXECUTION_TIME = {
  "O(1)": 0.001, // 1ms
  "O(log n)": 0.013, // 13ms
  "O(n)": 10, // 10ms
  "O(n log n)": 130, // 130ms
  "O(n²)": 100000, // 100 seconds
  "O(2^n)": 1e10, // effectively infinite for n=10000
  "O(n!)": 1e15, // practically impossible
};

// CI/CD pipeline typical configurations
const CICD_CONFIGS = {
  small: {
    buildsPerDay: 10,
    avgBuildTime: 5, // minutes
    instanceType: "t2.small",
    parallelJobs: 1,
  },
  medium: {
    buildsPerDay: 50,
    avgBuildTime: 10,
    instanceType: "m5.large",
    parallelJobs: 2,
  },
  large: {
    buildsPerDay: 200,
    avgBuildTime: 15,
    instanceType: "c5.xlarge",
    parallelJobs: 4,
  },
};

class CarbonCalculatorService {
  /**
   * Calculate carbon footprint for a repository
   */
  calculateRepositoryFootprint(
    complexityAnalysis,
    config = {
      avgExecutions: 1000000, // executions per month
      region: "us-east-1",
      instanceType: "m5.large",
      pipelineSize: "medium",
    }
  ) {
    const { summary, files } = complexityAnalysis;

    // Calculate runtime carbon emissions
    const runtimeEmissions = this.calculateRuntimeEmissions(
      files,
      config.avgExecutions,
      config.region,
      config.instanceType
    );

    // Calculate CI/CD carbon emissions
    const cicdEmissions = this.calculateCICDEmissions(
      config.region,
      config.pipelineSize
    );

    // Calculate bundle transfer emissions
    const transferEmissions = this.calculateTransferEmissions(
      summary.estimatedBundleSize,
      config.avgExecutions
    );

    const totalMonthly =
      runtimeEmissions.monthly + cicdEmissions.monthly + transferEmissions.monthly;

    return {
      timestamp: new Date().toISOString(),
      region: CLOUD_REGIONS[config.region],
      emissions: {
        runtime: runtimeEmissions,
        cicd: cicdEmissions,
        transfer: transferEmissions,
        total: {
          monthly: totalMonthly,
          yearly: totalMonthly * 12,
          perExecution: runtimeEmissions.perExecution,
        },
      },
      equivalents: this.calculateEquivalents(totalMonthly * 12),
      breakdown: this.calculateBreakdown(
        runtimeEmissions.monthly,
        cicdEmissions.monthly,
        transferEmissions.monthly
      ),
    };
  }

  /**
   * Calculate runtime execution emissions
   */
  calculateRuntimeEmissions(files, executions, region, instanceType) {
    const regionData = CLOUD_REGIONS[region];
    const instance = INSTANCE_TYPES[instanceType];

    // Calculate weighted average execution time based on file complexities
    const totalComplexityScore = files.reduce(
      (sum, f) => sum + (f.complexity.score || 1),
      0
    );
    const avgComplexity =
      files.reduce(
        (sum, f) =>
          sum +
          (COMPLEXITY_EXECUTION_TIME[f.complexity.level] || 1) *
            f.complexity.score,
        0
      ) / totalComplexityScore;

    // Energy consumption per execution (kWh)
    // watts * seconds / (1000 * 3600)
    const energyPerExecution = (instance.watts * (avgComplexity / 1000)) / 3600;

    // Carbon emissions per execution (kg CO2)
    const carbonPerExecution =
      (energyPerExecution * regionData.carbonIntensity) / 1000;

    // Monthly totals
    const monthlyEnergy = energyPerExecution * executions;
    const monthlyCarbon = carbonPerExecution * executions;

    return {
      perExecution: carbonPerExecution * 1000, // grams
      monthly: monthlyCarbon, // kg
      yearly: monthlyCarbon * 12,
      energy: {
        perExecution: energyPerExecution * 1000, // Wh
        monthly: monthlyEnergy, // kWh
      },
      avgExecutionTime: avgComplexity, // ms
    };
  }

  /**
   * Calculate CI/CD pipeline emissions
   */
  calculateCICDEmissions(region, pipelineSize) {
    const regionData = CLOUD_REGIONS[region];
    const pipeline = CICD_CONFIGS[pipelineSize];
    const instance = INSTANCE_TYPES[pipeline.instanceType];

    // Monthly builds
    const monthlyBuilds = pipeline.buildsPerDay * 30;

    // Energy per build (kWh)
    const energyPerBuild =
      (instance.watts * pipeline.avgBuildTime * 60 * pipeline.parallelJobs) /
      (1000 * 3600);

    // Monthly energy (kWh)
    const monthlyEnergy = energyPerBuild * monthlyBuilds;

    // Monthly carbon (kg CO2)
    const monthlyCarbon = (monthlyEnergy * regionData.carbonIntensity) / 1000;

    return {
      monthly: monthlyCarbon,
      yearly: monthlyCarbon * 12,
      perBuild: carbonPerBuild,
      energy: {
        perBuild: energyPerBuild,
        monthly: monthlyEnergy,
      },
      builds: {
        perDay: pipeline.buildsPerDay,
        monthly: monthlyBuilds,
      },
    };
  }

  /**
   * Calculate data transfer emissions
   * Based on network energy consumption for bundle downloads
   */
  calculateTransferEmissions(bundleSizeKB, monthlyUsers) {
    // Network energy: ~0.06 kWh per GB transferred
    const networkEnergyPerGB = 0.06;

    // Monthly data transfer (GB)
    const monthlyTransferGB = (bundleSizeKB * monthlyUsers) / (1024 * 1024);

    // Monthly energy (kWh)
    const monthlyEnergy = monthlyTransferGB * networkEnergyPerGB;

    // Assuming global average grid carbon intensity (475 gCO2/kWh)
    const globalAvgIntensity = 475;
    const monthlyCarbon = (monthlyEnergy * globalAvgIntensity) / 1000;

    return {
      monthly: monthlyCarbon,
      yearly: monthlyCarbon * 12,
      bundleSize: bundleSizeKB,
      transfers: monthlyUsers,
      energy: {
        monthly: monthlyEnergy,
      },
    };
  }

  /**
   * Calculate carbon equivalents for context
   */
  calculateEquivalents(yearlyKgCO2) {
    return {
      treesNeeded: Math.round(yearlyKgCO2 / 21), // 1 tree absorbs ~21kg CO2/year
      carMiles: Math.round(yearlyKgCO2 / 0.404), // 0.404 kg CO2 per mile
      flights: Math.round(yearlyKgCO2 / 90), // ~90kg CO2 per hour of flight
      smartphones: Math.round(yearlyKgCO2 / 0.008), // ~8g CO2 to charge smartphone
      coalBurned: (yearlyKgCO2 / 2.86).toFixed(2), // 2.86 kg CO2 per kg coal
    };
  }

  /**
   * Calculate emissions breakdown by percentage
   */
  calculateBreakdown(runtime, cicd, transfer) {
    const total = runtime + cicd + transfer;
    return {
      runtime: Math.round((runtime / total) * 100),
      cicd: Math.round((cicd / total) * 100),
      transfer: Math.round((transfer / total) * 100),
    };
  }

  /**
   * Compare regions for CI/CD carbon savings
   */
  compareRegions(pipelineSize = "medium") {
    const pipeline = CICD_CONFIGS[pipelineSize];
    const instance = INSTANCE_TYPES[pipeline.instanceType];
    const monthlyBuilds = pipeline.buildsPerDay * 30;
    const energyPerBuild =
      (instance.watts * pipeline.avgBuildTime * 60 * pipeline.parallelJobs) /
      (1000 * 3600);
    const monthlyEnergy = energyPerBuild * monthlyBuilds;

    const comparisons = [];

    for (const [regionId, regionData] of Object.entries(CLOUD_REGIONS)) {
      const monthlyCarbon = (monthlyEnergy * regionData.carbonIntensity) / 1000;

      comparisons.push({
        regionId,
        ...regionData,
        emissions: {
          monthly: monthlyCarbon,
          yearly: monthlyCarbon * 12,
        },
        energy: {
          monthly: monthlyEnergy,
        },
      });
    }

    // Sort by carbon emissions (lowest first)
    comparisons.sort((a, b) => a.emissions.monthly - b.emissions.monthly);

    // Calculate savings compared to worst region
    const worstRegion = comparisons[comparisons.length - 1];
    const bestRegion = comparisons[0];

    comparisons.forEach((region) => {
      region.savingsVsWorst = {
        monthly: worstRegion.emissions.monthly - region.emissions.monthly,
        yearly: worstRegion.emissions.yearly - region.emissions.yearly,
        percentage: Math.round(
          ((worstRegion.emissions.monthly - region.emissions.monthly) /
            worstRegion.emissions.monthly) *
            100
        ),
      };
    });

    return {
      comparisons,
      recommendation: {
        regionId: bestRegion.regionId,
        name: bestRegion.name,
        provider: bestRegion.provider,
        reason: `Lowest carbon intensity (${bestRegion.carbonIntensity.toFixed(
          1
        )} gCO2/kWh)`,
        savings: {
          vsWorst: worstRegion.emissions.yearly - bestRegion.emissions.yearly,
          percentage: Math.round(
            ((worstRegion.emissions.yearly - bestRegion.emissions.yearly) /
              worstRegion.emissions.yearly) *
              100
          ),
        },
      },
      insight: {
        bestRegion: bestRegion.regionId,
        worstRegion: worstRegion.regionId,
        maxSavings: worstRegion.emissions.yearly - bestRegion.emissions.yearly,
        maxSavingsPercentage: Math.round(
          ((worstRegion.emissions.yearly - bestRegion.emissions.yearly) /
            worstRegion.emissions.yearly) *
            100
        ),
      },
    };
  }

  /**
   * Calculate potential savings from optimization
   */
  calculateOptimizationSavings(
    currentFootprint,
    complexityAnalysis,
    optimizationScenarios
  ) {
    const savings = [];

    // Scenario 1: Replace heavy libraries
    if (complexityAnalysis.summary.potentialSavings > 0) {
      const bundleSavingsKB = complexityAnalysis.summary.potentialSavings;
      const transferSavings =
        (bundleSavingsKB /
          currentFootprint.emissions.transfer.bundleSize) *
        currentFootprint.emissions.transfer.yearly;

      savings.push({
        scenario: "Replace Heavy Libraries",
        type: "bundle-optimization",
        carbonSavings: {
          yearly: transferSavings,
          monthly: transferSavings / 12,
        },
        bundleSizeReduction: bundleSavingsKB,
        effort: "medium",
        impact: "high",
      });
    }

    // Scenario 2: Reduce complexity
    const highComplexityFiles = complexityAnalysis.files.filter(
      (f) => f.complexity.score >= 5
    );
    if (highComplexityFiles.length > 0) {
      // Assume 40% runtime reduction if optimized
      const runtimeSavings = currentFootprint.emissions.runtime.yearly * 0.4;

      savings.push({
        scenario: "Optimize High-Complexity Code",
        type: "algorithm-optimization",
        carbonSavings: {
          yearly: runtimeSavings,
          monthly: runtimeSavings / 12,
        },
        filesAffected: highComplexityFiles.length,
        effort: "high",
        impact: "high",
      });
    }

    // Scenario 3: Move to green region
    const currentRegion = currentFootprint.region;
    const regionComparison = this.compareRegions();
    const bestRegion = regionComparison.comparisons[0];

    if (currentRegion.carbonIntensity > bestRegion.carbonIntensity * 1.5) {
      const cicdSavings =
        currentFootprint.emissions.cicd.yearly *
        (1 - bestRegion.carbonIntensity / currentRegion.carbonIntensity);

      savings.push({
        scenario: `Move CI/CD to ${bestRegion.name}`,
        type: "region-migration",
        carbonSavings: {
          yearly: cicdSavings,
          monthly: cicdSavings / 12,
        },
        fromRegion: currentRegion.name,
        toRegion: bestRegion.name,
        effort: "low",
        impact: "medium",
      });
    }

    // Calculate total potential savings
    const totalYearlySavings = savings.reduce(
      (sum, s) => sum + s.carbonSavings.yearly,
      0
    );

    return {
      scenarios: savings,
      total: {
        yearly: totalYearlySavings,
        monthly: totalYearlySavings / 12,
        percentage: Math.round(
          (totalYearlySavings /
            currentFootprint.emissions.total.yearly) *
            100
        ),
      },
      equivalents: this.calculateEquivalents(totalYearlySavings),
    };
  }

  /**
   * Get all available regions grouped by category
   */
  getRegionsByCategory() {
    const grouped = {
      "low-carbon": [],
      "medium-carbon": [],
      "high-carbon": [],
    };

    for (const [regionId, data] of Object.entries(CLOUD_REGIONS)) {
      grouped[data.category].push({
        regionId,
        ...data,
      });
    }

    // Sort each category by carbon intensity
    Object.keys(grouped).forEach((category) => {
      grouped[category].sort(
        (a, b) => a.carbonIntensity - b.carbonIntensity
      );
    });

    return grouped;
  }
}

module.exports = new CarbonCalculatorService();
