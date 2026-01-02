// Frontend Auth Integration (Self-hosted backend)
// Replaces Supabase auth with JWT-based backend auth

(function () {
  const API_BASE_URL = "http://localhost:5000/api/auth";

  /* =========================
     AUTH STATE
  ========================= */
  function isAuthenticated() {
    return Boolean(localStorage.getItem("token"));
  }

  /* =========================
     AUTH ACTIONS
  ========================= */
  async function login(email, password) {
    const res = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Login failed");
    }

    const data = await res.json();
    localStorage.setItem("token", data.token);
    renderAuthArea();
    applyAuthGating();
  }

  async function register(email, password) {
    const res = await fetch(`${API_BASE_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Registration failed");
    }

    return res.json();
  }

  function logout() {
    localStorage.removeItem("token");
    renderAuthArea();
    applyAuthGating();
  }

  /* =========================
     UI RENDERING
  ========================= */
  function renderAuthArea() {
    const container = document.getElementById("auth-area");
    if (!container) return;

    if (!isAuthenticated()) {
      container.innerHTML =
        '<a class="btn btn-outline" href="login.html">Sign in</a>';
      return;
    }

    container.innerHTML = `
      <div class="user-menu">
        <button class="user-button" id="user-button">
          <span class="user-avatar">U</span>
          <span class="chev">▾</span>
        </button>
        <div class="user-dropdown" id="user-dropdown" hidden>
          <button class="dropdown-item" id="sign-out-btn">Sign out</button>
        </div>
      </div>
    `;

    const btn = document.getElementById("user-button");
    const dd = document.getElementById("user-dropdown");
    const signOutBtn = document.getElementById("sign-out-btn");

    btn.addEventListener("click", () => {
      dd.toggleAttribute("hidden");
    });

    signOutBtn.addEventListener("click", logout);
  }

  /* =========================
     UI GATING
  ========================= */
  function applyAuthGating() {
    const authed = isAuthenticated();

    document
      .querySelectorAll("[data-requires-auth]")
      .forEach((el) => (el.style.display = authed ? "" : "none"));

    document
      .querySelectorAll("[data-requires-guest]")
      .forEach((el) => (el.style.display = authed ? "none" : ""));
  }

  /* =========================
     EXPORT (IMPORTANT)
  ========================= */
  window.XAYTHEON_AUTH = {
    login,
    register,   
    logout,
    isAuthenticated,
  };

  window.addEventListener("DOMContentLoaded", () => {
    renderAuthArea();
    applyAuthGating();
  });
})();
