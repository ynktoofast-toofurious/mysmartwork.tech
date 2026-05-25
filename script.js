const AUTH_KEY = "mwangaza_auth";

const scriptElement = document.currentScript;
const baseUrl = scriptElement ? new URL(".", scriptElement.src).href : new URL("./", window.location.href).href;
const adminUrl = new URL("admin/", baseUrl).href;

const isSignInElement = (el) => {
  if (!el) return false;
  const text = (el.textContent || "").trim().toLowerCase();
  return text === "se connecter" || text.includes("se connecter");
};

document.addEventListener(
  "click",
  (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const action = target.closest("button, a");
    if (!isSignInElement(action)) return;

    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === "function") {
      event.stopImmediatePropagation();
    }

    localStorage.setItem(AUTH_KEY, "true");
    window.location.assign(adminUrl);
  },
  true
);
