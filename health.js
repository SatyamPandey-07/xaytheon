/**
 * XAYTHEON - Health Monitor Frontend
 */

document.addEventListener('DOMContentLoaded', () => {
    const buildFeed = document.getElementById('build-feed');
    const repoFleet = document.getElementById('repo-fleet');
    const diagnosisContent = document.getElementById('diagnosis-content');
    const triggerDemoBtn = document.getElementById('trigger-demo');

    const lightRed = document.getElementById('light-red');
    const lightYellow = document.getElementById('light-yellow');
    const lightGreen = document.getElementById('light-green');
    const statusText = document.getElementById('status-text');

    // Socket.io initialization
    const socket = io('/', {
        auth: { token: localStorage.getItem('xaytheon_token') }
    });

    socket.on('connect', () => {
        console.log('Connected to health monitor stream');
    });

    socket.on('build_update', (data) => {
        addBuildToFeed(data);
        updateTrafficLight(data.status);
        if (data.aiAnalysis) {
            showAiDiagnosis(data);
        }
        refreshSummary();
    });

    triggerDemoBtn.addEventListener('click', async () => {
        const statuses = ['success', 'failure', 'in_progress'];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

        const logs = randomStatus === 'failure'
            ? 'Error: Command failed with exit code 1. Could not find module express. ReferenceError: app is not defined at line 45.'
            : 'Build completed successfully.';

        await fetch('/api/health/mock-trigger', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repo: 'SatyamPandey-07/xaytheon', status: randomStatus, logs })
        });
    });

    async function refreshSummary() {
        try {
            const res = await fetch('/api/health/summary');
            const data = await res.json();
            renderFleet(data.repos);
        } catch (err) {
            console.error('Failed to load fleet summary');
        }
    }

    function renderFleet(repos) {
        if (repos.length === 0) return;
        repoFleet.innerHTML = '';
        repos.forEach(repo => {
            const card = document.createElement('div');
            card.className = 'card repo-card';
            const statusClass = repo.status === 'healthy' ? 'status-healthy' :
                repo.status === 'error' ? 'status-error' : 'status-warning';

            card.innerHTML = `
                <div class="repo-info">
                    <h4>${repo.name}</h4>
                    <p>Default Branch: main</p>
                </div>
                <div class="status-indicator ${statusClass}"></div>
            `;
            repoFleet.appendChild(card);
        });
    }

    function addBuildToFeed(data) {
        const empty = buildFeed.querySelector('.empty-feed');
        if (empty) empty.remove();

        const item = document.createElement('div');
        item.className = 'build-item';

        const time = new Date(data.timestamp).toLocaleTimeString();
        const icon = data.status === 'success' ? 'ri-checkbox-circle-line success' :
            data.status === 'failure' ? 'ri-error-warning-line failure' :
                'ri-loader-4-line running';

        item.innerHTML = `
            <i class="build-icon ${icon}"></i>
            <div class="build-details">
                <h5>${data.repoName}</h5>
                <p>Build #${data.buildId.split('-').pop()} • ${data.status}</p>
            </div>
            <div class="build-time">${time}</div>
        `;

        buildFeed.prepend(item);

        // Keep only last 10
        if (buildFeed.children.length > 10) {
            buildFeed.lastElementChild.remove();
        }
    }

    function updateTrafficLight(status) {
        lightRed.classList.remove('active');
        lightYellow.classList.remove('active');
        lightGreen.classList.remove('active');

        if (status === 'failure') {
            lightRed.classList.add('active');
            statusText.textContent = "Immediate Action Required: Build Failed";
        } else if (status === 'in_progress') {
            lightYellow.classList.add('active');
            statusText.textContent = "Deployment in Progress...";
        } else {
            lightGreen.classList.add('active');
            statusText.textContent = "All Systems Operational";
        }
    }

    function showAiDiagnosis(data) {
        diagnosisContent.innerHTML = `
            <div class="diagnosis-header">
                <strong>Analysis for Build #${data.buildId.split('-').pop()}</strong>
            </div>
            <p>${data.aiAnalysis}</p>
        `;
    }

    // Initial load
    refreshSummary();
});
