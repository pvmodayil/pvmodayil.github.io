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

    function prng(a) {
        return function () {
            a |= 0; a = (a + 0x6D2B79F5) | 0;
            var t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    var rand = prng((A.seed ^ 0xB17D) >>> 0);

    /* ————— Bird SVG ————— */
    function makeBird() {
        var g = document.createElementNS(NS, 'g');
        g.setAttribute('class', 'bird-svg');
        var inner = document.createElementNS(NS, 'g');
        inner.setAttribute('class', 'bird-inner');
        inner.innerHTML =
            '<path class="bird-body" d="M0 0 q 7 -5 14 0 q -2 3 -7 3 q -5 0 -7 -3 Z"/>' +
            '<path class="bird-body" d="M13 0.5 q 5 -1 7 -4 q -4 0 -7 1.5 Z"/>' +
            '<path class="wing bird-body" d="M7 -1 q -3 -9 -10 -11 q 3 7 7 11 Z"/>' +
            '<circle cx="11.5" cy="-1.6" r="0.9" fill="var(--paper)"/>';
        g.appendChild(inner);
        gsap.set(inner, { scale: 2.4, transformOrigin: '50% 100%' });
        return g;
    }

    function landingSpot() {
        if (!A.data || !A.data.leaves.length) return null;
        var best = null;
        A.data.leaves.forEach(function (l) {
            if (l.x < 60 || l.x > 940) return;
            if (!best || l.y < best.y) best = l;
        });
        return best ? { x: best.x, y: best.y - 4 } : { x: A.BASE_X, y: 300 };
    }

    var bird = null;
    var state = 'waiting';
    var landed = { x: 0, y: 0 };
    var bob = null;

    function bezier(p0, p1, p2, t) {
        var u = 1 - t;
        return {
            x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
            y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y
        };
    }

    function fly(from, to, dur, onDone) {
        var ctrl = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - 240 - rand() * 120 };
        var o = { t: 0 };
        bird.classList.add('flapping');
        bird.style.opacity = '1';
        gsap.to(o, {
            t: 1, duration: dur, ease: 'power1.inOut',
            onUpdate: function () {
                var p = bezier(from, ctrl, to, o.t);
                var p2 = bezier(from, ctrl, to, Math.min(1, o.t + 0.01));
                var ang = Math.atan2(p2.y - p.y, p2.x - p.x) * 180 / Math.PI;
                bird.setAttribute('transform',
                    'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ') rotate(' + (ang * 0.35).toFixed(1) + ')');
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
        // nest in the canopy group so a landed bird sways with the branches
        A.leavesGroup.appendChild(bird);
        var from = { x: -80, y: 140 + rand() * 160 };
        fly(from, landed, 3.4 + rand() * 1.2, function () {
            state = 'landed';
            bird.classList.add('landed');
            var inner = bird.querySelector('.bird-inner');
            bob = gsap.to(inner, {
                rotation: 2.5, duration: 0.9, yoyo: true, repeat: -1, ease: 'sine.inOut',
                transformOrigin: '50% 100%'
            });
            // leave again on its own after a while
            setTimeout(function () { if (state === 'landed') takeoff(); }, 14000 + rand() * 8000);
        });
    }

    function takeoff() {
        if (state !== 'landed' || !bird) return;
        if (bob) { bob.kill(); bob = null; }
        state = 'outgoing';
        var cur = { x: landed.x, y: landed.y };
        var to = { x: 1090, y: 90 + rand() * 140 };
        fly(cur, to, 2.8 + rand(), function () {
            if (bird && bird.parentNode) bird.parentNode.removeChild(bird);
            bird = null;
            state = 'waiting';
            schedule();
        });
    }

    var timer = null;
    function schedule(ms) {
        clearTimeout(timer);
        timer = setTimeout(arrive, ms || (9000 + rand() * 14000));
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
        if (Math.hypot(sp.x - landed.x, sp.y - landed.y) < 130) takeoff();
    });

    A.on('rebuild', function () {
        if (bird && bird.parentNode) bird.parentNode.removeChild(bird);
        bird = null; state = 'waiting';
        rand = prng((A.seed ^ 0xB17D) >>> 0);
        schedule(6000);
    });

    schedule(5000);
})();
