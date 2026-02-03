const db = require("../config/db");

/**
 * Create a new user
 */
/**
 * Create a new user
 */
exports.createUser = (email, password, githubId = null, username = null, avatarUrl = null) =>
  new Promise((resolve, reject) => {
    if (!email || typeof email !== "string" || email.length > 254) {
      return reject(new Error("Invalid email"));
    }

    if (!githubId && (!password || typeof password !== "string" || password.length > 128)) {
      return reject(new Error("Invalid password"));
    }

    db.run(
      `INSERT INTO users (email, password, github_id, username, avatar_url)
       VALUES (?, ?, ?, ?, ?)`,
      [email, password, githubId, username, avatarUrl],
      function (err) {
        if (err) return reject(err);
        resolve({
          id: this.lastID,
          email,
          githubId,
          username,
          avatarUrl
        });
      }
    );
  });

/**
 * Find user by email
 */
exports.findByEmail = (email) =>
  new Promise((resolve, reject) => {
    if (!email || typeof email !== "string") {
      return reject(new Error("Invalid email"));
    }

    db.get(
      "SELECT id, email, password, github_id, username, avatar_url, view_history, preferred_language, preferences FROM users WHERE email = ?",
      [email],
      (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      }
    );
  });

/**
 * Find user by GitHub ID
 */
exports.findByGithubId = (githubId) =>
  new Promise((resolve, reject) => {
    if (!githubId) {
      return reject(new Error("Invalid GitHub ID"));
    }

    db.get(
      "SELECT id, email, password, github_id, username, avatar_url, view_history, preferred_language, preferences FROM users WHERE github_id = ?",
      [githubId],
      (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      }
    );
  });

/**
 * Find user by ID
 */
exports.findById = (id) =>
  new Promise((resolve, reject) => {
    const userId = Number(id);
    if (!userId || userId <= 0) {
      return reject(new Error("Invalid user ID"));
    }

    db.get(
      "SELECT id, email, view_history, refresh_token, preferred_language, preferences FROM users WHERE id = ?",
      [userId],
      (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      }
    );
  });

/**
 * Update refresh token (login / logout)
 */
exports.updateRefreshToken = (userId, refreshToken) =>
  new Promise((resolve, reject) => {
    db.run(
      "UPDATE users SET refresh_token = ? WHERE id = ?",
      [refreshToken, userId],
      function (err) {
        if (err) reject(err);
        else resolve(this.changes);
      }
    );
  });


/**
 * Update user view history
 */
exports.updateViewHistory = (userId, historyJson) =>
  new Promise((resolve, reject) => {
    const id = Number(userId);
    if (!id || id <= 0) {
      return reject(new Error("Invalid user ID"));
    }

    if (historyJson && typeof historyJson !== "string") {
      return reject(new Error("Invalid history data"));
    }

    db.run(
      `UPDATE users
       SET view_history = ?

       WHERE id = ?`,
      [historyJson, id],
      function (err) {
        if (err) return reject(err);
        resolve(this.changes);
      }
    );
  });

/**
 * Update user GitHub info (linking account)
 */
exports.updateGithubInfo = (userId, githubId, username, avatarUrl) =>
  new Promise((resolve, reject) => {
    db.run(
      "UPDATE users SET github_id = ?, username = ?, avatar_url = ? WHERE id = ?",
      [githubId, username, avatarUrl, userId],
      function (err) {
        if (err) reject(err);
        else resolve(this.changes);
      }
    );
  });

exports.setPasswordResetToken = (email, token, expiresAt) =>
  new Promise((resolve, reject) => {
    if (!email || typeof email !== 'string' || email.length > 254) {
      return reject(new Error('Invalid email'));
    }
    if (!token || typeof token !== 'string' || token.length > 255) {
      return reject(new Error('Invalid token'));
    }

    db.run(
      `UPDATE users 
       SET password_reset_token = ?, 
           password_reset_expires = ?,
           updated_at = CURRENT_TIMESTAMP 
       WHERE email = ?`,
      [token, expiresAt, email],
      function (err) {
        if (err) reject(err);
        else if (this.changes === 0) reject(new Error('User not found'));
        else resolve(this.changes);
      }
    );
  });

exports.findByResetToken = (token) =>
  new Promise((resolve, reject) => {
    if (!token || typeof token !== 'string' || token.length > 255) {
      return reject(new Error('Invalid token'));
    }

    db.get(
      `SELECT id, email, password_reset_token, password_reset_expires 
       FROM users 
       WHERE password_reset_token = ?`,
      [token],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });

exports.updatePassword = (userId, hashedPassword) =>
  new Promise((resolve, reject) => {
    if (!userId || (typeof userId !== 'number' && typeof userId !== 'string')) {
      return reject(new Error('Invalid user ID'));
    }
    if (!hashedPassword || typeof hashedPassword !== 'string') {
      return reject(new Error('Invalid password'));
    }

    const id = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    if (isNaN(id) || id <= 0) {
      return reject(new Error('Invalid user ID'));
    }

    db.run(
      `UPDATE users 
       SET password = ?, 
           password_reset_token = NULL,
           password_reset_expires = NULL,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [hashedPassword, id],
      function (err) {
        if (err) reject(err);
        else if (this.changes === 0) reject(new Error('User not found'));
        else resolve(this.changes);
      }
    );
  });

exports.clearResetToken = (userId) =>
  new Promise((resolve, reject) => {
    if (!userId || (typeof userId !== 'number' && typeof userId !== 'string')) {
      return reject(new Error('Invalid user ID'));
    }

    const id = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    if (isNaN(id) || id <= 0) {
      return reject(new Error('Invalid user ID'));
    }

    db.run(
      `UPDATE users 
       SET password_reset_token = NULL,
           password_reset_expires = NULL,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [id],
      function (err) {
        if (err) reject(err);
        else resolve(this.changes);
      }
    );
  });

exports.updatePreferredLanguage = (userId, lang) =>
  new Promise((resolve, reject) => {
    if (!userId || (typeof userId !== 'number' && typeof userId !== 'string')) {
      return reject(new Error('Invalid user ID'));
    }
    if (!lang || typeof lang !== 'string' || lang.length > 10) {
      return reject(new Error('Invalid language code'));
    }

    const id = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    if (isNaN(id) || id <= 0) {
      return reject(new Error('Invalid user ID'));
    }

    db.run(
      "UPDATE users SET preferred_language = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [lang, id],
      function (err) {
        if (err) reject(err);
        else resolve(this.changes);
      }
    );
  });

exports.updatePreferences = (userId, preferencesJson) =>
  new Promise((resolve, reject) => {
    if (!userId || (typeof userId !== 'number' && typeof userId !== 'string')) {
      return reject(new Error('Invalid user ID'));
    }
    if (preferencesJson && (typeof preferencesJson !== 'string' || preferencesJson.length > 5000)) {
      return reject(new Error('Invalid preferences data'));
    }

    const id = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    if (isNaN(id) || id <= 0) {
      return reject(new Error('Invalid user ID'));
    }

    db.run(
      "UPDATE users SET preferences = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [preferencesJson, id],
      function (err) {
        if (err) reject(err);
        else resolve(this.changes);
      }
    );
  });
