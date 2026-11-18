const fs = require('fs');
let c = fs.readFileSync('public/home.html.bak', 'utf8');

const css = `
  /* ===== 学员进步对比（深色震撼版） ===== */
  .progress-hero{margin:34px auto 0;max-width:1320px;background:linear-gradient(160deg,#1a1108,#2e2113);border-radius:26px;padding:40px 28px 28px;box-shadow:0 24px 60px rgba(26,18,8,.35);position:relative;overflow:hidden}
  .progress-hero::before{content:"";position:absolute;top:-80px;right:-80px;width:240px;height:240px;border-radius:50%;background:radial-gradient(circle,rgba(232,160,90,.15),transparent 70%)}
  .ph-tag{font-size:11px;letter-spacing:.3em;color:#E8A05A;text-align:center;margin-bottom:12px}
  .ph-title{font-size:clamp(24px,4vw,32px);font-weight:800;color:#f5ede2;text-align:center}
  .ph-sub{font-size:13px;color:#b9a996;text-align:center;margin-top:6px}
  .ph-stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:24px}
  .ph-stat{background:rgba(255,255,255,.05);border:1px solid rgba(232,160,90,.2);border-radius:18px;padding:20px 12px;text-align:center}
  .ph-stat.ph-main-stat{grid-column:span 2;background:linear-gradient(135deg,#E8784A,#D9643C);border:none;box-shadow:0 12px 32px rgba(232,120,74,.3)}
  .ph-num{font-size:36px;font-weight:900;color:#f5ede2;font-variant-numeric:tabular-nums;line-height:1.1}
  .ph-main-stat .ph-num{font-size:52px}
  .ph-unit{font-size:.4em;font-weight:600;opacity:.8;margin-left:3px}
  .ph-label{font-size:11px;color:#b9a996;margin-top:6px}
  .ph-main-stat .ph-label{color:rgba(255,255,255,.9)}
  .ph-divider{display:flex;align-items:center;gap:12px;max-width:1320px;margin:20px auto 8px;padding:0 20px}
  .ph-divider::before,.ph-divider::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(232,160,90,.3),transparent)}
  .ph-divider span{font-size:11px;letter-spacing:.2em;color:#E8A05A}
  .ph-scroller-wrap{max-width:1320px;margin:0 auto;padding:10px 16px}
  .ph-scroller{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;height:420px;overflow:hidden;position:relative;-webkit-mask-image:linear-gradient(180deg,transparent 0,#000 28px,#000 calc(100% - 28px),transparent 100%);mask-image:linear-gradient(180deg,transparent 0,#000 28px,#000 calc(100% - 28px),transparent 100%);touch-action:pan-y;cursor:grab}
  .ph-scroller.dragging{cursor:grabbing}
  .ph-card{background:linear-gradient(160deg,#1f1508,#2a1d0e);border:1px solid rgba(232,160,90,.2);border-radius:16px;padding:14px 12px;display:flex;flex-direction:column;gap:6px}
  .ph-card-top{display:flex;align-items:center;gap:8px}
  .ph-av{width:32px;height:32px;border-radius:10px;flex:none;display:grid;place-items:center;color:#fff;font-size:14px;font-weight:800}
  .ph-card-name{font-size:14px;font-weight:700;color:#f5ede2;line-height:1.2}
  .ph-card-exam{font-size:10px;color:#9a8e7a;line-height:1.2}
  .ph-card-scores{display:flex;align-items:baseline;gap:6px;margin-top:2px}
  .ph-from{font-size:16px;color:#b9a996;font-weight:700;font-variant-numeric:tabular-nums}
  .ph-arrow{font-size:12px;color:#E8784A}
  .ph-to{font-size:22px;color:#E8A05A;font-weight:800;font-variant-numeric:tabular-nums}
  .ph-gain{margin-top:auto;display:inline-block;width:fit-content;font-size:11px;font-weight:700;padding:2px 9px;border-radius:99px;color:#fff}
  .ph-gain.g{background:linear-gradient(135deg,#27a644,#1e8b3a)}
  .ph-gain.o{background:linear-gradient(135deg,#E8A05A,#D9783C)}
  .ph-scrollbar{height:3px;background:rgba(245,237,226,.1);border-radius:3px;margin:8px 16px 0;overflow:hidden}
  .ph-scrollbar i{display:block;height:100%;background:#E8A05A;width:0}
  .ph-hint{text-align:center;font-size:10px;color:#6b5e4e;padding:6px 0 10px}
  .ph-type-row{display:flex;gap:10px;max-width:1320px;margin:0 auto;padding:0 16px 16px}
  .ph-type-card{flex:1;background:rgba(255,255,255,.04);border:1px solid rgba(232,160,90,.15);border-radius:14px;padding:14px 8px;text-align:center}
  .ph-t-name{font-size:11px;color:#b9a996;margin-bottom:4px}
  .ph-t-num{font-size:18px;font-weight:800;color:#E8A05A}
  .ph-t-gain{font-size:10px;color:#27a644;margin-top:2px}
  .ph-note{text-align:center;font-size:11px;color:#6b5e4e;padding:8px 16px 20px;max-width:1320px;margin:0 auto}
  @media (max-width:960px){.ph-scroller{grid-template-columns:repeat(2,1fr);height:440px}}
  @media (max-width:520px){.progress-hero{padding:28px 16px 20px}.ph-num{font-size:30px}.ph-main-stat .ph-num{font-size:42px}.ph-scroller{grid-template-columns:repeat(2,1fr);height:460px;gap:10px}.ph-card{padding:12px 10px}.ph-to{font-size:20px}}

`;

c = c.replace('</style>', css + '</style>');
fs.writeFileSync('public/home.html', c, 'utf8');
console.log('Done. Size:', c.length);
console.log('Check 牧哲学堂:', c.includes('牧哲学堂'));
console.log('Check 杜*诺:', c.includes('杜*诺'));
console.log('Check .progress-hero CSS:', c.includes('.progress-hero{'));
