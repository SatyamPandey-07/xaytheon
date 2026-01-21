/**
 * Boilerplate Loader
 * Dynamically loads header and footer components into pages
 * Uses XMLHttpRequest for compatibility with file:// protocol
 */

(function () {
    'use strict';

    /**
     * Load HTML content from a file and inject it into a target element
     * Using XMLHttpRequest instead of fetch for file:// protocol support
     */
    function loadComponent(url, targetId) {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);

        xhr.onload = function () {
            if (xhr.status === 200 || xhr.status === 0) { // 0 for file:// protocol
                const target = document.getElementById(targetId);
                if (target) {
                    target.innerHTML = xhr.responseText;
                } else {
                    console.warn(`Target element #${targetId} not found`);
                }
            } else {
                console.error(`Failed to load ${url}: ${xhr.status}`);
            }
        };

        xhr.onerror = function () {
            console.error(`Error loading component from ${url}`);
        };

        xhr.send();
    }

    /**
     * Initialize boilerplate components when DOM is ready
     */
    function initBoilerplate() {
        // Load header
        loadComponent('boilerplate/header.html', 'header-placeholder');

        // Load footer
        loadComponent('boilerplate/footer.html', 'footer-placeholder');
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBoilerplate);
    } else {
        initBoilerplate();
    }
})();
