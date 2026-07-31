// 🛡️ ABsUP Immutable Branding & Anti-Tamper Guard Engine
(function () {
  const TARGET_URL = "https://pocwu.pages.dev";
  const REDIRECT_PATH = "/F/";
  const BRANDING_TEXT = "🗄️⚡💝~ ABsUP.ORG";

  function verifyBranding() {
    const link = document.getElementById("absup-footer-link");
    if (!link || link.href !== TARGET_URL || !link.innerText.includes(BRANDING_TEXT)) {
      window.location.href = REDIRECT_PATH;
      return;
    }
    const style = window.getComputedStyle(link);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
      window.location.href = REDIRECT_PATH;
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    if (!document.getElementById("absup-footer-link")) {
      const footer = document.createElement("footer");
      footer.style.cssText = "text-align:center; padding:15px; background:rgba(0,0,0,0.8); position:fixed; bottom:0; width:100%; z-index:999999;";
      footer.innerHTML = `<a href="${TARGET_URL}" id="absup-footer-link" target="_blank" style="color:#00d2ff; font-weight:bold; text-decoration:none; font-family:sans-serif;">${BRANDING_TEXT}</a>`;
      document.body.appendChild(footer);
    }
    verifyBranding();
    setInterval(verifyBranding, 1500);
  });
})();
