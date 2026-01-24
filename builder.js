/**
 * Workflow Builder Logic
 */

const elements = {
    canvas: document.getElementById('workflow-canvas'),
    placeholder: document.getElementById('canvas-placeholder'),
    yamlPreview: document.querySelector('#yaml-preview code'),
    workflowName: document.getElementById('workflow-name'),
    triggerSelect: document.getElementById('trigger-select'),
    validationPill: document.getElementById('validation-pill'),
    exportBtn: document.getElementById('export-yaml-btn'),
    copyBtn: document.getElementById('copy-yaml'),
    
    // Modals
    editModal: document.getElementById('edit-modal'),
    editName: document.getElementById('edit-step-name'),
    editUses: document.getElementById('edit-step-uses'),
    editRun: document.getElementById('edit-step-run'),
    saveEditBtn: document.getElementById('save-edit'),
    cancelEditBtn: document.getElementById('cancel-edit'),
};

    let workflowSteps = [];
    let editingStepId = null;
    let draggedStepId = null;

    /* -------------------- Utilities -------------------- */
    function generateStepId() {
        return 'step-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    function getStepDataFromElement(el) {
        return {
            name: el.getAttribute('data-name'),
            type: el.getAttribute('data-type'),
            uses: el.getAttribute('data-uses') || null,
            run: el.getAttribute('data-run') || null,
        };
    }

    /* -------------------- Library Drag -------------------- */

    function initializeDraggableSteps() {
        document.querySelectorAll('.draggable-step').forEach(step => {
            // Accessibility
            step.setAttribute('tabindex', '0');
            step.setAttribute('role', 'button');
            step.setAttribute('aria-label', `Add step: ${step.getAttribute('data-name')}`);

            // Drag
            step.addEventListener('dragstart', e => {
                const data = getStepDataFromElement(step);
                e.dataTransfer.setData('application/json', JSON.stringify(data));
            });

            // Keyboard activation
            step.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    addStep(getStepDataFromElement(step));
                }
            });
        });
    }

    /* -------------------- Canvas Drag -------------------- */

    function setupCanvasDropZone() 
    {
    elements.canvas.addEventListener('dragover', e => {
        e.preventDefault();
        elements.canvas.classList.add('drag-over');
    });

    elements.canvas.addEventListener('dragleave', () => {
        elements.canvas.classList.remove('drag-over');
    });

    elements.canvas.addEventListener('drop', e => {
        e.preventDefault();
        elements.canvas.classList.remove('drag-over');

        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            addStep(data);
        } catch (err) 
        {
            console.error('Invalid drop data', err);
        }
    });

        // Accessibility - make canvas focusable
        elements.canvas.setAttribute('tabindex', '-1');
    }

    /* -------------------- Workflow Management -------------------- */

    function addStep(stepData) {
        const step = {
            id: generateStepId(),
            ...stepData,
        };
        workflowSteps.push(step);
        renderSteps();
        updatePreviewAndValidation();
    }

    function removeStep(stepId) {
        workflowSteps = workflowSteps.filter(s => s.id !== stepId);
        renderSteps();
        updatePreviewAndValidation();
    }

    function updateStep(stepId, updates) {
        const step = workflowSteps.find(s => s.id === stepId);
        if (step) {
            Object.assign(step, updates);
            renderSteps();
            updatePreviewAndValidation();
        }
    }

    function renderSteps() {
        // Clear previous step blocks
        elements.canvas.querySelectorAll('.step-block').forEach(el => el.remove());

        if (workflowSteps.length === 0) {
            elements.placeholder.style.display = 'flex';
            return;
        }

        elements.placeholder.style.display = 'none';

        workflowSteps.forEach(step => {
            const block = document.createElement('div');
            block.className = 'step-block';
            block.dataset.stepId = step.id;

            block.innerHTML = `
                <div class="step-info">
                    <h5>${step.name}</h5>
                    <p class="step-detail">${step.uses ? step.uses : step.run}</p>
                </div>
                <div class="step-actions">
                    <button type="button" class="icon-btn edit" aria-label="Edit step">
                        <i class="ri-edit-line"></i>
                    </button>
                    <button type="button" class="icon-btn delete" aria-label="Delete step">
                        <i class="ri-delete-bin-line"></i>
                    </button>
                </div>
            `;

            elements.canvas.appendChild(block);
        });
    }

    /* -------------------- Edit Modals -------------------- */
    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    function trapModalFocus(e) {
        const focusable = elements.editModal.querySelectorAll(focusableSelector);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.key === 'Tab') {
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }

        if (e.key === 'Escape') {
            closeEditModal();
        }
    }

    function openEditModal(stepId) {
        editingStepId = stepId;
        const step = workflowSteps.find(s => s.id === stepId);
        if (!step) return;

        elements.editName.value = step.name;
        const usesField = document.getElementById('uses-field');
        const runField = document.getElementById('run-field');

        if (step.uses) {
            usesField.style.display = 'block';
            runField.style.display = 'none';
            elements.editUses.value = step.uses;
        } else {
            usesField.style.display = 'none';
            runField.style.display = 'block';
            elements.editRun.value = step.run || '';
        }

        previousFocusedElement = document.activeElement;
        elements.editModal.classList.remove('hidden');
        elements.editName.focus();
        elements.editModal.addEventListener('keydown', trapModalFocus);
    }
    function closeEditModal() {
        elements.editModal.classList.add('hidden');
        elements.editModal.removeEventListener('keydown', trapModalFocus);
        if (previousFocusedElement && document.body.contains(previousFocusedElement)) {
            previousFocusedElement.focus();
        }
        previousFocusedElement = null;
        editingStepId = null;
    }

    /* -------------------- YAML Preview -------------------- */

    function updatePreviewAndValidation() {
        // Update UI validation state + export button
        const { valid, errors } = validateCurrentWorkflow(workflowSteps, {
            name: elements.workflowName.value.trim(),
            trigger: elements.triggerSelect.value,
        });

        elements.exportBtn.disabled = !valid;

        if (valid) {
            elements.validationPill.className = 'pill status-pill valid';
            elements.validationPill.textContent = 'Valid';
        } else {
            elements.validationPill.className = 'pill status-pill invalid';
            elements.validationPill.textContent = `Invalid (${errors?.length || '?'})`;
        }

        // Update preview
        try {
            const yaml = getWorkflowYaml(workflowSteps, {
                name: elements.workflowName.value.trim(),
                trigger: elements.triggerSelect.value,
            });
            elements.yamlPreview.textContent = yaml;
        } catch (err) {
            elements.yamlPreview.textContent = `# Error generating preview!\n# ${err.message}`;
        }

        if (typeof triggerUIUpdate === 'function') {
            triggerUIUpdate();
        }
    }

    /* -------------------- Actions -------------------- */

    function initEventListeners() {
        // Canvas actions (edit/delete)
        elements.canvas.addEventListener('click', e => {
            const btn = e.target.closest('button');
            if (!btn) return;

            const stepBlock = btn.closest('.step-block');
            if (!stepBlock) return;

            const stepId = stepBlock.dataset.stepId;

            if (btn.classList.contains('edit')) {
                openEditModal(stepId);
            } else if (btn.classList.contains('delete')) {
                if (confirm('Remove this step?')) {
                    removeStep(stepId);
                }
            }
        });
        // Search filter
        const searchInput = document.getElementById('step-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', e => {
                const q = e.target.value.toLowerCase().trim();
                document.querySelectorAll('.draggable-step').forEach(el => {
                    const name = (el.dataset.name || '').toLowerCase();
                    el.style.display = name.includes(q) ? '' : 'none';
                });
            });
        }
        // Modal Logic
        elements.saveEditBtn.addEventListener('click', () => {
            const updates = {
                name: elements.editName.value.trim(),
            };

            if (workflowSteps.find(s => s.id === editingStepId)?.uses) {
                updates.uses = elements.editUses.value.trim();
            } else {
                updates.run = elements.editRun.value.trim();
            }

            updateStep(editingStepId, updates);
            closeEditModal();
        });
        elements.cancelEditBtn.addEventListener('click', closeEditModal);
        elements.editModal.addEventListener('click', e => {
            if (e.target === elements.editModal) closeEditModal();
        });
        // Trigger preview updates
        elements.workflowName.addEventListener('input', updatePreviewAndValidation);
        elements.triggerSelect.addEventListener('change', updatePreviewAndValidation);
        // Export (already has validation guard in HTML + disabled state)
        elements.exportBtn.addEventListener('click', () => {
            const yaml = getWorkflowYaml(workflowSteps, {
                name: elements.workflowName.value.trim() || 'workflow',
                trigger: elements.triggerSelect.value,
            });

            const filename = (elements.workflowName.value.trim() || 'workflow')
                .replace(/\.ya?ml$/i, '') + '.yml';
            const blob = new Blob([yaml], { type: 'text/yaml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        });
        elements.copyBtn.addEventListener('click', () => {
            const text = elements.yamlPreview.textContent;
            navigator.clipboard.writeText(text).then(() => {
                elements.copyBtn.innerHTML = '<i class="ri-check-line"></i>';
                setTimeout(() => {
                    elements.copyBtn.innerHTML = '<i class="ri-file-copy-line"></i>';
                }, 1800);
            });
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        initializeDraggableSteps();
        setupCanvasDropZone();
        initEventListeners();
        // First render
        renderSteps();
        updatePreviewAndValidation();
    });

    export function refreshWorkflowUI() {
        renderSteps();
        updatePreviewAndValidation();
    }