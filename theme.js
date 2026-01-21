
(function() {
  'use strict';

  const STORAGE_KEY = 'xaytheon-theme';

  // Get saved theme or use system preference
  function getSavedTheme() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    
    return 'light'; // default
  }

  // Apply theme to the page
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
    localStorage.setItem(STORAGE_KEY, theme);
    updateAllIcons(theme);
  }

  // Update ALL theme icons on the page
  function updateAllIcons(theme) {
    const allIcons = document.querySelectorAll('.theme-icon');
    
    allIcons.forEach(function(icon) {
      if (theme === 'dark') {
        // Moon icon
        icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
      } else {
        // Sun icon
        icon.innerHTML = `
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        `;
      }
    });
  }

  // Toggle between light and dark
  function toggleTheme() {
    const current = document.documentElement.classList.contains('dark-theme') ? 'dark' : 'light';
    const newTheme = current === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
  }

  // Initialize theme immediately (before page loads)
  const initialTheme = getSavedTheme();
  applyTheme(initialTheme);

  // Setup theme toggle buttons when DOM is ready
  function setupThemeToggles() {
    // Find ALL theme toggle buttons (any ID or class)
    const buttons = document.querySelectorAll(
      '#theme-toggle, #theme-toggle-auth, .theme-toggle, .theme-toggle-auth, [data-theme-toggle]'
    );
    
    buttons.forEach(function(button) {
      button.addEventListener('click', function(e) {
        e.preventDefault();
        toggleTheme();
      });
    });

    // Update icons immediately
    updateAllIcons(initialTheme);
  }

  // Run setup when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupThemeToggles);
  } else {
    setupThemeToggles();
  }

  // Listen for system theme changes
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
      // Only auto-switch if user hasn't manually set a preference
      if (!localStorage.getItem(STORAGE_KEY)) {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  // Make toggle function available globally (optional)
  window.toggleTheme = toggleTheme;

})();