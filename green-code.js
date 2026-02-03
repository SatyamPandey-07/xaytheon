// Green Code Optimizer - Client-side JavaScript

const API_BASE = "/api/green-code";

let currentData = null;
let currentTab = "all";

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
});

function setupEventListeners() {
  document.getElementById("analyzeBtn").addEventListener("click", analyzeRepository);

  // Tab switching
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // Modal
  document.getElementById("exportBadgeBtn")?.addEventListener("click", showBadgeModal);
  document.getElementById("exportReportBtn")?.addEventListener("click", exportReport);

  const modal = document.getElementById("badgeModal");
  const closeBtn = modal?.querySelector(".close");
  closeBtn?.addEventListener("click", () => modal.classList.add("hidden"));

  // Copy buttons
  document.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", () => copyToClipboard(btn.dataset.target));
  });
}

async function analyzeRepository() {
  const owner = document.getElementById("ownerInput").value.trim();
  const repo = document.getElementById("repoInput").value.trim();
  const region = document.getElementById("regionSelect").value;
  const pipelineSize = document.getElementById("pipelineSizeSelect").value;

  if (!owner || !repo) {
    alert("Please enter repository owner and name");
    return;
  }

  // Show loading
  document.getElementById("loadingOverlay").classList.remove("hidden");
  document.getElementById("results").classList.add("hidden");

  try {
    // Parallel API calls
    const [ratingData, refactorsData, regionComparison] = await Promise.all([
      fetch(`${API_BASE}/rating/${owner}/${repo}?region=${region}&pipelineSize=${pipelineSize}`).then((r) =>
        r.json()
      ),
      fetch(`${API_BASE}/refactors/${owner}/${repo}`).then((r) => r.json()),
      fetch(`${API_BASE}/regions/compare?pipelineSize=${pipelineSize}`).then((r) => r.json()),
    ]);

    currentData = {
      rating: ratingData.data,
      refactors: refactorsData.data,
      regions: regionComparison.data,
    };

    renderResults();
  } catch (error) {
    console.error("Error analyzing repository:", error);
    alert("Failed to analyze repository. Please try again.");
  } finally {
    document.getElementById("loadingOverlay").classList.add("hidden");
  }
}

function renderResults() {
  document.getElementById("results").classList.remove("hidden");

  const { rating, refactors, regions } = currentData;

  // Rating Card
  renderRating(rating);

  // Carbon Footprint
  renderCarbonFootprint(rating.carbonFootprint);

  // Equivalents
  renderEquivalents(rating.carbonFootprint.equivalents);

  // Code Complexity
  renderComplexity(rating.scores.codeComplexity);

  // Bundle Size
  renderBundleSize(rating.scores.bundleSize, rating.summary.bundleSize);

  // Region Comparison
  renderRegionComparison(regions);

  // Refactors
  renderRefactors(refactors);

  // Roadmap
  renderRoadmap(rating.roadmap);

  // Score Breakdown
  renderScoreBreakdown(rating.scores);
}

function renderRating(rating) {
  const badge = document.getElementById("ratingBadge");
  badge.querySelector(".rating-icon").textContent = rating.rating.icon;
  badge.querySelector(".rating-grade").textContent = rating.rating.grade;
  badge.querySelector(".rating-score").textContent = `${rating.rating.score}/100`;
  badge.style.borderColor = rating.rating.color;
  badge.style.background = `${rating.rating.color}20`;

  document.getElementById("ratingDescription").textContent = rating.rating.description;

  // Achievements
  const achievementsEl = document.getElementById("achievements");
  achievementsEl.innerHTML = "";

  rating.achievements.forEach((achievement) => {
    const achEl = document.createElement("div");
    achEl.className = "achievement earned";
    achEl.innerHTML = `
      <span class="icon">${achievement.icon}</span>
      <span class="name">${achievement.name}</span>
    `;
    achEl.title = achievement.description;
    achievementsEl.appendChild(achEl);
  });

  // Show potential achievements
  rating.potentialAchievements.slice(0, 3).forEach((achievement) => {
    const achEl = document.createElement("div");
    achEl.className = "achievement";
    achEl.innerHTML = `
      <span class="icon" style="opacity: 0.4">${achievement.icon}</span>
      <span class="name" style="opacity: 0.6">${achievement.name}</span>
    `;
    achEl.title = `🔒 ${achievement.description}`;
    achievementsEl.appendChild(achEl);
  });
}

