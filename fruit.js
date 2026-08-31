/* ————————————————————————————————————————
   fruit.js — interactive fruit & blossoms
   Projects grow as fruit, publications as blossoms.
   Click a fruit → it drops, a bottom sheet opens.
———————————————————————————————————————— */

(function () {
    'use strict';

    var A = window.TreeApp;
    if (!A) return;

    var NS = A.NS;

    /* ————— Content ————— */
    var PROJECTS = [
        {
            type: 'Project', name: 'Hazard Inspection', kicker: 'BMW Innovation Challenge 2024',
            tip: 'Vision transformers scanning drone imagery for site safety.',
            body: 'Developed software that scans drone images for safety risks on industrial sites using vision transformers, so safety teams can focus on the most critical areas first.',
            tags: ['Computer Vision', 'VLM', 'Streamlit', 'Industrial AI']
        },
        {
            type: 'Project', name: 'Police Report Insight', kicker: 'Young AI Leaders Dortmund',
            tip: 'RAG over police documents, turned into clear dashboards.',
            body: 'Built a system that reads police documents with an AI model and turns them into clear dashboards, helping non-technical staff quickly spot trends and risks.',
            tags: ['Python', 'Ollama', 'Web Scrape', 'RAG']
        },
        {
            type: 'Project', name: 'ragyphi', kicker: 'Personal project',
            tip: 'Ask questions over your documents, get direct answers.',
            body: 'Created a library that lets users ask questions over their documents (text, tables, images) and get direct answers instead of manually searching through files.',
            tags: ['Python', 'Ollama', 'RAG'],
            links: [{ label: 'GitHub', url: 'https://github.com/pvmodayil' }]
        },
        {
            type: 'Project', name: 'Online Job Scheduling', kicker: 'Academic',
            tip: 'Reinforcement learning for resource-constrained planning.',
            body: 'Trained an AI model that learns how to schedule jobs when resources are limited, demonstrating how reinforcement learning can improve planning decisions.',
            tags: ['Python', 'Reinforcement Learning', 'Job Scheduling', 'Algorithms']
        }
    ];
    var PUBLICATIONS = [
        {
            type: 'Publication', name: 'IEEE APEMC 2025', kicker: 'Hybrid AI for electronic design automation',
            tip: 'DRL + genetic algorithms for PCB transmission lines.',
            body: 'Physics-informed optimization of PCB transmission-line design, combining deep reinforcement learning with genetic algorithms to dramatically accelerate design exploration.',
            tags: ['DRL', 'Genetic Algorithms', 'Signal Integrity', 'EDA'],
            links: [{ label: 'Research', url: './pages/research-focus.html' }]
        },
        {
            type: 'Publication', name: 'DLR · LLM-assisted co-design', kicker: 'Publication contribution',
            tip: 'LLMs supporting engineering co-design workflows.',
            body: 'Contributed to DLR publications on LLM-assisted co-design, exploring how large language models can support engineering design workflows.',
            tags: ['LLM', 'Co-design', 'Research'],
            links: [{ label: 'Research', url: './pages/research-focus.html' }]
        }
    ];

    /* ————— Placement ————— */
    function pickSpots(data, count, seed) {
        // deterministic spread selection from canopy leaf tips
        var rand = (function (a) {
            return function () {
                a |= 0; a = (a + 0x6D2B79F5) | 0;
                var t = Math.imul(a ^ (a >>> 15), 1 | a);
                t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
                return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
            };
        }(seed));
        var cands = data.leaves.filter(function (l) { return l.y < 560; });
        cands.sort(function (a, b) { return a.y - b.y; });
        var picked = [];
        var pool = cands.slice();
        // shuffle lightly
        for (var s = pool.length - 1; s > 0; s--) {
            var k = Math.floor(rand() * (s + 1));
            var tmp = pool[s]; pool[s] = pool[k]; pool[k] = tmp;
        }
        pool.sort(function (a, b) { return a.y - b.y; });
        for (var i = 0; i < pool.length && picked.length < count; i++) {
            var cand = pool[i];
            var ok = true;
            for (var j = 0; j < picked.length; j++) {
                var dx = cand.x - picked[j].x, dy = cand.y - picked[j].y;
                if (Math.hypot(dx, dy) < 110) { ok = false; break; }
            }
            if (ok) picked.push(cand);
        }
        return picked;
    }

    /* ————— SVG builders ————— */
    var fruitLayer = null;
    var fruits = [];
    var revealed = false;

    function makeFruit(item, x, y) {
        var g = document.createElementNS(NS, 'g');
        g.setAttribute('class', 'fruit');
        g.setAttribute('tabindex', '0');
        g.setAttribute('role', 'button');
        g.setAttribute('aria-label', item.type + ': ' + item.name);
        var stem = document.createElementNS(NS, 'path');
        stem.setAttribute('class', 'fruit-stem');
        stem.setAttribute('d', 'M ' + x + ' ' + (y - 2) + ' q 2 5 0 10');
        var body = document.createElementNS(NS, 'circle');
        body.setAttribute('class', 'fruit-body');
        body.setAttribute('cx', x); body.setAttribute('cy', y + 17);
        body.setAttribute('r', 8.5);
        var shine = document.createElementNS(NS, 'circle');
        shine.setAttribute('class', 'fruit-shine');
        shine.setAttribute('cx', x - 3); shine.setAttribute('cy', y + 14);
        shine.setAttribute('r', 2.4);
        g.appendChild(stem); g.appendChild(body); g.appendChild(shine);
        g.style.transformBox = 'fill-box';
        g.style.transformOrigin = 'center';
        g.style.transform = 'scale(0)';
        return { g: g, x: x, y: y, item: item, kind: 'fruit' };
    }

    function makeBlossom(item, x, y) {
        var g = document.createElementNS(NS, 'g');
        g.setAttribute('class', 'blossom');
        g.setAttribute('tabindex', '0');
        g.setAttribute('role', 'button');
        g.setAttribute('aria-label', item.type + ': ' + item.name);
        for (var i = 0; i < 5; i++) {
            var a = (i / 5) * Math.PI * 2;
            var p = document.createElementNS(NS, 'ellipse');
            p.setAttribute('class', 'petal');
            p.setAttribute('cx', x + Math.cos(a) * 6);
            p.setAttribute('cy', y + Math.sin(a) * 6);
            p.setAttribute('rx', 4.6); p.setAttribute('ry', 3);
            p.setAttribute('transform', 'rotate(' + (a * 180 / Math.PI) + ' ' + x + ' ' + y + ')');
            g.appendChild(p);
        }
        var core = document.createElementNS(NS, 'circle');
        core.setAttribute('class', 'blossom-core');
        core.setAttribute('cx', x); core.setAttribute('cy', y);
        core.setAttribute('r', 3);
        g.appendChild(core);
        g.style.transformBox = 'fill-box';
        g.style.transformOrigin = 'center';
        g.style.transform = 'scale(0)';
        return { g: g, x: x, y: y, item: item, kind: 'blossom' };
    }

    /* ————— Bottom sheet ————— */
    var sheet = document.getElementById('sheet');
    var backdrop = document.getElementById('sheet-backdrop');
    var elKicker = document.getElementById('sheet-kicker');
    var elTitle = document.getElementById('sheet-title');
    var elBody = document.getElementById('sheet-body');
    var elTags = document.getElementById('sheet-tags');
    var elLinks = document.getElementById('sheet-links');
    var lastOpened = null;

    function openSheet(item) {
        elKicker.textContent = item.type + ' · ' + item.kicker;
        elTitle.textContent = item.name;
        elBody.textContent = item.body;
        elTags.innerHTML = '';
        item.tags.forEach(function (t) {
            var s = document.createElement('span');
            s.textContent = t;
            elTags.appendChild(s);
        });
        elLinks.innerHTML = '';
        (item.links || []).forEach(function (l) {
            var a = document.createElement('a');
            a.href = l.url;
            a.textContent = l.label;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            elLinks.appendChild(a);
        });
        backdrop.hidden = false;
        sheet.hidden = false;
        sheetOpen = true;
        requestAnimationFrame(function () {
            backdrop.classList.add('show');
            sheet.classList.add('show');
        });
    }

    function closeSheet() {
        backdrop.classList.remove('show');
        sheet.classList.remove('show');
        setTimeout(function () {
            backdrop.hidden = true;
            sheet.hidden = true;
            if (lastOpened) respawn(lastOpened);
            lastOpened = null;
            sheetOpen = false;
            syncReveal(A.progress(), false);
        }, 420);
    }

    document.getElementById('sheet-close').addEventListener('click', closeSheet);
    backdrop.addEventListener('click', closeSheet);
    window.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !sheet.hidden) closeSheet();
    });

    // swipe-down to dismiss
    var dragY = null;
    sheet.addEventListener('pointerdown', function (e) {
        if (e.target.closest('.sheet-body, .sheet-tags, .sheet-links')) return;
        dragY = e.clientY;
    });
    sheet.addEventListener('pointermove', function (e) {
        if (dragY === null) return;
        var dy = e.clientY - dragY;
        if (dy > 0) sheet.style.transform = 'translate(-50%, ' + dy + 'px)';
    });
    sheet.addEventListener('pointerup', function (e) {
        if (dragY === null) return;
        var dy = e.clientY - dragY;
        sheet.style.transform = '';
        if (dy > 90) closeSheet();
        dragY = null;
    });

    /* ————— Tooltip ————— */
    var tip = document.getElementById('fruit-tip');
    function showTip(f) {
        tip.innerHTML = '<strong>' + f.item.name + '</strong>' + f.item.tip;
        var r = f.g.getBoundingClientRect();
        tip.style.left = (r.left + r.width / 2) + 'px';
        tip.style.top = r.top + 'px';
        tip.hidden = false;
        requestAnimationFrame(function () { tip.classList.add('show'); });
    }
    function hideTip() {
        tip.classList.remove('show');
        setTimeout(function () { tip.hidden = true; }, 200);
    }

    /* ————— Activation ————— */
    function startBob(f, i) {
        if (A.REDUCED) return;
        f.bob = gsap.to(f.g, {
            y: '+=3', rotation: '+=2', duration: 1.6 + i * 0.3,
            yoyo: true, repeat: -1, ease: 'sine.inOut', delay: i * 0.4
        });
    }

    function respawn(f) {
        if (f.bob) { f.bob.kill(); f.bob = null; }
        if (A.REDUCED) { f.g.style.transform = 'scale(1)'; return; }
        gsap.fromTo(f.g,
            { scale: 0, y: 0, opacity: 1, rotation: 0 },
            {
                scale: 1, duration: 0.7, ease: 'back.out(2)',
                clearProps: 'transform,opacity',
                onComplete: function () { startBob(f, fruits.indexOf(f)); }
            });
    }

    function activate(f) {
        lastOpened = f;
        hideTip();
        if (f.bob) { f.bob.kill(); f.bob = null; }
        if (f.kind === 'blossom') {
            gsap.fromTo(f.g, { scale: 1.35 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1,0.4)' });
            openSheet(f.item);
            return;
        }
        if (A.REDUCED) { openSheet(f.item); return; }
        // drop: fall to ground, bounce, then open
        var fall = 812 - (f.y + 17);
        gsap.timeline()
            .to(f.g, { y: fall, rotation: 50, ease: 'power2.in', duration: 0.75 })
            .to(f.g, { y: fall - 26, duration: 0.22, ease: 'power2.out' })
            .to(f.g, { y: fall, duration: 0.2, ease: 'power2.in' })
            .to(f.g, { opacity: 0, duration: 0.25 });
        setTimeout(function () { openSheet(f.item); }, 620);
    }

    function bind(f) {
        f.g.addEventListener('pointerenter', function () { if (revealed) showTip(f); });
        f.g.addEventListener('pointerleave', hideTip);
        f.g.addEventListener('click', function () { if (revealed) activate(f); });
        f.g.addEventListener('keydown', function (e) {
            if ((e.key === 'Enter' || e.key === ' ') && revealed) { e.preventDefault(); activate(f); }
        });
    }

    /* ————— Build / rebuild ————— */
    function place() {
        if (!fruitLayer) {
            fruitLayer = document.createElementNS(NS, 'g');
            fruitLayer.setAttribute('id', 'fruit-group');
            // live INSIDE the canopy group so wind sway carries the fruit too
            A.leavesGroup.appendChild(fruitLayer);
        }
        fruitLayer.innerHTML = '';
        fruits = [];
        if (!A.data) return;
        var spots = pickSpots(A.data, PROJECTS.length + PUBLICATIONS.length, A.seed);
        var i, f;
        for (i = 0; i < PROJECTS.length && i < spots.length; i++) {
            f = makeFruit(PROJECTS[i], spots[i].x, spots[i].y);
            fruitLayer.appendChild(f.g); fruits.push(f); bind(f);
        }
        for (i = 0; i < PUBLICATIONS.length && (PROJECTS.length + i) < spots.length; i++) {
            f = makeBlossom(PUBLICATIONS[i], spots[PROJECTS.length + i].x, spots[PROJECTS.length + i].y);
            fruitLayer.appendChild(f.g); fruits.push(f); bind(f);
        }
        revealed = false;
        syncReveal(A.progress(), true);
    }

    function setReveal(on, instant) {
        if (on === revealed) return;
        revealed = on;
        fruits.forEach(function (f, i) {
            if (f.bob) { f.bob.kill(); f.bob = null; }
            if (on) {
                if (instant || A.REDUCED) {
                    gsap.set(f.g, { scale: 1, y: 0, rotation: 0, opacity: 1 });
                    startBob(f, i);
                } else {
                    gsap.fromTo(f.g, { scale: 0, y: 0, rotation: 0, opacity: 1 }, {
                        scale: 1, duration: 0.6, delay: i * 0.08, ease: 'back.out(2.2)',
                        clearProps: 'transform',
                        onComplete: function () { startBob(f, i); }
                    });
                }
            } else {
                if (A.REDUCED) { gsap.set(f.g, { scale: 0 }); return; }
                gsap.to(f.g, {
                    scale: 0, duration: 0.35, ease: 'back.in(1.4)',
                    onComplete: function () { gsap.set(f.g, { y: 0, rotation: 0, opacity: 1 }); }
                });
            }
        });
    }

    var sheetOpen = false;
    function syncReveal(p, instant) {
        if (p > 0.72) setReveal(true, instant);
        else if (p < 0.70) setReveal(false, false);
    }

    A.on('progress', function (p) {
        if (!sheetOpen) syncReveal(p, false);
    });

    A.on('rebuild', place);
    place();
})();
