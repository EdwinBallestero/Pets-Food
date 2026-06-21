document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const errorBox = document.getElementById('loginError');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    try {
      const user = await loginUser(username, password);
      window.location.href = 'index.html';
    } catch (error) {
      if (errorBox) {
        errorBox.textContent = error.message;
      }
    }
  });
});