function renderCarbonFootprint(footprint) {
  document.getElementById("carbonTotal").textContent = footprint.yearly.toFixed(1);

  // Breakdown (assuming we have breakdown data)
  const total = footprint.yearly;
  const runtime = total * 0.6; // Placeholder
  const cicd = total * 0.3;
  const transfer = total * 0.1;

  const runtimePercent = Math.round((runtime / total) * 100);
  const cicdPercent = Math.round((cicd / total) * 100);
  const transferPercent = Math.round((transfer / total) * 100);

  document.getElementById("runtimeBar").style.width = `${runtimePercent}%`;
  document.getElementById("cicdBar").style.width = `${cicdPercent}%`;
  document.getElementById("transferBar").style.width = `${transferPercent}%`;

  document.getElementById("runtimePercent").textContent = `${runtimePercent}%`;
  document.getElementById("cicdPercent").textContent = `${cicdPercent}%`;
  document.getElementById("transferPercent").textContent = `${transferPercent}%`;
}

function renderEquivalents(equivalents) {
  document.getElementById("treesEquivalent").textContent = equivalents.treesNeeded.toLocaleString();
  document.getElementById("carMiles").textContent = equivalents.carMiles.toLocaleString();
  document.getElementById("flights").textContent = equivalents.flights.toLocaleString();
  document.getElementById("smartphones").textContent = equivalents.smartphones.toLocaleString();
}

function renderComplexity(complexity) {
  const score = complexity.score;
  document.getElementById("complexityScore").textContent = score;

  // Update circle
  const circumference = 2 * Math.PI * 40; // radius = 40
  const offset = circumference - (score / 100) * circumference;
  document.getElementById("complexityCircle").style.strokeDashoffset = offset;

  // Color based on score
  const circle = document.getElementById("complexityCircle");
  if (score >= 80) circle.style.stroke = "var(--green-primary)";
  else if (score >= 60) circle.style.stroke = "var(--yellow-warning)";
  else circle.style.stroke = "var(--red-alert)";

  document.getElementById("avgEnergyScore").textContent = complexity.details.avgEnergyScore;
  document.getElementById("worstComplexity").textContent = complexity.details.worstComplexity || "O(n)";
}

function renderBundleSize(bundleScore, bundleSize) {
  document.getElementById("bundleSize").textContent = bundleSize.toFixed(0);
  document.getElementById("bundleSavings").textContent = `${bundleScore.details.potentialSavings} KB`;
  document.getElementById("heavyLibs").textContent = "0"; // Would come from data

  const percentage = Math.min(100, (bundleSize / 500) * 100);
  document.getElementById("bundleProgress").style.width = `${percentage}%`;

  // Color based on size
  const progress = document.getElementById("bundleProgress");
  if (bundleSize < 100) progress.style.background = "var(--green-primary)";
  else if (bundleSize < 300) progress.style.background = "var(--yellow-warning)";
  else progress.style.background = "var(--red-alert)";
}

function renderRegionComparison(regions) {
  const grid = document.getElementById("regionGrid");
  grid.innerHTML = "";

  regions.comparisons.slice(0, 6).forEach((region) => {
    const item = document.createElement("div");
    item.className = `region-item ${region.category}`;
    item.innerHTML = `
      <div class="region-name">${region.name}</div>
      <div class="region-details">
        <div>🏭 ${region.carbonIntensity.toFixed(1)} gCO₂/kWh</div>
        <div>♻️ ${region.renewablePercent}% renewable</div>
        <div>💰 Save ${region.savingsVsWorst.yearly.toFixed(1)} kg CO₂/year</div>
      </div>
    `;
    grid.appendChild(item);
  });
}

function renderRefactors(refactors) {
  const allSuggestions = [
    ...refactors.suggestions.library,
    ...refactors.suggestions.algorithm,
    ...refactors.suggestions.pattern,
    ...refactors.suggestions.antiPattern,
  ];

  document.getElementById("refactorCount").textContent = `${allSuggestions.length} suggestions`;
  document.getElementById("refactorSavings").textContent = refactors.summary.estimatedCarbonSavings;

  filterAndRenderRefactors(allSuggestions);
}

