/**
 * Simulation Panel Component
 * Interactive what-if simulator with sliders for team size and scope
 */

class SimulationPanel {
    constructor(containerId, baseVelocity) {
        this.container = document.getElementById(containerId);
        this.baseVelocity = baseVelocity;
        this.scenarios = [];
        this.render();
    }

    render() {
        this.container.innerHTML = `
            <div class="simulation-controls">
                <div class="simulation-group">
                    <label for="team-size-slider">
                        Team Size: <span id="team-size-value">5</span> developers
                    </label>
                    <input 
                        type="range" 
                        id="team-size-slider" 
                        min="1" 
                        max="20" 
                        value="5" 
                        step="1"
                        class="slider"
                    >
                    <div class="slider-labels">
                        <span>1</span>
                        <span>20</span>
                    </div>
                </div>

                <div class="simulation-group">
                    <label for="scope-slider">
                        Scope Multiplier: <span id="scope-value">100</span>%
                    </label>
                    <input 
                        type="range" 
                        id="scope-slider" 
                        min="50" 
                        max="200" 
                        value="100" 
                        step="10"
                        class="slider"
                    >
                    <div class="slider-labels">
                        <span>50%</span>
                        <span>100%</span>
                        <span>200%</span>
                    </div>
                </div>

                <div class="simulation-group">
                    <label for="complexity-slider">
                        Task Complexity: <span id="complexity-value">Medium</span>
                    </label>
                    <input 
                        type="range" 
                        id="complexity-slider" 
                        min="1" 
                        max="3" 
                        value="2" 
                        step="1"
                        class="slider"
                    >
                    <div class="slider-labels">
                        <span>Low</span>
                        <span>Medium</span>
                        <span>High</span>
                    </div>
                </div>

                <button id="run-simulation" class="btn btn-primary">
                    🔮 Run Simulation
                </button>
            </div>

            <div class="simulation-results" id="simulation-results" style="display:none;">
                <h3>📊 Simulation Results</h3>
                <div class="results-grid" id="results-grid"></div>
                <div class="comparison-chart">
                    <canvas id="simulation-chart"></canvas>
                </div>
            </div>
        `;

        this.attachEventListeners();
    }

    attachEventListeners() {
        const teamSizeSlider = document.getElementById('team-size-slider');
        const scopeSlider = document.getElementById('scope-slider');
        const complexitySlider = document.getElementById('complexity-slider');
        const runButton = document.getElementById('run-simulation');

        // Update display values
        teamSizeSlider.addEventListener('input', (e) => {
            document.getElementById('team-size-value').textContent = e.target.value;
        });

        scopeSlider.addEventListener('input', (e) => {
            document.getElementById('scope-value').textContent = e.target.value;
        });

        complexitySlider.addEventListener('input', (e) => {
            const complexityLabels = ['Low', 'Medium', 'High'];
            document.getElementById('complexity-value').textContent = 
                complexityLabels[parseInt(e.target.value) - 1];
        });

        // Run simulation
        runButton.addEventListener('click', () => this.runSimulation());
    }

    async runSimulation() {
        const teamSize = parseInt(document.getElementById('team-size-slider').value);
        const scopeMultiplier = parseInt(document.getElementById('scope-slider').value) / 100;
        const complexity = parseInt(document.getElementById('complexity-slider').value);

        const scenarios = [
            {
                name: 'Current State',
                teamSizeMultiplier: 1,
                scopeMultiplier: 1,
                complexityFactor: 1
            },
            {
                name: 'Your Scenario',
                teamSizeMultiplier: teamSize / 5, // Base is 5 devs
                scopeMultiplier: scopeMultiplier,
                complexityFactor: complexity / 2 // Base is 2 (Medium)
            },
            {
                name: 'Optimistic',
                teamSizeMultiplier: teamSize / 5,
                scopeMultiplier: scopeMultiplier * 0.8,
                complexityFactor: complexity / 2.5
            },
            {
                name: 'Pessimistic',
                teamSizeMultiplier: teamSize / 5,
                scopeMultiplier: scopeMultiplier * 1.2,
                complexityFactor: complexity / 1.5
            }
        ];

        const results = await this.calculateScenarios(scenarios);
        this.displayResults(results);
    }

