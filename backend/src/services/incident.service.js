/**
 * Incident Management Service
 * Handles incident pinning, tracking, and resolution
 */

const axios = require('axios');

class IncidentService {
    constructor() {
        this.incidents = new Map();
        this.pinnedIncident = null;
        this.incidentCounter = 1;
    }

    /**
     * Create incident from event
     */
    createIncident(event, userId) {
        const incidentId = `INC-${Date.now()}-${this.incidentCounter++}`;
        
        const incident = {
            id: incidentId,
            eventId: event.id,
            type: event.type,
            title: event.title,
            description: event.description,
            severity: this.calculateSeverity(event),
            status: 'open',
            createdAt: Date.now(),
            createdBy: userId,
            repository: event.repository,
            environment: event.environment || 'unknown',
            metadata: event.metadata || {},
            
            // Incident tracking
            assignedTo: [],
            watchers: [userId],
            timeline: [{
                timestamp: Date.now(),
                action: 'created',
                userId,
                details: 'Incident created'
            }],
            
            // Related data
            relatedPRs: [],
            relatedDevelopers: [],
            affectedServices: [],
            
            // AI analysis
            rootCause: null,
            aiHypothesis: null,
            suggestedActions: [],
            
            // Metrics
            impactScore: 0,
            affectedUsers: event.metadata?.affectedUsers || 0,
            downtime: 0,
            mttr: null // Mean Time To Resolve
        };

        this.incidents.set(incidentId, incident);
        return incident;
    }

    /**
     * Calculate incident severity
     */
    calculateSeverity(event) {
        if (event.type === 'production_error' && event.severity === 'critical') {
            return 'critical';
        }
        if (event.type === 'deployment_failure' && event.environment === 'production') {
            return 'critical';
        }
        if (event.type === 'security_alert') {
            return 'high';
        }
        if (event.type === 'build_failure' || event.type === 'deployment_failure') {
            return 'medium';
        }
        return 'low';
    }

    /**
     * Pin incident to center (War-Room focus)
     */
    async pinIncident(incidentId, userId) {
        const incident = this.incidents.get(incidentId);
        if (!incident) {
            throw new Error('Incident not found');
        }

        // Enrich incident with related data
        await this.enrichIncident(incident);

        this.pinnedIncident = incident;
        
        // Add to timeline
        incident.timeline.push({
            timestamp: Date.now(),
            action: 'pinned',
            userId,
            details: 'Incident pinned to War-Room'
        });

        return incident;
    }

    /**
     * Unpin incident
     */
    unpinIncident(userId) {
        if (this.pinnedIncident) {
            this.pinnedIncident.timeline.push({
                timestamp: Date.now(),
                action: 'unpinned',
                userId,
                details: 'Incident unpinned from War-Room'
            });
        }
        
        const wasPin ned = this.pinnedIncident;
        this.pinnedIncident = null;
        return wasPinned;
    }

    /**
     * Get pinned incident
     */
    getPinnedIncident() {
        return this.pinnedIncident;
    }

    /**
     * Enrich incident with related data
     */
    async enrichIncident(incident) {
        try {
            // Extract repository info
            if (incident.repository) {
                const [owner, repo] = incident.repository.split('/');
                
                // Fetch related PRs
                const prs = await this.fetchRelatedPRs(owner, repo, incident);
                incident.relatedPRs = prs;
                
                // Extract developers
                const developers = new Set();
                prs.forEach(pr => {
                    if (pr.author) developers.add(pr.author);
                    if (pr.reviewers) pr.reviewers.forEach(r => developers.add(r));
                });
                incident.relatedDevelopers = Array.from(developers);
            }

            // Identify affected services
            if (incident.metadata?.service) {
                incident.affectedServices.push(incident.metadata.service);
            }

            return incident;
        } catch (error) {
            console.error('Incident enrichment error:', error.message);
            return incident;
        }
    }

    /**
     * Fetch related pull requests
     */
    async fetchRelatedPRs(owner, repo, incident) {
        try {
            // Fetch recent merged PRs
            const response = await axios.get(
                `https://api.github.com/repos/${owner}/${repo}/pulls`,
                {
                    params: {
                        state: 'closed',
                        sort: 'updated',
                        direction: 'desc',
                        per_page: 10
                    }
                }
            );

            const prs = response.data || [];
            
            return prs
                .filter(pr => pr.merged_at)
                .map(pr => ({
                    number: pr.number,
                    title: pr.title,
                    url: pr.html_url,
                    author: pr.user.login,
                    mergedAt: pr.merged_at,
                    reviewers: pr.requested_reviewers?.map(r => r.login) || []
                }))
                .slice(0, 5);
        } catch (error) {
            console.error('PR fetch error:', error.message);
            return [];
        }
    }

