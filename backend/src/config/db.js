const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "..", "..", "users.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error(err.message);
  else console.log("📦 Connected to SQLite database");
});

db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT,
    github_id TEXT UNIQUE,
    username TEXT,
    avatar_url TEXT,
    refresh_token TEXT,
    view_history TEXT DEFAULT '[]',
    password_reset_token TEXT,
    password_reset_expires DATETIME,
    preferred_language TEXT DEFAULT 'en',
    preferences TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Migration for existing tables
db.run("ALTER TABLE users ADD COLUMN github_id TEXT UNIQUE", (err) => {
  // Ignore error if column exists
});
db.run("ALTER TABLE users ADD COLUMN username TEXT", (err) => {
  // Ignore error if column exists
});
db.run("ALTER TABLE users ADD COLUMN avatar_url TEXT", (err) => {
  // Ignore error if column exists
});

module.exports = db;
