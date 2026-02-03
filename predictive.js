/**
 * Predictive Analytics Dashboard
 * Main JavaScript for forecasting, velocity tracking, and burnout detection
 */

const API_BASE = 'http://localhost:5001/api';

let currentRepo = null;
let currentOwner = null;
let velocityChart = null;
let ganttChart = null;
let burndownChart = null;
let simulationPanel = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    loadNavbar();
    initializeEventListeners();
});

function initializeEventListeners() {
    document.getElementById('load-analytics').addEventListener('click', loadAnalytics);
    document.getElementById('forecast-btn').addEventListener('click', forecastMilestone);
    document.getElementById('burndown-btn').addEventListener('click', generateBurndown);
}

async function loadAnalytics() {
    const owner = document.getElementById('repo-owner').value.trim();
    const repo = document.getElementById('repo-name').value.trim();

    if (!owner || !repo) {
        alert('Please enter both repository owner and name');
        return;
    }

    currentOwner = owner;
    currentRepo = repo;

    // Show loading state
    showLoading();

    try {
        // Load all metrics in parallel
        await Promise.all([
            loadProjectHealth(),
            loadVelocityData(),
            loadBottlenecks()
        ]);

        // Show all sections
        showSections();

        // Initialize simulation panel
        const velocity = await getVelocity();
        simulationPanel = new SimulationPanel('simulation-panel', velocity);

    } catch (error) {
        console.error('Error loading analytics:', error);
        alert('Failed to load analytics. Please check repository name and try again.');
    } finally {
        hideLoading();
    }
}

function showSections() {
    document.getElementById('project-health').style.display = 'block';
    document.getElementById('velocity-section').style.display = 'block';
    document.getElementById('milestone-section').style.display = 'block';
    document.getElementById('simulator-section').style.display = 'block';
    document.getElementById('burnout-section').style.display = 'block';
    document.getElementById('burndown-section').style.display = 'block';
    document.getElementById('bottleneck-section').style.display = 'block';
}

async function loadProjectHealth() {
    try {
        const response = await fetch(
            `${API_BASE}/predictive/health?owner=${currentOwner}&repo=${currentRepo}`
        );

        if (!response.ok) throw new Error('Failed to load project health');

        const data = await response.json();
        displayProjectHealth(data.data);
    } catch (error) {
        console.error('Error loading project health:', error);
        displayProjectHealthError();
    }
}

function displayProjectHealth(health) {
    // Velocity
    document.getElementById('velocity-current').textContent = 
        `${health.velocity.current.toFixed(1)} issues/week`;
    
    const trendElement = document.getElementById('velocity-trend');
    trendElement.textContent = health.velocity.trend;
    trendElement.className = `metric-trend ${health.velocity.trend}`;

    // Confidence
    document.getElementById('velocity-confidence').textContent = 
        `${Math.round(health.velocity.confidence * 100)}%`;

    // Bottlenecks
    document.getElementById('bottleneck-count').textContent = health.bottlenecks.count;
    document.getElementById('bottleneck-status').textContent = 
        health.bottlenecks.critical ? 'Critical issues detected' : 'Under control';

    // Burnout Risk (placeholder)
    document.getElementById('burnout-risk').textContent = 'Low';
}

function displayProjectHealthError() {
    document.getElementById('velocity-current').textContent = 'N/A';
    document.getElementById('velocity-trend').textContent = 'Unable to load';
    document.getElementById('velocity-confidence').textContent = 'N/A';
    document.getElementById('bottleneck-count').textContent = 'N/A';
    document.getElementById('bottleneck-status').textContent = 'Error';
    document.getElementById('burnout-risk').textContent = 'N/A';
}

async function getVelocity() {
    try {
        const response = await fetch(
            `${API_BASE}/predictive/velocity?owner=${currentOwner}&repo=${currentRepo}`
        );

        if (!response.ok) throw new Error('Failed to get velocity');

        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error getting velocity:', error);
        return null;
    }
}

async function loadVelocityData() {
    try {
        const velocity = await getVelocity();
        
        if (!velocity) {
            throw new Error('No velocity data available');
        }

        displayVelocityChart(velocity);
        displayVelocityInsights(velocity);
    } catch (error) {
        console.error('Error loading velocity data:', error);
    }
}

function displayVelocityChart(velocity) {
    const ctx = document.getElementById('velocity-chart').getContext('2d');

    if (velocityChart) {
        velocityChart.destroy();
    }

    // Generate historical data (in production, this would come from API)
    const weeks = [];
    const velocityData = [];
    const trendData = [];

    for (let i = 7; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - (i * 7));
        weeks.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        
        // Simulate historical velocity with trend
        const baseValue = velocity.current * (1 + (Math.random() - 0.5) * 0.3);
        velocityData.push(Math.round(baseValue * 10) / 10);
        
        // Linear trend
        const trendValue = velocity.current + (velocity.trendSlope || 0) * (7 - i);
        trendData.push(Math.round(trendValue * 10) / 10);
    }

    velocityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: weeks,
            datasets: [
                {
                    label: 'Actual Velocity',
                    data: velocityData,
                    borderColor: 'rgba(102, 126, 234, 1)',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Trend',
                    data: trendData,
                    borderColor: 'rgba(239, 68, 68, 1)',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    tension: 0.1,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                title: {
                    display: true,
                    text: 'Team Velocity Over Time',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Issues Closed per Week'
                    }
                }
            }
        }
    });
}

