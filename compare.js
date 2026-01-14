/**
 * XAYTHEON - Repository Comparison Tool
 * Logic for fetching and visualizing repository metrics
 */

document.addEventListener('DOMContentLoaded', () => {
    const compareBtn = document.getElementById('compare-btn');
    const exportBtn = document.getElementById('export-pdf');
    const statusMsg = document.getElementById('compare-status');
    const resultsArea = document.getElementById('comparison-results');
    const loadingArea = document.getElementById('loading-state');

    let charts = {
        radar: null,
        bar: null
    };

    // Chart Colors
    const colors = [
        { border: '#6366f1', bg: 'rgba(99, 102, 241, 0.2)' },
        { border: '#ec4899', bg: 'rgba(236, 72, 153, 0.2)' },
        { border: '#10b981', bg: 'rgba(16, 185, 129, 0.2)' }
    ];

    compareBtn.addEventListener('click', handleCompare);
    exportBtn.addEventListener('click', handleExport);

    async function handleCompare() {
        const repo1 = document.getElementById('repo-1').value.trim();
        const repo2 = document.getElementById('repo-2').value.trim();
        const repo3 = document.getElementById('repo-3').value.trim();

        const repos = [repo1, repo2, repo3].filter(r => r.length > 0);

        if (repos.length < 1) {
            showStatus('Please enter at least one repository (owner/repo)', 'error');
            return;
        }

        try {
            showLoading(true);
            showStatus('Analyzing repositories...', 'info');

            const response = await fetch(`${window.location.origin}/api/compare?repos=${repos.join(',')}`);
            const data = await response.json();

            if (!response.ok) throw new Error(data.message || 'Failed to fetch comparison data');

            renderComparison(data);
            showStatus(`Analysis complete for ${data.length} repositories`, 'success');
            exportBtn.disabled = false;
        } catch (error) {
            console.error('Comparison error:', error);
            showStatus(error.message, 'error');
            resultsArea.classList.add('hidden');
        } finally {
            showLoading(false);
        }
    }

    function renderComparison(data) {
        resultsArea.classList.remove('hidden');

        renderTable(data);
        renderCharts(data);
        renderProfiles(data);
    }

    function renderTable(data) {
        const headRow = document.getElementById('table-head');
        const body = document.getElementById('table-body');

        // Clear existing
        headRow.innerHTML = `<th>Metric</th>`;
        body.innerHTML = '';

        // Add headers
        data.forEach(repo => {
            const th = document.createElement('th');
            th.className = 'repo-header-cell';
            th.innerHTML = `
                <div class="repo-header-content">
                    <img src="${repo.owner.avatarUrl}" class="repo-header-avatar" alt="${repo.owner.login}"/>
                    <span>${repo.name}</span>
                </div>
            `;
            headRow.appendChild(th);
        });

        const metrics = [
            { label: 'Stars', key: 'stars' },
            { label: 'Forks', key: 'forks' },
            { label: 'Open Issues', key: 'openIssues' },
            { label: 'Watchers', key: 'watchers' },
            { label: 'Primary Language', key: 'language' },
            { label: 'Health Score', key: 'healthScore', suffix: '/100' },
            { label: 'Size', key: 'size', format: (v) => `${(v / 1024).toFixed(1)} MB` },
            { label: 'License', key: 'license' }
        ];

        metrics.forEach(metric => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td class="metric-name">${metric.label}</td>`;

            data.forEach(repo => {
                let value = repo[metric.key];
                if (metric.format) value = metric.format(value);
                if (metric.suffix) value = `${value}${metric.suffix}`;

                tr.innerHTML += `<td style="text-align: center;">${value || 'None'}</td>`;
            });
            body.appendChild(tr);
        });
    }

    function renderCharts(data) {
        // Radar Chart (Health & Activity)
        const ctxRadar = document.getElementById('radarChart').getContext('2d');
        if (charts.radar) charts.radar.destroy();

        charts.radar = new Chart(ctxRadar, {
            type: 'radar',
            data: {
                labels: ['Stars', 'Forks', 'Issues (Activity)', 'Recent Push', 'Health Score'],
                datasets: data.map((repo, idx) => ({
                    label: repo.name,
                    data: [
                        repo.normalizedMetrics.stars,
                        repo.normalizedMetrics.forks,
                        repo.normalizedMetrics.openIssues,
                        repo.normalizedMetrics.activity,
                        repo.healthScore
                    ],
                    borderColor: colors[idx].border,
                    backgroundColor: colors[idx].bg,
                    borderWidth: 2,
                    pointBackgroundColor: colors[idx].border
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                        pointLabels: { color: '#94a3b8' }
                    }
                },
                plugins: {
                    legend: { labels: { color: '#94a3b8' } }
                }
            }
        });

        // Bar Chart (Direct Stats)
        const ctxBar = document.getElementById('barChart').getContext('2d');
        if (charts.bar) charts.bar.destroy();

        charts.bar = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: ['Stars', 'Forks', 'Watchers'],
                datasets: data.map((repo, idx) => ({
                    label: repo.name,
                    data: [repo.stars, repo.forks, repo.watchers],
                    backgroundColor: colors[idx].border,
                    borderRadius: 6
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#94a3b8' }
                    },
                    x: {
                        ticks: { color: '#94a3b8' }
                    }
                },
                plugins: {
                    legend: { labels: { color: '#94a3b8' } }
                }
            }
        });
    }

    function renderProfiles(data) {
        const container = document.getElementById('repo-profiles');
        container.innerHTML = '';

        data.forEach(repo => {
            const card = document.createElement('div');
            card.className = 'repo-detail-card';

            const healthClass = repo.healthScore > 75 ? 'health-high' : (repo.healthScore > 40 ? 'health-medium' : 'health-low');

            card.innerHTML = `
                <div class="repo-card-header">
                    <img src="${repo.owner.avatarUrl}" class="repo-card-avatar" alt="${repo.owner.login}"/>
                    <div class="repo-card-title">
                        <h3>${repo.name}</h3>
                        <span class="repo-card-owner">by ${repo.owner.login}</span>
                    </div>
                </div>
                <div style="margin-bottom: 20px;">
                    <span class="health-badge ${healthClass}">Health: ${repo.healthScore}%</span>
                </div>
                <p style="font-size: 0.9rem; margin-bottom: 20px; line-height: 1.5; height: 4.5rem; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;">
                    ${repo.description || 'No description available for this repository.'}
                </p>
                <div style="display: flex; gap: 15px; font-size: 0.85rem; color: var(--text-muted);">
                    <span><i class="ri-code-line"></i> ${repo.language || 'Mixed'}</span>
                    <span><i class="ri-history-line"></i> Updated ${formatTimeAgo(repo.pushedAt)}</span>
                </div>
            `;
            container.appendChild(card);
        });
    }

    function formatTimeAgo(dateString) {
        const now = new Date();
        const then = new Date(dateString);
        const diffDays = Math.floor((now - then) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 30) return `${diffDays} days ago`;
        return `${Math.floor(diffDays / 30)} months ago`;
    }

    function showStatus(msg, type) {
        statusMsg.textContent = msg;
        statusMsg.className = `status-message ${type}`;
        if (type === 'error') {
            statusMsg.style.color = '#ef4444';
        } else if (type === 'success') {
            statusMsg.style.color = '#22c55e';
        } else {
            statusMsg.style.color = '#94a3b8';
        }
    }

    function showLoading(isLoading) {
        if (isLoading) {
            loadingArea.classList.remove('hidden');
            resultsArea.classList.add('hidden');
            compareBtn.disabled = true;
        } else {
            loadingArea.classList.add('hidden');
            compareBtn.disabled = false;
        }
    }

    async function handleExport() {
        const results = document.getElementById('comparison-results');
        showStatus('Generating export...', 'info');

        try {
            const canvas = await html2canvas(results, {
                backgroundColor: null,
                scale: 2,
                logging: false,
                useCORS: true
            });

            const link = document.createElement('a');
            link.download = `xaytheon-comparison-${new Date().getTime()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            showStatus('Exported successfully!', 'success');
        } catch (error) {
            console.error('Export error:', error);
            showStatus('Failed to export. Please try again.', 'error');
        }
    }
});
