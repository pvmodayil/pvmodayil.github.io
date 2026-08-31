/* ————————————————————————————————————————
   forest.js — background grove
   Two layers of procedural tree silhouettes with parallax.
———————————————————————————————————————— */

(function () {
    'use strict';

    var A = window.TreeApp;
    if (!A) return;

    var NS = 'http://www.w3.org/2000/svg';

    function prng(a) {
        return function () {
            a |= 0; a = (a + 0x6D2B79F5) | 0;
            var t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function treeSilhouette(rand, baseX, baseY, h) {
        var g = document.createElementNS(NS, 'g');
        var trunkW = h * 0.06;
        var trunk = document.createElementNS(NS, 'path');
        var ty = baseY - h * 0.45;
        trunk.setAttribute('d',
            'M ' + (baseX - trunkW) + ' ' + baseY +
            ' L ' + (baseX - trunkW * 0.4) + ' ' + ty +
            ' L ' + (baseX + trunkW * 0.4) + ' ' + ty +
            ' L ' + (baseX + trunkW) + ' ' + baseY + ' Z');
        g.appendChild(trunk);
        var blobs = 2 + Math.floor(rand() * 2);
        for (var i = 0; i < blobs; i++) {
            var c = document.createElementNS(NS, 'circle');
            c.setAttribute('cx', (baseX + (rand() - 0.5) * h * 0.34).toFixed(1));
            c.setAttribute('cy', (ty - rand() * h * 0.3).toFixed(1));
            c.setAttribute('r', (h * (0.16 + rand() * 0.14)).toFixed(1));
            g.appendChild(c);
        }
        return g;
    }

    function buildLayer(cls, count, hMin, hMax, seedVal) {
        var layer = document.createElement('div');
        layer.className = 'forest-layer ' + cls;
        var svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('viewBox', '0 0 1000 1000');
        svg.setAttribute('preserveAspectRatio', 'xMidYMax meet');
        var rand = prng(seedVal);
        for (var i = 0; i < count; i++) {
            var x = (i + 0.5) * (1000 / count) + (rand() - 0.5) * (1000 / count) * 0.7;
            var h = hMin + rand() * (hMax - hMin);
            svg.appendChild(treeSilhouette(rand, x, 838, h));
        }
        layer.appendChild(svg);
        return layer;
    }

    var far = buildLayer('forest-far', 14, 90, 170, 987654);
    var mid = buildLayer('forest-mid', 8, 150, 260, 246813);

    var stage = A.stage;
    stage.insertBefore(far, stage.firstChild);
    stage.insertBefore(mid, document.getElementById('tree-svg'));

    if (!A.REDUCED) {
        A.on('progress', function (p) {
            far.style.transform = 'translateY(' + (-p * 34).toFixed(1) + 'px)';
            mid.style.transform = 'translateY(' + (-p * 78).toFixed(1) + 'px)';
        });
    }
})();
