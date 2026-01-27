/**
 * Favourite Repositories Feature
 * Manages favorite repositories using localStorage
 * Provides UI components for adding, viewing, and managing favorites
 */

class FavoritesManager {
  constructor() {
    this.storageKey = 'favoriteRepositories';
    this.favorites = this.loadFavorites();
    this.panelOpen = false;
  }

  /**
   * Load favorites from localStorage
   */
  loadFavorites() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading favorites:', error);
      return [];
    }
  }

  /**
   * Save favorites to localStorage
   */
  saveFavorites() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.favorites));
      this.dispatchEvent('favoritesUpdated');
    } catch (error) {
      console.error('Error saving favorites:', error);
    }
  }

  /**
   * Add a repository to favorites
   */
  addFavorite(repo) {
    const exists = this.favorites.some(fav => fav.id === repo.id);
    if (!exists) {
      this.favorites.push({
        id: repo.id,
        name: repo.name,
        owner: repo.owner,
        url: repo.url,
        description: repo.description,
        stars: repo.stars,
        language: repo.language,
        addedAt: new Date().toISOString()
      });
      this.saveFavorites();
      return true;
    }
    return false;
  }

  /**
   * Remove a repository from favorites
   */
  removeFavorite(repoId) {
    this.favorites = this.favorites.filter(fav => fav.id !== repoId);
    this.saveFavorites();
  }

  /**
   * Check if a repository is favorited
   */
  isFavorited(repoId) {
    return this.favorites.some(fav => fav.id === repoId);
  }

  /**
   * Get all favorites
   */
  getFavorites() {
    return [...this.favorites];
  }

  /**
   * Clear all favorites
   */
  clearAll() {
    this.favorites = [];
    this.saveFavorites();
  }

  /**
   * Get favorites count
   */
  getCount() {
    return this.favorites.length;
  }

  /**
   * Dispatch custom event for updates
   */
  dispatchEvent(eventName) {
    window.dispatchEvent(new CustomEvent(eventName, { detail: this.favorites }));
  }
}

// Initialize global favorites manager
const favoritesManager = new FavoritesManager();

/**
 * UI Components for Favorites
 */
class FavoritesUI {
  constructor() {
    this.manager = favoritesManager;
    this.panelOpen = false;
    this.initializePanel();
    this.attachEventListeners();
  }

  /**
   * Initialize the favorites panel
   */
  initializePanel() {
    if (document.getElementById('favorites-panel')) {
      return; // Already initialized
    }

    const panelHTML = `
      <div id="favorites-panel" class="favorites-panel">
        <div class="favorites-panel-header">
          <h3 class="favorites-title">⭐ Favourite Repositories</h3>
          <button id="favorites-close-btn" class="favorites-close-btn" title="Close">×</button>
        </div>
        <div id="favorites-list" class="favorites-list">
          <div class="favorites-empty">No favorite repositories yet</div>
        </div>
        <div class="favorites-panel-footer">
          <button id="favorites-clear-btn" class="favorites-clear-btn" title="Clear all favorites">Clear All</button>
        </div>
      </div>
      <button id="favorites-toggle-btn" class="favorites-toggle-btn" title="Toggle Favorites">
        ⭐ <span id="favorites-badge" class="favorites-badge">0</span>
      </button>
    `;

    document.body.insertAdjacentHTML('beforeend', panelHTML);
    this.updateBadge();
    this.renderFavoritesList();
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const toggleBtn = document.getElementById('favorites-toggle-btn');
    const closeBtn = document.getElementById('favorites-close-btn');
    const clearBtn = document.getElementById('favorites-clear-btn');

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.togglePanel());
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closePanel());
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearAllFavorites());
    }

    // Listen for favorite updates
    window.addEventListener('favoritesUpdated', () => {
      this.renderFavoritesList();
      this.updateBadge();
    });

    // Close panel when clicking outside
    document.addEventListener('click', (e) => {
      const panel = document.getElementById('favorites-panel');
      const toggleBtn = document.getElementById('favorites-toggle-btn');
      if (this.panelOpen && panel && !panel.contains(e.target) && !toggleBtn.contains(e.target)) {
        this.closePanel();
      }
    });
  }

  /**
   * Toggle favorites panel
   */
  togglePanel() {
    if (this.panelOpen) {
      this.closePanel();
    } else {
      this.openPanel();
    }
  }

  /**
   * Open favorites panel
   */
  openPanel() {
    const panel = document.getElementById('favorites-panel');
    if (panel) {
      panel.classList.add('open');
      this.panelOpen = true;
    }
  }

  /**
   * Close favorites panel
   */
  closePanel() {
    const panel = document.getElementById('favorites-panel');
    if (panel) {
      panel.classList.remove('open');
      this.panelOpen = false;
    }
  }

  /**
   * Update favorite badge count
   */
  updateBadge() {
    const badge = document.getElementById('favorites-badge');
    if (badge) {
      const count = this.manager.getCount();
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
  }

  /**
   * Render favorites list
   */
  renderFavoritesList() {
    const listContainer = document.getElementById('favorites-list');
    if (!listContainer) return;

    const favorites = this.manager.getFavorites();

    if (favorites.length === 0) {
      listContainer.innerHTML = '<div class="favorites-empty">No favorite repositories yet</div>';
      return;
    }

    const listHTML = favorites
      .sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt))
      .map(repo => `
        <div class="favorite-item" data-repo-id="${repo.id}">
          <div class="favorite-item-header">
            <a href="${repo.url}" target="_blank" class="favorite-repo-name">${repo.owner}/${repo.name}</a>
            <button class="favorite-remove-btn" data-repo-id="${repo.id}" title="Remove from favorites">×</button>
          </div>
          <div class="favorite-item-meta">
            ${repo.language ? `<span class="favorite-lang">${repo.language}</span>` : ''}
            ${repo.stars ? `<span class="favorite-stars">⭐ ${repo.stars}</span>` : ''}
          </div>
          ${repo.description ? `<p class="favorite-description">${repo.description}</p>` : ''}
        </div>
      `)
      .join('');

    listContainer.innerHTML = listHTML;

    // Attach remove button listeners
    document.querySelectorAll('.favorite-remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const repoId = btn.getAttribute('data-repo-id');
        this.manager.removeFavorite(repoId);
      });
    });
  }

  /**
   * Clear all favorites with confirmation
   */
  clearAllFavorites() {
    if (confirm('Are you sure you want to remove all favorite repositories?')) {
      this.manager.clearAll();
    }
  }

  /**
   * Add favorite button to repository item
   */
  addFavoriteButton(element, repo) {
    if (element.querySelector('.favorite-repo-btn')) {
      return; // Already added
    }

    const btn = document.createElement('button');
    btn.className = 'favorite-repo-btn';
    btn.innerHTML = this.manager.isFavorited(repo.id) ? '⭐' : '☆';
    btn.title = this.manager.isFavorited(repo.id) ? 'Remove from favorites' : 'Add to favorites';

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (this.manager.isFavorited(repo.id)) {
        this.manager.removeFavorite(repo.id);
        btn.innerHTML = '☆';
        btn.title = 'Add to favorites';
      } else {
        this.manager.addFavorite(repo);
        btn.innerHTML = '⭐';
        btn.title = 'Remove from favorites';
      }
    });

    element.insertBefore(btn, element.firstChild);
  }
}

// Initialize UI when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new FavoritesUI();
  });
} else {
  new FavoritesUI();
}
