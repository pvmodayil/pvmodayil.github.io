/* ————————————————————————————————————————
   theme.js — day / night toggle
   Swaps CSS variables, pollen becomes fireflies, stars appear.
———————————————————————————————————————— */

(function () {
    'use strict';

    var A = window.TreeApp;
    if (!A) return;

    var root = document.documentElement;
    var btn = document.getElementById('theme-toggle');

    // stars layer (behind the forest)
    var stars = document.createElement('div');
    stars.className = 'stars';
    A.stage.insertBefore(stars, A.stage.firstChild);

    // fade mask for the swap
    var fade = document.createElement('div');
    fade.className = 'theme-fade';
    A.stage.appendChild(fade);

    function apply(mode) {
        if (mode === 'night') root.setAttribute('data-theme', 'night');
        else root.removeAttribute('data-theme');
        A.setMotesMode(mode === 'night' ? 'firefly' : 'pollen');
        try { localStorage.setItem('pm-theme', mode); } catch (e) {}
    }

    function current() {
        return root.getAttribute('data-theme') === 'night' ? 'night' : 'day';
    }

    var saved = 'day';
    try { saved = localStorage.getItem('pm-theme') || 'day'; } catch (e) {}
    apply(saved);

    btn.addEventListener('click', function () {
        var next = current() === 'night' ? 'day' : 'night';
        if (A.REDUCED) { apply(next); return; }
        gsap.timeline()
            .to(fade, { opacity: 0.6, duration: 0.35, ease: 'power1.in' })
            .add(function () { apply(next); })
            .to(fade, { opacity: 0, duration: 0.75, ease: 'power1.out' });
    });
})();
