/**
 * XAYTHEON | Security Visualization & Orchestration
 * 
 * Manages the security globe visualization, real-time threat feed,
 * and AI/Fuzzer API interactions.
 */

document.addEventListener('DOMContentLoaded', () => {
    // API State
    let threatHistory = [];
    let threatChart = null;

    // UI Elements
    const runAnalysisBtn = document.getElementById('run-analysis-btn');
    const runFuzzBtn = document.getElementById('run-fuzz-btn');
    const fuzzUrlInput = document.getElementById('fuzz-url');
    const threatFeed = document.getElementById('threat-feed');
    const threatCountBadge = document.getElementById('threat-count-badge');
    const fuzzBadge = document.getElementById('active-fuzz-target');

    // Initial Load
    init();

    async function init() {
        await fetchHistory();
        initThreatChart();
    }

    /**
     * Fetch threat history from backend
     */
    async function fetchHistory() {
        try {
            const res = await fetch('/api/security/threats');
            const data = await res.json();
            if (data.success) {
                threatHistory = data.data;
                renderThreatFeed(threatHistory);
                updateDashboardStats(threatHistory);
            }
        } catch (err) {
            console.error("Security API offline.");
        }
    }

    /**
     * Render the threat feed in the sidebar
     */
    function renderThreatFeed(threats) {
        if (!threatFeed) return;

        if (threats.length === 0) {
            threatFeed.innerHTML = '<div class="empty-feed"><p>No active threats detected.</p></div>';
            return;
        }

        threatFeed.innerHTML = threats.map(t => `
            <div class="threat-card ${t.severity.toLowerCase()}" onclick="viewThreatDetails('${t.id}')">
                <div class="hdr">
                    <span class="type">${t.type}</span>
                    <span class="sev">${t.severity}</span>
                </div>
                <p class="desc">${t.description.substring(0, 80)}...</p>
                <div class="footer">
                    <span>${new Date(t.timestamp).toLocaleTimeString()}</span>
                    <span class="status">${t.status}</span>
                </div>
            </div>
        `).join('');

        if (threatCountBadge) threatCountBadge.textContent = threats.length;

        // GSAP animate entrance
        gsap.from('.threat-card', { opacity: 0, x: 20, stagger: 0.1, duration: 0.4 });
    }

    /**
     * Run Predictive Analysis
     */
    if (runAnalysisBtn) {
        runAnalysisBtn.addEventListener('click', async () => {
            runAnalysisBtn.disabled = true;
            runAnalysisBtn.textContent = 'Analyzing patterns...';

            try {
                const res = await fetch('/api/security/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ context: { sessionId: 'WARROOM-' + Date.now() } })
                });
                const data = await res.json();

                if (data.success && data.threatsFound > 0) {
                    alert(`AI IDENTIFIED ${data.threatsFound} NEW PATTERN(S)!`);
                    await fetchHistory();
                } else {
                    alert("Analysis complete. No new anomalies detected in this cycle.");
                }
            } finally {
                runAnalysisBtn.disabled = false;
                runAnalysisBtn.textContent = 'Analyze Logs';
            }
        });
    }

    /**
     * Execute Security Fuzz
     */
    if (runFuzzBtn) {
        runFuzzBtn.addEventListener('click', async () => {
            const url = fuzzUrlInput.value;
            if (!url) return;

            runFuzzBtn.disabled = true;
            runFuzzBtn.textContent = 'FUZZING...';
            if (fuzzBadge) {
                fuzzBadge.textContent = `FUZZING TARGET: ${url}`;
                fuzzBadge.classList.remove('hidden');
            }

            try {
                const res = await fetch('/api/security/fuzz', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ targetUrl: url })
                });
                const data = await res.json();

                if (data.success) {
                    alert(`Simulated exploit finished. ${data.vulnerabilities?.length || 0} vulnerabilities found.`);
                    await fetchHistory();
                }
            } finally {
                runFuzzBtn.disabled = false;
                runFuzzBtn.textContent = 'Execute Exploit Simulation';
                if (fuzzBadge) fuzzBadge.classList.add('hidden');
            }
        });
    }

    /**
     * Chart.js Configuration for threat types
     */
    function initThreatChart() {
        const canvas = document.getElementById('threat-type-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        threatChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Vulnerability', 'Anomaly', 'Active Attack'],
                datasets: [{
                    label: 'Threat Distribution',
                    data: [0, 0, 0],
                    backgroundColor: ['#ef4444', '#fbbf24', '#a855f7'],
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                    x: { ticks: { color: '#94a3b8' } }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    function updateDashboardStats(threats) {
        if (!threatChart) return;

        const counts = { vulnerability: 0, anomaly: 0, attack: 0 };
        threats.forEach(t => {
            if (t.type === 'VULNERABILITY') counts.vulnerability++;
            else if (t.type === 'ANOMALY') counts.anomaly++;
            else counts.attack++;
        });

        threatChart.data.datasets[0].data = [counts.vulnerability, counts.anomaly, counts.attack];
        threatChart.update();

        // Update integrity value randomly based on threats
        const integrityValue = document.getElementById('integrity-value');
        if (integrityValue) {
            const score = Math.max(70, 99.8 - (threats.length * 2.5)).toFixed(1);
            integrityValue.textContent = score + '%';
            integrityValue.className = score < 90 ? 'value status-warn' : 'value status-good';
        }
    }

    // Modal view
    window.viewThreatDetails = (id) => {
        const threat = threatHistory.find(t => t.id === id);
        if (!threat) return;

        document.getElementById('modal-threat-title').textContent = threat.type;
        document.getElementById('modal-severity').textContent = threat.severity;
        document.getElementById('modal-severity').className = `badge ${threat.severity.toLowerCase()}`;
        document.getElementById('modal-timestamp').textContent = new Date(threat.timestamp).toLocaleString();
        document.getElementById('modal-description').textContent = threat.description;
        document.getElementById('modal-remediation').textContent = threat.remediation;

        document.getElementById('threat-modal').classList.remove('hidden');
    };

    const closeModal = document.getElementById('close-modal');
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            document.getElementById('threat-modal').classList.add('hidden');
        });
    }
});
