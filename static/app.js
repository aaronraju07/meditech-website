// ============================================================
// Meditech Components — Enhanced app.js
// Fixes: alert() replaced with toasts, broken HTML entity
//        references cleaned up, missing closePopup global fixed
// Added: hero particle canvas, typed text, counter animation,
//        scroll progress bar, mobile nav, scroll-to-top,
//        sticky header shrink, toast system
// ============================================================

// Security: Frame-busting to prevent UI Redressing/Clickjacking
if (window.top !== window.self) {
    window.top.location = window.self.location;
}

// ======== FUZZY SEARCH (shared across all pages) ========
// Levenshtein edit distance — tolerates typos (missing/extra/swapped letters)
function levenshtein(a, b) {
    if (a === b) return 0;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const prev = new Array(b.length + 1);
    const curr = new Array(b.length + 1);
    for (let j = 0; j <= b.length; j++) prev[j] = j;

    for (let i = 1; i <= a.length; i++) {
        curr[0] = i;
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            curr[j] = Math.min(
                prev[j] + 1,        // deletion
                curr[j - 1] + 1,    // insertion
                prev[j - 1] + cost  // substitution
            );
        }
        for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
    }
    return prev[b.length];
}

// Returns true if `query` fuzzy-matches anywhere in `text`.
// Tolerant of typos; scales tolerance with word length.
function fuzzyMatch(query, text) {
    if (!query) return true;
    query = query.toLowerCase();
    text = text.toLowerCase();
    if (text.includes(query)) return true; // fast path: exact substring still works

    const queryWords = query.split(/\s+/).filter(Boolean);
    const textWords  = text.split(/\s+/).filter(Boolean);

    return queryWords.every(qw => {
        return textWords.some(tw => {
            if (tw.includes(qw) || qw.includes(tw)) return true;
            const maxDist = qw.length <= 4 ? 1 : (qw.length <= 8 ? 2 : 3);
            return levenshtein(qw, tw) <= maxDist;
        });
    });
}

// ======== TOAST SYSTEM (replaces alert()) ========
function showToast(message, type = 'default', duration = 3200) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = { success: '✔', error: '✕', default: 'ℹ' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.default}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('removing');
        toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }, duration);
}

