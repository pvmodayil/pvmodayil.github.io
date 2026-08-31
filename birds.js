/* ————————————————————————————————————————
   birds.js — ambient birds
   A bird flies in, lands on the highest branch, idles,
   and takes off when you reach the canopy or click near it.
———————————————————————————————————————— */

(function () {
    'use strict';

    var A = window.TreeApp;
    if (!A || A.REDUCED) return;

    var NS = A.NS;
    var svg = document.getElementById('tree-svg');
    var SCALE = 3.4;

    function prng(a) {
        return function () {
            a |= 0; a = (a + 0x6D2B79F5) | 0;
            var t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    var rand = prng((A.seed ^ 0xB17D) >>> 0);

    /* ————— Bird SVG (explicit nodes, no innerHTML) ————— */
    function el(name, attrs, cls) {
        var e = document.createElementNS(NS, name);
        if (cls) e.setAttribute('class', cls);
        for (var k in attrs) e.setAttribute(k, attrs[k]);
        return e;
    }

    function makeBird() {
        var g = el('g', {}, 'bird-svg');
        g.appendChild(el('path', { d: 'M0 0 q 7 -5 14 0 q -2 3 -7 3 q -5 0 -7 -3 Z' }, 'bird-body'));
        g.appendChild(el('path', { d: 'M13 0.5 q 5 -1 7 -4 q -4 0 -7 1.5 Z' }, 'bird-body'));
        g.appendChild(el('path', { d: 'M7 -1 q -3 -9 -10 -11 q 3 7 7 11 Z' }, 'wing bird-body'));
        g.appendChild(el('circle', { cx: 11.5, cy: -1.6, r: 0.9 }, 'bird-eye'));
        return g;
    }

    function landingSpot() {
        if (!A.data || !A.data.leaves.length) return null;
        var best = null;
        A.data.leaves.forEach(function (l) {
            if (l.x < 60 || l.x > 940) return;
            if (!best || l.y < best.y) best = l;
        });
        return best ? { x: best.x, y: best.y - 5 } : { x: A.BASE_X, y: 300 };
    }

    /* ————— State ————— */
    var bird = null;          // <g>
    var pos = { x: 0, y: 0 }; // current position in svg units
    var rot = 0;              // idle bob rotation
    var state = 'waiting';
    var landed = { x: 0, y: 0 };
    var bobTween = null;

    function applyTransform() {
        if (!bird) return;
        bird.setAttribute('transform',
            'translate(' + pos.x.toFixed(1) + ' ' + pos.y.toFixed(1) + ') ' +
            'rotate(' + rot.toFixed(1) + ') scale(' + SCALE + ')');
    }

    function bezier(p0, p1, p2, t) {
        var u = 1 - t;
        return {
            x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
            y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y
        };
    }

    function fly(from, to, dur, onDone) {
        var ctrl = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - 220 - rand() * 120 };
        var o = { t: 0 };
        bird.classList.add('flapping');
        bird.style.opacity = '1';
        gsap.to(o, {
            t: 1, duration: dur, ease: 'power1.inOut',
            onUpdate: function () {
                var p = bezier(from, ctrl, to, o.t);
                var p2 = bezier(from, ctrl, to, Math.min(1, o.t + 0.01));
                var ang = Math.atan2(p2.y - p.y, p2.x - p.x) * 180 / Math.PI;
                pos.x = p.x; pos.y = p.y; rot = ang * 0.3;
                applyTransform();
            },
            onComplete: function () {
                bird.classList.remove('flapping');
                if (onDone) onDone();
            }
        });
    }

    function arrive() {
        if (state !== 'waiting') return;
        var spot = landingSpot();
        if (!spot) { schedule(4000); return; }
        landed = spot;
        state = 'incoming';
        bird = makeBird();
        pos = { x: -80, y: 140 + rand() * 160 };
        rot = 0;
        applyTransform();
        svg.appendChild(bird);
        fly({ x: pos.x, y: pos.y }, landed, 3.2 + rand() * 1.2, function () {
            state = 'landed';
            bird.classList.add('landed');
            rot = 0;
            var o = { r: 0 };
            bobTween = gsap.to(o, {
                r: 3, duration: 0.9, yoyo: true, repeat: -1, ease: 'sine.inOut',
                onUpdate: function () { rot = o.r; applyTransform(); }
            });
            setTimeout(function () { if (state === 'landed') takeoff(); }, 16000 + rand() * 10000);
        });
    }

    function takeoff() {
        if (state !== 'landed' || !bird) return;
        if (bobTween) { bobTween.kill(); bobTween = null; }
        state = 'outgoing';
        fly({ x: pos.x, y: pos.y }, { x: 1090, y: 90 + rand() * 140 }, 2.6 + rand(), function () {
            if (bird && bird.parentNode) bird.parentNode.removeChild(bird);
            bird = null;
            state = 'waiting';
            schedule();
        });
    }

    var timer = null;
    function schedule(ms) {
        clearTimeout(timer);
        timer = setTimeout(arrive, ms || (10000 + rand() * 12000));
    }

    // take off when the visitor reaches the canopy
    A.on('progress', function (p) {
        if (p > 0.86 && state === 'landed') takeoff();
    });

    // or when they click near the bird
    svg.addEventListener('click', function (e) {
        if (state !== 'landed' || !bird) return;
        var pt = svg.createSVGPoint();
        pt.x = e.clientX; pt.y = e.clientY;
        var m = svg.getScreenCTM();
        if (!m) return;
        var sp = pt.matrixTransform(m.inverse());
        if (Math.hypot(sp.x - pos.x, sp.y - pos.y) < 140) takeoff();
    });

    A.on('rebuild', function () {
        if (bird && bird.parentNode) bird.parentNode.removeChild(bird);
        bird = null; state = 'waiting';
        rand = prng((A.seed ^ 0xB17D) >>> 0);
        schedule(4000);
    });

    schedule(2500); // first bird arrives soon
})();
