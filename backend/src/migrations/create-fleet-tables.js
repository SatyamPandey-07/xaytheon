/**
 * Migration: Create Fleet Management Tables
 * Creates tables for storing fleet configuration and analytics
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Connect to database
const dbPath = path.resolve(__dirname, '../db.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
        process.exit(1);
    }
    console.log('Connected to SQLite database');
});

// SQL statements for fleet tables
const createFleetConfigsTable = `
CREATE TABLE IF NOT EXISTS fleet_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    repositories TEXT NOT NULL, -- JSON string of repositories
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, name)
);`;

const createFleetAnalyticsTable = `
CREATE TABLE IF NOT EXISTS fleet_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fleet_config_id INTEGER NOT NULL,
    snapshot_data TEXT NOT NULL, -- JSON string of fleet analytics
    health_score INTEGER,
    total_repositories INTEGER,
    total_stars INTEGER,
    total_contributors INTEGER,
    total_commits INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fleet_config_id) REFERENCES fleet_configs(id) ON DELETE CASCADE
);`;

const createFleetAlertsTable = `
CREATE TABLE IF NOT EXISTS fleet_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fleet_config_id INTEGER NOT NULL,
    repository_name TEXT,
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    message TEXT NOT NULL,
    recommendation TEXT,
    resolved BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    FOREIGN KEY (fleet_config_id) REFERENCES fleet_configs(id) ON DELETE CASCADE
);`;

const createIndexes = [
    'CREATE INDEX IF NOT EXISTS idx_fleet_configs_user_id ON fleet_configs(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_fleet_analytics_fleet_id ON fleet_analytics(fleet_config_id);',
    'CREATE INDEX IF NOT EXISTS idx_fleet_alerts_fleet_id ON fleet_alerts(fleet_config_id);',
    'CREATE INDEX IF NOT EXISTS idx_fleet_alerts_severity ON fleet_alerts(severity);',
    'CREATE INDEX IF NOT EXISTS idx_fleet_analytics_created_at ON fleet_analytics(created_at);'
];

// Execute migration
db.serialize(() => {
    console.log('Starting Fleet Management migration...');
    
    // Create tables
    db.run(createFleetConfigsTable, (err) => {
        if (err) {
            console.error('Error creating fleet_configs table:', err.message);
            process.exit(1);
        }
        console.log('✓ fleet_configs table created');
    });

    db.run(createFleetAnalyticsTable, (err) => {
        if (err) {
            console.error('Error creating fleet_analytics table:', err.message);
            process.exit(1);
        }
        console.log('✓ fleet_analytics table created');
    });

    db.run(createFleetAlertsTable, (err) => {
        if (err) {
            console.error('Error creating fleet_alerts table:', err.message);
            process.exit(1);
        }
        console.log('✓ fleet_alerts table created');
    });

    // Create indexes
    createIndexes.forEach((sql, index) => {
        db.run(sql, (err) => {
            if (err) {
                console.error(`Error creating index ${index + 1}:`, err.message);
                process.exit(1);
            }
            console.log(`✓ Index ${index + 1} created`);
        });
    });

    // Close database connection
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('✓ Database connection closed');
            console.log('✓ Fleet Management migration completed successfully!');
        }
    });
});