document.addEventListener('DOMContentLoaded', () => {

    // ======== 1. Scroll Progress Bar ========
    const progressBar = document.getElementById('scroll-progress');
    if (progressBar) {
        window.addEventListener('scroll', () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
            progressBar.style.width = pct + '%';
        }, { passive: true });
    }

    // ======== 2. Sticky Header Shrink on Scroll ========
    const header = document.getElementById('main-header');
    if (header) {
        window.addEventListener('scroll', () => {
            header.classList.toggle('scrolled', window.scrollY > 60);
        }, { passive: true });
    }

    // ======== 3. Scroll-to-Top Button ========
    const scrollTopBtn = document.getElementById('scroll-top-btn');
    if (scrollTopBtn) {
        window.addEventListener('scroll', () => {
            scrollTopBtn.classList.toggle('visible', window.scrollY > 400);
        }, { passive: true });
        scrollTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // ======== 4. Mobile Hamburger Menu ========
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const mobileDrawer = document.getElementById('mobile-nav-drawer');

    if (hamburgerBtn && mobileDrawer) {
        hamburgerBtn.addEventListener('click', () => {
            const isOpen = hamburgerBtn.classList.toggle('is-open');
            mobileDrawer.classList.toggle('is-open', isOpen);
            mobileDrawer.setAttribute('aria-hidden', String(!isOpen));
            hamburgerBtn.setAttribute('aria-expanded', String(isOpen));
        });

        // Close on link click
        mobileDrawer.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                hamburgerBtn.classList.remove('is-open');
                mobileDrawer.classList.remove('is-open');
                mobileDrawer.setAttribute('aria-hidden', 'true');
                hamburgerBtn.setAttribute('aria-expanded', 'false');
            });
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!header.contains(e.target) && !mobileDrawer.contains(e.target)) {
                hamburgerBtn.classList.remove('is-open');
                mobileDrawer.classList.remove('is-open');
                mobileDrawer.setAttribute('aria-hidden', 'true');
            }
        });
    }

    // ======== 5. Hero Canvas — Floating Particles ========
    const canvas = document.getElementById('hero-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let particles = [];
        let animId;

        function resizeCanvas() {
            canvas.width  = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        }
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas, { passive: true });

        class Particle {
            constructor() { this.reset(); }
            reset() {
                this.x  = Math.random() * canvas.width;
                this.y  = Math.random() * canvas.height;
                this.r  = Math.random() * 2.5 + 0.5;
                this.vx = (Math.random() - 0.5) * 0.4;
                this.vy = (Math.random() - 0.5) * 0.4;
                this.alpha = Math.random() * 0.25 + 0.05;
                // gold or dark-navy tones
                this.color = Math.random() > 0.5
                    ? `rgba(212,175,55,${this.alpha})`
                    : `rgba(26,37,51,${this.alpha})`;
            }
            update() {
                this.x += this.vx;
                this.y += this.vy;
                if (this.x < -10 || this.x > canvas.width + 10 ||
                    this.y < -10 || this.y > canvas.height + 10) this.reset();
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
            }
        }

        // Spawn 60 particles
        for (let i = 0; i < 60; i++) particles.push(new Particle());

        function renderParticles() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => { p.update(); p.draw(); });
            animId = requestAnimationFrame(renderParticles);
        }

        // Only run when hero is visible
        const heroSection = document.getElementById('hero');
        if (heroSection) {
            const heroObs = new IntersectionObserver(([entry]) => {
                if (entry.isIntersecting) { renderParticles(); }
                else { cancelAnimationFrame(animId); }
            });
            heroObs.observe(heroSection);
        } else {
            renderParticles();
        }

        // Respect reduced motion
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            cancelAnimationFrame(animId);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    // ======== 6. Typed Text Effect on Hero Title ========
    const typedEl = document.getElementById('typed-word');
    if (typedEl) {
        const words = ['Equipment', 'Solutions', 'Innovation', 'Care'];
        let wordIdx = 0;
        let charIdx = 0;
        let isDeleting = false;
        const typingSpeed = 110;
        const deletingSpeed = 65;
        const pauseDuration = 2200;

        function type() {
            const current = words[wordIdx];
            if (isDeleting) {
                typedEl.textContent = current.substring(0, charIdx - 1);
                charIdx--;
            } else {
                typedEl.textContent = current.substring(0, charIdx + 1);
                charIdx++;
            }

            typedEl.classList.remove('typing-done');

            let delay = isDeleting ? deletingSpeed : typingSpeed;

            if (!isDeleting && charIdx === current.length) {
                typedEl.classList.add('typing-done');
                delay = pauseDuration;
                isDeleting = true;
            } else if (isDeleting && charIdx === 0) {
                isDeleting = false;
                wordIdx = (wordIdx + 1) % words.length;
                delay = 400;
            }

            setTimeout(type, delay);
        }

        // Small initial delay before starting
        setTimeout(type, 1000);
    }

    // ======== 7. Intersection Observer — Fade-in & Lazy Load ========
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const element = entry.target;
                if (element.classList.contains('is-loading')) {
                    element.classList.remove('is-loading');
                    const img = element.querySelector('img');
                    if (img) img.style.opacity = '1';
                }
                element.classList.add('is-visible');
                obs.unobserve(element);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.fade-in, .is-loading').forEach(el => observer.observe(el));

    // ======== 8. Counter Animation (Stats Bar) ========
    const counterEls = document.querySelectorAll('.stat-item[data-count]');
    if (counterEls.length > 0) {
        const counterObs = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const item = entry.target;
                const target = parseInt(item.getAttribute('data-count'), 10);
                const suffix = item.getAttribute('data-suffix') || '';
                const numEl = item.querySelector('.counter-number');
                if (!numEl) return;

                const duration = 1600;
                const startTime = performance.now();

                function tick(now) {
                    const elapsed = now - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    // ease-out cubic
                    const eased = 1 - Math.pow(1 - progress, 3);
                    const current = Math.round(eased * target);
                    numEl.textContent = current + suffix;
                    if (progress < 1) requestAnimationFrame(tick);
                }

                requestAnimationFrame(tick);
                obs.unobserve(item);
            });
        }, { threshold: 0.5 });

        counterEls.forEach(el => counterObs.observe(el));
    }

    // ======== 9. Global Search UI & Routing ========
    const searchIcon   = document.getElementById('search-icon');
    const searchOverlay = document.getElementById('search-overlay');
    const closeSearchBtn = document.getElementById('close-search');
    const globalSearchInput = document.getElementById('global-search-input');

    if (searchIcon && searchOverlay && globalSearchInput) {
        searchIcon.addEventListener('click', () => {
            searchOverlay.classList.remove('hidden');
            globalSearchInput.focus();
        });
        closeSearchBtn?.addEventListener('click', () => {
            searchOverlay.classList.add('hidden');
            globalSearchInput.value = '';
        });
        globalSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = globalSearchInput.value.trim();
                if (query) window.location.href = `/products?search=${encodeURIComponent(query)}`;
            }
        });
        // ESC to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') searchOverlay.classList.add('hidden');
        });
    }

    // ======== 10. Procurement Cart (LocalStorage) ========
    let procurementCart = [];
    try { procurementCart = JSON.parse(localStorage.getItem('medicore_cart')) || []; } catch {}

    const cartBadge     = document.getElementById('cart-badge');
    const cartIcon      = document.getElementById('cart-icon');
    const cartModal     = document.getElementById('cart-modal');
    const closeCartBtn  = document.getElementById('close-cart');
    const cartItemsContainer = document.getElementById('cart-items');
    const clearCartBtn  = document.getElementById('clear-cart');
    const checkoutCartBtn = document.getElementById('checkout-cart');
    const quoteModal    = document.getElementById('quote-modal');

    function updateCart() {
        try { localStorage.setItem('medicore_cart', JSON.stringify(procurementCart)); } catch {}

        if (cartBadge) {
            if (procurementCart.length > 0) {
                cartBadge.textContent = procurementCart.length;
                cartBadge.style.display = 'flex';
            } else {
                cartBadge.style.display = 'none';
            }
        }

        if (cartItemsContainer) {
            if (procurementCart.length === 0) {
                cartItemsContainer.innerHTML = '<p class="cart-empty-state">Your procurement list is empty.</p>';
                if (checkoutCartBtn) checkoutCartBtn.disabled = true;
            } else {
                if (checkoutCartBtn) checkoutCartBtn.disabled = false;
                cartItemsContainer.innerHTML = procurementCart.map((item, index) => `
                    <div class="cart-item">
                        <div class="cart-item-info">
                            <h4>${item.name}</h4>
                            <p>SKU: ${item.sku}</p>
                        </div>
                        <button type="button" class="btn-remove-item" data-index="${index}">Remove</button>
                    </div>
                `).join('');

                cartItemsContainer.querySelectorAll('.btn-remove-item').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
                        const removed = procurementCart.splice(idx, 1)[0];
                        updateCart();
                        showToast(`Removed "${removed?.name}" from list`, 'default');
                    });
                });
            }
        }
    }

    // Add-to-cart buttons
    document.querySelectorAll('.btn-add-cart').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id   = e.currentTarget.getAttribute('data-id');
            const name = e.currentTarget.getAttribute('data-name');
            const sku  = e.currentTarget.getAttribute('data-sku');

            if (!procurementCart.some(item => item.id === id)) {
                procurementCart.push({ id, name, sku });
                updateCart();
                showToast(`Added "${name}" to your list ✓`, 'success');
                const orig = e.currentTarget.textContent;
                e.currentTarget.textContent = 'Added ✓';
                e.currentTarget.style.backgroundColor = 'var(--color-primary)';
                e.currentTarget.style.color = 'white';
                setTimeout(() => {
                    e.currentTarget.textContent = orig;
                    e.currentTarget.style.backgroundColor = '';
                    e.currentTarget.style.color = '';
                }, 2000);
            } else {
                showToast('Already in your procurement list', 'default');
            }
        });
    });

    if (cartIcon && cartModal) {
        cartIcon.addEventListener('click', () => { updateCart(); cartModal.showModal(); });
        closeCartBtn?.addEventListener('click', () => cartModal.close());
        cartModal.addEventListener('click', (e) => { if (e.target === cartModal) cartModal.close(); });
    }

    if (clearCartBtn) {
        clearCartBtn.addEventListener('click', () => {
            procurementCart = [];
            updateCart();
            showToast('Procurement list cleared', 'default');
        });
    }

    if (checkoutCartBtn) {
        checkoutCartBtn.addEventListener('click', () => {
            cartModal?.close();
            const productSelect = document.getElementById('product-select');
            if (productSelect && procurementCart.length > 0) {
                const existingCombined = Array.from(productSelect.options).find(opt => opt.value === 'combined-cart');
                if (!existingCombined) {
                    productSelect.appendChild(new Option(`Combined Quote (${procurementCart.length} items)`, 'combined-cart', true, true));
                } else {
                    existingCombined.text = `Combined Quote (${procurementCart.length} items)`;
                    existingCombined.selected = true;
                }
            }
            if (quoteModal) quoteModal.showModal();
        });
    }

    updateCart();

    // ======== 11. Quote Modal ========
    const closeQuoteBtn = document.getElementById('close-modal');

    if (quoteModal) {
        document.querySelectorAll('.btn-quote:not(.btn-add-cart)').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const requestedProduct = e.currentTarget.getAttribute('data-product');
                const productSelect = document.getElementById('product-select');
                if (requestedProduct && productSelect) productSelect.value = requestedProduct;
                quoteModal.showModal();
            });
        });
        closeQuoteBtn?.addEventListener('click', () => quoteModal.close());
        quoteModal.addEventListener('click', (e) => { if (e.target === quoteModal) quoteModal.close(); });
    }

    // ======== 12. Product Listing Filter ========
    const checkboxes    = document.querySelectorAll('.filter-checkbox');
    const productCards  = document.querySelectorAll('#product-grid .product-row, #product-grid .product-card');
    const plpClearBtn   = document.getElementById('clear-filters');

    const urlParams = new URLSearchParams(window.location.search);
    let activeSearchQuery = urlParams.get('search') ? urlParams.get('search').toLowerCase() : '';
    if (activeSearchQuery && globalSearchInput) globalSearchInput.value = activeSearchQuery;

    function filterProducts() {
        if (!productCards.length) return;
        const activeCategories = Array.from(checkboxes)
            .filter(cb => cb.checked && ['AED','Stretcher','Wheelchair'].includes(cb.value))
            .map(cb => cb.value);
        const activeCerts = Array.from(checkboxes)
            .filter(cb => cb.checked && ['fda','iso','ce'].includes(cb.value))
            .map(cb => cb.value);

        productCards.forEach(card => {
            const cardCategory = card.getAttribute('data-category');
            const cardCerts    = card.getAttribute('data-cert') || '';
            const titleEl = card.querySelector('h3') || card.querySelector('h4');
            const productTitle = titleEl ? titleEl.textContent.toLowerCase() : '';

            const matchesCategory = activeCategories.length === 0 || activeCategories.includes(cardCategory);
            const matchesCert     = activeCerts.every(cert => cardCerts.includes(cert));
            const matchesSearch   = activeSearchQuery === '' || productTitle.includes(activeSearchQuery);

            card.classList.toggle('hidden', !(matchesCategory && matchesCert && matchesSearch));
        });
    }

    if (checkboxes.length > 0) {
        checkboxes.forEach(cb => cb.addEventListener('change', filterProducts));
        if (plpClearBtn) {
            plpClearBtn.addEventListener('click', () => {
                checkboxes.forEach(cb => cb.checked = true);
                activeSearchQuery = '';
                window.history.pushState({}, '', window.location.pathname);
                if (globalSearchInput) globalSearchInput.value = '';
                filterProducts();
            });
        }
        filterProducts();
    }

    // ======== 13. Product Detail Page (PDP) — Tabs & Thumbnails ========
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels  = document.querySelectorAll('.tab-panel');
    if (tabButtons.length > 0) {
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                tabButtons.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
                tabPanels.forEach(p => p.hidden = true);
                btn.classList.add('active');
                btn.setAttribute('aria-selected', 'true');
                document.getElementById(btn.getAttribute('aria-controls')).hidden = false;
            });
        });
    }

    const thumbnails = document.querySelectorAll('.thumb');
    const mainImage  = document.getElementById('current-image');
    if (thumbnails.length > 0 && mainImage) {
        thumbnails.forEach(thumb => {
            thumb.addEventListener('click', () => {
                thumbnails.forEach(t => t.classList.remove('active-thumb'));
                thumb.classList.add('active-thumb');
                mainImage.style.opacity = '0';
                setTimeout(() => {
                    mainImage.src = thumb.src;
                    mainImage.style.opacity = '1';
                }, 150);
            });
        });
    }

    // ======== 14. About Page — Smooth Anchor Scroll ========
    const contactAnchor = document.querySelector('a[href="#contact-section"]');
    if (contactAnchor) {
        contactAnchor.addEventListener('click', (e) => {
            const target = document.getElementById('contact-section');
            if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
        });
    }

    // ======== 15. Success Popup (after contact form) ========
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === '1') {
        const popup = document.getElementById('success-popup');
        if (popup) popup.classList.remove('hidden');
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    // ======== 16. Filter Dropdown Toggle (Products Page) ========
    const dropdownTrigger = document.getElementById('filter-dropdown-trigger');
    const dropdownPanel   = document.getElementById('filter-dropdown-panel');
    if (dropdownTrigger && dropdownPanel) {
        dropdownTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownPanel.classList.toggle('hidden');
        });
        document.addEventListener('click', (e) => {
            if (!dropdownPanel.contains(e.target) && e.target !== dropdownTrigger) {
                dropdownPanel.classList.add('hidden');
            }
        });
    }

    // ======== 17. Layout Toggle (Products grid/list view) ========
    const layoutBtn  = document.getElementById('layout-toggle');
    const productGrid = document.getElementById('product-grid');
    if (layoutBtn && productGrid) {
        layoutBtn.addEventListener('click', () => {
            productGrid.classList.toggle('grid-mode');
        });
    }

    console.log('%cMeditech Components — Enhanced v2.0', 'color: #d4af37; font-size: 18px; font-weight: bold; background: #1a2533; padding: 8px 16px; border-radius: 4px;');
});

// ======== GLOBAL FUNCTIONS ========
window.closePopup = function () {
    const popup = document.getElementById('success-popup');
    if (popup) popup.classList.add('hidden');
};