const AUTH_USER_KEY = 'logged_user';
let authUsersCache = null;

async function loadAuthUsers() {
  if (authUsersCache) return authUsersCache;
  const resp = await fetch('data/users.json');
  if (!resp.ok) throw new Error('No se pudo cargar usuarios');
  authUsersCache = await resp.json();
  return authUsersCache;
}

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_USER_KEY));
  } catch (e) {
    return null;
  }
}

function saveStoredUser(user) {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

function clearStoredUser() {
  localStorage.removeItem(AUTH_USER_KEY);
}

async function loginUser(username, password) {
  const users = await loadAuthUsers();
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
  if (!user) {
    throw new Error('Usuario o clave incorrecta');
  }
  saveStoredUser({ username: user.username, role: user.role });
  return user;
}

function logoutUser() {
  clearStoredUser();
  window.location.href = 'login.html';
}

function setupAuthNav() {
  const user = getStoredUser();
  const catalogItems = document.querySelectorAll('.nav-catalog');
  const solicitudesItems = document.querySelectorAll('.nav-solicitudes');
  const loginItems = document.querySelectorAll('.nav-login');
  const logoutItems = document.querySelectorAll('.nav-logout');
  const catalogButtons = document.querySelectorAll('.ver-catalogo-btn');
  const userLabel = document.getElementById('loggedUserLabel');

  catalogItems.forEach(item => {
    item.style.display = user?.role === 'admin' ? '' : 'none';
  });
  catalogButtons.forEach(button => {
    button.style.display = user?.role === 'admin' ? '' : 'none';
  });
  solicitudesItems.forEach(item => {
    item.style.display = user ? '' : 'none';
  });
  loginItems.forEach(item => {
    item.style.display = user ? 'none' : '';
  });
  logoutItems.forEach(item => {
    item.style.display = user ? '' : 'none';
  });
  if (userLabel) {
    userLabel.textContent = user ? `${user.username} (${user.role})` : '';
  }
}

function attachAuthHandlers() {
  const logoutLink = document.getElementById('logoutLink');
  if (logoutLink) {
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      logoutUser();
    });
  }
}

function getCurrentPath() {
  return window.location.pathname.split('/').pop();
}

function requireAuth(allowedRoles = []) {
  const user = getStoredUser();
  if (!user) {
    const redirect = encodeURIComponent(getCurrentPath());
    window.location.href = `login.html?redirect=${redirect}`;
    return false;
  }
  if (allowedRoles.length && !allowedRoles.includes(user.role)) {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

function redirectIfLoggedIn() {
  const user = getStoredUser();
  if (!user) return;
  if (getCurrentPath() === 'login.html') {
    if (user.role === 'admin') {
      window.location.href = 'catalogo.html';
    } else {
      window.location.href = 'solicitudes.html';
    }
  }
}

function initAuth() {
  setupAuthNav();
  attachAuthHandlers();
  const page = getCurrentPath();
  if (page === 'login.html') {
    redirectIfLoggedIn();
  }
  if (page === 'catalogo.html') {
    requireAuth(['admin']);
  }
  if (page === 'solicitudes.html') {
    requireAuth(['admin', 'cliente']);
  }
}

document.addEventListener('DOMContentLoaded', initAuth);
