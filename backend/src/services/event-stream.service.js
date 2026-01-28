/**
 * Event Stream Aggregation Service
 * Collects and streams real-time repository events
 */

const axios = require('axios');

class EventStreamService {
    constructor() {
        this.eventBuffer = [];
        this.maxBufferSize = 1000;
        this.listeners = new Set();
        
        // Event type priorities
        this.priorities = {
            'deployment_failure': 10,
            'production_error': 9,
            'build_failure': 8,
            'security_alert': 8,
            'deployment_success': 5,
            'pr_merged': 4,
            'commit': 3,
            'pr_opened': 2,
            'comment': 1
        };
        
        // Event type colors
        this.eventColors = {
            'deployment_failure': '#dc3545',
            'production_error': '#ff1744',
            'build_failure': '#fd7e14',
            'security_alert': '#9c27b0',
            'deployment_success': '#28a745',
            'pr_merged': '#17a2b8',
            'commit': '#6c757d',
            'pr_opened': '#007bff',
            'comment': '#6c757d'
        };
    }

    /**
     * Add event to stream
     */
    addEvent(event) {
        const enrichedEvent = {
            ...event,
            id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            priority: this.priorities[event.type] || 1,
            color: this.eventColors[event.type] || '#6c757d',
            acknowledged: false
        };

        this.eventBuffer.unshift(enrichedEvent);
        
        // Trim buffer
        if (this.eventBuffer.length > this.maxBufferSize) {
            this.eventBuffer = this.eventBuffer.slice(0, this.maxBufferSize);
        }

        // Notify all listeners
        this.notifyListeners(enrichedEvent);

        return enrichedEvent;
    }

