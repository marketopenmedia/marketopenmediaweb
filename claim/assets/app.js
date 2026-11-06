/* Market Open Media funnel engine (cloned from Agency Closers 2026-10-13). Everything it says comes
 * from /funnel.js (window.FUNNEL); this file is behaviour only: the A/B/C film, the event beacon, the
 * quiz, the contact step and the calendar. Plain ES2017, no build step, no framework.
 *
 * Traps carried over from the AgencyOvernight quiz (reference_ao_vsl_system_funnel_v3_2026-10-05):
 *  - THE STRADDLE: a finger that came down on the affirmation can lift on the next question's
 *    option and answer it unseen. Every option ignores a click whose pointerdown happened before
 *    that question rendered, and options lock while an affirmation is showing.
 *  - The progress bar counts TAPS, never seconds.
 * No texted code and no consent box (Josh 2026-10-12): name, company, email, mobile, calendar.
 */
(function () {
  'use strict';
  var F = window.FUNNEL;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };
  var qs = new URLSearchParams(location.search);

  /* ---------- identity + attribution ---------- */
  var sid = store.get('mom_sid');
  if (!sid || !/^[a-z0-9]{12,40}$/i.test(sid)) {
    sid = (Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)).slice(0, 24);
    store.set('mom_sid', sid);
  }
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'];
  var utm = {};
  try { utm = JSON.parse(store.get('mom_utm') || '{}') || {}; } catch (e) { utm = {}; }
  if (UTM_KEYS.some(function (k) { return qs.get(k); })) {
    utm = {}; UTM_KEYS.forEach(function (k) { if (qs.get(k)) utm[k] = qs.get(k).slice(0, 120); });
    store.set('mom_utm', JSON.stringify(utm));
  }
  var arm = null;
  /* ?t=1 = a test visit (walk.mjs, Josh checking the page): nothing is recorded, so the sorter and
     /admin only ever count real people. */
  var TEST = qs.get('t') === '1';

  function ev(name, meta) {
    if (TEST) return;
    var m = meta || {};
    if (utm.utm_content && !m.ad) m.ad = utm.utm_content;
    /* a real Meta click always carries fbclid; Meta's ad-review crawler opens the bare ad link without one.
       /admin counts a visit that came from an ad link only when it has the click id (2026-10-15). */
    if (utm.fbclid) m.fb = '1';
    var payload = JSON.stringify({ sid: sid, arm: arm, ev: name, meta: m });
    try {
      if (navigator.sendBeacon && navigator.sendBeacon('/api/ev', new Blob([payload], { type: 'text/plain' }))) return;
    } catch (e) {}
    fetch('/api/ev', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(function () {});
  }
  function post(url, data) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { j._status = r.status; return j; }); })
      .catch(function () { return { ok: false, _status: 0 }; });
  }

  /* ---------- Meta pixel: only once the dataset is confirmed as Miguel's (funnel.js pixelVerified) ---------- */
  function px(name, data, eventId) {
    if (TEST || !window.fbq) return;
    if (F.pageConversions === false && name !== 'PageView' && name !== 'Schedule') return; /* only a booking converts */
    try { eventId ? window.fbq('track', name, data || {}, { eventID: eventId }) : window.fbq('track', name, data || {}); } catch (e) {}
  }
  if (F.pixel && F.pixelVerified && F.pagePixel !== false && !TEST) {
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', F.pixel); px('PageView');
  }

  $('#yr').textContent = new Date().getFullYear();

  /* ---------- the example grid: squares turn green from the shop outward, day by day ---------- */
  (function grid5() {
    var g = $('#grid5'); if (!g) return;
    var cells = [];
    for (var i = 0; i < 25; i++) { var c = document.createElement('i'); if (i === 12) c.className = 'c'; g.appendChild(c); cells.push(c); }
    var order = cells.map(function (c, i) { var x = i % 5 - 2, y = Math.floor(i / 5) - 2; return { c: c, d: Math.abs(x) + Math.abs(y) + (i * 7 % 3) * 0.3 }; })
      .sort(function (a, b) { return a.d - b.d; });
    var k = 0;
    function tick() {
      if (k < 19) { order[k].c.classList.add('g'); k++; setTimeout(tick, 260); }
      else setTimeout(function () { cells.forEach(function (c) { c.classList.remove('g'); }); k = 0; setTimeout(tick, 900); }, 2600);
    }
    if ('IntersectionObserver' in window) {
      var started = false;
      new IntersectionObserver(function (es) { if (es[0].isIntersecting && !started) { started = true; tick(); } }).observe(g);
    } else tick();
  })();

  /* ---------- the A/B/C film ---------- */
  var film = $('#film');
  function ctaWords() { var A = F.arms[arm]; return esc((A && A.cta) || 'Start my free trial'); }
  function applyArm(k) {
    arm = k; store.set('mom_arm', k);
    var A = F.arms[k];
    $('#kicker').textContent = A.kicker; $('#headline').textContent = A.headline; $('#sub').textContent = A.sub;
    /* an arm can carry its own button words (/book); every other arm keeps "Start my free trial" */
    if (A.cta) $$('.js-open-quiz').forEach(function (b) { b.innerHTML = esc(A.cta) + (b.querySelector('.arr') ? ' <span class="arr">&rarr;</span>' : ''); });
    document.documentElement.setAttribute('data-arm', k);
    /* proof order is one of the three things an angle changes */
    var box = $('#cases');
    (A.proofOrder || []).slice().reverse().forEach(function (id) { var el = $('[data-case="' + id + '"]', box); if (el) box.insertBefore(el, box.firstChild); });
    if (A.film) {
      /* phones get the 4:5 cut: a 16:9 film in a 358px box is a postage stamp (audit 2026-10-21) */
      var phone = A.film45 && window.matchMedia && window.matchMedia('(max-width: 720px)').matches;
      film.poster = (phone && A.poster45) || A.poster || ''; film.src = phone ? A.film45 : A.film;
      var p = film.play(); if (p && p.catch) p.catch(function () {});
    } else if (F.preview) {
      /* preview only: deploy.mjs refuses a production deploy while F.preview is true */
      $('#vslph').hidden = false; $('#unmute').hidden = true;
    }
    ev('view', { path: location.pathname, entry: entry });
    if (entry === 'sorted' && A.slug && history.replaceState) {
      try { history.replaceState(null, '', '/' + A.slug + location.search + location.hash); } catch (e) {}
    }
  }
  var entry = 'sorted';
  (function pickArm() {
    var live = F.liveArms();
    var byPath = F.armFromPath(location.pathname);
    if (byPath) { entry = 'direct'; if (!F.arms[byPath].live) TEST = true; return applyArm(byPath); }
    var forced = (qs.get('v') || '').toLowerCase();
    if (live.indexOf(forced) >= 0) { entry = 'direct'; return applyArm(forced); }
    var kept = store.get('mom_arm');
    if (kept && live.indexOf(kept) >= 0) return applyArm(kept);
    fetch('/api/arm', { cache: 'no-store' }).then(function (r) { return r.json(); })
      .then(function (j) { applyArm(j && live.indexOf(j.arm) >= 0 ? j.arm : live[Math.floor(Math.random() * live.length)]); })
      .catch(function () { applyArm(live[Math.floor(Math.random() * live.length)]); });
  })();

  var unmuted = false, marks = {};
  /* The player takes the film's own shape: a portrait film gets a narrower frame. */
  film.addEventListener('loadedmetadata', function () {
    if (!film.videoWidth || !film.videoHeight) return;
    var box = $('#vsl'), r = film.videoWidth / film.videoHeight;
    box.style.aspectRatio = film.videoWidth + ' / ' + film.videoHeight;
    box.classList.toggle('tall', r < 1);
  });
  film.muted = true; film.loop = false; film.autoplay = true;
  $('#unmute').addEventListener('click', function () {
    unmuted = true; film.muted = false; film.currentTime = 0; film.loop = false;
    var p = film.play(); if (p && p.catch) p.catch(function () {});
    $('#unmute').hidden = true; $('#vslui').hidden = false; ev('unmute'); ev('play');
  });
  film.addEventListener('ended', function () { if (!unmuted) { film.currentTime = 0; film.play().catch(function () {}); } });
  $('#pp').addEventListener('click', function () {
    if (film.paused) { film.play(); this.classList.remove('paused'); } else { film.pause(); this.classList.add('paused'); }
  });
  film.addEventListener('timeupdate', function () {
    if (!unmuted || !film.duration) return;
    var f = film.currentTime / film.duration;
    $('#prog').style.width = (Math.pow(f, 0.6) * 100).toFixed(2) + '%';
    [25, 50, 75, 95].forEach(function (m) { if (f * 100 >= m && !marks[m]) { marks[m] = 1; ev('w' + m, { secs: Math.round(film.currentTime) }); } });
  });

  /* ---------- reveal, sticky CTA ---------- */
  $$('.sec h2, .faq-list, .pf-head, .pf-case, .pf-stats').forEach(function (el) { el.classList.add('rv'); });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (!e.isIntersecting) return; e.target.classList.add('in'); io.unobserve(e.target); });
    }, { rootMargin: '0px 0px -10% 0px' });
    $$('.rv').forEach(function (el) { io.observe(el); });
    new IntersectionObserver(function (es) { $('#sticky').hidden = false; $('#sticky').classList.toggle('on', !es[0].isIntersecting && es[0].boundingClientRect.top < 0); }).observe($('#qin'));
    var seen = new Set();
    var io2 = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) seen.add(e.target); else seen.delete(e.target); });
      $('#sticky').classList.toggle('hide', seen.size > 0);
    });
    $$('.pf-cta').forEach(function (el) { io2.observe(el); });
  } else { $$('.rv').forEach(function (el) { el.classList.add('in'); }); }
  /* scroll depth in 10% steps (scroll10 ... scroll100), each once per visit: /admin draws the curve per page */
  var scrolled = {};
  addEventListener('scroll', function () {
    var f = (scrollY + innerHeight) / document.documentElement.scrollHeight;
    for (var m = 10; m <= 100; m += 10) if (f >= (m === 100 ? 0.985 : m / 100) && !scrolled[m]) { scrolled[m] = 1; ev('scroll' + m); }
  }, { passive: true });
  /* time on page, counted only while the tab is visible: t15 t30 t60 t120 t300 */
  (function () {
    var marks = [15, 30, 60, 120, 300], seen = 0, last = Date.now();
    setInterval(function () {
      var now = Date.now();
      if (document.visibilityState === 'visible') seen += (now - last) / 1000;
      last = now;
      while (marks.length && seen >= marks[0]) ev('t' + marks.shift());
    }, 1000);
  })();
  $$('.faq-list details').forEach(function (d, i) { d.addEventListener('toggle', function () { if (d.open) ev('faq', { q: String(i) }); }); });

  /* ================= THE QUIZ ================= */
  var Q = $('#quiz'), stage = $('#qstage');
  var answers = {}, step = 0, startedAt = 0, renderAt = 0, downAt = 0, sayTimer = null, locked = false;
  var person = {}, scheduleId = null;
  addEventListener('pointerdown', function () { downAt = performance.now(); }, true);
  /* A click is a straddle only when its finger came down before this screen drew AND within the
     same gesture (1.5 s). Keyboard clicks have no fresh pointerdown, so they always pass. */
  function straddled() { var now = performance.now(); return !!downAt && downAt < renderAt && now - downAt < 1500; }

  function openQuiz(src, driven) {
    ev('cta', { src: src || '' });
    if (!startedAt) { startedAt = Date.now(); ev('q_start', { src: src || '' }); }
    Q.hidden = false; document.body.style.overflow = 'hidden';
    if (!film.paused && unmuted) { film.pause(); $('#pp').classList.add('paused'); }
    var dq = store.get('mom_dq');
    if (dq && F.stops[dq]) return renderStop(dq);
    if (person.done) return renderCalendar();
    if (!driven) renderQ(step);
  }
  function closeQuiz() { Q.hidden = true; document.body.style.overflow = ''; }
  $$('.js-open-quiz').forEach(function (b) { b.addEventListener('click', function () { openQuiz(b.getAttribute('data-src')); }); });
  $('#qclose').addEventListener('click', closeQuiz);
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && !Q.hidden) closeQuiz(); });

  var TOTAL = F.questions.length;
  function setBar(n, label) {
    $('#qbar').style.width = Math.max(4, Math.round((n / TOTAL) * 100)) + '%';
    $('#qcount').textContent = label != null ? label : (Math.min(n + 1, TOTAL) + ' of ' + TOTAL);
  }
  function pane(html) {
    stage.innerHTML = '<div class="q-pane">' + html + '</div>';
    stage.scrollTop = 0; renderAt = performance.now();
    return $('.q-pane', stage);
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function optHtml(q, o, j) {
    return '<button class="q-opt' + (answers[q.id] === o.v ? ' sel' : '') + '" data-v="' + esc(o.v) + '"><span class="k">' + String.fromCharCode(65 + j) + '</span><span><span class="t">' + esc(o.t) + '</span>' + (o.d ? '<span class="d">' + esc(o.d) + '</span>' : '') + '</span></button>';
  }

  /* ---------- question one, inline under the film ---------- */
  function renderInline() {
    var q = F.questions[0];
    $('#qinh').textContent = q.q; $('#qinsub').textContent = q.sub || '';
    $('#qinopts').innerHTML = q.options.map(function (o, j) { return optHtml(q, o, j); }).join('');
    $$('#qinopts .q-opt').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-v');
        var dq = store.get('mom_dq');
        if (dq && F.stops[dq]) return openQuiz('inline');
        if (person.done) return openQuiz('inline');
        $$('#qinopts .q-opt').forEach(function (x) { x.classList.toggle('sel', x === b); });
        openQuiz('inline', true);
        renderQ(0);
        locked = false; renderAt = 0;
        choose(q, v, $('.q-opt[data-v="' + v + '"]', stage));
      });
    });
  }

  function renderQ(i) {
    clearTimeout(sayTimer); locked = false; step = i; setBar(i);
    var q = F.questions[i];
    var p = pane(
      '<p class="q-step">Question ' + (i + 1) + '</p>' +
      '<h2 class="q-h" id="qh">' + esc(q.q) + '</h2><p class="q-sub">' + esc(q.sub || '') + '</p>' +
      '<div class="q-opts">' + q.options.map(function (o, j) { return optHtml(q, o, j); }).join('') + '</div>' +
      (i > 0 ? '<button class="q-back" id="qback">&larr; Back</button>' : '')
    );
    $$('.q-opt', p).forEach(function (b) { b.addEventListener('click', function () { choose(q, b.getAttribute('data-v'), b); }); });
    if ($('#qback', p)) $('#qback', p).addEventListener('click', function () { renderQ(i - 1); });
  }

  function choose(q, v, btn) {
    if (locked) return;
    if (straddled()) return;
    var opt = q.options.filter(function (o) { return o.v === v; })[0];
    if (!opt) return;
    answers[q.id] = v; locked = true;
    $$('.q-opt', stage).forEach(function (b) { b.classList.toggle('sel', b === btn); });
    ev('ans', { q: q.id, v: v });
    if (opt.stop) {
      store.set('mom_dq', opt.stop);
      ev('dq', { reason: opt.stop, q: q.id });
      /* QuizDq: a custom pixel event so Meta can learn who NOT to send (custom, never a standard event) */
      if (!TEST && window.fbq && F.pageConversions !== false) try { window.fbq('trackCustom', 'QuizDq', { reason: opt.stop, q: q.id }, { eventID: 'dq-' + sid }); } catch (e) {}
      return setTimeout(function () { renderStop(opt.stop); }, 280);
    }
    var nxt = function () { clearTimeout(sayTimer); if (step + 1 < TOTAL) renderQ(step + 1); else finishQuiz(); };
    if (opt.say) setTimeout(function () { renderAffirm(q, opt, nxt); }, 240);
    else setTimeout(nxt, 260);
  }

  /* THE AFFIRMATION PAGE: talks about the answer they just gave, shows one proof line, teases the
     next tap. Moves on by itself after DWELL, or on Continue. */
  var DWELL = 4000;
  var WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'];
  function renderAffirm(q, opt, nxt) {
    var left = TOTAL - (step + 1);
    setBar(step + 1, left ? (WORDS[left] || left) + ' to go' : 'Done');
    var p = pane(
      '<div class="affirm">' +
      '<div class="chk" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7"/></svg></div>' +
      '<h2 class="q-h" id="qh">' + esc(opt.say) + '</h2>' +
      (opt.why ? '<p class="why">' + esc(opt.why) + '</p>' : '') +
      (opt.stat ? '<div class="astat"><b>' + esc(opt.stat.big) + '</b><span>' + esc(opt.stat.small) + '</span></div>' : '') +
      (q.next ? '<p class="anext">' + esc(q.next) + '</p>' : '') +
      '<button class="btn btn-xl q-next" id="qnext">' + (left ? 'Continue' : ctaWords()) + ' <span class="arr">&rarr;</span></button>' +
      '<span class="await" style="--dwell:' + DWELL + 'ms"><i></i></span>' +
      '</div>'
    );
    ev('affirm', { q: q.id });
    $('#qnext', p).addEventListener('click', function () { if (straddled()) return; nxt(); });
    p.addEventListener('pointerdown', function () { clearTimeout(sayTimer); var w = $('.await', p); if (w) w.style.visibility = 'hidden'; });
    sayTimer = setTimeout(nxt, DWELL);
  }

  function renderStop(reason) {
    var s = F.stops[reason] || F.stops.other;
    setBar(TOTAL, '');
    var p = pane('<div class="stop" data-stop="' + esc(reason) + '"><div class="ico">!</div><h2 class="q-h">' + esc(s.h) + '</h2><p>' + esc(s.p) + '</p><button class="btn btn-ghost" id="qredo">Change my answer</button> <button class="btn btn-ghost" id="qdone">Close</button></div>');
    $('#qdone', p).addEventListener('click', closeQuiz);
    /* 2026-10-21: a stop used to stick in localStorage forever, so one mistap locked the visitor out. Now they can go back. */
    $('#qredo', p).addEventListener('click', function () {
      try { localStorage.removeItem('mom_dq'); } catch (e) {}
      var at = 0;
      F.questions.forEach(function (q, i) { if (q.options.some(function (o) { return o.stop === reason; })) at = i; });
      delete answers[F.questions[at].id];
      renderQ(at);
    });
  }

  function label(id) {
    var q = F.questions.filter(function (x) { return x.id === id; })[0];
    var o = q && q.options.filter(function (x) { return x.v === answers[id]; })[0];
    return o ? o.t.replace(/"/g, '') : '';
  }

  function finishQuiz() {
    ev('q_done');
    setBar(TOTAL, 'Done');
    person.done = true;
    renderCalendar();
  }

  function calUrl() {
    var u = new URL(F.calendar.url);
    u.searchParams.set('embed_domain', location.hostname); u.searchParams.set('embed_type', 'Inline'); u.searchParams.set('hide_gdpr_banner', '1');
    /* the ad's own utm rides into the booking so the booked call keeps its source (fbclid is not a Calendly field) */
    UTM_KEYS.forEach(function (k) { if (k !== 'fbclid' && utm[k]) u.searchParams.set(k, utm[k]); });
    if (!utm.utm_source) u.searchParams.set('utm_source', 'mom-funnel');
    u.searchParams.set('utm_term', 'vsl-' + (arm || 'x'));
    return u.toString();
  }

  function renderCalendar() {
    ev('cal_view');
    setBar(TOTAL, 'Book');
    var cal = F.calendar.url
      ? '<div class="cal-frame"><iframe id="cal" title="Pick your free trial setup time" src="' + esc(calUrl()) + '" loading="eager"></iframe></div>'
      : (F.preview ? '<div class="cal-ph" id="calph">Preview: the calendar connects here (' + esc(F.calendar.owner) + ', ' + esc(F.calendar.hours) + ', ' + F.calendar.minutes + ' minutes).' +
          (TEST ? '<br><button class="btn btn-sm" id="testbook" style="margin-top:14px">Test booking</button>' : '') + '</div>' : '');
    var p = pane(
      '<p class="q-step">You qualify for the free 7-day trial</p>' +
      '<h2 class="q-h">Pick a time to set up your free trial</h2>' +
      '<ul class="agenda"><li>We show you your map: where you show up on Google Maps, and which shops get the calls instead</li><li>We set up your free 7-day trial on the call</li><li>No card, no contract. Your map review is yours to keep</li></ul>' +
      cal
    );
    if ($('#testbook', p)) $('#testbook', p).addEventListener('click', function () { markBooked('test'); });
  }

  /* ---------- booking detection ----------
     Calendly's widget postMessages the parent ("calendly.event_scheduled") the moment a booking lands. */
  var bookedOnce = false;
  addEventListener('message', function (e) {
    if (bookedOnce || !/^https:\/\/([a-z0-9-]+\.)?calendly\.com$/i.test(e.origin || '')) return;
    if (e.data && e.data.event === 'calendly.event_scheduled') markBooked('calendly');
  });
  function markBooked(src) {
    if (bookedOnce) return; bookedOnce = true;
    var go = function () { location.href = '/booked?from=' + encodeURIComponent(src) + (TEST ? '&t=1' : ''); };
    if (TEST) return go();
    px('Schedule', { content_name: 'hvac-map-check' }, F.scheduleId(null, sid));
    post('/api/booked', { sid: sid }).then(function () { setTimeout(go, 700); });
  }
  renderInline();
  if (qs.get('quiz') === '1') openQuiz('link');
})();
