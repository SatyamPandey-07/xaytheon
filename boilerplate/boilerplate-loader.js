
(function () {
    'use strict';

   
    function loadComponent(url, targetId, callback) {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);

        xhr.onload = function () {
            if (xhr.status === 200 || xhr.status === 0) { // 0 for file:// protocol
                const target = document.getElementById(targetId);
                if (target) {
                    target.innerHTML = xhr.responseText;
                    
                    // Call callback after content is loaded
                    if (callback && typeof callback === 'function') {
                        // Small delay to ensure DOM is updated
                        setTimeout(callback, 50);
                    }
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

  
    function initBoilerplate() {
        // Load header and re-initialize theme toggles after it loads
        loadComponent('boilerplate/header.html', 'header-placeholder', function() {
            // Re-setup theme toggles after header is loaded
            if (typeof window.setupThemeToggles === 'function') {
                window.setupThemeToggles();
            }
        });

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