/**
 * Fleet Dashboard JavaScript
 * Handles multi-repository fleet analytics and visualization
 */

class FleetDashboard {
    constructor() {
        this.repositories = [];
        this.fleetData = null;
        this.charts = {};
        this.currentConfigId = null;
        this.initializeElements();
        this.bindEvents();
        this.loadTemplates();
        this.loadSavedConfigs();
    }

    initializeElements() {
        // Configuration section
        this.configSection = document.getElementById('fleet-config');
        this.templateSelector = document.getElementById('fleet-template');
        this.applyTemplateBtn = document.getElementById('apply-template');
        this.repoOwnerInput = document.getElementById('repo-owner');
        this.repoNameInput = document.getElementById('repo-name');
        this.addRepoBtn = document.getElementById('add-repo');
        this.reposList = document.getElementById('repos-list');
        this.repoCount = document.getElementById('repo-count');
        this.analyzeBtn = document.getElementById('analyze-fleet');
        this.saveConfigBtn = document.getElementById('save-config');

        // Results section
        this.resultsSection = document.getElementById('fleet-results');
        this.loadingState = document.getElementById('loading-state');
        this.refreshBtn = document.getElementById('refresh-dashboard');
        this.exportBtn = document.getElementById('export-fleet');

        // Metric displays
        this.healthScoreValue = document.getElementById('health-score-value');
        this.healthLevel = document.getElementById('health-level');
        this.healthDescription = document.getElementById('health-description');
        this.recommendationsList = document.getElementById('recommendations-list');
        this.totalStars = document.getElementById('total-stars');
        this.totalContributors = document.getElementById('total-contributors');
        this.totalCommits = document.getElementById('total-commits');
        this.topPerformers = document.getElementById('top-performers');
        this.alertsContainer = document.getElementById('alerts-container');
        this.comparisonBody = document.getElementById('comparison-body');
    }

