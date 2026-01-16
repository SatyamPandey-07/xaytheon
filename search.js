/**
 * XAYTHEON Search Engine Frontend
 * Handles real-time search, autocomplete, filtering, and history.
 */

class SearchEngine {
    constructor() {
        this.input = document.getElementById('main-search-input');
        this.resultsContainer = document.getElementById('results-list');
        this.autocompleteDropdown = document.getElementById('autocomplete-dropdown');
        this.clearBtn = document.getElementById('clear-search-btn');
        this.searchBtn = document.getElementById('search-action-btn');
        this.loader = document.getElementById('search-loader');
        this.statusArea = document.getElementById('search-status');
        this.historyList = document.getElementById('history-list');

        // Filters
        this.filterLang = document.getElementById('filter-lang');
        this.filterStars = document.getElementById('filter-stars');
        this.starsValue = document.getElementById('stars-value');
        this.filterTypes = document.getElementsByName('type');
        this.resetFiltersBtn = document.getElementById('reset-filters');

        this.debounceTimeout = null;
        this.activeAutocompleteIndex = -1;
        this.lastQuery = '';

        this.init();
    }

    init() {
        if (!this.input) return;

        // Input events
        this.input.addEventListener('input', () => {
            this.toggleClearBtn();
            this.handleDebouncedInput();
        });

        this.input.addEventListener('keydown', (e) => this.handleKeyboard(e));
        this.input.addEventListener('focus', () => this.showHistoryDropdown());

        this.clearBtn.addEventListener('click', () => this.clearSearch());
        this.searchBtn.addEventListener('click', () => this.performSearch());

        // Keyboard Shortcut: '/' to focus search
        document.addEventListener('keydown', (e) => {
            if (e.key === '/' && document.activeElement !== this.input) {
                e.preventDefault();
                this.input.focus();
            }
        });

        // Close dropdown on click outside
        document.addEventListener('click', (e) => {
            if (!this.input.contains(e.target) && !this.autocompleteDropdown.contains(e.target)) {
                this.hideAutocomplete();
            }
        });

        // Filter events
        this.filterStars.addEventListener('input', () => {
            this.starsValue.innerText = this.filterStars.value + '+';
        });

        // Trigger search on filter change
        [this.filterLang, this.filterStars].forEach(el => {
            el.addEventListener('change', () => this.performSearch());
        });

        this.filterTypes.forEach(el => {
            el.addEventListener('change', () => this.performSearch());
        });

        this.resetFiltersBtn.addEventListener('click', () => this.resetFilters());

        // Load history and trending
        this.loadTrending();
        this.loadHistory();

        // Check if query exists in URL
        const urlParams = new URLSearchParams(window.location.search);
        const query = urlParams.get('q');
        if (query) {
            this.input.value = query;
            this.performSearch(query);
            this.toggleClearBtn();
        }
    }

    toggleClearBtn() {
        this.clearBtn.classList.toggle('hidden', !this.input.value);
    }

    handleDebouncedInput() {
        const query = this.input.value.trim();
        clearTimeout(this.debounceTimeout);

        if (query.length < 2) {
            this.hideAutocomplete();
            return;
        }

        this.debounceTimeout = setTimeout(() => {
            this.fetchSuggestions(query);
        }, 300);
    }

    async fetchSuggestions(query) {
        try {
            const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            this.renderAutocomplete(data.suggestions, query);
        } catch (error) {
            console.error('Failed to fetch suggestions');
        }
    }

