/**
 * Collab Cursors Management
 * Handles rendering and updating remote user cursors.
 */
class CollabCursors {
    constructor(containerId) {
        this.container = document.getElementById(containerId) || document.body;
        this.cursors = new Map(); // userId -> element
    }

    updateCursor(userId, x, y, metadata) {
        if (!this.cursors.has(userId)) {
            this.createCursor(userId, metadata);
        }

        const cursor = this.cursors.get(userId);
        const { label, dot } = cursor;

        // Smooth translation
        dot.style.transform = `translate(${x}px, ${y}px)`;
        label.style.transform = `translate(${x}px, ${y}px)`;

        // Update label name if changed
        if (metadata.name) label.innerText = metadata.name;
    }

    createCursor(userId, metadata) {
        const color = this.getRandomColor();

        const dot = document.createElement('div');
        dot.className = 'remote-cursor-dot';
        dot.style.backgroundColor = color;

        const label = document.createElement('div');
        label.className = 'remote-cursor-label';
        label.style.backgroundColor = color;
        label.innerText = metadata.name || userId.slice(-4);

        this.container.appendChild(dot);
        this.container.appendChild(label);

        this.cursors.set(userId, { dot, label, color });
    }

    removeCursor(userId) {
        if (this.cursors.has(userId)) {
            const { dot, label } = this.cursors.get(userId);
            dot.remove();
            label.remove();
            this.cursors.delete(userId);
        }
    }

    getRandomColor() {
        const colors = ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e', '#84cc16', '#eab308', '#f59e0b', '#f97316', '#ef4444'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
}

// Global instance or export
window.CollabCursors = CollabCursors;
