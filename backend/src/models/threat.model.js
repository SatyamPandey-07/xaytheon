/**
 * XAYTHEON - Threat Model
 * 
 * Defines the schema for detected security threats and vulnerabilities.
 */

class Threat {
    constructor(data = {}) {
        this.id = data.id || `THR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        this.type = data.type || 'VULNERABILITY'; // VULNERABILITY, ATTACK_IN_PROGRESS, ANOMALY
        this.severity = data.severity || 'LOW'; // CRITICAL, HIGH, MEDIUM, LOW
        this.source = data.source || 'AI_ANALYZER';
        this.target = data.target || 'API_ENDPOINT';
        this.description = data.description || '';
        this.remediation = data.remediation || '';
        this.status = data.status || 'OPEN'; // OPEN, INVESTIGATING, FIXED, IGNORED
        this.timestamp = data.timestamp || new Date().toISOString();
        this.metadata = data.metadata || {};
    }

    static fromJSON(json) {
        return new Threat(json);
    }

    toJSON() {
        return {
            id: this.id,
            type: this.type,
            severity: this.severity,
            source: this.source,
            target: this.target,
            description: this.description,
            remediation: this.remediation,
            status: this.status,
            timestamp: this.timestamp,
            metadata: this.metadata
        };
    }
}

module.exports = Threat;
