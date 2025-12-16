// Authentication utilities - Reusable across dashboards
async function checkAuth() {
  try {
    const response = await fetch('/api/auth/session', { credentials: 'include' });
    const data = await response.json();
    if (!data.authenticated) {
      window.location.href = '/';
      return false;
    }
    localStorage.setItem('user', JSON.stringify(data.user));
    return true;
  } catch (error) {
    console.error('Auth check failed:', error);
    window.location.href = '/';
    return false;
  }
}

function getAuthUser() {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

function logout() {
  localStorage.removeItem('user');
  window.location.href = '/api/auth/logout';
}
