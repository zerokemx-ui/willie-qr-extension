/* === Willie QR Extension · popup.js === */
(() => {
  "use strict";

  // ---------- UTF-8 override for qrcode-generator ----------
  // The default stringToBytes truncates to low byte, breaking Chinese / emoji.
  // Replace with a proper UTF-8 encoder so non-ASCII content scans correctly.
  if (typeof qrcode !== "undefined" && qrcode.stringToBytes) {
    qrcode.stringToBytes = function (s) {
      const encoded = unescape(encodeURIComponent(s));
      const bytes = new Array(encoded.length);
      for (let i = 0; i < encoded.length; i++) bytes[i] = encoded.charCodeAt(i);
      return bytes;
    };
  }

  // ---------- State ----------
  const state = {
    text: "",
    ec: "M",                 // L | M | Q | H
    dataStyle: "square",     // square | dot | rounded | gapped
    frameStyle: "square",    // square | rounded | circle
    centerStyle: "square",
    logoImg: null,           // HTMLImageElement
    qr: null,                // last qrcode() instance
    dotScale: 0.85,
    border: 2,               // quiet zone in modules
    boxPx: 20,               // rendering scale per module (in canvas px)
  };

  // ---------- Elements ----------
  const $ = (id) => document.getElementById(id);
  const input = $("qr-input");
  const fetchUrlBtn = $("fetch-url");
  const canvas = $("qr-canvas");
  const ctx = canvas.getContext("2d");
  const previewEmpty = $("preview-empty");
  const statusLine = $("status-line");
  const logoFile = $("logo-file");
  const logoLabel = $("logo-label");
  const logoClearBtn = $("logo-clear");
  const upload = document.querySelector(".upload-btn");
  const saveBtnPng = $("save-png");
  const saveBtnSvg = $("save-svg");
  const copyBtn = $("copy-png");
  const themeToggle = $("theme-toggle");

  // ---------- Theme ----------
  function applyTheme(isDark) {
    document.body.classList.toggle("dark", isDark);
    try { localStorage.setItem("willieqr_theme", isDark ? "dark" : "light"); } catch (_) {}
  }
  (function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem("willieqr_theme"); } catch (_) {}
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(saved ? saved === "dark" : prefersDark);
  })();
  themeToggle.addEventListener("click", () => {
    applyTheme(!document.body.classList.contains("dark"));
  });

  // ---------- Group button bindings ----------
  function bindGroup(groupName, attr, onSelect) {
    document.querySelectorAll(`[data-group="${groupName}"] [${attr}]`).forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(`[data-group="${groupName}"] [${attr}]`).forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        onSelect(btn.getAttribute(attr));
      });
    });
  }
  bindGroup("ec", "data-ec", (v) => { state.ec = v; render(); });
  bindGroup("data", "data-style", (v) => { state.dataStyle = v; render(); });
  bindGroup("frame", "data-style", (v) => { state.frameStyle = v; render(); });
  bindGroup("center", "data-style", (v) => { state.centerStyle = v; render(); });

  // ---------- Input ----------
  let debounceTimer;
  input.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      state.text = input.value;
      render();
    }, 120);
  });

  // ---------- Fetch current tab URL ----------
  fetchUrlBtn.addEventListener("click", async () => {
    try {
      if (!chrome?.tabs) throw new Error("chrome.tabs unavailable");
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url) {
        input.value = tab.url;
        state.text = tab.url;
        render();
        toast("已抓取目前分頁網址");
      }
    } catch (err) {
      toast("無法讀取分頁網址");
    }
  });

  // ---------- Logo ----------
  logoFile.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        state.logoImg = img;
        logoLabel.textContent = "LOGO 已載入";
        upload.classList.add("loaded");
        logoClearBtn.classList.remove("hidden");
        // Auto-bump to H when logo is present
        if (state.ec !== "H") {
          state.ec = "H";
          document.querySelectorAll('[data-group="ec"] .pill').forEach((b) => {
            b.classList.toggle("active", b.getAttribute("data-ec") === "H");
          });
          toast("已自動切換容錯率 H (30%)");
        }
        render();
      };
      img.onerror = () => toast("圖片讀取失敗");
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
  logoClearBtn.addEventListener("click", () => {
    state.logoImg = null;
    logoFile.value = "";
    logoLabel.textContent = "上傳圖片";
    upload.classList.remove("loaded");
    logoClearBtn.classList.add("hidden");
    render();
  });

  // ---------- QR matrix generation ----------
  function buildMatrix(text, ecLevel) {
    // Auto type number (1–40): let the lib decide by increasing until it fits.
    for (let type = 1; type <= 40; type++) {
      try {
        const qr = qrcode(type, ecLevel);
        qr.addData(text);
        qr.make();
        return qr;
      } catch (_) { /* try next type */ }
    }
    throw new Error("內容過長，無法產生 QR Code");
  }

  // ---------- Rendering ----------
  function isEyeZone(r, c, size) {
    if (r < 7 && c < 7) return true;
    if (r < 7 && c >= size - 7) return true;
    if (r >= size - 7 && c < 7) return true;
    return false;
  }

  function render() {
    const text = state.text.trim();
    if (!text) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      previewEmpty.classList.remove("hidden");
      statusLine.textContent = "準備就緒";
      state.qr = null;
      return;
    }
    try {
      const qr = buildMatrix(text, state.ec);
      state.qr = qr;
      const size = qr.getModuleCount();
      const border = state.border;
      const box = state.boxPx;
      const total = (size + border * 2) * box;

      // Resize canvas to match module-pixel layout for crisp output
      canvas.width = total;
      canvas.height = total;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, total, total);

      ctx.fillStyle = "#000000";
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (!qr.isDark(r, c)) continue;
          if (isEyeZone(r, c, size)) continue;
          const x = (c + border) * box;
          const y = (r + border) * box;
          drawDataModule(ctx, x, y, box);
        }
      }
      drawEyes(ctx, qr, size, border, box);

      if (state.logoImg) drawLogo(ctx, total);

      previewEmpty.classList.add("hidden");
      statusLine.textContent = `已產生 · ${size}×${size} · EC ${state.ec}${state.logoImg ? " · 含 LOGO" : ""}`;
    } catch (err) {
      previewEmpty.classList.remove("hidden");
      statusLine.textContent = err.message || "產生失敗";
      state.qr = null;
    }
  }

  function drawDataModule(ctx, x, y, box) {
    const scaled = box * state.dotScale;
    const offset = (box - scaled) / 2;
    const cx = x + box / 2;
    const cy = y + box / 2;
    const r = scaled / 2;
    switch (state.dataStyle) {
      case "dot":
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        break;
      case "rounded":
        roundRect(ctx, x + offset, y + offset, scaled, scaled, scaled * 0.3);
        ctx.fill();
        break;
      case "gapped": {
        const gap = box * 0.75;
        const off = (box - gap) / 2;
        ctx.fillRect(x + off, y + off, gap, gap);
        break;
      }
      case "square":
      default:
        ctx.fillRect(x + offset, y + offset, scaled, scaled);
    }
  }

  function drawEyes(ctx, qr, size, border, box) {
    const centers = [
      [(border + 3.5) * box, (border + 3.5) * box],
      [(size - 7 + border + 3.5) * box, (border + 3.5) * box],
      [(border + 3.5) * box, (size - 7 + border + 3.5) * box],
    ];
    const rOuter = 3.45 * box;
    const rInner = 2.45 * box;
    const rCenter = 1.45 * box;
    const clear = 3.5 * box;
    for (const [cx, cy] of centers) {
      // Clear the whole eye region (so any stray data under the eye is removed)
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(cx - clear, cy - clear, clear * 2, clear * 2);
      // Outer frame (black)
      ctx.fillStyle = "#000000";
      drawEyeShape(ctx, cx, cy, rOuter, state.frameStyle, true);
      // Punch the inner out with white (same shape family)
      ctx.fillStyle = "#ffffff";
      drawEyeShape(ctx, cx, cy, rInner, state.frameStyle, true);
      // Center eye
      ctx.fillStyle = "#000000";
      drawEyeShape(ctx, cx, cy, rCenter, state.centerStyle, true);
    }
  }

  function drawEyeShape(ctx, cx, cy, r, style, fill) {
    ctx.beginPath();
    if (style === "circle") {
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
    } else if (style === "rounded") {
      const d = r * 2;
      roundRectPath(ctx, cx - r, cy - r, d, d, d * 0.28);
    } else {
      ctx.rect(cx - r, cy - r, r * 2, r * 2);
    }
    if (fill) ctx.fill();
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    roundRectPath(ctx, x, y, w, h, r);
  }
  function roundRectPath(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  function drawLogo(ctx, total) {
    const img = state.logoImg;
    const max = Math.round(total * 0.22);
    const ratio = Math.min(max / img.naturalWidth, max / img.naturalHeight);
    const w = img.naturalWidth * ratio;
    const h = img.naturalHeight * ratio;
    const x = (total - w) / 2;
    const y = (total - h) / 2;
    // White pad for readability
    const pad = Math.round(total * 0.01);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x - pad, y - pad, w + pad * 2, h + pad * 2);
    ctx.drawImage(img, x, y, w, h);
  }

  // ---------- SVG export ----------
  function generateSVG() {
    if (!state.qr) return null;
    const qr = state.qr;
    const size = qr.getModuleCount();
    const border = state.border;
    const box = state.boxPx;
    const total = (size + border * 2) * box;
    const parts = [];
    parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${total}" viewBox="0 0 ${total} ${total}">`);
    parts.push(`<rect width="100%" height="100%" fill="#ffffff"/>`);
    // data
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!qr.isDark(r, c)) continue;
        if (isEyeZone(r, c, size)) continue;
        const x = (c + border) * box;
        const y = (r + border) * box;
        parts.push(dataModuleSVG(x, y, box));
      }
    }
    // eyes
    const centers = [
      [(border + 3.5) * box, (border + 3.5) * box],
      [(size - 7 + border + 3.5) * box, (border + 3.5) * box],
      [(border + 3.5) * box, (size - 7 + border + 3.5) * box],
    ];
    const rOuter = 3.45 * box;
    const rInner = 2.45 * box;
    const rCenter = 1.45 * box;
    for (const [cx, cy] of centers) {
      const outerPath = eyeShapePath(cx, cy, rOuter, state.frameStyle);
      const innerPath = eyeShapePath(cx, cy, rInner, state.frameStyle);
      parts.push(`<path fill-rule="evenodd" fill="#000000" d="${outerPath} ${innerPath}"/>`);
      parts.push(`<path fill="#000000" d="${eyeShapePath(cx, cy, rCenter, state.centerStyle)}"/>`);
    }
    parts.push("</svg>");
    return parts.join("\n");
  }

  function dataModuleSVG(x, y, box) {
    const scaled = box * state.dotScale;
    const off = (box - scaled) / 2;
    const cx = x + box / 2;
    const cy = y + box / 2;
    const r = scaled / 2;
    switch (state.dataStyle) {
      case "dot":
        return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#000000"/>`;
      case "rounded":
        return `<rect x="${cx - r}" y="${cy - r}" width="${scaled}" height="${scaled}" rx="${scaled * 0.3}" fill="#000000"/>`;
      case "gapped": {
        const gap = box * 0.75;
        const goff = (box - gap) / 2;
        return `<rect x="${x + goff}" y="${y + goff}" width="${gap}" height="${gap}" fill="#000000"/>`;
      }
      case "square":
      default:
        return `<rect x="${x + off}" y="${y + off}" width="${scaled}" height="${scaled}" fill="#000000"/>`;
    }
  }

  function eyeShapePath(cx, cy, r, style) {
    if (style === "circle") {
      // Full circle as path (CCW so even-odd cut-outs work)
      return `M ${cx - r},${cy} a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 ${-r * 2},0 Z`;
    }
    if (style === "rounded") {
      const d = r * 2;
      const rad = d * 0.28;
      const x = cx - r, y = cy - r;
      return `M ${x + rad},${y} L ${x + d - rad},${y} A ${rad},${rad} 0 0 1 ${x + d},${y + rad} L ${x + d},${y + d - rad} A ${rad},${rad} 0 0 1 ${x + d - rad},${y + d} L ${x + rad},${y + d} A ${rad},${rad} 0 0 1 ${x},${y + d - rad} L ${x},${y + rad} A ${rad},${rad} 0 0 1 ${x + rad},${y} Z`;
    }
    const x = cx - r, y = cy - r;
    return `M ${x},${y} L ${x + r * 2},${y} L ${x + r * 2},${y + r * 2} L ${x},${y + r * 2} Z`;
  }

  // ---------- Save / Copy ----------
  function download(name, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  saveBtnPng.addEventListener("click", () => {
    if (!state.qr) { toast("請先輸入內容"); return; }
    canvas.toBlob((blob) => {
      if (!blob) return toast("匯出失敗");
      download(`qrcode-${Date.now()}.png`, blob);
      toast("已下載 PNG");
    }, "image/png");
  });

  saveBtnSvg.addEventListener("click", () => {
    if (!state.qr) { toast("請先輸入內容"); return; }
    const svg = generateSVG();
    if (!svg) return toast("匯出失敗");
    const blob = new Blob([svg], { type: "image/svg+xml" });
    download(`qrcode-${Date.now()}.svg`, blob);
    if (state.logoImg) toast("SVG 已下載（不含 LOGO，請於 AI 中置入）");
    else toast("已下載 SVG");
  });

  copyBtn.addEventListener("click", async () => {
    if (!state.qr) { toast("請先輸入內容"); return; }
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return toast("複製失敗");
        const item = new ClipboardItem({ "image/png": blob });
        await navigator.clipboard.write([item]);
        toast("圖片已複製到剪貼簿");
      }, "image/png");
    } catch (err) {
      toast("瀏覽器不支援複製圖片");
    }
  });

  // ---------- Toast ----------
  let toastEl;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.remove("show"), 1800);
  }

  // ---------- Initial render ----------
  render();
})();
