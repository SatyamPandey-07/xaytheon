/**
 * XAYTHEON - Real-Time Collaboration Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. UI Elements
    const statusEl = document.getElementById('connection-status');
    const userListEl = document.getElementById('user-list');
    const activityFeedEl = document.getElementById('activity-feed');
    const inviteBtn = document.getElementById('invite-btn');
    const workspaceCard = document.querySelector('.workspace-card');

    // Parse URL params for Room ID
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room') || 'global-collab';
    document.getElementById('room-id-display').textContent = roomId;

    // 2. Initialize Socket & Collaboration
    const token = localStorage.getItem('sb-access-token') || 'demo-token';
    const socket = io('http://localhost:5000', { auth: { token } });

    // Initialize Cursor Tracker
    const cursorManager = new CollabCursors('shared-workspace-area');
    // For this demo, let's use the workspace card as the area
    workspaceCard.id = 'shared-workspace-area';

    // 3. Socket Connection & Room Engagement
    socket.on('connect', () => {
        statusEl.innerHTML = '🟢 Live';
        statusEl.style.color = '#10b981';

        // Join room with user metadata
        socket.emit('join_collab', {
            roomId: roomId,
            userMetadata: {
                name: `User ${socket.id.substring(0, 4)}`,
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${socket.id}`
            }
        });
    });

    socket.on('presence_update', ({ viewers }) => {
        renderUserList(viewers);
    });

    socket.on('user_joined_collab', ({ metadata }) => {
        addActivity(`${metadata.name} joined the workspace.`);
    });

    socket.on('user_left_collab', ({ userId }) => {
        cursorManager.removeCursor(userId);
        addActivity(`A user left the room.`);
    });

    // --- Cursor Tracking ---
    workspaceCard.addEventListener('mousemove', (e) => {
        const rect = workspaceCard.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        socket.emit('cursor_move', { roomId, x, y });
    });

    socket.on('cursor_update', ({ userId, x, y, metadata }) => {
        cursorManager.updateCursor(userId, x, y, metadata);
    });

    // --- Typing Indicators & Content Sync ---
    const sharedInput = document.createElement('textarea');
    sharedInput.className = 'shared-editor';
    sharedInput.placeholder = 'Collaborative Notes...';
    document.getElementById('shared-list').appendChild(sharedInput);

    let typingTimeout;
    sharedInput.addEventListener('input', (e) => {
        // Optimistic Sync
        socket.emit('edit_content', { roomId, change: e.target.value });

        // Typing indicator
        clearTimeout(typingTimeout);
        socket.emit('typing_status', { roomId, isTyping: true });

        typingTimeout = setTimeout(() => {
            socket.emit('typing_status', { roomId, isTyping: false });
        }, 1000);
    });

    socket.on('content_synced', ({ change, userId }) => {
        if (userId !== socket.id) {
            sharedInput.value = change;
        }
    });

    const typingArea = document.createElement('div');
    typingArea.id = 'typing-indicator-area';
    typingArea.className = 'typing-indicator';
    sharedInput.after(typingArea);

    socket.on('user_typing', ({ metadata, isTyping }) => {
        if (isTyping) {
            typingArea.innerText = `${metadata.name} is typing...`;
        } else {
            typingArea.innerText = '';
        }
    });

    // --- Helpers ---
    function renderUserList(viewers) {
        userListEl.innerHTML = viewers.map(v => `
            <li class="user-item">
                <div class="user-avatar">${v.metadata.name.substring(0, 2).toUpperCase()}</div>
                <span>${v.metadata.name}</span>
                <span class="user-status-dot"></span>
            </li>
        `).join('');
    }

    function addActivity(text) {
        const div = document.createElement('div');
        div.className = 'activity-item';
        div.innerHTML = `
            <span class="activity-time">${new Date().toLocaleTimeString()}</span>
            <span class="activity-text">${text}</span>
        `;
        activityFeedEl.prepend(div);
    }
});
