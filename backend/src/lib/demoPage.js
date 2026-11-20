import { escapeHtml as e } from "./email.js";

/**
 * Typical job value by niche, used only as the calculator's starting value.
 * The prospect can drag it to their real number. Kept deliberately
 * conservative and labelled as an estimate on the page.
 */
export const AVG_JOB_VALUE = {
  plumbing: 350,
  hvac: 450,
  electrical: 350,
  roofing: 1500,
  landscaping: 250,
  cleaning: 180,
  pest_control: 200,
  auto_repair: 400,
  dental: 300,
  med_spa: 350,
  salon: 90,
  law: 1500,
  real_estate: 2500,
  contractor: 1200,
  other: 250,
};

export function renderDemoPage({ slug, prospect, checkoutEnabled, calendlyUrl }) {
  const jobValue = AVG_JOB_VALUE[prospect.niche] ?? AVG_JOB_VALUE.other;
  const name = e(prospect.businessName);
  const convo = (prospect.sampleConversation || [])
    .map((m) => `<div class="b ${m.from === "caller" ? "in" : "out"}">${e(m.text)}</div>`)
    .join("");

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${name}: your missed calls, answered automatically</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Fraunces:wght@600&display=swap" rel="stylesheet">
<style>
:root{--ink:#14262a;--muted:#55686b;--bg:#f7f5f0;--card:#fff;--teal:#1f9e8f;--teal-d:#167a6e;--warm:#e8734a;--line:#e3ded3}
*{box-sizing:border-box}body{margin:0;font-family:Manrope,system-ui,sans-serif;color:var(--ink);background:var(--bg);line-height:1.55}
.wrap{max-width:1040px;margin:0 auto;padding:0 16px}
header{padding:18px 0;font-weight:800}header span{color:var(--teal)}
.hero{display:grid;grid-template-columns:1.1fr .9fr;gap:40px;align-items:center;padding:24px 0 56px}
@media(max-width:820px){.hero{grid-template-columns:1fr}}
.eyebrow{color:var(--warm);font-weight:700;text-transform:uppercase;letter-spacing:.08em;font-size:.8rem;margin:0 0 10px}
h1{font-family:Fraunces,serif;font-size:clamp(1.9rem,4.4vw,2.9rem);line-height:1.12;margin:0 0 16px}
h2{font-family:Fraunces,serif;font-size:clamp(1.5rem,3vw,2rem);margin:0 0 8px}
.sub{color:var(--muted);font-size:1.08rem;margin:0 0 24px}
.btn{display:inline-block;background:var(--teal);color:#fff;font-weight:700;padding:15px 24px;border-radius:12px;text-decoration:none;border:0;font-size:1rem;cursor:pointer;font-family:inherit}
.btn:hover{background:var(--teal-d)}.btn.ghost{background:transparent;color:var(--ink);border:2px solid var(--line)}
.actions{display:flex;gap:12px;flex-wrap:wrap}.fine{color:var(--muted);font-size:.88rem;margin-top:12px}
.phone{background:#101d20;border-radius:36px;padding:14px;max-width:340px;margin:0 auto;box-shadow:0 30px 60px -20px rgba(20,38,42,.45)}
.screen{background:#fff;border-radius:26px;padding:16px 12px 20px;min-height:460px}
.ch{text-align:center;font-weight:700;font-size:.9rem;padding-bottom:10px;border-bottom:1px solid #eee;margin-bottom:12px}
.b{max-width:82%;padding:9px 13px;border-radius:18px;margin:7px 0;font-size:.9rem;line-height:1.35}
.b.out{background:var(--teal);color:#fff;margin-left:auto;border-bottom-right-radius:5px}
.b.in{background:#eef0f0;border-bottom-left-radius:5px}
.b.miss{background:none;color:var(--muted);text-align:center;max-width:none;font-size:.8rem}
section.band{background:var(--card);border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:56px 0}
.calc{display:grid;grid-template-columns:1fr 1fr;gap:32px;align-items:center;margin-top:24px}
@media(max-width:820px){.calc{grid-template-columns:1fr}}
label{display:block;font-weight:600;margin:18px 0 6px}label output{float:right;color:var(--teal-d)}
input[type=range]{width:100%;accent-color:var(--teal)}
.result{background:var(--bg);border-radius:18px;padding:28px;text-align:center}
.big{font-family:Fraunces,serif;font-size:clamp(2.2rem,6vw,3.4rem);color:var(--warm);margin:4px 0}
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin:28px 0 0;padding:0;list-style:none}
@media(max-width:820px){.steps{grid-template-columns:1fr}}
.steps li{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:20px}
.steps strong{display:block;color:var(--teal-d);margin-bottom:4px}
.offer{padding:56px 0 72px;text-align:center}.offer .card{background:var(--card);border:2px solid var(--teal);border-radius:20px;padding:32px 24px;max-width:560px;margin:0 auto}
.price{font-size:2.4rem;font-weight:800;margin:6px 0}.price small{font-size:1rem;color:var(--muted);font-weight:600}
footer{color:var(--muted);font-size:.85rem;text-align:center;padding:28px 16px}
#msg{color:var(--warm);margin-top:10px;min-height:1.2em}
</style></head><body>
<header class="wrap">CND<span> Digital</span></header>
<main>
<div class="wrap hero">
  <div>
    <p class="eyebrow">Made for ${name}</p>
    <h1>When ${name} misses a call, here's what that caller would get within 5 seconds.</h1>
    <p class="sub">Most people who reach voicemail don't leave a message. They call the next business on the list. This text keeps them talking to you instead. It's written from your own website, and an assistant keeps the conversation going until you can take over.</p>
    <div class="actions">
      <button class="btn start">Start my free 30 days</button>
      <a class="btn ghost" href="#calc">What is it costing me?</a>
    </div>
    <p class="fine">No setup fee. Keep your current number. Cancel anytime.</p>
  </div>
  <div class="phone" aria-label="Example text conversation"><div class="screen">
    <div class="ch">${name}</div>
    <div class="b miss">Missed call &middot; just now</div>
    <div class="b out">${e(prospect.persona?.missed_call_text)}</div>
    ${convo}
  </div></div>
</div>

<section class="band" id="calc"><div class="wrap">
  <p class="eyebrow">Your numbers</p>
  <h2>What missed calls might be costing ${name}</h2>
  <p class="sub">Drag the sliders to match your business. Starting values are rough estimates, not data about you.</p>
  <div class="calc">
    <div>
      <label>Missed calls per week <output id="o1"></output></label><input id="r1" type="range" min="1" max="60" value="8">
      <label>Average job value <output id="o2"></output></label><input id="r2" type="range" min="50" max="5000" step="25" value="${jobValue}">
      <label>Share of those callers you'd win back <output id="o3"></output></label><input id="r3" type="range" min="5" max="60" value="20">
    </div>
    <div class="result">
      <div>Revenue you could recover each month</div>
      <div class="big" id="out">$0</div>
      <div id="roi" class="fine"></div>
    </div>
  </div>
</div></section>

<div class="wrap"><ul class="steps">
  <li><strong>1. Start your trial</strong>Takes about a minute. We already have your text ready, the one shown above.</li>
  <li><strong>2. Dial one code</strong>We email you a short code to dial from your business phone. It only forwards calls nobody answers. Your voicemail and number stay the same.</li>
  <li><strong>3. Missed calls get answered</strong>Every missed caller gets your text within seconds. You get a weekly summary of how many it saved.</li>
</ul></div>

<section class="offer"><div class="wrap"><div class="card">
  <p class="eyebrow">Founding client offer</p>
  <div class="price">$0 <small>for 30 days, then $249/month</small></div>
  <p>If it doesn't win back at least one job you would have missed in the first 30 days, cancel and you pay nothing.</p>
  <button class="btn start">Start my free 30 days</button>
  ${calendlyUrl ? `<p class="fine">Prefer to talk first? <a href="${e(calendlyUrl)}">Book a 15-minute call</a>.</p>` : ""}
  <p id="msg" role="status"></p>
</div></div></section>
</main>
<footer>CND Digital &middot; This page was prepared for ${name}.</footer>
<script>
(function(){
  var r1=document.getElementById('r1'),r2=document.getElementById('r2'),r3=document.getElementById('r3');
  var fmt=function(n){return '$'+Math.round(n).toLocaleString()};
  function calc(){
    document.getElementById('o1').textContent=r1.value;
    document.getElementById('o2').textContent=fmt(+r2.value);
    document.getElementById('o3').textContent=r3.value+'%';
    var monthly=r1.value*4.33*(r3.value/100)*r2.value;
    document.getElementById('out').textContent=fmt(monthly);
    document.getElementById('roi').textContent = monthly>249 ? 'About '+(monthly/249).toFixed(1)+'x the $249 monthly cost.' : 'Less than the monthly cost at these numbers.';
  }
  [r1,r2,r3].forEach(function(r){r.addEventListener('input',calc)});calc();
  var enabled=${checkoutEnabled ? "true" : "false"};
  var cal=${JSON.stringify(calendlyUrl || "")};
  document.querySelectorAll('.start').forEach(function(btn){
    btn.addEventListener('click',function(){
      var msg=document.getElementById('msg');
      if(!enabled){ if(cal){location.href=cal;} else {msg.textContent='Reply to our email and we will set you up today.';} return; }
      btn.disabled=true; msg.textContent='Opening secure checkout...';
      fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug:${JSON.stringify(slug)}})})
        .then(function(r){return r.json()}).then(function(d){ if(d.url){location.href=d.url} else {throw new Error(d.error||'failed')} })
        .catch(function(){btn.disabled=false; msg.textContent='Something went wrong. Reply to our email and we will set you up.';});
    });
  });
})();
</script>
</body></html>`;
}