    async calculateScenarios(scenarios) {
        return scenarios.map(scenario => {
            // Simplified calculation (would use API in production)
            const baseIssuesPerWeek = this.baseVelocity?.issuesPerWeek || 10;
            
            // Team size has diminishing returns (Brooks's Law)
            const teamEfficiency = scenario.teamSizeMultiplier > 1 
                ? Math.log(1 + scenario.teamSizeMultiplier) / Math.log(2)
                : scenario.teamSizeMultiplier;

            const adjustedVelocity = baseIssuesPerWeek * 
                teamEfficiency / 
                (scenario.scopeMultiplier * scenario.complexityFactor);

            const remainingIssues = 50; // Default
            const weeksToComplete = Math.ceil(remainingIssues / adjustedVelocity);
            
            const completionDate = new Date();
            completionDate.setDate(completionDate.getDate() + (weeksToComplete * 7));

            return {
                scenario: scenario.name,
                velocity: Math.round(adjustedVelocity * 10) / 10,
                weeksToComplete,
                completionDate: completionDate.toLocaleDateString(),
                confidence: this.calculateConfidence(scenario),
                metrics: {
                    teamSize: Math.round(5 * scenario.teamSizeMultiplier),
                    scope: Math.round(scenario.scopeMultiplier * 100),
                    complexity: this.getComplexityLabel(scenario.complexityFactor)
                }
            };
        });
    }

    calculateConfidence(scenario) {
        // Higher confidence for scenarios closer to current state
        const deviation = Math.abs(scenario.teamSizeMultiplier - 1) +
                         Math.abs(scenario.scopeMultiplier - 1) +
                         Math.abs(scenario.complexityFactor - 1);
        
        return Math.max(0.3, 1 - (deviation * 0.2));
    }

    getComplexityLabel(factor) {
        if (factor < 0.7) return 'Low';
        if (factor < 1.3) return 'Medium';
        return 'High';
    }

    displayResults(results) {
        const resultsDiv = document.getElementById('simulation-results');
        const gridDiv = document.getElementById('results-grid');

        resultsDiv.style.display = 'block';

        // Create result cards
        gridDiv.innerHTML = results.map(result => `
            <div class="simulation-result-card ${result.scenario === 'Current State' ? 'baseline' : ''}">
                <h4>${result.scenario}</h4>
                <div class="result-metrics">
                    <div class="result-metric">
                        <div class="metric-label">Velocity</div>
                        <div class="metric-value">${result.velocity} issues/week</div>
                    </div>
                    <div class="result-metric">
                        <div class="metric-label">Duration</div>
                        <div class="metric-value">${result.weeksToComplete} weeks</div>
                    </div>
                    <div class="result-metric">
                        <div class="metric-label">Completion</div>
                        <div class="metric-value">${result.completionDate}</div>
                    </div>
                    <div class="result-metric">
                        <div class="metric-label">Confidence</div>
                        <div class="metric-value">${Math.round(result.confidence * 100)}%</div>
                    </div>
                </div>
                <div class="scenario-params">
                    <span>👥 ${result.metrics.teamSize} devs</span>
                    <span>📦 ${result.metrics.scope}% scope</span>
                    <span>🧩 ${result.metrics.complexity}</span>
                </div>
            </div>
        `).join('');

        // Draw comparison chart
        this.drawComparisonChart(results);
    }

    drawComparisonChart(results) {
        const ctx = document.getElementById('simulation-chart').getContext('2d');

        if (this.chart) {
            this.chart.destroy();
        }

        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: results.map(r => r.scenario),
                datasets: [
                    {
                        label: 'Weeks to Complete',
                        data: results.map(r => r.weeksToComplete),
                        backgroundColor: [
                            'rgba(102, 126, 234, 0.6)',
                            'rgba(118, 75, 162, 0.6)',
                            'rgba(16, 185, 129, 0.6)',
                            'rgba(239, 68, 68, 0.6)'
                        ],
                        borderColor: [
                            'rgba(102, 126, 234, 1)',
                            'rgba(118, 75, 162, 1)',
                            'rgba(16, 185, 129, 1)',
                            'rgba(239, 68, 68, 1)'
                        ],
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Scenario Comparison',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            afterLabel: (context) => {
                                const result = results[context.dataIndex];
                                return [
                                    `Velocity: ${result.velocity} issues/week`,
                                    `Confidence: ${Math.round(result.confidence * 100)}%`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Weeks'
                        }
                    }
                }
            }
        });
    }
}

// Make available globally
window.SimulationPanel = SimulationPanel;
