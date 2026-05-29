// Navigation functionality
const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('.section');

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        // Only prevent default for hash links (internal sections)
        if (link.getAttribute('href').startsWith('#')) {
            e.preventDefault();
            
            // Remove active class from all nav links and sections
            navLinks.forEach(nl => nl.classList.remove('active'));
            sections.forEach(section => section.classList.remove('active'));
            
            // Add active class to clicked nav link
            link.classList.add('active');
            
            // Show corresponding section
            const targetId = link.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add('active');
                
                // Add animation to cards in the active section
                const cards = targetSection.querySelectorAll('.card');
                cards.forEach((card, index) => {
                    card.style.animationDelay = `${index * 0.1}s`;
                    card.classList.add('animate-fade-in');
                });
            }
        }
        // For other links (like gallery.html), let the browser handle navigation
    });
});

// Smooth scrolling for better UX
document.addEventListener('DOMContentLoaded', function() {
    // Add some interactive hover effects
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });

    // Add typing effect to hero title
    const heroTitle = document.querySelector('.hero h1');
    const originalText = heroTitle.textContent;
    heroTitle.textContent = '';
    
    let i = 0;
    const typeWriter = () => {
        if (i < originalText.length) {
            heroTitle.textContent += originalText.charAt(i);
            i++;
            setTimeout(typeWriter, 100);
        }
    };
    
    setTimeout(typeWriter, 500);
});

// Add some particle animation to the header
function createParticle() {
    const particle = document.createElement('div');
    particle.style.position = 'absolute';
    particle.style.width = '4px';
    particle.style.height = '4px';
    particle.style.background = 'rgba(255, 255, 255, 0.6)';
    particle.style.borderRadius = '50%';
    particle.style.pointerEvents = 'none';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDuration = (Math.random() * 3 + 2) + 's';
    particle.style.animationName = 'float';

    document.querySelector('.hero').appendChild(particle);

    setTimeout(() => {
        particle.remove();
    }, 5000);
}

// Add CSS for floating animation
const style = document.createElement('style');
style.textContent = `
    @keyframes float {
        0% {
            transform: translateY(100vh) rotate(0deg);
            opacity: 1;
        }
        100% {
            transform: translateY(-100px) rotate(360deg);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Create particles periodically
setInterval(createParticle, 300);

function addWatermark(img) {
    if (img.dataset.watermarked) return;
    img.dataset.watermarked = 'true';
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#ffffff';
    ctx.font = Math.max(Math.floor(canvas.width / 12), 16) + 'px Arial';
    ctx.rotate(-Math.PI / 6);
    var text = '\u00A9 Philip Modayil';
    var textWidth = ctx.measureText(text).width;
    var stepX = textWidth + 80;
    var stepY = Math.max(Math.floor(canvas.height / 5), 60);
    var diag = Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height);
    for (var y = -diag; y < diag; y += stepY) {
        for (var x = -diag; x < diag; x += stepX) {
            ctx.fillText(text, x, y);
        }
    }
    ctx.restore();
    img.src = canvas.toDataURL('image/jpeg', 0.92);
}

document.querySelectorAll('img').forEach(function(img) {
    if (img.complete && img.naturalWidth > 0) {
        addWatermark(img);
    } else {
        img.addEventListener('load', function() { addWatermark(img); });
    }
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