    /**
     * Register event listener
     */
    addListener(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    /**
     * Notify all listeners of new event
     */
    notifyListeners(event) {
        this.listeners.forEach(listener => {
            try {
                listener(event);
            } catch (error) {
                console.error('Listener error:', error);
            }
        });
    }

    /**
     * Get recent events
     */
    getRecentEvents(limit = 50, filter = null) {
        let events = [...this.eventBuffer];

        if (filter) {
            if (filter.type) {
                events = events.filter(e => e.type === filter.type);
            }
            if (filter.severity) {
                events = events.filter(e => e.priority >= filter.severity);
            }
            if (filter.repository) {
                events = events.filter(e => e.repository === filter.repository);
            }
        }

        return events.slice(0, limit);
    }

    /**
     * Get event statistics
     */
    getStatistics(timeWindow = 3600000) { // Default 1 hour
        const now = Date.now();
        const recentEvents = this.eventBuffer.filter(e => 
            now - e.timestamp < timeWindow
        );

        const typeCount = {};
        const severityCount = { critical: 0, warning: 0, info: 0 };
        const repositories = new Set();

        recentEvents.forEach(event => {
            typeCount[event.type] = (typeCount[event.type] || 0) + 1;
            
            if (event.priority >= 8) severityCount.critical++;
            else if (event.priority >= 5) severityCount.warning++;
            else severityCount.info++;
            
            if (event.repository) repositories.add(event.repository);
        });

        return {
            total: recentEvents.length,
            byType: typeCount,
            bySeverity: severityCount,
            repositories: repositories.size,
            timeWindow: timeWindow / 1000 / 60, // minutes
            eventsPerMinute: (recentEvents.length / (timeWindow / 1000 / 60)).toFixed(2)
        };
    }

    /**
     * Simulate GitHub Actions events
     */
    async fetchGitHubActions(owner, repo, token) {
        try {
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            
            const response = await axios.get(
                `https://api.github.com/repos/${owner}/${repo}/actions/runs`,
                { 
                    headers,
                    params: { per_page: 20 }
                }
            );

            const runs = response.data.workflow_runs || [];
            
            runs.forEach(run => {
                const eventType = run.conclusion === 'failure' ? 'build_failure' :
                                 run.conclusion === 'success' ? 'deployment_success' :
                                 'build_in_progress';

                if (run.conclusion) {
                    this.addEvent({
                        type: eventType,
                        title: `Workflow: ${run.name}`,
                        description: `${run.display_title} - ${run.conclusion}`,
                        repository: `${owner}/${repo}`,
                        url: run.html_url,
                        actor: run.actor?.login,
                        branch: run.head_branch,
                        metadata: {
                            workflowId: run.id,
                            runNumber: run.run_number,
                            event: run.event,
                            conclusion: run.conclusion
                        }
                    });
                }
            });

            return runs.length;
        } catch (error) {
            console.error('GitHub Actions fetch error:', error.message);
            return 0;
        }
    }

    /**
     * Fetch recent commits
     */
    async fetchCommits(owner, repo, token) {
        try {
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            
            const response = await axios.get(
                `https://api.github.com/repos/${owner}/${repo}/commits`,
                { 
                    headers,
                    params: { per_page: 10 }
                }
            );

            const commits = response.data || [];
            
            commits.forEach(commit => {
                this.addEvent({
                    type: 'commit',
                    title: commit.commit.message.split('\n')[0],
                    description: `by ${commit.commit.author.name}`,
                    repository: `${owner}/${repo}`,
                    url: commit.html_url,
                    actor: commit.author?.login || commit.commit.author.name,
                    branch: 'main',
                    metadata: {
                        sha: commit.sha.substring(0, 7),
                        additions: commit.stats?.additions || 0,
                        deletions: commit.stats?.deletions || 0
                    }
                });
            });

            return commits.length;
        } catch (error) {
            console.error('Commits fetch error:', error.message);
            return 0;
        }
    }

    /**
     * Fetch pull requests
     */
    async fetchPullRequests(owner, repo, token) {
        try {
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            
            const response = await axios.get(
                `https://api.github.com/repos/${owner}/${repo}/pulls`,
                { 
                    headers,
                    params: { state: 'all', per_page: 10 }
                }
            );

            const prs = response.data || [];
            
            prs.forEach(pr => {
                const eventType = pr.merged_at ? 'pr_merged' : 'pr_opened';
                
                this.addEvent({
                    type: eventType,
                    title: pr.title,
                    description: `#${pr.number} by ${pr.user.login}`,
                    repository: `${owner}/${repo}`,
                    url: pr.html_url,
                    actor: pr.user.login,
                    metadata: {
                        number: pr.number,
                        state: pr.state,
                        merged: !!pr.merged_at,
                        additions: pr.additions,
                        deletions: pr.deletions
                    }
                });
            });

            return prs.length;
        } catch (error) {
            console.error('PRs fetch error:', error.message);
            return 0;
        }
    }

    /**
     * Simulate production errors
     */
    simulateProductionError(severity = 'high') {
        const errorTypes = [
            'NullPointerException',
            'OutOfMemoryError',
            'DatabaseConnectionTimeout',
            'APIRateLimitExceeded',
            'AuthenticationFailure',
            'ServiceUnavailable',
            'InvalidConfiguration',
            'CacheCorruption'
        ];

        const services = ['auth-service', 'api-gateway', 'database', 'cache', 'worker'];
        const errorType = errorTypes[Math.floor(Math.random() * errorTypes.length)];
        const service = services[Math.floor(Math.random() * services.length)];

        return this.addEvent({
            type: 'production_error',
            title: `${errorType} in ${service}`,
            description: `Production incident detected - ${severity} severity`,
            severity,
            service,
            metadata: {
                errorType,
                stackTrace: `at ${service}.handler.process()\n  at runtime.invoke()`,
                affectedUsers: Math.floor(Math.random() * 1000),
                region: ['us-east-1', 'eu-west-1', 'ap-south-1'][Math.floor(Math.random() * 3)]
            }
        });
    }

    /**
     * Simulate deployment failure
     */
    simulateDeploymentFailure(repository, environment = 'production') {
        const reasons = [
            'Health check failed',
            'Container failed to start',
            'Database migration failed',
            'Configuration error',
            'Insufficient resources',
            'Rollback triggered'
        ];

        const reason = reasons[Math.floor(Math.random() * reasons.length)];

        return this.addEvent({
            type: 'deployment_failure',
            title: `Deployment failed: ${environment}`,
            description: reason,
            repository,
            environment,
            metadata: {
                reason,
                deploymentId: `deploy_${Date.now()}`,
                previousVersion: 'v1.2.3',
                attemptedVersion: 'v1.2.4',
                duration: Math.floor(Math.random() * 300) + 60
            }
        });
    }

    /**
     * Acknowledge event
     */
    acknowledgeEvent(eventId, userId) {
        const event = this.eventBuffer.find(e => e.id === eventId);
        if (event) {
            event.acknowledged = true;
            event.acknowledgedBy = userId;
            event.acknowledgedAt = Date.now();
            this.notifyListeners({ type: 'event_acknowledged', event });
            return true;
        }
        return false;
    }

    /**
     * Clear event buffer
     */
    clearBuffer() {
        this.eventBuffer = [];
    }

    /**
     * Get event by ID
     */
    getEvent(eventId) {
        return this.eventBuffer.find(e => e.id === eventId);
    }
}

module.exports = new EventStreamService();
