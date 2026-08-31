/* ————————————————————————————————————————
   wind.js — mouse-reactive wind
   The canopy bends toward the cursor; fast movement = gust.
———————————————————————————————————————— */

(function () {
    'use strict';

    var A = window.TreeApp;
    if (!A || A.REDUCED) return;

    var leaves = A.leavesGroup;
    var trunk = A.treeGroup;
    var origin = A.BASE_X + ' ' + A.BASE_Y;

    gsap.set(leaves, { svgOrigin: origin });
    gsap.set(trunk, { svgOrigin: origin });

    var setLeaves = gsap.quickTo(leaves, 'rotation', { duration: 1.1, ease: 'power2.out' });
    var setTrunk = gsap.quickTo(trunk, 'rotation', { duration: 1.5, ease: 'power2.out' });

    var mx = 0;          // -1..1 horizontal pointer position
    var influence = 0;   // gust strength, decays
    var lastX = null;

    window.addEventListener('pointermove', function (e) {
        if (e.pointerType === 'touch') return;
        mx = (e.clientX / window.innerWidth - 0.5) * 2;
        if (lastX !== null) {
            influence = Math.min(1.8, influence + Math.abs(e.clientX - lastX) * 0.01);
        }
        lastX = e.clientX;
    }, { passive: true });

    window.addEventListener('pointerleave', function () { lastX = null; });

    gsap.ticker.add(function (time) {
        influence *= 0.965;
        var t = time;
        var ambient = Math.sin(t * 0.55) * 1.1 + Math.sin(t * 1.63) * 0.45;
        var gust = mx * (0.8 + influence * 2.4);
        setLeaves(ambient + gust);
        setTrunk(ambient * 0.22 + gust * 0.25);
    });

    A.on('rebuild', function () {
        var o = A.BASE_X + ' ' + A.BASE_Y;
        gsap.set(leaves, { svgOrigin: o });
        gsap.set(trunk, { svgOrigin: o });
    });
})();
