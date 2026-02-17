/* auth-widget.js — shared auth guard + session pill for all pages */
(function () {
  "use strict";

  function escapeHtml(str) {
    var d = document.createElement("div");
    d.appendChild(document.createTextNode(str));
    return d.innerHTML;
  }

  var isIndex =
    location.pathname === "/" || location.pathname === "/index.html";

  fetch("/me", { credentials: "include" })
    .then(function (r) {
      return r.ok ? r.json() : Promise.reject("not ok");
    })
    .then(function (data) {
      if (!data.authed) {
        if (!isIndex) {
          location.href = "/?redirect_to=" + encodeURIComponent(location.pathname);
        }
        return;
      }
      injectPill(escapeHtml(data.username || "user"));
    })
    .catch(function () {
      if (!isIndex) {
        location.href = "/?redirect_to=" + encodeURIComponent(location.pathname);
      }
    });

  function injectPill(safeUser) {
    var css = document.createElement("style");
    css.textContent =
      "#aw-pill{position:fixed;bottom:16px;right:16px;z-index:9998;" +
      "background:rgba(30,30,30,.85);backdrop-filter:blur(8px);" +
      "color:#f0f0f0;font:500 12px/1 Inter,-apple-system,BlinkMacSystemFont,sans-serif;" +
      "padding:8px 14px;border-radius:20px;display:flex;align-items:center;gap:8px;" +
      "border:1px solid rgba(255,255,255,.12);box-shadow:0 2px 8px rgba(0,0,0,.25)}" +
      "#aw-pill span{opacity:.85}" +
      "#aw-pill a{color:#8cb4ff;text-decoration:none;cursor:pointer;margin-left:2px}" +
      "#aw-pill a:hover{text-decoration:underline}";
    document.head.appendChild(css);

    var pill = document.createElement("div");
    pill.id = "aw-pill";
    pill.innerHTML =
      "<span>" + safeUser + "</span>" +
      '<a id="aw-logout">Logout</a>';
    document.body.appendChild(pill);

    document.getElementById("aw-logout").addEventListener("click", function () {
      fetch("/logout", { method: "POST", credentials: "include" }).then(function () {
        location.href = "/";
      });
    });
  }
})();
