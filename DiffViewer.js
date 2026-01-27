/**
 * DiffViewer.js
 * Custom component for visual code comparison
 */

class DiffViewer {
    constructor(container) {
        this.container = container;
        this.diffData = null;
    }

    /**
     * Render diff data in the container
     */
    render(diffData) {
        this.diffData = diffData;
        this.container.innerHTML = '';

        const diffContainer = document.createElement('div');
        diffContainer.className = 'diff-container';

        // Header with file info and stats
        const header = this.createHeader();
        diffContainer.appendChild(header);

        // Diff content
        const content = this.createDiffContent();
        diffContainer.appendChild(content);

        this.container.appendChild(diffContainer);
    }

    /**
     * Create diff header with file information
     */
    createHeader() {
        const header = document.createElement('div');
        header.className = 'diff-header';

        header.innerHTML = `
            <div class="diff-file-info">
                <span class="file-path">${this.diffData.filePath}</span>
                <span class="file-description">${this.diffData.description}</span>
            </div>
            <div class="diff-stats">
                <span class="stat additions">+${this.diffData.stats.additions}</span>
                <span class="stat deletions">-${this.diffData.stats.deletions}</span>
                <span class="stat changes">${this.diffData.stats.changes} changes</span>
            </div>
        `;

        return header;
    }

    /**
     * Create the main diff content area
     */
    createDiffContent() {
        const content = document.createElement('div');
        content.className = 'diff-content';

        // Column headers
        const headers = document.createElement('div');
        headers.className = 'diff-headers';
        headers.innerHTML = `
            <div class="diff-column-header">Original</div>
            <div class="diff-column-header">Refactored</div>
        `;
        content.appendChild(headers);

        // Diff lines
        const linesContainer = document.createElement('div');
        linesContainer.className = 'diff-lines';

        this.diffData.lines.forEach((line, index) => {
            const lineElement = this.createDiffLine(line, index);
            linesContainer.appendChild(lineElement);
        });

        content.appendChild(linesContainer);
        return content;
    }

    /**
     * Create a single diff line element
     */
    createDiffLine(line, index) {
        const lineElement = document.createElement('div');
        lineElement.className = `diff-line ${line.type}`;

        const lineNumber = index + 1;

        if (line.type === 'context') {
            lineElement.innerHTML = `
                <div class="line-number">${line.left.lineNumber}</div>
                <div class="line-content">${this.escapeHtml(line.left.content)}</div>
                <div class="line-number">${line.right.lineNumber}</div>
                <div class="line-content">${this.escapeHtml(line.right.content)}</div>
            `;
        } else if (line.type === 'add') {
            lineElement.innerHTML = `
                <div class="line-number"></div>
                <div class="line-content empty"></div>
                <div class="line-number">${line.right.lineNumber}</div>
                <div class="line-content">${this.escapeHtml(line.right.content)}</div>
            `;
        } else if (line.type === 'delete') {
            lineElement.innerHTML = `
                <div class="line-number">${line.left.lineNumber}</div>
                <div class="line-content">${this.escapeHtml(line.left.content)}</div>
                <div class="line-number"></div>
                <div class="line-content empty"></div>
            `;
        }

        return lineElement;
    }

    /**
     * Escape HTML characters for safe display
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Highlight syntax in code lines (basic implementation)
     */
    highlightSyntax(content, language = 'javascript') {
        // Basic syntax highlighting for JavaScript
        if (language === 'javascript') {
            return content
                .replace(/\b(function|const|let|var|if|else|for|while|return)\b/g, '<span class="keyword">$1</span>')
                .replace(/(\/\/.*$)/gm, '<span class="comment">$1</span>')
                .replace(/(".*?"|'.*?')/g, '<span class="string">$1</span>');
        }
        return content;
    }

    /**
     * Scroll to a specific line
     */
    scrollToLine(lineNumber) {
        const lines = this.container.querySelectorAll('.diff-line');
        if (lines[lineNumber - 1]) {
            lines[lineNumber - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    /**
     * Toggle line numbers visibility
     */
    toggleLineNumbers(show = true) {
        this.container.classList.toggle('hide-line-numbers', !show);
    }

    /**
     * Filter diff lines by type
     */
    filterLines(type) {
        const lines = this.container.querySelectorAll('.diff-line');
        lines.forEach(line => {
            if (type === 'all' || line.classList.contains(type)) {
                line.style.display = 'flex';
            } else {
                line.style.display = 'none';
            }
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DiffViewer;
}
