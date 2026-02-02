/**
 * Intersection Observer for scroll-triggered animations
 * Observes elements with .ammo-animate-on-scroll class and adds animation classes when visible
 */
(function () {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const delay = el.dataset.delay || 1;
                console.log(el.dataset.animation);

                const animation = el.dataset.animation || 'ammo-fade-in-up';

                el.classList.add(animation, 'ammo-delay-' + delay);
                el.classList.remove('ammo-animate-on-scroll');
                observer.unobserve(el);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    function observeElements() {
        document.querySelectorAll('.ammo-animate-on-scroll:not(.ammo-fade-in-up):not(.ammo-scale-in)').forEach(el => {
            observer.observe(el);
        });
    }

    // Initial observation
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', observeElements);
    } else {
        observeElements();
    }

    // Re-observe on Shopify section events (theme editor)
    document.addEventListener('shopify:section:load', observeElements);
    document.addEventListener('shopify:section:reorder', observeElements);
})();
