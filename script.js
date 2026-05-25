const AUTH_KEY = "mwangaza_auth";

const openLogin = document.getElementById("openLogin");
const heroLogin = document.getElementById("heroLogin");
const dialog = document.getElementById("loginDialog");
const closeDialog = document.getElementById("closeDialog");
const loginForm = document.getElementById("loginForm");

const openAuthDialog = () => {
  if (dialog && typeof dialog.showModal === "function") {
    dialog.showModal();
  }
};

openLogin?.addEventListener("click", openAuthDialog);
heroLogin?.addEventListener("click", openAuthDialog);

closeDialog?.addEventListener("click", () => {
  dialog?.close();
});

loginForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const email = document.getElementById("email")?.value.trim();
  const password = document.getElementById("password")?.value.trim();

  if (!email || !password) {
    return;
  }

  localStorage.setItem(AUTH_KEY, "true");
  window.location.href = "./admin/";
});
