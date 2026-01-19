/**
 * Fleet Models
 * Database operations for fleet management
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to database
const dbPath = path.resolve(__dirname, '../db.sqlite');
const db = new sqlite3.Database(dbPath);

/**
 * Create a new fleet configuration
 */
exports.createFleetConfig = (userId, name, description, repositories) => {
    return new Promise((resolve, reject) => {
        const query = `
            INSERT INTO fleet_configs (user_id, name, description, repositories)
            VALUES (?, ?, ?, ?)
        `;
        
        db.run(query, [userId, name, description, JSON.stringify(repositories)], function (err) {
            if (err) {
                reject(err);
            } else {
                resolve(this.lastID);
            }
        });
    });
};

/**
 * Get fleet configurations for a user
 */
exports.getFleetConfigs = (userId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT id, name, description, repositories, created_at, updated_at, is_active
            FROM fleet_configs
            WHERE user_id = ?
            ORDER BY created_at DESC
        `;
        
        db.all(query, [userId], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                const configs = rows.map(row => ({
                    ...row,
                    repositories: JSON.parse(row.repositories)
                }));
                resolve(configs);
            }
        });
    });
};

/**
 * Get a specific fleet configuration
 */
exports.getFleetConfigById = (configId, userId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT id, user_id, name, description, repositories, created_at, updated_at, is_active
            FROM fleet_configs
            WHERE id = ? AND user_id = ?
        `;
        
        db.get(query, [configId, userId], (err, row) => {
            if (err) {
                reject(err);
            } else if (!row) {
                reject(new Error('Fleet configuration not found'));
            } else {
                resolve({
                    ...row,
                    repositories: JSON.parse(row.repositories)
                });
            }
        });
    });
};

/**
 * Update a fleet configuration
 */
exports.updateFleetConfig = (configId, userId, name, description, repositories) => {
    return new Promise((resolve, reject) => {
        const query = `
            UPDATE fleet_configs
            SET name = ?, description = ?, repositories = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
        `;
        
        db.run(query, [name, description, JSON.stringify(repositories), configId, userId], function (err) {
            if (err) {
                reject(err);
            } else if (this.changes === 0) {
                reject(new Error('Fleet configuration not found or unauthorized'));
            } else {
                resolve(configId);
            }
        });
    });
};

/**
 * Delete a fleet configuration
 */
exports.deleteFleetConfig = (configId, userId) => {
    return new Promise((resolve, reject) => {
        const query = 'DELETE FROM fleet_configs WHERE id = ? AND user_id = ?';
        
        db.run(query, [configId, userId], function (err) {
            if (err) {
                reject(err);
            } else if (this.changes === 0) {
                reject(new Error('Fleet configuration not found or unauthorized'));
            } else {
                resolve(true);
            }
        });
    });
};

/**
 * Create a fleet analytics snapshot
 */
exports.createFleetAnalytics = (fleetConfigId, snapshotData, healthScore, metrics) => {
    return new Promise((resolve, reject) => {
        const query = `
            INSERT INTO fleet_analytics (
                fleet_config_id, snapshot_data, health_score, 
                total_repositories, total_stars, total_contributors, total_commits
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        db.run(
            query,
            [
                fleetConfigId,
                JSON.stringify(snapshotData),
                healthScore,
                metrics.totalRepositories || 0,
                metrics.totalStars || 0,
                metrics.totalContributors || 0,
                metrics.totalCommits || 0
            ],
            function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            }
        );
    });
};

/**
 * Get analytics snapshots for a fleet configuration
 */
exports.getFleetAnalytics = (fleetConfigId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT id, fleet_config_id, snapshot_data, health_score, 
                   total_repositories, total_stars, total_contributors, total_commits, created_at
            FROM fleet_analytics
            WHERE fleet_config_id = ?
            ORDER BY created_at DESC
        `;
        
        db.all(query, [fleetConfigId], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                const analytics = rows.map(row => ({
                    ...row,
                    snapshot_data: JSON.parse(row.snapshot_data)
                }));
                resolve(analytics);
            }
        });
    });
};

/**
 * Create a fleet alert
 */
exports.createFleetAlert = (fleetConfigId, repositoryName, alertType, severity, message, recommendation) => {
    return new Promise((resolve, reject) => {
        const query = `
            INSERT INTO fleet_alerts (
                fleet_config_id, repository_name, alert_type, severity, message, recommendation
            )
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        db.run(query, [fleetConfigId, repositoryName, alertType, severity, message, recommendation], function (err) {
            if (err) {
                reject(err);
            } else {
                resolve(this.lastID);
            }
        });
    });
};

/**
 * Get unresolved alerts for a fleet configuration
 */
exports.getUnresolvedFleetAlerts = (fleetConfigId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT id, repository_name, alert_type, severity, message, recommendation, created_at
            FROM fleet_alerts
            WHERE fleet_config_id = ? AND resolved = 0
            ORDER BY created_at DESC
        `;
        
        db.all(query, [fleetConfigId], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

/**
 * Resolve a fleet alert
 */
exports.resolveFleetAlert = (alertId, fleetConfigId) => {
    return new Promise((resolve, reject) => {
        const query = `
            UPDATE fleet_alerts
            SET resolved = 1, resolved_at = CURRENT_TIMESTAMP
            WHERE id = ? AND fleet_config_id = ?
        `;
        
        db.run(query, [alertId, fleetConfigId], function (err) {
            if (err) {
                reject(err);
            } else if (this.changes === 0) {
                reject(new Error('Alert not found or unauthorized'));
            } else {
                resolve(true);
            }
        });
    });
};

/**
 * Get fleet health trend
 */
exports.getFleetHealthTrend = (fleetConfigId, days = 30) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT health_score, created_at
            FROM fleet_analytics
            WHERE fleet_config_id = ?
            AND created_at >= datetime('now', '-${days} days')
            ORDER BY created_at ASC
        `;
        
        db.all(query, [fleetConfigId], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};