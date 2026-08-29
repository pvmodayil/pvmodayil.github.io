/* ————————————————————————————————————————
   The Growing Tree — v2
   Procedural growth + atmosphere + scroll choreography.
   A new tree is grown from a random seed on every visit.
———————————————————————————————————————— */

(function () {
    'use strict';

    gsap.registerPlugin(ScrollTrigger);

    var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var NS = 'http://www.w3.org/2000/svg';

    var BASE_X = 500, BASE_Y = 820;
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
    var beatEls = BEATS.map(function (b) {
        return { el: document.getElementById(b.id), win: b };
    });

    var groundLen = groundLine.getTotalLength();
    groundLine.style.strokeDasharray = groundLen;

    /* ————— Build / rebuild ————— */
    function build(seed) {
        var rand = mulberry32(seed);
        var data = generate(rand);
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
    }

    /* ————— Per-frame render ————— */
    function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

    function render(p) {
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
            b.el.style.opacity = v.toFixed(3);
            b.el.style.visibility = v > 0.01 ? 'visible' : 'hidden';
            if (!isHero) b.el.style.transform = 'translateY(calc(-50% + ' + ((1 - v) * 24).toFixed(1) + 'px))';
        }
    }

    /* ————— Atmosphere: floating motes / pollen ————— */
    var motes = [];
    var moteCanvas = document.getElementById('motes');
    var moteCtx = moteCanvas.getContext('2d');

    function sizeMotes() {
        moteCanvas.width = stage.clientWidth;
        moteCanvas.height = stage.clientHeight;
    }
    function initMotes() {
        motes = [];
        var n = Math.max(14, Math.floor(stage.clientWidth / 90));
        for (var i = 0; i < n; i++) {
            motes.push({
                x: Math.random() * moteCanvas.width,
                y: Math.random() * moteCanvas.height,
                r: 0.6 + Math.random() * 1.8,
                vx: 0.1 + Math.random() * 0.35,
                vy: -(0.05 + Math.random() * 0.2),
                ph: Math.random() * Math.PI * 2,
                a: 0.15 + Math.random() * 0.35
            });
        }
    }
    function tickMotes(t) {
        moteCtx.clearRect(0, 0, moteCanvas.width, moteCanvas.height);
        for (var i = 0; i < motes.length; i++) {
            var m = motes[i];
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

    /* ————— Atmosphere: gentle wind sway on the canopy ————— */
    var swayTl = null;
    function startSway() {
        if (REDUCED) return;
        if (swayTl) swayTl.kill();
        swayTl = gsap.to(leavesGroup, {
            rotation: 1.6, transformOrigin: '50% 82%',
            duration: 3.2, yoyo: true, repeat: -1, ease: 'sine.inOut'
        });
    }

    /* ————— Master ticker ————— */
    gsap.ticker.add(function (time) {
        if (!REDUCED) tickMotes(time * 1000);
    });

    /* ————— Scroll wiring ————— */
    var st = null;
    function wireScroll() {
        if (st) { st.kill(); st = null; }
        if (REDUCED) { render(1); return; }
        st = ScrollTrigger.create({
            trigger: '#grow-scene',
            start: 'top top',
            end: 'bottom bottom',
            pin: '#stage',
            scrub: 0.6,
            onUpdate: function (self) { render(self.progress); }
        });
        render(clamp01((window.scrollY - st.start) / (st.end - st.start)));
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

    /* ————— Regrow ————— */
    var seed = (Math.random() * 4294967296) >>> 0;
    document.getElementById('regrow').addEventListener('click', function () {
        seed = (Math.random() * 4294967296) >>> 0;
        build(seed);
        wireScroll();
        ScrollTrigger.refresh();
    });

    /* ————— Boot ————— */
    build(seed);
    sizeMotes();
    initMotes();
    wireScroll();
    startSway();

    window.addEventListener('resize', function () {
        sizeMotes(); initMotes();
        if (st) render(clamp01((window.scrollY - st.start) / (st.end - st.start)));
    });
})();
