/**
 * XAYTHEON | Traffic Orchestrator Dashboard Logic
 * 
 * Synchronizes regional health data, failover events, and 
 * handles simulation triggers.
 */

document.addEventListener('DOMContentLoaded', () => {
    // State
    let globalStatus = null;
    let refreshInterval = null;

    init();

    async function init() {
        await fetchStatus();
        startPolling();
    }

    function startPolling() {
        refreshInterval = setInterval(fetchStatus, 3000);
    }

    async function fetchStatus() {
        try {
            const res = await fetch('/api/load-balancer/status');
            const data = await res.json();
            if (data.success) {
                globalStatus = data.data;
                renderDashboard(globalStatus);
            }
        } catch (err) {
            console.error("Traffic API offline.");
        }
    }

    function renderDashboard(status) {
        // Update regional markers
        Object.entries(status.globalHealth).forEach(([id, health]) => {
            const marker = document.getElementById(`region-${id}`);
            if (marker) {
                const healthSpan = marker.querySelector('.health');
                healthSpan.textContent = Math.round(health.score * 100) + '%';

                // Update classification
                marker.classList.remove('unhealthy', 'degraded');
                if (health.status === 'CRITICAL') marker.classList.add('unhealthy');
                else if (health.status === 'DEGRADED') marker.classList.add('degraded');
            }
        });

        // Update Failover Feed
        const feed = document.getElementById('failover-log');
        if (status.recentEvents.length > 0) {
            feed.innerHTML = status.recentEvents.map(e => `
                <div class="failover-event">
                    <span class="time">${new Date(e.timestamp).toLocaleTimeString()}</span>
                    <span class="desc"><strong>FAILOVER:</strong> ${e.from} → ${e.to}</span>
                    <small style="color: #94a3b8">${e.reason}</small>
                </div>
            `).reverse().join('');
        }

        // Render Load Cards in Footer
        const routeDisplay = document.getElementById('active-routes');
        routeDisplay.innerHTML = Object.entries(status.globalHealth).map(([id, h]) => `
            <div class="region-card">
                <span class="name">${id.toUpperCase()}</span>
                <div class="load-bar">
                    <div class="load-fill" style="width: ${h.saturation * 100}%"></div>
                </div>
                <span class="latency">${Math.round(h.latency)}ms</span>
            </div>
        `).join('');

        // Update Total Traffic Mock
        document.getElementById('total-traffic').textContent = (Math.random() * 5 + 10).toFixed(1) + 'k req/s';
    }

    window.simulateFailure = async (regionId) => {
        try {
            const res = await fetch('/api/load-balancer/simulate-failure', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ regionId })
            });
            const data = await res.json();
            if (data.success) {
                // Instantly fetch status to show reaction
                await fetchStatus();
            }
        } catch (err) {
            alert("Simulation request failed.");
        }
    };
});