    renderAutocomplete(suggestions, query) {
        if (!suggestions || suggestions.length === 0) {
            this.hideAutocomplete();
            return;
        }

        this.autocompleteDropdown.innerHTML = '';
        suggestions.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'autocomplete-item';
            div.innerHTML = `<i class="ri-search-line"></i> ${this.highlightText(item, query)}`;
            div.addEventListener('click', () => {
                this.input.value = item;
                this.performSearch(item);
                this.hideAutocomplete();
            });
            this.autocompleteDropdown.appendChild(div);
        });

        this.autocompleteDropdown.classList.remove('hidden');
        this.activeAutocompleteIndex = -1;
    }

    hideAutocomplete() {
        this.autocompleteDropdown.classList.add('hidden');
    }

    handleKeyboard(e) {
        const items = this.autocompleteDropdown.querySelectorAll('.autocomplete-item');

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.activeAutocompleteIndex = Math.min(this.activeAutocompleteIndex + 1, items.length - 1);
                this.updateAutocompleteSelection(items);
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.activeAutocompleteIndex = Math.max(this.activeAutocompleteIndex - 1, -1);
                this.updateAutocompleteSelection(items);
                break;
            case 'Enter':
                if (this.activeAutocompleteIndex >= 0) {
                    this.input.value = items[this.activeAutocompleteIndex].textContent.trim();
                    this.hideAutocomplete();
                }
                this.performSearch();
                break;
            case 'Escape':
                this.hideAutocomplete();
                break;
        }
    }

    updateAutocompleteSelection(items) {
        items.forEach((item, index) => {
            item.classList.toggle('active', index === this.activeAutocompleteIndex);
        });
        if (this.activeAutocompleteIndex >= 0) {
            items[this.activeAutocompleteIndex].scrollIntoView({ block: 'nearest' });
        }
    }

    async performSearch(overrideQuery = null) {
        const query = (overrideQuery || this.input.value).trim();
        if (!query) {
            this.renderPlaceholder();
            return;
        }

        this.lastQuery = query;
        this.hideAutocomplete();
        this.showLoader();

        // Update URL
        const url = new URL(window.location);
        url.searchParams.set('q', query);
        window.history.pushState({}, '', url);

        // Get filter values
        const lang = this.filterLang.value;
        const stars = this.filterStars.value;
        const types = Array.from(this.filterTypes).filter(t => t.checked).map(t => t.value).join(',');

        try {
            const token = localStorage.getItem('xaytheon_token');
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&lang=${lang}&stars=${stars}&type=${types}`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            const data = await response.json();
            this.renderResults(data.results, query);
            this.loadHistory(); // Refresh history
        } catch (error) {
            this.renderError();
        } finally {
            this.hideLoader();
        }
    }

    renderResults(results, query) {
        this.resultsContainer.innerHTML = '';
        const allResults = [
            ...results.repositories.map(r => ({ ...r, category: 'repo' })),
            ...results.users.map(u => ({ ...u, category: 'user', name: u.username })),
            ...results.highlights.map(h => ({ ...h, category: 'highlight', name: h.title }))
        ];

        if (allResults.length === 0) {
            this.renderEmptyState();
            return;
        }

        this.statusArea.innerText = `Found ${allResults.length} matches for "${query}"`;

        allResults.forEach(item => {
            const div = document.createElement('div');
            div.className = 'result-card fade-in';

            let content = '';
            const badgeClass = `badge-${item.category}`;
            const categoryLabel = item.category.toUpperCase();

            if (item.category === 'repo') {
                content = `
                    <span class="result-badge ${badgeClass}">${categoryLabel}</span>
                    <div class="result-header">
                        <h4><i class="ri-git-repository-line"></i> ${this.highlightText(item.name, query)}</h4>
                        <p class="muted">${this.highlightText(item.description || '', query)}</p>
                    </div>
                    <div class="result-footer">
                        <span><i class="ri-star-fill"></i> ${item.stars}</span>
                        <span><i class="ri-code-line"></i> ${item.language}</span>
                    </div>
                `;
            } else if (item.category === 'user') {
                content = `
                    <span class="result-badge ${badgeClass}">${categoryLabel}</span>
                    <div class="result-header">
                        <h4><i class="ri-user-follow-line"></i> ${this.highlightText(item.username, query)}</h4>
                        <p class="muted">${this.highlightText(item.bio || '', query)}</p>
                    </div>
                `;
            } else {
                content = `
                    <span class="result-badge ${badgeClass}">${categoryLabel}</span>
                    <div class="result-header">
                        <h4><i class="ri-bookmark-line"></i> ${this.highlightText(item.title, query)}</h4>
                        <p class="muted">${item.category}</p>
                    </div>
                `;
            }

            div.innerHTML = content;
            this.resultsContainer.appendChild(div);
        });
    }

    highlightText(text, query) {
        if (!query) return text;
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<span class="highlight">$1</span>');
    }

    clearSearch() {
        this.input.value = '';
        this.input.focus();
        this.toggleClearBtn();
        this.hideAutocomplete();
        this.renderPlaceholder();

        const url = new URL(window.location);
        url.searchParams.delete('q');
        window.history.pushState({}, '', url);
    }

    resetFilters() {
        this.filterLang.value = '';
        this.filterStars.value = 0;
        this.starsValue.innerText = '0+';
        this.filterTypes.forEach(t => t.checked = true);
        this.performSearch();
    }

    async loadHistory() {
        const token = localStorage.getItem('xaytheon_token');
        if (!token) {
            this.renderLocalHistory();
            return;
        }

        try {
            const response = await fetch('/api/search/history', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            this.renderHistory(data.history || []);
        } catch (error) {
            this.renderLocalHistory();
        }
    }

    renderHistory(history) {
        if (!this.historyList) return;
        this.historyList.innerHTML = '';

        if (history.length === 0) {
            this.historyList.innerHTML = '<li class="muted">No recent searches</li>';
            return;
        }

        history.forEach(item => {
            const li = document.createElement('li');
            li.className = 'history-item';
            const queryText = typeof item === 'string' ? item : item.query;
            li.innerHTML = `
                <a href="#" class="history-link"><i class="ri-time-line"></i> ${queryText}</a>
            `;
            li.querySelector('a').addEventListener('click', (e) => {
                e.preventDefault();
                this.input.value = queryText;
                this.performSearch();
                this.toggleClearBtn();
            });
            this.historyList.appendChild(li);
        });
    }

    renderLocalHistory() {
        // Fallback for guests using localStorage
        const local = JSON.parse(localStorage.getItem('xaytheon_search_history') || '[]');
        this.renderHistory(local);
    }

    async loadTrending() {
        try {
            const response = await fetch('/api/search/trending');
            const data = await response.json();
            const list = document.getElementById('trending-list');
            if (!list || !data.trending) return;

            list.innerHTML = '';
            data.trending.forEach(item => {
                const span = document.createElement('span');
                span.className = 'tag';
                span.innerText = item.query;
                span.addEventListener('click', () => {
                    this.input.value = item.query;
                    this.performSearch();
                    this.toggleClearBtn();
                });
                list.appendChild(span);
            });
        } catch (error) {
            // Silently fail trending
        }
    }

    showHistoryDropdown() {
        if (this.input.value.trim() === '') {
            // Show history in autocomplete if input is empty
            // This is a common UX pattern
        }
    }

    // Helper UI methods
    showLoader() { this.loader.classList.remove('hidden'); }
    hideLoader() { this.loader.classList.add('hidden'); }

    renderPlaceholder() {
        this.resultsContainer.innerHTML = `
            <div class="search-placeholder">
                <i class="ri-flashlight-line"></i>
                <p>Type something to start searching across Xaytheon...</p>
            </div>
        `;
        this.statusArea.innerText = '';
    }

    renderEmptyState() {
        this.resultsContainer.innerHTML = `
            <div class="search-placeholder">
                <i class="ri-find-replace-line"></i>
                <p>No results found for "${this.lastQuery}". Try adjusting your filters.</p>
            </div>
        `;
    }

    renderError() {
        this.resultsContainer.innerHTML = `
            <div class="search-placeholder">
                <i class="ri-error-warning-line"></i>
                <p>Opps! Something went wrong while searching. Please try again.</p>
            </div>
        `;
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    window.XaytheonSearch = new SearchEngine();
});
