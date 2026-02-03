/**
 * DevOps War-Room JavaScript
 * Real-time incident monitoring and collaboration
 */

class WarRoomDashboard {
    constructor() {
        this.socket = null;
        this.events = [];
        this.incidents = [];
        this.pinnedIncident = null;
        this.isPaused = false;
        this.filterCritical = false;
        this.audioContext = null;
        this.emergencyMode = false;
        this.userId = 'user-' + Math.random().toString(36).substr(2, 9);
        
        this.init();
    }

    /**
     * Initialize dashboard
     */
    init() {
        this.setupWebSocket();
        this.setupEventListeners();
        this.setupAudioContext();
        this.updateConnectionStatus('connecting');
    }

    /**
     * Setup WebSocket connection
     */
    setupWebSocket() {
        // Connect to War-Room namespace
        this.socket = io('http://localhost:3000/war-room', {
            transports: ['websocket'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 10
        });

        // Connection events
        this.socket.on('connect', () => {
            console.log('Connected to War-Room');
            this.updateConnectionStatus('connected');
            
            // Register user
            this.socket.emit('register', {
                userId: this.userId,
                username: 'Engineer-' + this.userId.slice(-4),
                avatar: `https://ui-avatars.com/api/?name=${this.userId}`
            });

            // Subscribe to event stream
            this.socket.emit('subscribe:events');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from War-Room');
            this.updateConnectionStatus('disconnected');
        });

        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.updateConnectionStatus('disconnected');
        });

        // Event stream handlers
        this.socket.on('events:initial', (events) => {
            this.events = events;
            this.renderEventStream();
        });

        this.socket.on('event:new', (event) => {
            this.events.unshift(event);
            if (this.events.length > 100) {
                this.events.pop();
            }
            this.renderEventStream();
            
            // Check if critical for alert
            if (event.priority >= 9) {
                this.showCriticalAlert(event);
            }
        });

        this.socket.on('event:acknowledged', (data) => {
            const event = this.events.find(e => e.id === data.eventId);
            if (event) {
                event.acknowledged = true;
                this.renderEventStream();
            }
        });

        // Incident handlers
        this.socket.on('incident:created', ({ incident, analysis }) => {
            this.incidents.unshift(incident);
            this.renderIncidentsList();
        });

        this.socket.on('incident:pinned', ({ incident, analysis }) => {
            this.pinnedIncident = incident;
            this.renderPinnedIncident(incident, analysis);
        });

        this.socket.on('incident:unpinned', () => {
            this.pinnedIncident = null;
            this.showNoIncidentState();
        });

        this.socket.on('incident:updated', ({ incident }) => {
            // Update in list
            const index = this.incidents.findIndex(i => i.id === incident.id);
            if (index >= 0) {
                this.incidents[index] = incident;
                this.renderIncidentsList();
            }
            
            // Update if pinned
            if (this.pinnedIncident && this.pinnedIncident.id === incident.id) {
                this.pinnedIncident = incident;
                this.renderPinnedIncident(incident);
            }
        });

        this.socket.on('incidents:all', (incidents) => {
            this.incidents = incidents;
            this.renderIncidentsList();
        });

        // Statistics
        this.socket.on('stats:update', (stats) => {
            this.updateStatistics(stats);
        });

        // User list
        this.socket.on('users:list', (users) => {
            document.getElementById('users-count').textContent = users.length;
        });

        // Critical alerts
        this.socket.on('alert:critical', (event) => {
            this.showCriticalAlert(event);
        });