    /**
     * Update incident status
     */
    updateStatus(incidentId, status, userId, notes = '') {
        const incident = this.incidents.get(incidentId);
        if (!incident) {
            throw new Error('Incident not found');
        }

        const previousStatus = incident.status;
        incident.status = status;

        incident.timeline.push({
            timestamp: Date.now(),
            action: 'status_changed',
            userId,
            details: `Status changed from ${previousStatus} to ${status}`,
            notes
        });

        // Calculate MTTR if resolved
        if (status === 'resolved') {
            incident.mttr = Date.now() - incident.createdAt;
            incident.resolvedAt = Date.now();
            incident.resolvedBy = userId;
        }

        return incident;
    }

    /**
     * Assign incident to user
     */
    assignIncident(incidentId, userIds, assignedBy) {
        const incident = this.incidents.get(incidentId);
        if (!incident) {
            throw new Error('Incident not found');
        }

        incident.assignedTo = Array.isArray(userIds) ? userIds : [userIds];
        
        incident.timeline.push({
            timestamp: Date.now(),
            action: 'assigned',
            userId: assignedBy,
            details: `Assigned to ${incident.assignedTo.join(', ')}`
        });

        return incident;
    }

    /**
     * Add comment to incident
     */
    addComment(incidentId, userId, comment) {
        const incident = this.incidents.get(incidentId);
        if (!incident) {
            throw new Error('Incident not found');
        }

        incident.timeline.push({
            timestamp: Date.now(),
            action: 'comment',
            userId,
            details: comment
        });

        return incident;
    }

    /**
     * Set AI root cause analysis
     */
    setRootCause(incidentId, rootCause, hypothesis, actions) {
        const incident = this.incidents.get(incidentId);
        if (!incident) {
            throw new Error('Incident not found');
        }

        incident.rootCause = rootCause;
        incident.aiHypothesis = hypothesis;
        incident.suggestedActions = actions;

        incident.timeline.push({
            timestamp: Date.now(),
            action: 'ai_analysis',
            userId: 'ai-bot',
            details: 'AI root cause analysis completed'
        });

        return incident;
    }

    /**
     * Get all incidents
     */
    getAllIncidents(filter = {}) {
        let incidents = Array.from(this.incidents.values());

        if (filter.status) {
            incidents = incidents.filter(i => i.status === filter.status);
        }

        if (filter.severity) {
            incidents = incidents.filter(i => i.severity === filter.severity);
        }

        if (filter.repository) {
            incidents = incidents.filter(i => i.repository === filter.repository);
        }

        // Sort by created date (newest first)
        incidents.sort((a, b) => b.createdAt - a.createdAt);

        return incidents;
    }

    /**
     * Get incident by ID
     */
    getIncident(incidentId) {
        return this.incidents.get(incidentId);
    }

    /**
     * Get incident statistics
     */
    getStatistics(timeWindow = 86400000) { // 24 hours
        const now = Date.now();
        const recentIncidents = Array.from(this.incidents.values()).filter(i =>
            now - i.createdAt < timeWindow
        );

        const stats = {
            total: recentIncidents.length,
            open: recentIncidents.filter(i => i.status === 'open').length,
            inProgress: recentIncidents.filter(i => i.status === 'in_progress').length,
            resolved: recentIncidents.filter(i => i.status === 'resolved').length,
            
            bySeverity: {
                critical: recentIncidents.filter(i => i.severity === 'critical').length,
                high: recentIncidents.filter(i => i.severity === 'high').length,
                medium: recentIncidents.filter(i => i.severity === 'medium').length,
                low: recentIncidents.filter(i => i.severity === 'low').length
            },

            avgMTTR: 0,
            totalAffectedUsers: 0
        };

        // Calculate average MTTR
        const resolvedWithMTTR = recentIncidents.filter(i => i.mttr);
        if (resolvedWithMTTR.length > 0) {
            const totalMTTR = resolvedWithMTTR.reduce((sum, i) => sum + i.mttr, 0);
            stats.avgMTTR = Math.round(totalMTTR / resolvedWithMTTR.length / 1000); // seconds
        }

        // Total affected users
        stats.totalAffectedUsers = recentIncidents.reduce((sum, i) => sum + (i.affectedUsers || 0), 0);

        return stats;
    }

    /**
     * Delete incident
     */
    deleteIncident(incidentId) {
        return this.incidents.delete(incidentId);
    }

    /**
     * Clear all incidents
     */
    clearAll() {
        this.incidents.clear();
        this.pinnedIncident = null;
        this.incidentCounter = 1;
    }
}

module.exports = new IncidentService();
