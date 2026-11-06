/* funnel.js: THE single source of truth for the Market Open Media HVAC funnel.
 *
 * Cloned from apps/agencyclosers (2026-10-13). Loaded by the browser (window.FUNNEL) AND required by
 * the API (module.exports), so the questions the visitor saw and the gate that decided qualified/DQ
 * are the same code on both sides. The server never trusts the browser: api/lead.js re-runs gate().
 *
 * ONE design, three angles (Josh 2026-10-13): only the headline, the VSL slot and the proof order
 * change per version. A: /trial (Prove-It Trial), B: /claim (Root-Cause), C: /grid (Live Demo).
 *
 * Locked copy rules (brands/market-open-media/_plan/DECISIONS-2026-10-13.md): HVAC only, no price
 * anywhere, never explain the method, no grid size or mileage at all (Miguel 2026-10-21: "five-mile" undersells it; was "five-mile grid", never "radius"), no lead-site comparison,
 * 1 truck and service-area shops pass since 2026-10-21, booked solid since 2026-10-23 (Miguel sorts them on the call),
 * NO Google profile stops again since 2026-10-31 (Miguel 10/30: "thats not something we can create for them"),
 * one HVAC shop per city (Josh 2026-10-23, confirmed true),
 * proof is Axel + John Davis Tree Service exactly as offer.json words them.
 */