        // Errors
        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
            this.showNotification('Error: ' + error.message, 'error');
        });

        // Request initial stats
        setInterval(() => {
            if (this.socket.connected) {
                this.socket.emit('stats:request');
            }
        }, 5000);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Stream controls
        document.getElementById('pause-stream')?.addEventListener('click', () => {
            this.isPaused = !this.isPaused;
            const btn = document.getElementById('pause-stream');
            btn.textContent = this.isPaused ? '▶ Resume' : '⏸ Pause';
            btn.classList.toggle('active', this.isPaused);
        });

        document.getElementById('filter-critical')?.addEventListener('click', () => {
            this.filterCritical = !this.filterCritical;
            const btn = document.getElementById('filter-critical');
            btn.classList.toggle('active', this.filterCritical);
            this.renderEventStream();
        });

        // Simulate buttons
        document.getElementById('simulate-deploy-fail')?.addEventListener('click', () => {
            this.simulateDeploymentFailure();
        });

        document.getElementById('simulate-prod-error')?.addEventListener('click', () => {
            this.simulateProductionError();
        });

        // Incident actions
        document.getElementById('unpin-btn')?.addEventListener('click', () => {
            this.unpinIncident();
        });

        document.getElementById('assign-btn')?.addEventListener('click', () => {
            this.assignIncident();
        });

        document.getElementById('acknowledge-btn')?.addEventListener('click', () => {
            this.acknowledgeIncident();
        });

        document.getElementById('resolve-btn')?.addEventListener('click', () => {
            this.resolveIncident();
        });

        document.getElementById('add-comment-btn')?.addEventListener('click', () => {
            this.addComment();
        });

        // Emergency mode
        document.getElementById('emergency-btn')?.addEventListener('click', () => {
            this.toggleEmergencyMode();
        });

        document.getElementById('exit-emergency')?.addEventListener('click', () => {
            this.toggleEmergencyMode();
        });

        // Incident filter
        document.getElementById('incident-filter')?.addEventListener('change', (e) => {
            this.renderIncidentsList(e.target.value);
        });
    }

    /**
     * Setup Web Audio API for alerts
     */
    setupAudioContext() {
        // Initialize on user interaction
        document.addEventListener('click', () => {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
        }, { once: true });
    }

    /**
     * Play alert sound
     */
    playAlertSound(frequency = 800, duration = 200, type = 'warning') {
        if (!this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        if (type === 'critical') {
            oscillator.frequency.value = 1200;
            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.5);
            
            // Play second beep
            setTimeout(() => {
                this.playAlertSound(1200, 200, 'warning');
            }, 300);
        } else {
            oscillator.frequency.value = frequency;
            gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration / 1000);
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration / 1000);
        }
    }

    /**
     * Update connection status
     */
    updateConnectionStatus(status) {
        const badge = document.getElementById('connection-status');
        badge.textContent = status.toUpperCase();
        badge.className = 'status-badge ' + status;
    }

    /**
     * Render event stream
     */
    renderEventStream() {
        if (this.isPaused) return;

        const container = document.getElementById('event-stream');
        if (!container) return;

        let events = this.events;
        if (this.filterCritical) {
            events = events.filter(e => e.priority >= 8);
        }

        container.innerHTML = events.map(event => `
            <div class="event-item ${event.type === 'deployment_failure' || event.priority >= 9 ? 'critical' : ''}"
                 onclick="warRoom.pinEvent('${event.id}')">
                <div class="event-title">${this.escapeHtml(event.title)}</div>
                <div class="event-description">${this.escapeHtml(event.description || '')}</div>
                <div class="event-meta">
                    <span class="event-time">${this.formatTimeAgo(event.timestamp)}</span>
                    <span class="event-priority">Priority: ${event.priority}</span>
                </div>
            </div>
        `).join('');
    }

    /**
     * Pin event as incident
     */
    pinEvent(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;

        this.socket.emit('incident:create', {
            event,
            userId: this.userId
        });
    }

    /**
     * Render pinned incident
     */
    renderPinnedIncident(incident, analysis) {
        document.getElementById('no-incident').classList.add('hidden');
        const container = document.getElementById('pinned-incident');
        container.classList.remove('hidden');

        // Update header
        document.getElementById('incident-title').textContent = incident.title;
        document.getElementById('incident-id').textContent = incident.id;
        document.getElementById('incident-severity').textContent = incident.severity.toUpperCase();
        document.getElementById('incident-severity').className = `severity-badge ${incident.severity}`;
        document.getElementById('incident-status').textContent = incident.status.toUpperCase();
        document.getElementById('incident-time').textContent = this.formatTimeAgo(incident.createdAt);

        // AI Analysis
        if (analysis || incident.aiHypothesis) {
            const analysisData = analysis || {
                hypothesis: incident.aiHypothesis,
                confidence: 0.75,
                suggestedActions: incident.suggestedActions
            };
            
            document.getElementById('ai-analysis').innerHTML = `
                <p>${this.escapeHtml(analysisData.hypothesis)}</p>
                ${analysisData.category ? `<p><strong>Category:</strong> ${analysisData.category}</p>` : ''}
            `;
            
            const confidence = Math.round((analysisData.confidence || 0.75) * 100);
            document.getElementById('confidence-bar').style.width = confidence + '%';
            document.getElementById('confidence-value').textContent = confidence + '%';

            // Suggested actions
            if (analysisData.suggestedActions && analysisData.suggestedActions.length > 0) {
                document.getElementById('suggested-actions').innerHTML = analysisData.suggestedActions
                    .map(action => `<li>${this.escapeHtml(action)}</li>`)
                    .join('');
            }
        }

        // Related PRs
        if (incident.relatedPRs && incident.relatedPRs.length > 0) {
            document.getElementById('related-prs').innerHTML = incident.relatedPRs
                .map(pr => `
                    <div class="related-item">
                        <a href="${pr.url}" target="_blank">#${pr.number}: ${this.escapeHtml(pr.title)}</a>
                        <div>by ${pr.author} • ${this.formatTimeAgo(new Date(pr.mergedAt).getTime())}</div>
                    </div>
                `).join('');
        } else {
            document.getElementById('related-prs').innerHTML = '<div class="related-item">No related PRs found</div>';
        }

        // Related developers
        if (incident.relatedDevelopers && incident.relatedDevelopers.length > 0) {
            document.getElementById('related-devs').innerHTML = incident.relatedDevelopers
                .map(dev => `<div class="related-item">@${dev}</div>`)
                .join('');
        } else {
            document.getElementById('related-devs').innerHTML = '<div class="related-item">No developers identified</div>';
        }

        // Timeline
        if (incident.timeline && incident.timeline.length > 0) {
            document.getElementById('incident-timeline').innerHTML = incident.timeline
                .map(item => `
                    <div class="timeline-item">
                        <strong>${item.action}</strong> by ${item.userId}
                        <div>${this.escapeHtml(item.details)}</div>
                        <div class="event-time">${this.formatTimeAgo(item.timestamp)}</div>
                    </div>
                `).join('');
        }

        // Scroll to top
        container.scrollTop = 0;
    }

    /**
     * Show no incident state
     */
    showNoIncidentState() {
        document.getElementById('pinned-incident').classList.add('hidden');
        document.getElementById('no-incident').classList.remove('hidden');
    }

    /**
     * Unpin incident
     */
    unpinIncident() {
        this.socket.emit('incident:unpin', { userId: this.userId });
    }

    /**
     * Assign incident
     */
    assignIncident() {
        if (!this.pinnedIncident) return;
        
        const assignee = prompt('Enter user ID to assign:');
        if (assignee) {
            this.socket.emit('incident:assign', {
                incidentId: this.pinnedIncident.id,
                userIds: [assignee],
                assignedBy: this.userId
            });
        }
    }

    /**
     * Acknowledge incident
     */
    acknowledgeIncident() {
        if (!this.pinnedIncident) return;
        
        this.socket.emit('incident:status', {
            incidentId: this.pinnedIncident.id,
            status: 'in_progress',
            userId: this.userId,
            notes: 'Acknowledged and investigating'
        });
    }

    /**
     * Resolve incident
     */
    resolveIncident() {
        if (!this.pinnedIncident) return;
        
        const notes = prompt('Resolution notes:');
        if (notes !== null) {
            this.socket.emit('incident:status', {
                incidentId: this.pinnedIncident.id,
                status: 'resolved',
                userId: this.userId,
                notes
            });
        }
    }

    /**
     * Add comment
     */
    addComment() {
        if (!this.pinnedIncident) return;
        
        const textarea = document.getElementById('comment-text');
        const comment = textarea.value.trim();
        
        if (comment) {
            this.socket.emit('incident:comment', {
                incidentId: this.pinnedIncident.id,
                userId: this.userId,
                comment
            });
            textarea.value = '';
        }
    }

    /**
     * Render incidents list
     */
    renderIncidentsList(filter = 'open') {
        const container = document.getElementById('incidents-list');
        if (!container) return;

        let incidents = this.incidents;
        if (filter !== 'all') {
            incidents = incidents.filter(i => i.status === filter);
        }

        container.innerHTML = incidents.map(incident => `
            <div class="incident-card ${incident.severity === 'critical' ? 'critical' : ''}"
                 onclick="warRoom.pinIncidentById('${incident.id}')">
                <div class="event-title">${this.escapeHtml(incident.title)}</div>
                <div class="incident-meta">
                    <span class="severity-badge ${incident.severity}">${incident.severity}</span>
                    <span class="status-badge">${incident.status}</span>
                </div>
                <div class="event-time">${this.formatTimeAgo(incident.createdAt)}</div>
            </div>
        `).join('');
    }

    /**
     * Pin incident by ID
     */
    pinIncidentById(incidentId) {
        this.socket.emit('incident:pin', {
            incidentId,
            userId: this.userId
        });
    }

    /**
     * Update statistics
     */
    updateStatistics(stats) {
        document.getElementById('events-count').textContent = stats.events?.eventsPerMinute || 0;
        document.getElementById('critical-count').textContent = stats.events?.bySeverity?.critical || 0;
        document.getElementById('incidents-count').textContent = stats.incidents?.total || 0;
        document.getElementById('mttr-stat').textContent = (stats.incidents?.avgMTTR || 0) + 's';
    }

    /**
     * Show critical alert
     */
    showCriticalAlert(event) {
        // Play alert sound
        this.playAlertSound(1200, 300, 'critical');

        // Flash border
        const container = document.getElementById('war-room-container');
        container.style.border = '5px solid var(--emergency-red)';
        setTimeout(() => {
            container.style.border = 'none';
        }, 2000);

        // Show notification
        this.showNotification(`🚨 Critical Event: ${event.title}`, 'critical');
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Check if browser supports notifications
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('DevOps War-Room', {
                body: message,
                icon: '/assets/logo/logo.png'
            });
        }
    }

    /**
     * Toggle emergency mode
     */
    toggleEmergencyMode() {
        this.emergencyMode = !this.emergencyMode;
        const overlay = document.getElementById('emergency-overlay');
        overlay.classList.toggle('hidden', !this.emergencyMode);

        if (this.emergencyMode) {
            this.playAlertSound(1500, 500, 'critical');
        }
    }

    /**
     * Simulate deployment failure
     */
    simulateDeploymentFailure() {
        // This would call backend API in production
        fetch('http://localhost:3000/api/war-room/simulate/deployment-failure', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }).then(() => {
            this.showNotification('Deployment failure simulated', 'info');
        }).catch(err => {
            console.error('Simulation error:', err);
        });
    }

    /**
     * Simulate production error
     */
    simulateProductionError() {
        // This would call backend API in production
        fetch('http://localhost:3000/api/war-room/simulate/production-error', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }).then(() => {
            this.showNotification('Production error simulated', 'info');
        }).catch(err => {
            console.error('Simulation error:', err);
        });
    }

    /**
     * Format time ago
     */
    formatTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        
        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    }

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize War-Room
let warRoom;
document.addEventListener('DOMContentLoaded', () => {
    warRoom = new WarRoomDashboard();

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
});