function filterAndRenderRefactors(suggestions) {
  const list = document.getElementById("refactorsList");
  list.innerHTML = "";

  const filtered =
    currentTab === "all"
      ? suggestions
      : suggestions.filter((s) => s.type.includes(currentTab));

  filtered.forEach((suggestion) => {
    const item = document.createElement("div");
    item.className = `refactor-item priority-${suggestion.priority}`;
    item.innerHTML = `
      <div class="refactor-header">
        <div class="refactor-title">${suggestion.title}</div>
        <div class="refactor-tags">
          <span class="tag priority">${suggestion.priority}</span>
          <span class="tag effort">${suggestion.effort}</span>
        </div>
      </div>
      <div class="refactor-description">${suggestion.description}</div>
      <div class="refactor-impact">
        ${renderImpact(suggestion.impact)}
      </div>
    `;
    list.appendChild(item);
  });

  if (filtered.length === 0) {
    list.innerHTML = '<p style="text-align: center; color: var(--text-secondary)">No suggestions in this category</p>';
  }
}

function renderImpact(impact) {
  let html = "";
  if (impact.carbonSavings) {
    html += `<div class="impact-item">💨 ${impact.carbonSavings}</div>`;
  }
  if (impact.bundleSizeReduction) {
    html += `<div class="impact-item">📦 ${impact.bundleSizeReduction}</div>`;
  }
  if (impact.speedup) {
    html += `<div class="impact-item">⚡ ${impact.speedup}</div>`;
  }
  if (impact.complexity) {
    html += `<div class="impact-item">🧮 ${impact.complexity}</div>`;
  }
  return html;
}

function switchTab(tab) {
  currentTab = tab;

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });

  if (currentData) {
    const allSuggestions = [
      ...currentData.refactors.suggestions.library,
      ...currentData.refactors.suggestions.algorithm,
      ...currentData.refactors.suggestions.pattern,
      ...currentData.refactors.suggestions.antiPattern,
    ];
    filterAndRenderRefactors(allSuggestions);
  }
}

function renderRoadmap(roadmap) {
  renderActions("immediateActions", roadmap.improvements.filter((i) => i.priority === "high").slice(0, 5));
  renderActions(
    "shortTermActions",
    roadmap.improvements.filter((i) => i.priority === "medium").slice(0, 5)
  );
  renderActions("longTermActions", roadmap.improvements.filter((i) => i.priority === "low").slice(0, 5));
}

function renderActions(containerId, actions) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  if (actions.length === 0) {
    container.innerHTML = '<p style="color: var(--text-secondary)">No actions in this phase</p>';
    return;
  }

  actions.forEach((action) => {
    const item = document.createElement("div");
    item.className = "action-item";
    item.innerHTML = `
      <div class="action-title">${action.category}</div>
      <div class="action-details">
        Target: +${action.targetScore - action.currentScore} points | 
        Impact: ${action.estimatedImpact}
      </div>
    `;
    container.appendChild(item);
  });
}

function renderScoreBreakdown(scores) {
  const container = document.getElementById("scoreBreakdown");
  container.innerHTML = "";

  Object.entries(scores).forEach(([category, data]) => {
    const categoryEl = document.createElement("div");
    categoryEl.className = "score-category";
    categoryEl.innerHTML = `
      <div class="category-header">
        <span class="category-name">${formatCategoryName(category)}</span>
        <span class="category-score">${data.score}/100</span>
      </div>
      <div class="category-bar">
        <div class="category-fill" style="width: ${data.score}%"></div>
      </div>
    `;
    container.appendChild(categoryEl);
  });
}

function formatCategoryName(name) {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function showBadgeModal() {
  if (!currentData) return;

  const modal = document.getElementById("badgeModal");
  const badge = currentData.rating.badge;

  document.getElementById("badgePreview").innerHTML = badge.svg;
  document.getElementById("badgeMarkdown").textContent = badge.markdown;
  document.getElementById("badgeSVG").textContent = badge.svg;

  modal.classList.remove("hidden");
}

function copyToClipboard(targetId) {
  const text = document.getElementById(targetId).textContent;
  navigator.clipboard.writeText(text).then(() => {
    alert("Copied to clipboard!");
  });
}

function exportReport() {
  if (!currentData) return;

  const report = {
    repository: currentData.rating.repository,
    timestamp: currentData.rating.timestamp,
    rating: currentData.rating.rating,
    carbonFootprint: currentData.rating.carbonFootprint,
    summary: currentData.rating.summary,
    refactors: currentData.refactors.summary,
    roadmap: currentData.rating.roadmap,
  };

  const blob = new Blob([JSON.stringify(report, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `green-code-report-${new Date().toISOString().split("T")[0]}.json`;
  a.click();
}