function displayVelocityInsights(velocity) {
    const insightsList = document.getElementById('velocity-insights-list');
    const insights = [];

    // Generate AI insights based on velocity data
    if (velocity.trend === 'improving') {
        insights.push('✅ Team velocity is improving - great momentum!');
    } else if (velocity.trend === 'declining') {
        insights.push('⚠️ Team velocity is declining - investigate potential blockers');
    } else {
        insights.push('📊 Team velocity is stable - consistent performance');
    }

    if (velocity.confidence > 0.7) {
        insights.push('🎯 High confidence in predictions based on robust historical data');
    } else if (velocity.confidence < 0.4) {
        insights.push('⚠️ Low confidence - need more historical data for accurate predictions');
    }

    if (velocity.current > 15) {
        insights.push('🚀 High velocity detected - team is highly productive');
    } else if (velocity.current < 5) {
        insights.push('🐌 Low velocity - consider identifying bottlenecks');
    }

    insightsList.innerHTML = insights.map(insight => `<li>${insight}</li>`).join('');
}

async function forecastMilestone() {
    const milestone = document.getElementById('milestone-name').value.trim();
    const remainingIssues = parseInt(document.getElementById('remaining-issues').value);
    const remainingPoints = parseInt(document.getElementById('remaining-points').value) || null;

    if (!milestone || !remainingIssues) {
        alert('Please enter milestone name and remaining issues');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/predictive/forecast/milestone`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                owner: currentOwner,
                repo: currentRepo,
                milestone,
                remainingIssues,
                remainingPoints
            })
        });

        if (!response.ok) throw new Error('Failed to forecast milestone');

        const data = await response.json();
        displayForecast(data.data);
    } catch (error) {
        console.error('Error forecasting milestone:', error);
        alert('Failed to generate forecast. Please try again.');
    }
}

function displayForecast(forecast) {
    document.getElementById('forecast-result').style.display = 'block';

    // Display ETA
    const etaDate = new Date(forecast.estimatedCompletion);
    document.getElementById('eta-date').textContent = 
        etaDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });

    // Display range
    const optimisticDate = new Date(forecast.optimisticDate);
    const pessimisticDate = new Date(forecast.pessimisticDate);
    document.getElementById('eta-optimistic').textContent = 
        optimisticDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    document.getElementById('eta-pessimistic').textContent = 
        pessimisticDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // Display duration
    document.getElementById('eta-weeks').textContent = `${forecast.weeksToComplete} weeks`;

    // Display confidence
    const confidencePercent = Math.round(forecast.confidence * 100);
    document.getElementById('forecast-confidence-bar').style.width = `${confidencePercent}%`;
    document.getElementById('forecast-confidence-text').textContent = `${confidencePercent}% confidence`;

    // Draw Gantt chart
    drawGanttChart(forecast);
}

function drawGanttChart(forecast) {
    const ctx = document.getElementById('gantt-chart').getContext('2d');

    if (ganttChart) {
        ganttChart.destroy();
    }

    const startDate = new Date();
    const etaDate = new Date(forecast.estimatedCompletion);
    const optimisticDate = new Date(forecast.optimisticDate);
    const pessimisticDate = new Date(forecast.pessimisticDate);

    const weeks = [];
    let currentDate = new Date(startDate);
    while (currentDate <= pessimisticDate) {
        weeks.push(currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        currentDate.setDate(currentDate.getDate() + 7);
    }

    ganttChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Timeline'],
            datasets: [
                {
                    label: 'Optimistic',
                    data: [Math.ceil((optimisticDate - startDate) / (7 * 24 * 60 * 60 * 1000))],
                    backgroundColor: 'rgba(16, 185, 129, 0.6)',
                    borderColor: 'rgba(16, 185, 129, 1)',
                    borderWidth: 2
                },
                {
                    label: 'Expected',
                    data: [Math.ceil((etaDate - startDate) / (7 * 24 * 60 * 60 * 1000))],
                    backgroundColor: 'rgba(102, 126, 234, 0.6)',
                    borderColor: 'rgba(102, 126, 234, 1)',
                    borderWidth: 2
                },
                {
                    label: 'Pessimistic',
                    data: [Math.ceil((pessimisticDate - startDate) / (7 * 24 * 60 * 60 * 1000))],
                    backgroundColor: 'rgba(239, 68, 68, 0.6)',
                    borderColor: 'rgba(239, 68, 68, 1)',
                    borderWidth: 2
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                title: {
                    display: true,
                    text: 'Completion Timeline',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Weeks from Now'
                    }
                }
            }
        }
    });
}

async function loadBottlenecks() {
    try {
        const response = await fetch(
            `${API_BASE}/predictive/bottlenecks?owner=${currentOwner}&repo=${currentRepo}`
        );

        if (!response.ok) throw new Error('Failed to load bottlenecks');

        const data = await response.json();
        displayBottlenecks(data.data);
    } catch (error) {
        console.error('Error loading bottlenecks:', error);
    }
}

function displayBottlenecks(bottlenecks) {
    const grid = document.getElementById('bottleneck-grid');

    const bottleneckArray = Object.entries(bottlenecks).map(([key, value]) => ({
        key,
        ...value
    }));

    if (bottleneckArray.length === 0) {
        grid.innerHTML = '<p class="loading-message">No bottlenecks detected - workflow is healthy! 🎉</p>';
        return;
    }

    grid.innerHTML = bottleneckArray.map(bottleneck => `
        <div class="bottleneck-card severity-${bottleneck.severity}">
            <div class="bottleneck-header">
                <div class="bottleneck-title">${formatBottleneckTitle(bottleneck.key)}</div>
                <span class="severity-badge severity-${bottleneck.severity}">${bottleneck.severity}</span>
            </div>
            <div class="bottleneck-description">${bottleneck.description}</div>
            ${bottleneck.metrics ? `
                <div class="bottleneck-metrics">
                    ${Object.entries(bottleneck.metrics).map(([key, value]) => `
                        <div class="bottleneck-metric">
                            <div class="bottleneck-metric-label">${formatMetricLabel(key)}</div>
                            <div class="bottleneck-metric-value">${value}</div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `).join('');
}

function formatBottleneckTitle(key) {
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
}

function formatMetricLabel(key) {
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
}

async function generateBurndown() {
    const sprintStart = document.getElementById('sprint-start').value;
    const sprintEnd = document.getElementById('sprint-end').value;
    const totalPoints = parseInt(document.getElementById('total-points').value);

    if (!sprintStart || !sprintEnd || !totalPoints) {
        alert('Please fill in all sprint details');
        return;
    }

    try {
        const response = await fetch(
            `${API_BASE}/predictive/burndown?owner=${currentOwner}&repo=${currentRepo}&sprintStart=${sprintStart}&sprintEnd=${sprintEnd}&totalPoints=${totalPoints}`
        );

        if (!response.ok) throw new Error('Failed to generate burndown');

        const data = await response.json();
        displayBurndown(data.data);
    } catch (error) {
        console.error('Error generating burndown:', error);
        alert('Failed to generate burndown chart. Please try again.');
    }
}

function displayBurndown(burndown) {
    document.getElementById('burndown-result').style.display = 'block';

    const ctx = document.getElementById('burndown-chart').getContext('2d');

    if (burndownChart) {
        burndownChart.destroy();
    }

    const labels = burndown.daily.map(d => 
        new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    );
    const actualData = burndown.daily.map(d => d.remaining);
    const idealData = burndown.daily.map(d => d.ideal);

    burndownChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Actual Burndown',
                    data: actualData,
                    borderColor: 'rgba(102, 126, 234, 1)',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Ideal Burndown',
                    data: idealData,
                    borderColor: 'rgba(16, 185, 129, 1)',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                title: {
                    display: true,
                    text: 'Sprint Burndown',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Story Points Remaining'
                    }
                }
            }
        }
    });

    // Display status
    displayBurndownStatus(burndown);
}

function displayBurndownStatus(burndown) {
    const statusDiv = document.getElementById('burndown-status');
    
    const statusHtml = `
        <h3>Sprint Status</h3>
        <div class="status-grid">
            <div class="status-item">
                <div class="status-label">Status</div>
                <div class="status-value">${burndown.status}</div>
            </div>
            <div class="status-item">
                <div class="status-label">Remaining Points</div>
                <div class="status-value">${burndown.remaining}</div>
            </div>
            <div class="status-item">
                <div class="status-label">Projected Completion</div>
                <div class="status-value">${new Date(burndown.projectedCompletion).toLocaleDateString()}</div>
            </div>
            <div class="status-item">
                <div class="status-label">Confidence</div>
                <div class="status-value">${Math.round(burndown.confidence * 100)}%</div>
            </div>
        </div>
    `;

    statusDiv.innerHTML = statusHtml;
}

function showLoading() {
    document.body.style.cursor = 'wait';
}

function hideLoading() {
    document.body.style.cursor = 'default';
}

async function loadNavbar() {
    try {
        const response = await fetch('navbar.html');
        const html = await response.text();
        document.getElementById('navbar-container').innerHTML = html;
    } catch (error) {
        console.error('Error loading navbar:', error);
    }
}
