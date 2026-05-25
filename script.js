const AUTH_KEY = "mwangaza_auth";

const scriptElement = document.currentScript;
const baseUrl = scriptElement ? new URL(".", scriptElement.src).href : new URL("./", window.location.href).href;
const adminUrl = new URL("admin/", baseUrl).href;
const loginDialog = document.getElementById("loginDialog");
const loginForm = document.getElementById("loginForm");
const closeLogin = document.getElementById("closeLogin");
const loginTriggers = Array.from(document.querySelectorAll(".login-trigger"));

const redirectToAdmin = () => {
  localStorage.setItem(AUTH_KEY, "true");
  window.location.assign(adminUrl);
};

const openLoginDialog = () => {
  if (loginDialog && typeof loginDialog.showModal === "function") {
    loginDialog.showModal();
  } else {
    redirectToAdmin();
  }
};

loginTriggers.forEach((trigger) => {
  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    openLoginDialog();
  });
});

closeLogin?.addEventListener("click", () => {
  loginDialog?.close();
});

loginForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = document.getElementById("emailInput")?.value.trim();
  const password = document.getElementById("passwordInput")?.value.trim();
  if (!email || !password) return;
  redirectToAdmin();
});