(function (root) {
  var F = {
    brand: 'Market Open Media',
    site: 'marketopenmedia.com',

    /* PREVIEW MODE. true while any film or the calendar is still a placeholder. The page shows a
       "video coming" poster and a calendar stand-in ONLY when this is true, and deploy.mjs refuses a
       production deploy while it is (a placeholder never reaches a paid click). Flip to false when
       the three films and Miguel's calendar are in. */
    preview: false,

    /* Meta. Pixel 243877356528505 "Market Open Media's Pixel" CONFIRMED on Miguel's ad account
       act_2141824449403301 through Pipeboard (2026-10-14). Browser pixel on; server CAPI joins once
       env MOM_CAPI_TOKEN is set (Events Manager > this dataset > Conversions API token). */
    pixel: '243877356528505',
    pixelVerified: true,
    /* The page fires PageView + Lead (form submit) on the pixel. It never fires Schedule: a booked call
       reaches Meta as Schedule from ONE place outside the page (a GHL workflow on calendar
       5GA9IFhFkZnXPZpAy5tb), so one booking is one Schedule. The booked-call campaign optimises on that. */
    pagePixel: true,
    /* Josh 2026-11-06: "make sure it's only converting from the GHL calendar since we are transferring
       everything over". The page fires PageView ONLY (landing-page views + audiences). No Lead, no QuizDq,
       no server CAPI. The one conversion is Schedule, sent from a booking on calendar 5GA9IFhFkZnXPZpAy5tb. */
    pageConversions: false,

    /* Booking: Miguel, Mon to Fri, Eastern, 15 minutes. Calendar 5GA9IFhFkZnXPZpAy5tb in Miguel's own GHL
       (location ZEoHCPW7vgJTpWYQHmtb), built 2026-10-15: no pixel, redirects to /booked. */
    calendar: { kind: 'ghl', url: 'https://api.leadconnectorhq.com/widget/booking/5GA9IFhFkZnXPZpAy5tb', owner: 'Miguel', hours: 'Mon to Fri, Eastern', minutes: 15 },

    /* 2026-11-06 (Miguel 11/5: one campaign, one page, booked calls). Version B "Claim your neighborhood" is the only page that
       ever booked (1 of 128 views; A 0/53, C 0/198, D 0/14). It is the only live version; the rest point their old links here. */
    winner: 'b',

    arms: {
      a: {
        live: false, retiredTo: 'b',  /* 2026-11-06: retired, 0 bookings in 53 views; /trial now serves the winner */
        name: 'Prove-It Trial',
        slug: 'trial',
        film: '/claim/media/vsl-a.mp4', poster: '/claim/media/vsl-a.jpg', film45: '/claim/media/vsl-a-45.mp4', poster45: '/claim/media/vsl-a-45.jpg',  /* VSL A (DISPATCH look) lands here */
        kicker: 'For HVAC shop owners',
        headline: 'Get more HVAC calls from Google Maps. Try it free for 7 days.',
        sub: "Free for 7 days. No card, no contract. One HVAC shop per city. See your map first, then watch your shop climb.",
        proofOrder: ['axel', 'jd'],
      },
      b: {
        live: true,
        name: 'Root-Cause Reveal',
        slug: 'claim',
        film: '/claim/media/vsl-d.mp4', poster: '/claim/media/vsl-d.jpg', film45: '/claim/media/vsl-d-45.mp4', poster45: '/claim/media/vsl-d-45.jpg',  /* VSL D 2026-11-06: 93 s Live Demonstration rebuild, burned captions (Miguel: old one lost him) */
        kicker: 'For HVAC shop owners',
        headline: 'Claim your neighborhood on Google Maps before the shop down the road does.',
        /* 2026-11-06 CRO pass: outcome (the call), mechanism (top three), effort (you run your trucks), the step the ads promise (15-minute call) */
        sub: "When the AC dies, people call the top three shops on the map. We move you up while you run your trucks. Book a 15-minute call, then try it free for 7 days.",
        proofOrder: ['axel', 'jd'],
      },
      c: {
        live: false, retiredTo: 'b',  /* 2026-11-06: retired, 0 bookings in 198 views; /grid now serves the winner */
        name: 'Live Demonstration',
        slug: 'grid',
        film: '/claim/media/vsl-c.mp4', poster: '/claim/media/vsl-c.jpg', film45: '/claim/media/vsl-c-45.mp4', poster45: '/claim/media/vsl-c-45.jpg',  /* VSL C (ISOMETRIC look) lands here */
        kicker: 'For HVAC shop owners',
        headline: 'See which shop is taking your calls on Google Maps.',
        sub: "Free for 7 days. No card, no contract. One HVAC shop per city. See your map first, then watch your shop climb.",
        proofOrder: ['axel', 'jd'],
      },
      /* Josh 2026-11-01: the day-7 ads say "Book a call. Get 7 days free." and land here, so the page says the same thing. adOnly = reachable only
         at /book: the root sorter and /api/arm never pick it, so the A/B/C bandit keeps its three films. Plays film A. */
      d: {
        live: false, retiredTo: 'b',  /* 2026-11-06: retired with campaign #5; /book now serves the winner */
        adOnly: true,
        name: 'Book A Call',
        slug: 'book',
        film: '/claim/media/vsl-a.mp4', poster: '/claim/media/vsl-a.jpg', film45: '/claim/media/vsl-a-45.mp4', poster45: '/claim/media/vsl-a-45.jpg',
        kicker: 'For HVAC shop owners',
        headline: 'Book a 15-minute call. Get 7 days on Google Maps, free.',
        sub: "Free for 7 days. No card, no contract. One HVAC shop per city. See your map first, then watch your shop climb.",
        cta: 'Book my call',
        proofOrder: ['axel', 'jd'],
      },
    },

    /* Proof, worded as offer.json words it (the VSL gate enforces the same sentences). */
    cases: {
      axel: { who: 'Axel', biz: 'Premium Heat and Air', big: 'Page two to top three', line: 'Axel at Premium Heat and Air went from page two of Google to the top three in his area.', detail: "In his words: “We're competing against all the big companies.”" },
      jd: { who: 'John Davis Tree Service', biz: 'Florida', big: 'Almost half the map', line: "Three days in, almost half of John Davis Tree Service's map showed them in the top three.", detail: 'About two months in, three quarters of their map did.' },
    },

    /* Questions. `stop` = hard stop, no booking (since 2026-10-21 one truck and a hidden address pass; since 2026-10-23 no Google profile and
       booked solid pass too, Josh: free-trial pivot; since 2026-10-31 no Google profile stops again, Miguel's ask). Every passing answer gets an affirmation page: `say` is about THEIR
       answer, `why` one line on what it means, `stat` only from the locked proof list. */
    questions: [
      {
        id: 'trucks', q: 'How many trucks do you run?', sub: 'Count the ones out on calls most days.',
        next: 'Up next: your Google Business Profile.',
        options: [
          { v: '1', t: 'Just 1',
            say: 'One truck, and you want more calls. Good.', why: "More calls from the map is how the second truck happens. We'll set up your free trial on the call.",
            stat: { big: 'Page two to top three', small: 'Axel at Premium Heat and Air' } },
          { v: '2-3', t: '2 to 3',
            say: '2 or 3 trucks is the sweet spot.', why: "You're big enough to take more calls, and small enough that a few extra jobs a week shows up fast.",
            stat: { big: 'Page two to top three', small: 'Axel at Premium Heat and Air' } },
          { v: '4-9', t: '4 to 9',
            say: 'John Davis had a lot of ground to cover too.', why: "Three days in, almost half of John Davis Tree Service's map showed them in the top three.",
            stat: { big: 'Almost half', small: 'of their map in the top three, three days in' } },
          { v: '10-plus', t: '10 or more',
            say: 'What we see with big fleets:', why: 'The bigger the area, the more spots where a smaller shop shows up above you on the map. Those calls go to someone with fewer trucks than you.',
            stat: { big: 'Three quarters', small: "of John Davis Tree Service's map in the top three, about two months in" } },
        ],
      },
      {
        id: 'gbp', q: 'Do you have a Google Business Profile with your shop address on it?', sub: "That's your listing on Google Maps.",
        next: 'Up next: your website.',
        options: [
          { v: 'yes', t: 'Yes, with my shop address',
            say: 'That already puts you ahead.', why: "Some shops we talk to don't have a profile at all. Yours is the thing the map runs on.",
            stat: { big: '7 days', small: 'free. No card, no contract. Your map review is yours to keep.' } },
          { v: 'unsure', t: "I think so, I'm not sure",
            say: "Here's a ten-second check.", why: "Search your shop name on Google Maps. If you pop up with a pin and your address, you're set.",
            stat: { big: '7 days', small: 'free. No card, no contract. Your map review is yours to keep.' } },
          { v: 'no-address', t: 'Yes, but my address is hidden (service area)',
            say: "That's normal for HVAC.", why: "Plenty of shops hide the address and serve an area. Your profile still sits on the map. We'll look at yours on the call.",
            stat: { big: '7 days', small: 'free. No card, no contract. Your map review is yours to keep.' } },
          /* Miguel 2026-10-30: "4 out of the 5 leads don't have a Google business ... Those guys without a GMB don't run a legit
             local service business." No profile = hard stop again (Josh 2026-10-31). Not sure still passes on the ten-second check. */
          { v: 'no', t: "No, I don't have one", stop: 'gbp' },
        ],
      },
      {
        id: 'site', q: 'Do you have a website?', sub: "It doesn't have to be fancy. It just has to work.",
        next: 'Last one: can your crew take more work?',
        options: [
          { v: 'yes', t: 'Yes, and it works',
            say: "You're set up right.", why: 'A real profile, a real address and a site that works. One question left.',
            stat: { big: '7 days', small: 'free. No card, no contract. Your map review is yours to keep.' } },
          { v: 'old', t: "Yes, but it's old",
            say: 'Old is fine. It just has to work.', why: "A site doesn't need to be new to help on the map. It needs to load and say what you do.",
            stat: { big: '7 days', small: 'free. No card, no contract. Your map review is yours to keep.' } },
          { v: 'no', t: 'No website', stop: 'site' },
        ],
      },
      {
        id: 'room', q: 'If the phone rang more next week, could your crew take the work?', sub: 'Be honest. It saves us both time.',
        next: "That's it. Now start your free trial.",
        options: [
          { v: 'yes', t: 'Yes, we have room',
            say: 'Room in the schedule is the best time to test this.', why: "When the extra calls show up, you'll know right away, because a truck can take them.",
            stat: { big: '7 days', small: 'free. No card, no contract. Your map review is yours to keep.' } },
          { v: 'make-room', t: "We'd make room",
            say: 'Spoken like an owner who wants to grow.', why: 'The trial shows you where the calls are. Making room is how you keep them.',
            stat: { big: '7 days', small: 'free. No card, no contract. Your map review is yours to keep.' } },
          { v: 'booked', t: "We're booked solid",
            say: 'Busy is good. Slow season is coming.', why: 'The trial lines up calls for the weeks your crew is light, so the board stays full all year.',
            stat: { big: '7 days', small: 'free. No card, no contract. Your map review is yours to keep.' } },
        ],
      },
    ],

    /* The hard stop copy. One per reason, honest, short, kind. */
    stops: {
      gbp: { h: 'You need a Google Business Profile first.', p: "It's free to set up on Google. Once yours is live, come back and we'll look at your map." },
      site: { h: 'You need a working website first.', p: "It doesn't have to be fancy. Once you've got a site that loads and says what you do, come back and take the check again." },
      other: { h: "This one's not a fit right now.", p: 'Come back and take the check again any time.' },
      booked: { h: "Sounds like you're already busy. Nice.", p: "The trial works best when your crew has room for more calls. Come back when things slow down." },
    },

    booked: { live: false, film: null, poster: null },  /* thank-you film from the VSL build lands here */
  };

  /* gate(answers) -> { ok:true } | { ok:false, reason }. Unanswered = not ok, never qualified. */
  F.gate = function (a) {
    a = a || {};
    for (var i = 0; i < F.questions.length; i++) {
      var q = F.questions[i];
      var opt = null;
      for (var j = 0; j < q.options.length; j++) if (q.options[j].v === a[q.id]) opt = q.options[j];
      if (!opt) return { ok: false, reason: 'incomplete', at: q.id };
      if (opt.stop) return { ok: false, reason: opt.stop, at: q.id };
    }
    return { ok: true };
  };

  /* ONE id for a booking everywhere (page pixel, /booked, server CAPI): sch-c-<GHL contact id>, or
     sch-s-<visitor id> while the CRM isn't wired. Meta dedupes the browser + server pair on it. */
  F.scheduleId = function (contactId, sid) {
    return contactId ? 'sch-c-' + contactId : 'sch-s-' + sid;
  };

  /* Each version has its own page: /trial, /claim, /grid (and /a /b /c). The root page sorts a
     visitor into one and swaps the address bar to that version's page. */
  F.armFromPath = function (p) {
    var s = String(p || '').replace(/^\/+|\/+$/g, '').toLowerCase();
    if (!s) return null;
    var hit = F.arms[s] ? s : null;
    if (!hit) for (var k in F.arms) if (F.arms[k].slug === s) { hit = k; break; }
    /* a retired version's old links land on the winner, never on a dry test page (old ads still carry /trial, /grid, /book) */
    for (var n = 0; hit && F.arms[hit].retiredTo && n < 10; n++) hit = F.arms[hit].retiredTo;
    if (hit && F.arms[hit].retiredTo) return null; /* retiredTo cycle: refuse rather than spin */
    return hit;
  };
  F.liveArms = function () {
    return Object.keys(F.arms).filter(function (k) { return F.arms[k].live && !F.arms[k].adOnly; });
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = F;
  else root.FUNNEL = F;
})(this);
