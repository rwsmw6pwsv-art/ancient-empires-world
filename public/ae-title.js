/* Decorative meridians for the Ancient Empires title. */
(function () {
  function paint(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(203,191,170,0.12)";
    ctx.lineWidth = 1;
    const cx = w * 0.72;
    const cy = h * 0.42;
    for (let i = 1; i <= 6; i++) {
      ctx.beginPath();
      ctx.arc(cx, cy, 28 * i, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let a = 0; a < 12; a++) {
      const t = (a / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(t) * 180, cy + Math.sin(t) * 180);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(195,146,42,0.28)";
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.stroke();
  }
  window.mountAeTitle = paint;
  function boot() {
    const el = document.getElementById("ae-title");
    if (el) paint(el);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  window.addEventListener("resize", boot);
})();
