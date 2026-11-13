/* Reception chat widget loader. Usage:
 * <script src="https://YOUR-RECEPTION-HOST/widget.js" data-reception="WIDGET_TOKEN" async></script>
 * The chat runs in an iframe, so the host page's CSS and scripts can't touch it (and vice versa).
 * Which sites may embed it is enforced server-side with a frame-ancestors policy.
 */
(function () {
  var script = document.currentScript || document.querySelector("script[data-reception]");
  if (!script || window.__receptionWidget) return;
  window.__receptionWidget = true;
  var token = script.getAttribute("data-reception");
  var origin = new URL(script.src).origin;
  if (!token) return;

  var root = document.createElement("div");
  root.style.cssText = "position:fixed;right:20px;bottom:20px;z-index:2147483000;font-family:system-ui,sans-serif";
  var shadow = root.attachShadow ? root.attachShadow({ mode: "open" }) : root;

  var btn = document.createElement("button");
  btn.type = "button";
  btn.setAttribute("aria-label", "Open chat");
  btn.setAttribute("aria-expanded", "false");
  btn.style.cssText =
    "all:initial;cursor:pointer;width:56px;height:56px;border-radius:50%;background:#3f574d;color:#fff;display:grid;place-items:center;box-shadow:0 8px 24px -8px rgba(33,40,38,.5)";
  btn.innerHTML =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';

  var frame = document.createElement("iframe");
  frame.title = "Chat";
  frame.src = origin + "/widget/" + encodeURIComponent(token);
  frame.setAttribute("loading", "lazy");
  frame.style.cssText =
    "display:none;position:absolute;right:0;bottom:72px;width:380px;height:600px;max-width:calc(100vw - 40px);max-height:calc(100vh - 110px);border:1px solid #e7e5df;border-radius:14px;background:#faf9f6;box-shadow:0 24px 60px -24px rgba(33,40,38,.45)";

  function setOpen(open) {
    frame.style.display = open ? "block" : "none";
    btn.setAttribute("aria-expanded", String(open));
    btn.setAttribute("aria-label", open ? "Close chat" : "Open chat");
  }
  btn.addEventListener("click", function () {
    setOpen(frame.style.display === "none");
  });
  window.addEventListener("message", function (e) {
    if (e.origin === origin && e.data && e.data.reception === "close") setOpen(false);
  });

  shadow.appendChild(frame);
  shadow.appendChild(btn);
  document.body.appendChild(root);
})();
