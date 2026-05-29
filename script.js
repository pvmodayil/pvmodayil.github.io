(function() {
    var nav = document.querySelector('.site-nav');
    if (nav) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 60) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }
        });
    }

    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.reveal').forEach(function(el) {
        observer.observe(el);
    });

    document.querySelectorAll('.nav-links a[href^="#"]').forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            var target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    document.addEventListener('contextmenu', function(e) {
        if (e.target.tagName === 'IMG') {
            e.preventDefault();
        }
    });

    document.addEventListener('dragstart', function(e) {
        if (e.target.tagName === 'IMG') {
            e.preventDefault();
        }
    });

    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
            e.preventDefault();
        }
        if (e.key === 'PrintScreen') {
            e.preventDefault();
            navigator.clipboard.writeText('');
        }
        if (e.metaKey || e.key === 'Meta' || e.key === 'OS') {
            document.querySelectorAll('img').forEach(function(img) {
                img.style.filter = 'blur(20px)';
            });
        }
    });

    document.addEventListener('keyup', function(e) {
        if (e.key === 'Meta' || e.key === 'OS') {
            document.querySelectorAll('img').forEach(function(img) {
                img.style.filter = '';
            });
        }
        if (e.key === 'PrintScreen') {
            navigator.clipboard.writeText('');
        }
    });

    document.addEventListener('visibilitychange', function() {
        document.querySelectorAll('img').forEach(function(img) {
            img.style.filter = document.hidden ? 'blur(20px)' : '';
        });
    });

    window.addEventListener('blur', function() {
        document.querySelectorAll('img').forEach(function(img) {
            img.style.filter = 'blur(20px)';
        });
    });

    window.addEventListener('focus', function() {
        document.querySelectorAll('img').forEach(function(img) {
            img.style.filter = '';
        });
    });
})();
