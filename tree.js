/* ————————————————————————————————————————
   The Growing Tree — core
   Procedural growth + atmosphere + scroll choreography.
   Exposes window.TreeApp for the feature modules
   (wind, forest, theme, birds).
———————————————————————————————————————— */

(function () {
    'use strict';

    gsap.registerPlugin(ScrollTrigger);

    var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var NS = 'http://www.w3.org/2000/svg';

    // tree on left, content on right (BASE_X placed so no branches clip the left edge)
    var MOBILE = window.matchMedia('(max-width: 780px)').matches;
    var BASE_X = MOBILE ? 500 : 400, BASE_Y = 820;
    var MAX_DEPTH = 8;
    var PATH_BUDGET = 620;

    /* ————— Seeded PRNG ————— */
    function mulberry32(a) {
        return function () {
            a |= 0; a = (a + 0x6D2B79F5) | 0;
            var t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    /* ————— Tiny event bus for feature modules ————— */
    var listeners = {};
    function on(evt, cb) { (listeners[evt] = listeners[evt] || []).push(cb); }
    function emit(evt, data) {
        (listeners[evt] || []).forEach(function (cb) { cb(data); });
    }

    /* ————— Seed <-> URL ————— */
    function seedFromURL() {
        try {
            var s = new URLSearchParams(window.location.search).get('seed');
            if (s === null) return null;
            var n = parseInt(s, 10);
            if (isNaN(n) || n < 0) return null;
            return n >>> 0;
        } catch (e) { return null; }
    }
    function writeSeedToURL(s) {
        try {
            var url = new URL(window.location.href);
            url.searchParams.set('seed', String(s));
            window.history.replaceState(null, '', url.toString());
        } catch (e) { /* file:// or privacy mode — degrade silently */ }
    }

    /* ————— Tree generation ————— */
    function generate(rand) {
        var paths = [];
        var leaves = [];
        var trunkPts = [];
        var count = 0;

        function branch(x, y, angle, len, w, depth, kind, t0) {
            if (count > PATH_BUDGET) depth = 0;
            var x2 = x + Math.cos(angle) * len;
            var y2 = y + Math.sin(angle) * len;
            var bend = (rand() - 0.5) * len * 0.45;
            var mx = (x + x2) / 2, my = (y + y2) / 2;
            var nx = -(y2 - y), ny = (x2 - x);
            var nl = Math.hypot(nx, ny) || 1;
            var cx = mx + (nx / nl) * bend;
            var cy = my + (ny / nl) * bend;
            var dur = 0.045 + len / 5200;
            paths.push({
                d: 'M ' + x.toFixed(1) + ' ' + y.toFixed(1) +
                   ' Q ' + cx.toFixed(1) + ' ' + cy.toFixed(1) +
                   ' ' + x2.toFixed(1) + ' ' + y2.toFixed(1),
                w: w, kind: kind, t0: t0, dur: dur
            });
            count++;
            if (kind === 'branch' && depth >= MAX_DEPTH - 1) trunkPts.push({ x: x2, y: y2 });

            if (depth <= 0 || len < 13) {
                if (kind === 'branch') {
                    leaves.push({
                        x: x2, y: y2, r: 4.5 + rand() * 6.5,
                        deg: rand() * 360, young: rand() < 0.4,
                        t0: 0.74 + rand() * 0.16
                    });
                }
                return;
            }
            var kids = depth > 5 ? 2 : (rand() < 0.72 ? 2 : 3);
            var childT0 = t0 + dur * 0.72;
            for (var i = 0; i < kids; i++) {
                var spread = 0.32 + rand() * 0.5;
                var dir = kids === 1 ? 0 : (i / (kids - 1) - 0.5) * 2;
                var childAngle = angle + dir * spread + (rand() - 0.5) * 0.18;
                childAngle += (-Math.PI / 2 - childAngle) * 0.14;
                branch(x2, y2, childAngle, len * (0.66 + rand() * 0.16),
                    Math.max(0.9, w * 0.68), depth - 1, 'branch', childT0);
            }
        }

        function root(x, y, angle, len, w, depth, t0) {
            var x2 = x + Math.cos(angle) * len;
            var y2 = y + Math.sin(angle) * len;
            var bend = (rand() - 0.5) * len * 0.6;
            var mx = (x + x2) / 2, my = (y + y2) / 2;
            var nx = -(y2 - y), ny = (x2 - x);
            var nl = Math.hypot(nx, ny) || 1;
            var cx = mx + (nx / nl) * bend;
            var cy = my + (ny / nl) * bend;
            var dur = 0.05 + len / 2600;
            paths.push({
                d: 'M ' + x.toFixed(1) + ' ' + y.toFixed(1) +
                   ' Q ' + cx.toFixed(1) + ' ' + cy.toFixed(1) +
                   ' ' + x2.toFixed(1) + ' ' + y2.toFixed(1),
                w: w, kind: 'root', t0: t0, dur: dur
            });
            if (depth <= 0 || len < 10) return;
            var kids = rand() < 0.6 ? 2 : 3;
            for (var i = 0; i < kids; i++) {
                var spread = 0.4 + rand() * 0.6;
                var dir = (i / (kids - 1) - 0.5) * 2;
                var childAngle = angle + dir * spread + (rand() - 0.5) * 0.2;
                childAngle += (Math.PI / 2 - childAngle) * 0.18;
                root(x2, y2, childAngle, len * (0.6 + rand() * 0.18),
                    Math.max(0.7, w * 0.62), depth - 1, t0 + dur * 0.6);
            }
        }

        branch(BASE_X, BASE_Y, -Math.PI / 2 + (rand() - 0.5) * 0.12,
            130 + rand() * 45, 15, MAX_DEPTH, 'branch', 0.16);

        var rootFans = 3;
        for (var r = 0; r < rootFans; r++) {
            var a = Math.PI / 2 + (r / (rootFans - 1) - 0.5) * 1.5 + (rand() - 0.5) * 0.2;
            root(BASE_X, BASE_Y, a, 55 + rand() * 30, 7, 4, 0.005 + r * 0.02);
        }

        return { paths: paths, leaves: leaves, trunkPts: trunkPts };
    }

    /* ————— DOM refs ————— */
    var treeGroup = document.getElementById('tree-group');
    var rootsGroup = document.getElementById('roots-group');
    var leavesGroup = document.getElementById('leaves-group');
    var ringsGroup = document.getElementById('rings-group');
    var groundLine = document.getElementById('ground-line');
    var stage = document.getElementById('stage');

    var RING_JOBS = [
        { t0: 0.36 }, { t0: 0.50 }, { t0: 0.64 }
    ];

    // [appearStart, appearEnd, disappearStart, disappearEnd]
    var BEATS = [
        { id: 'beat-hero',      a: 0.00, b: 0.015, c: 0.075, d: 0.11 },
        { id: 'beat-about',     a: 0.11, b: 0.145, c: 0.20,  d: 0.235 },
        { id: 'beat-education', a: 0.24, b: 0.275, c: 0.33,  d: 0.365 },
        { id: 'beat-wilo',      a: 0.35, b: 0.385, c: 0.44,  d: 0.475 },
        { id: 'beat-tud',       a: 0.47, b: 0.505, c: 0.56,  d: 0.595 },
        { id: 'beat-deriv',     a: 0.59, b: 0.625, c: 0.68,  d: 0.715 },
        { id: 'beat-projects',  a: 0.71, b: 0.745, c: 0.79,  d: 0.825 },
        { id: 'beat-research',  a: 0.82, b: 0.85,  c: 0.885, d: 0.915 },
        { id: 'beat-expertise', a: 0.90, b: 0.925, c: 0.95,  d: 0.975 },
        { id: 'beat-canopy',    a: 0.955, b: 0.985, c: 1.0,  d: 2.0 }
    ];

    var renderItems = [];
    var renderLeaves = [];
    var renderRings = [];
    var currentData = null;
    var beatEls = BEATS.map(function (b) {
        return { el: document.getElementById(b.id), win: b };
    });

    var groundLen = groundLine.getTotalLength();
    groundLine.style.strokeDasharray = groundLen;

    /* ————— Build / rebuild ————— */
    function build(s) {
        var rand = mulberry32(s);
        var data = generate(rand);
        currentData = data;
        treeGroup.innerHTML = '';
        rootsGroup.innerHTML = '';
        leavesGroup.innerHTML = '';
        ringsGroup.innerHTML = '';
        renderItems = []; renderLeaves = []; renderRings = [];

        data.paths.forEach(function (p) {
            var el = document.createElementNS(NS, 'path');
            el.setAttribute('d', p.d);
            el.setAttribute('stroke-width', p.w.toFixed(1));
            (p.kind === 'root' ? rootsGroup : treeGroup).appendChild(el);
            var len = el.getTotalLength();
            el.style.strokeDasharray = len;
            el.style.strokeDashoffset = len;
            renderItems.push({ el: el, len: len, t0: p.t0, dur: p.dur });
        });

        data.leaves.forEach(function (l) {
            var el = document.createElementNS(NS, 'ellipse');
            el.setAttribute('cx', l.x.toFixed(1));
            el.setAttribute('cy', l.y.toFixed(1));
            el.setAttribute('rx', l.r.toFixed(1));
            el.setAttribute('ry', (l.r * 0.55).toFixed(1));
            if (l.young) el.classList.add('young');
            el.style.transform = 'rotate(' + l.deg.toFixed(0) + 'deg) scale(0)';
            leavesGroup.appendChild(el);
            renderLeaves.push({ el: el, deg: l.deg, t0: l.t0 });
        });

        var pts = data.trunkPts;
        if (pts.length >= 3) {
            [0.18, 0.5, 0.82].forEach(function (f, i) {
                var pt = pts[Math.min(pts.length - 1, Math.floor(f * pts.length))];
                var g = document.createElementNS(NS, 'g');
                var outer = document.createElementNS(NS, 'circle');
                outer.setAttribute('cx', pt.x); outer.setAttribute('cy', pt.y); outer.setAttribute('r', 11);
                var dot = document.createElementNS(NS, 'circle');
                dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y); dot.setAttribute('r', 4.5);
                dot.classList.add('ring-dot');
                g.appendChild(outer); g.appendChild(dot);
                g.style.opacity = '0';
                ringsGroup.appendChild(g);
                renderRings.push({ el: g, t0: RING_JOBS[i].t0 });
            });
        }
        emit('rebuild', data);
    }

    /* ————— Per-frame render ————— */
    function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
    var lastProgress = 0;

    function render(p) {
        lastProgress = p;
        var i, f;
        groundLine.style.strokeDashoffset = groundLen * (1 - clamp01(p / 0.03));

        for (i = 0; i < renderItems.length; i++) {
            var it = renderItems[i];
            f = clamp01((p - it.t0) / it.dur);
            it.el.style.strokeDashoffset = it.len * (1 - f);
        }
        for (i = 0; i < renderLeaves.length; i++) {
            var lf = renderLeaves[i];
            f = clamp01((p - lf.t0) / 0.05);
            var s = f < 1 ? f * (1.15 - 0.15 * f) : 1;
            lf.el.style.transform = 'rotate(' + lf.deg + 'deg) scale(' + s.toFixed(3) + ')';
        }
        for (i = 0; i < renderRings.length; i++) {
            var rg = renderRings[i];
            f = clamp01((p - rg.t0) / 0.03);
            rg.el.style.opacity = f.toFixed(2);
        }
        for (i = 0; i < beatEls.length; i++) {
            var b = beatEls[i], w = b.win, v = 0;
            if (p >= w.a && p <= w.d) {
                if (p < w.b) v = (p - w.a) / (w.b - w.a);
                else if (p <= w.c) v = 1;
                else v = 1 - (p - w.c) / (w.d - w.c);
            }
            var isHero = b.el.id === 'beat-hero';
            if (isHero && idleOn) v = Math.max(v, 1);
            b.el.style.opacity = v.toFixed(3);
            b.el.style.visibility = v > 0.01 ? 'visible' : 'hidden';
            if (!isHero) b.el.style.transform = 'translateY(calc(-50% + ' + ((1 - v) * 24).toFixed(1) + 'px))';
        }
        emit('progress', p);
    }

    /* ————— Atmosphere: floating motes / pollen / fireflies ————— */
    var motes = [];
    var moteCanvas = document.getElementById('motes');
    var moteCtx = moteCanvas.getContext('2d');
    var motesMode = 'pollen';

    function sizeMotes() {
        moteCanvas.width = stage.clientWidth;
        moteCanvas.height = stage.clientHeight;
    }
    function initMotes() {
        motes = [];
        var w = moteCanvas.width, h = moteCanvas.height;
        if (motesMode === 'firefly') {
            var n = Math.max(10, Math.floor(w / 140));
            for (var i = 0; i < n; i++) {
                motes.push({
                    x: w * 0.1 + Math.random() * w * 0.45,
                    y: h * 0.08 + Math.random() * h * 0.5,
                    r: 1.2 + Math.random() * 1.6,
                    vx: (Math.random() - 0.5) * 0.3,
                    vy: (Math.random() - 0.5) * 0.2,
                    ph: Math.random() * Math.PI * 2,
                    blink: 0.004 + Math.random() * 0.006,
                    on: Math.random() * Math.PI * 2,
                    a: 0.5 + Math.random() * 0.5
                });
            }
        } else {
            var m = Math.max(14, Math.floor(w / 90));
            for (var j = 0; j < m; j++) {
                motes.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    r: 0.6 + Math.random() * 1.8,
                    vx: 0.1 + Math.random() * 0.35,
                    vy: -(0.05 + Math.random() * 0.2),
                    ph: Math.random() * Math.PI * 2,
                    a: 0.15 + Math.random() * 0.35
                });
            }
        }
    }
    function tickMotes(t) {
        moteCtx.clearRect(0, 0, moteCanvas.width, moteCanvas.height);
        var i, m;
        if (motesMode === 'firefly') {
            for (i = 0; i < motes.length; i++) {
                m = motes[i];
                m.x += m.vx; m.y += m.vy;
                if (m.x < moteCanvas.width * 0.05 || m.x > moteCanvas.width * 0.6) m.vx *= -1;
                if (m.y < moteCanvas.height * 0.04 || m.y > moteCanvas.height * 0.62) m.vy *= -1;
                m.on += m.blink;
                var glow = Math.max(0, Math.sin(m.on));
                glow = glow * glow * glow; // sharp blink
                if (glow < 0.02) continue;
                moteCtx.beginPath();
                moteCtx.arc(m.x, m.y, m.r * (1 + glow), 0, Math.PI * 2);
                moteCtx.fillStyle = 'rgba(190,230,120,' + (m.a * glow).toFixed(3) + ')';
                moteCtx.fill();
            }
        } else {
            for (i = 0; i < motes.length; i++) {
                m = motes[i];
                m.x += m.vx; m.y += m.vy;
                if (m.x > moteCanvas.width + 10) m.x = -10;
                if (m.y < -10) m.y = moteCanvas.height + 10;
                var tw = 0.5 + 0.5 * Math.sin(t * 0.001 + m.ph);
                moteCtx.beginPath();
                moteCtx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
                moteCtx.fillStyle = 'rgba(240,194,101,' + (m.a * tw).toFixed(3) + ')';
                moteCtx.fill();
            }
        }
    }
    function setMotesMode(mode) {
        motesMode = mode;
        initMotes();
    }

    /* ————— Master ticker ————— */
    gsap.ticker.add(function (time) {
        if (!REDUCED) tickMotes(time * 1000);
    });

    /* ————— Scroll wiring ————— */
    var st = null;
    var idleOn = false;
    var idleBase = 0;
    var idleTween = null;

    function currentProgress() {
        if (!st) return 0;
        return clamp01((window.scrollY - st.start) / (st.end - st.start));
    }

    function wireScroll() {
        if (st) { st.kill(); st = null; }
        if (REDUCED) { render(1); return; }
        st = ScrollTrigger.create({
            trigger: '#grow-scene',
            start: 'top top',
            end: 'bottom bottom',
            pin: '#stage',
            scrub: 0.6,
            onUpdate: function (self) {
                if (idleOn) {
                    if (self.progress > idleBase + 0.004) stopIdle();
                    else return;
                }
                render(self.progress);
            }
        });
        render(currentProgress());
    }

    /* ————— Idle: a living seedling that gently "breathes" before the first scroll ————— */
    var IDLE_LEVEL = 0.05;
    function startIdle() {
        if (REDUCED || !st) return;
        idleOn = true;
        idleBase = Math.max(currentProgress(), IDLE_LEVEL);
        render(idleBase);
        idleTween = gsap.to({ b: 0 }, {
            b: 1, duration: 2.6, yoyo: true, repeat: -1, ease: 'sine.inOut',
            onUpdate: function () {
                if (!idleOn) return;
                var breathe = this.targets()[0].b * 0.006;
                render(idleBase + breathe);
            }
        });
    }
    function stopIdle() {
        idleOn = false;
        if (idleTween) { idleTween.kill(); idleTween = null; }
    }

    /* ————— Nav ————— */
    var nav = document.getElementById('site-nav');
    window.addEventListener('scroll', function () {
        nav.classList.toggle('scrolled', window.scrollY > 60);
    }, { passive: true });

    document.querySelectorAll('.nav-links a[data-goto]').forEach(function (link) {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            if (!st) return;
            var f = parseFloat(link.getAttribute('data-goto'));
            window.scrollTo({ top: st.start + f * (st.end - st.start), behavior: 'smooth' });
        });
    });
    document.querySelector('.nav-name').addEventListener('click', function (e) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    /* ————— Ring cards ————— */
    document.querySelectorAll('.ring-card').forEach(function (card) {
        card.addEventListener('click', function () {
            var open = card.getAttribute('aria-expanded') === 'true';
            card.setAttribute('aria-expanded', String(!open));
        });
    });

    /* ————— Seed identity (footer) ————— */
    var seedEl = document.getElementById('seed-num');
    var copyBtn = document.getElementById('copy-link');

    function showSeed(s) {
        if (seedEl) seedEl.textContent = '#' + ('00000' + s).slice(-5);
    }
    function copyLink() {
        var url = window.location.href;
        function done() {
            if (!copyBtn) return;
            var old = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            setTimeout(function () { copyBtn.textContent = old; }, 1600);
        }
        function fallback() {
            var ta = document.createElement('textarea');
            ta.value = url;
            ta.style.position = 'fixed'; ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); } catch (e) {}
            document.body.removeChild(ta);
            done();
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(done, fallback);
        } else fallback();
    }
    if (copyBtn) copyBtn.addEventListener('click', copyLink);

    /* ————— Regrow ————— */
    function setSeed(s) {
        seed = s;
        build(seed);
        writeSeedToURL(seed);
        showSeed(seed);
        wireScroll();
        ScrollTrigger.refresh();
    }
    var seed = seedFromURL();
    if (seed === null) seed = (Math.random() * 4294967296) >>> 0;

    var regrowBtn = document.getElementById('regrow');
    if (regrowBtn) regrowBtn.addEventListener('click', function () {
        setSeed((Math.random() * 4294967296) >>> 0);
    });

    /* ————— Public API for feature modules ————— */
    window.TreeApp = {
        NS: NS,
        REDUCED: REDUCED,
        MOBILE: MOBILE,
        stage: stage,
        treeGroup: treeGroup,
        rootsGroup: rootsGroup,
        leavesGroup: leavesGroup,
        ringsGroup: ringsGroup,
        get seed() { return seed; },
        get data() { return currentData; },
        BASE_X: BASE_X,
        BASE_Y: BASE_Y,
        progress: function () { return lastProgress; },
        scrollToFraction: function (f) {
            if (!st) return;
            window.scrollTo({ top: st.start + f * (st.end - st.start), behavior: 'smooth' });
        },
        stopIdle: stopIdle,
        on: on,
        emit: emit,
        setMotesMode: setMotesMode,
        setSeed: setSeed
    };

    /* ————— Boot ————— */
    build(seed);
    writeSeedToURL(seed);
    showSeed(seed);
    sizeMotes();
    initMotes();
    wireScroll();

    if (!REDUCED) {
        idleOn = true;
        var intro = { p: 0 };
        render(0);
        gsap.to(intro, {
            p: IDLE_LEVEL, duration: 1.9, ease: 'power2.out', delay: 0.3,
            onUpdate: function () { render(intro.p); },
            onComplete: startIdle
        });
    } else {
        render(1);
    }

    window.addEventListener('resize', function () {
        sizeMotes(); initMotes();
        if (st) render(currentProgress());
    });
})();