    bindEvents() {
        // Template selection
        this.applyTemplateBtn.addEventListener('click', () => this.applySelectedTemplate());
        
        // Manual repository addition
        this.addRepoBtn.addEventListener('click', () => this.addRepository());
        
        // Enter key support for adding repositories
        this.repoNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addRepository();
        });
        
        // Fleet analysis
        this.analyzeBtn.addEventListener('click', () => this.analyzeFleet());
        
        // Save configuration
        this.saveConfigBtn.addEventListener('click', () => this.saveConfiguration());
        
        // Refresh dashboard
        this.refreshBtn.addEventListener('click', () => this.refreshDashboard());
        
        // Export functionality
        this.exportBtn.addEventListener('click', () => this.exportReport());
    }

    async loadTemplates() {
        try {
            const response = await fetch('/api/fleet/templates', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.populateTemplates(data.data);
            }
        } catch (error) {
            console.error('Failed to load templates:', error);
        }
    }

    populateTemplates(templates) {
        this.templateSelector.innerHTML = '<option value="">Select a template...</option>';
        
        templates.forEach(template => {
            const option = document.createElement('option');
            option.value = template.id;
            option.textContent = `${template.name} - ${template.description}`;
            option.dataset.repositories = JSON.stringify(template.repositories);
            this.templateSelector.appendChild(option);
        });

        this.templateSelector.addEventListener('change', () => {
            this.applyTemplateBtn.disabled = !this.templateSelector.value;
        });
    }

    applySelectedTemplate() {
        const selectedOption = this.templateSelector.options[this.templateSelector.selectedIndex];
        if (!selectedOption.value) return;

        const repositories = JSON.parse(selectedOption.dataset.repositories);
        this.repositories = [...repositories]; // Clear and set new repositories
        this.renderRepositories();
        this.updateAnalyzeButton();
    }

    addRepository() {
        const owner = this.repoOwnerInput.value.trim();
        const name = this.repoNameInput.value.trim();

        if (!owner || !name) {
            alert('Please enter both owner and repository name');
            return;
        }

        // Check for duplicates
        const exists = this.repositories.some(repo => 
            repo.owner === owner && repo.name === name
        );

        if (exists) {
            alert('Repository already added');
            return;
        }

        this.repositories.push({ owner, name });
        this.repoOwnerInput.value = '';
        this.repoNameInput.value = '';
        this.renderRepositories();
        this.updateAnalyzeButton();
    }

    removeRepository(index) {
        this.repositories.splice(index, 1);
        this.renderRepositories();
        this.updateAnalyzeButton();
    }

    renderRepositories() {
        this.reposList.innerHTML = '';
        this.repoCount.textContent = this.repositories.length;

        this.repositories.forEach((repo, index) => {
            const repoElement = document.createElement('div');
            repoElement.className = 'repo-item';
            repoElement.innerHTML = `
                <span class="repo-name">${repo.owner}/${repo.name}</span>
                <button class="remove-repo" data-index="${index}">×</button>
            `;
            
            const removeBtn = repoElement.querySelector('.remove-repo');
            removeBtn.addEventListener('click', () => this.removeRepository(index));
            
            this.reposList.appendChild(repoElement);
        });
    }

    updateAnalyzeButton() {
        const hasRepos = this.repositories.length > 0;
        this.analyzeBtn.disabled = !hasRepos;
        this.saveConfigBtn.disabled = !hasRepos;
    }

    async analyzeFleet() {
        if (this.repositories.length === 0) return;

        this.showLoading(true);
        this.resultsSection.classList.add('hidden');

        try {
            const response = await fetch('/api/fleet/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ repositories: this.repositories })
            });

            if (!response.ok) {
                throw new Error('Failed to analyze fleet');
            }

            const data = await response.json();
            this.fleetData = data.data;
            this.displayResults();
            this.resultsSection.classList.remove('hidden');
            this.exportBtn.disabled = false;

        } catch (error) {
            console.error('Analysis failed:', error);
            alert('Failed to analyze fleet. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    displayResults() {
        const { fleetSummary, healthScore, alerts, repositories } = this.fleetData;

        // Display health score
        this.displayHealthScore(healthScore);

        // Display summary metrics
        this.totalStars.textContent = fleetSummary.totalStars.toLocaleString();
        this.totalContributors.textContent = fleetSummary.totalContributors.toLocaleString();
        this.totalCommits.textContent = fleetSummary.totalCommits.toLocaleString();
        this.topPerformers.textContent = fleetSummary.topPerformers.slice(0, 2).join(', ');

        // Display alerts
        this.displayAlerts(alerts);

        // Display comparison table
        this.displayComparisonTable(repositories);

        // Render DORA charts
        this.renderDoraCharts(repositories);
    }

    async displayHealthScore(score) {
        try {
            const response = await fetch(`/api/fleet/health/${score}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                const health = data.data;

                this.healthScoreValue.textContent = health.score;
                this.healthScoreValue.style.color = health.color;
                this.healthLevel.textContent = health.level;
                this.healthLevel.style.color = health.color;
                this.healthDescription.textContent = health.description;

                // Display recommendations
                this.recommendationsList.innerHTML = '';
                health.recommendations.forEach(rec => {
                    const li = document.createElement('li');
                    li.textContent = rec;
                    this.recommendationsList.appendChild(li);
                });
            }
        } catch (error) {
            console.error('Failed to get health interpretation:', error);
        }
    }

    displayAlerts(alerts) {
        this.alertsContainer.innerHTML = '';

        if (alerts.length === 0) {
            this.alertsContainer.innerHTML = '<p class="no-alerts">No alerts - everything looks good! 🎉</p>';
            return;
        }

        alerts.forEach(alert => {
            const alertElement = document.createElement('div');
            alertElement.className = `alert-item alert-${alert.severity}`;
            alertElement.innerHTML = `
                <div class="alert-header">
                    <span class="alert-icon">${this.getAlertIcon(alert.type)}</span>
                    <span class="alert-repo">${alert.repository}</span>
                    <span class="alert-severity">${alert.severity.toUpperCase()}</span>
                </div>
                <div class="alert-content">
                    <p class="alert-message">${alert.message}</p>
                    <p class="alert-recommendation"><strong>Recommendation:</strong> ${alert.recommendation}</p>
                </div>
            `;
            this.alertsContainer.appendChild(alertElement);
        });
    }

    getAlertIcon(type) {
        const icons = {
            warning: '⚠️',
            danger: '🚨',
            info: 'ℹ️'
        };
        return icons[type] || '🔔';
    }

    displayComparisonTable(repositories) {
        this.comparisonBody.innerHTML = '';

        repositories.forEach(repo => {
            const row = document.createElement('tr');
            const healthStatus = this.getRepositoryHealthStatus(repo);
            
            row.innerHTML = `
                <td>${repo.fullName}</td>
                <td>${repo.stars.toLocaleString()}</td>
                <td>${repo.contributors}</td>
                <td>${repo.totalCommits.toLocaleString()}</td>
                <td>${repo.openIssues}</td>
                <td>${repo.doraMetrics.velocity.toFixed(1)}</td>
                <td><span class="health-status ${healthStatus.class}">${healthStatus.text}</span></td>
            `;
            this.comparisonBody.appendChild(row);
        });
    }

    getRepositoryHealthStatus(repo) {
        const score = (repo.stars / 1000) + (repo.contributors * 10) + (repo.totalCommits / 1000);
        if (score > 50) return { class: 'healthy', text: 'Healthy' };
        if (score > 25) return { class: 'fair', text: 'Fair' };
        return { class: 'needs-attention', text: 'Needs Attention' };
    }

    renderDoraCharts(repositories) {
        // Deployment Frequency Chart
        this.createBarChart('deployment-frequency-chart', repositories, 
            repo => repo.doraMetrics.deploymentFrequency,
            'Deployment Frequency (per day)',
            '#3b82f6'
        );

        // Lead Time Chart
        this.createBarChart('lead-time-chart', repositories,
            repo => repo.doraMetrics.leadTimeForChanges,
            'Lead Time (hours)',
            '#10b981'
        );

        // MTTR Chart
        this.createBarChart('mttr-chart', repositories,
            repo => repo.doraMetrics.meanTimeToRecovery,
            'MTTR (hours)',
            '#f59e0b'
        );

        // Change Failure Rate Chart
        this.createBarChart('change-failure-chart', repositories,
            repo => repo.doraMetrics.changeFailureRate,
            'Change Failure Rate (%)',
            '#ef4444'
        );
    }

    createBarChart(canvasId, repositories, valueExtractor, label, color) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        this.charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: repositories.map(repo => repo.fullName.split('/')[1]),
                datasets: [{
                    label: label,
                    data: repositories.map(valueExtractor),
                    backgroundColor: color,
                    borderColor: color,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    refreshDashboard() {
        if (this.repositories.length > 0) {
            this.analyzeFleet();
        }
    }

    exportReport() {
        if (!this.fleetData) return;

        const report = {
            generatedAt: new Date().toISOString(),
            repositories: this.repositories,
            fleetSummary: this.fleetData.fleetSummary,
            healthScore: this.fleetData.healthScore,
            alerts: this.fleetData.alerts,
            repositoriesDetailed: this.fleetData.repositories
        };

        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fleet-report-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    async saveConfiguration() {
        if (this.repositories.length === 0) {
            alert('Please add at least one repository before saving configuration');
            return;
        }

        const configName = prompt('Enter a name for this fleet configuration:');
        if (!configName) return;

        try {
            const response = await fetch('/api/fleet/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ 
                    repositories: this.repositories,
                    configName: configName
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.currentConfigId = data.configId;
                alert('Configuration saved successfully!');
            } else {
                throw new Error('Failed to save configuration');
            }
        } catch (error) {
            console.error('Save configuration error:', error);
            alert('Failed to save configuration');
        }
    }

    async loadSavedConfigs() {
        try {
            const response = await fetch('/api/fleet/configs', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.populateConfigDropdown(data.data);
            }
        } catch (error) {
            console.error('Failed to load saved configs:', error);
        }
    }

    populateConfigDropdown(configs) {
        // This would typically add a dropdown to load saved configs
        // For now, we'll log the available configs
        console.log('Available fleet configurations:', configs);
    }

    async loadConfig(configId) {
        try {
            const response = await fetch(`/api/fleet/config/${configId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.repositories = data.data.repositories;
                this.renderRepositories();
                this.updateAnalyzeButton();
                this.currentConfigId = configId;
                
                // Automatically analyze the loaded configuration
                await this.analyzeFleet();
            }
        } catch (error) {
            console.error('Failed to load config:', error);
        }
    }

    showLoading(show) {
        if (show) {
            this.loadingState.classList.remove('hidden');
        } else {
            this.loadingState.classList.add('hidden');
        }
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.fleetDashboard = new FleetDashboard();
});

// Theme toggle functionality
document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = themeToggle.querySelector('.theme-icon');
    
    // Check for saved theme or default to dark
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeIcon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        themeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    });
});