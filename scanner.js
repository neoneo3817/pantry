/* scanner.js — 바코드 리더 (index.html과 분리된 연결 파일)
   사용: PantryScanner.open(코드 => { ... })
   1순위: 브라우저 내장 BarcodeDetector (안드로이드 크롬 등)
   2순위: ZXing (CDN에서 최초 1회 내려받아 캐시) */
(function () {
  const FMT = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf", "qr_code"];
  const ZX = "https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js";
  const CSS = `
#scanDlg{border:0;padding:0;background:#000;color:#fff;width:100vw;height:100dvh;max-width:none;max-height:none;overflow:hidden}
#scanDlg::backdrop{background:#000}
#scanDlg video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
#scanDlg .sf{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none}
#scanDlg .sf i{width:min(78vw,360px);height:min(46vw,210px);border:3px solid #fdb827;border-radius:22px;box-shadow:0 0 0 100vmax rgba(0,0,0,.45)}
#scanDlg .sx{position:absolute;top:calc(env(safe-area-inset-top,0px) + 14px);right:14px;width:46px;height:46px;border-radius:50%;border:0;background:rgba(255,255,255,.92);font-size:18px;color:#2e2620}
#scanDlg .sm{position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 84px);text-align:center;font:600 14px system-ui,sans-serif;padding:0 16px;text-shadow:0 1px 4px #000}
#scanDlg form{position:absolute;left:16px;right:16px;bottom:calc(env(safe-area-inset-bottom,0px) + 20px);display:flex;gap:8px}
#scanDlg input{flex:1;min-width:0;border:0;border-radius:16px;padding:13px 14px;font:600 15px system-ui,sans-serif}
#scanDlg form button{border:0;border-radius:16px;padding:0 20px;background:#fdb827;color:#3d2a14;font:800 15px system-ui,sans-serif}`;
  let dlg, vid, msg, stream, timer, zr, cb, busy;

  function build() {
    if (dlg) return;
    const st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
    dlg = document.createElement("dialog"); dlg.id = "scanDlg";
    dlg.innerHTML = '<video playsinline muted></video><div class="sf"><i></i></div><button class="sx" type="button" aria-label="닫기">✕</button><div class="sm"></div><form><input inputmode="numeric" placeholder="번호 직접 입력" aria-label="바코드 번호 직접 입력"><button>확인</button></form>';
    document.body.appendChild(dlg);
    vid = dlg.querySelector("video"); msg = dlg.querySelector(".sm");
    dlg.querySelector(".sx").onclick = close;
    dlg.addEventListener("cancel", e => { e.preventDefault(); close(); });
    dlg.querySelector("form").onsubmit = e => { e.preventDefault(); const v = e.target.querySelector("input").value.trim(); if (v) done(v); };
  }
  function done(code) { if (busy) return; busy = true; if (navigator.vibrate) navigator.vibrate(40); close(); if (cb) cb(code); }
  function close() {
    clearInterval(timer); timer = null;
    if (zr) { try { zr.reset(); } catch (e) {} zr = null; }
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    if (vid) vid.srcObject = null;
    if (dlg && dlg.open) dlg.close();
  }
  const loadZX = () => window.ZXing ? Promise.resolve() : new Promise((ok, no) => {
    const s = document.createElement("script"); s.src = ZX; s.onload = ok; s.onerror = no; document.head.appendChild(s);
  });
  async function open(onCode) {
    cb = onCode; busy = false; build();
    dlg.querySelector("input").value = "";
    msg.textContent = "바코드를 사각형 안에 맞춰 주세요";
    dlg.showModal();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { msg.textContent = "이 환경에서는 카메라를 쓸 수 없어요. 번호를 직접 입력해 주세요."; return; }
    try {
      if ("BarcodeDetector" in window) {
        let f = null;
        try { const sup = await BarcodeDetector.getSupportedFormats(); f = FMT.filter(x => sup.includes(x)); if (!f.length) f = null; } catch (e) { f = null; }
        if (f) {
          const det = new BarcodeDetector({ formats: f });
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } }, audio: false });
          vid.srcObject = stream; await vid.play();
          timer = setInterval(async () => {
            try { if (vid.readyState < 2) return; const r = await det.detect(vid); if (r.length) done(r[0].rawValue); } catch (e) {}
          }, 250);
          return;
        }
      }
      msg.textContent = "스캐너를 준비하는 중…";
      await loadZX();
      zr = new ZXing.BrowserMultiFormatReader();
      msg.textContent = "바코드를 사각형 안에 맞춰 주세요";
      await zr.decodeFromVideoDevice(undefined, vid, r => { if (r) done(r.getText()); });
    } catch (e) {
      msg.textContent = "카메라를 열 수 없어요. 권한을 확인하거나 번호를 직접 입력해 주세요.";
    }
  }
  window.PantryScanner = { open, close };
})();
