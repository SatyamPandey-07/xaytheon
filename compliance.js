/**
 * XAYTHEON | Governance Auditor Dashboard Logic
 * 
 * Orchestrates compliance audits, visualizes results via Chart.js,
 * and manages real-time status updates for the governance module.
 */

document.addEventListener('DOMContentLoaded', () => {
    // API State
    let currentAuditReport = null;
    let auditHistory = [];
    let frameworks = {};
    let violationChart = null;

    // UI Elements
    const runAuditBtn = document.getElementById('run-audit-btn');
    const repoPathInput = document.getElementById('repo-path-input');
    const frameworkList = document.getElementById('framework-list');
    const auditResults = document.getElementById('audit-results');
    const emptyState = document.getElementById('empty-state');
    const violationsList = document.getElementById('violations-list');
    const historyList = document.getElementById('history-list');
    const globalScoreEl = document.getElementById('global-score');
    const failedChecksEl = document.getElementById('failed-checks');
    const auditStatusEl = document.getElementById('audit-status');

    // Tab Switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(`${btn.dataset.tab}-tab`).classList.add('active');

            if (btn.dataset.tab === 'history') loadAuditHistory();
        });
    });

    // Initial Load
    init();

    async function init() {
        await fetchFrameworks();
        setupViolationChart();
    }

    /**
     * Fetch available compliance frameworks from backend
     */
    async function fetchFrameworks() {
        try {
            const res = await fetch('/api/audit/frameworks');
            const data = await res.json();

            if (data.success) {
                frameworks = data.data;
                renderFrameworks();
            }
        } catch (err) {
            console.error("Failed to fetch frameworks:", err);
            frameworkList.innerHTML = '<p class="error">API Offline</p>';
        }
    }

    function renderFrameworks() {
        frameworkList.innerHTML = Object.entries(frameworks).map(([key, f]) => `
            <div class="framework-item">
                <span class="name">${f.name}</span>
                <span class="count">${f.controls.length} Controls</span>
            </div>
        `).join('');
    }

    /**
     * Execute a fresh compliance audit
     */
    runAuditBtn.addEventListener('click', async () => {
        const repoPath = repoPathInput.value || './';

        // Update UI to Loading
        runAuditBtn.disabled = true;
        runAuditBtn.textContent = 'Auditing Fleet...';
        auditStatusEl.textContent = 'SCANNING';
        auditStatusEl.className = 'value warning';

        try {
            const res = await fetch('/api/audit/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    repoPath,
                    frameworks: Object.keys(frameworks)
                })
            });

            const data = await res.json();

            if (data.success) {
                currentAuditReport = data.data;
                displayResults(currentAuditReport);
                updateChart(currentAuditReport);
                showNotification('Global audit completed successfully.', 'success');
            }
        } catch (err) {
            showNotification('Audit execution failed. Check console.', 'error');
        } finally {
            runAuditBtn.disabled = false;
            runAuditBtn.textContent = 'Execute Global Audit';
        }
    });

    /**
     * Render the audit results in the main panel
     */
    function displayResults(report) {
        emptyState.classList.add('hidden');
        auditResults.classList.remove('hidden');

        // Update Stats
        globalScoreEl.textContent = report.overallScore + '%';
        failedChecksEl.textContent = report.violations.length;

        auditStatusEl.textContent = report.status.toUpperCase();
        auditStatusEl.className = `value status-${report.status}`;

        document.getElementById('report-id').textContent = `ID: ${report.auditId}`;
        document.getElementById('report-date').textContent = new Date(report.timestamp).toLocaleTimeString();

        // Render Violations
        violationsList.innerHTML = report.violations.map(v => `
            <div class="violation-card sev-${v.severity}">
                <div class="violation-header">
                    <span class="framework">${v.framework}</span>
                    <span class="control">${v.control}</span>
                </div>
                <p class="violation-msg"><strong>${v.file}</strong>: ${v.message}</p>
                <div class="remediation-box">
                    <strong>Action Required:</strong> ${v.remediation}
                </div>
            </div>
        `).join('');

        if (report.violations.length === 0) {
            violationsList.innerHTML = '<div class="passed-state">✅ All checks passed. Full compliance verified.</div>';
        }

        // Animate entrance
        gsap.from('.violation-card', {
            opacity: 0,
            y: 20,
            stagger: 0.1,
            duration: 0.5,
            ease: 'back.out'
        });
    }

    /**
     * Fetch and render audit history
     */
    async function loadAuditHistory() {
        try {
            const res = await fetch('/api/audit/history');
            const data = await res.json();

            if (data.success && data.data.length > 0) {
                historyList.innerHTML = data.data.map(a => `
                    <div class="history-item glass" onclick="viewHistoricalReport('${a.auditId}')">
                        <div class="meta">
                            <strong>${a.auditId}</strong>
                            <span>${new Date(a.timestamp).toLocaleDateString()}</span>
                        </div>
                        <div class="score ${a.status}">${a.overallScore}%</div>
                    </div>
                `).join('');
            }
        } catch (err) {
            console.error("History fetch failed.");
        }
    }

    /**
     * Chart.js Integration
     */
    function setupViolationChart() {
        const ctx = document.getElementById('violation-chart').getContext('2d');
        violationChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Passed', 'Critical', 'High', 'Medium'],
                datasets: [{
                    data: [24, 0, 0, 0],
                    backgroundColor: ['#10b981', '#ef4444', '#f59e0b', '#6366f1'],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                cutout: '70%',
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#94a3b8', font: { family: 'Inter' } } }
                }
            }
        });
    }

    function updateChart(report) {
        const counts = { critical: 0, high: 0, medium: 0, passed: report.statistics.passedChecks };
        report.violations.forEach(v => counts[v.severity]++);

        violationChart.data.datasets[0].data = [
            counts.passed,
            counts.critical,
            counts.high,
            counts.medium
        ];
        violationChart.update();
    }

    // Modal Helpers
    window.viewHistoricalReport = async (id) => {
        const res = await fetch(`/api/audit/report/${id}?format=html`);
        const html = await res.text();

        document.getElementById('modal-body').innerHTML = html;
        document.getElementById('report-modal').classList.remove('hidden');
    };

    document.getElementById('close-modal-btn').addEventListener('click', () => {
        document.getElementById('report-modal').classList.add('hidden');
    });

    // Exports
    document.getElementById('download-md-btn').addEventListener('click', () => {
        if (!currentAuditReport) return;
        window.open(`/api/audit/report/${currentAuditReport.auditId}/download`, '_blank');
    });

    function showNotification(msg, type) {
        // Simple alert for now, can be replaced with premium toast
        alert(msg);
    }
});
