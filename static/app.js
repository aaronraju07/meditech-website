// Security: Frame-busting to prevent UI Redressing/Clickjacking
if (window.top !== window.self) {
    window.top.location = window.self.location;
}

document.addEventListener("DOMContentLoaded", () => {

    // ======== 1. Intersection Observer for Animations & Lazy Loading ========
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

    document.querySelectorAll('.fade-in').forEach((element) => observer.observe(element));

    // ======== 2. Global Search UI & Routing Logic ========
    // ======== Global Search UI & Routing Logic ========
    const searchIcon = document.getElementById('search-icon');
    const searchOverlay = document.getElementById('search-overlay');
    const closeSearchBtn = document.getElementById('close-search');
    const globalSearchInput = document.getElementById('global-search-input');

    if (searchIcon && searchOverlay && globalSearchInput) {
        // 1. Open Overlay
        searchIcon.addEventListener('click', () => {
            searchOverlay.classList.remove('hidden');
            globalSearchInput.focus();
        });

        // 2. Close Overlay
        closeSearchBtn.addEventListener('click', () => {
            searchOverlay.classList.add('hidden');
            globalSearchInput.value = '';
        });

        // 3. Single Handle for Redirect
        globalSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = globalSearchInput.value.trim();
                if (query) {
                    // Use the Flask route '/products' and a consistent param 'search'
                    window.location.href = `/products?search=${encodeURIComponent(query)}`;
                }
            }
        });
    }

    // ======== 3. Procurement Cart (LocalStorage) ========
    let procurementCart = JSON.parse(localStorage.getItem('medicore_cart')) || [];
    const cartBadge = document.getElementById('cart-badge');
    const cartIcon = document.getElementById('cart-icon');
    const cartModal = document.getElementById('cart-modal');
    const closeCartBtn = document.getElementById('close-cart');
    const cartItemsContainer = document.getElementById('cart-items');
    const clearCartBtn = document.getElementById('clear-cart');
    const checkoutCartBtn = document.getElementById('checkout-cart');
    const quoteModal = document.getElementById('quote-modal');

    function updateCart() {
        localStorage.setItem('medicore_cart', JSON.stringify(procurementCart));
        if (procurementCart.length > 0) {
            cartBadge.textContent = procurementCart.length;
            cartBadge.style.display = 'flex';
        } else {
            cartBadge.style.display = 'none';
        }

        if (cartItemsContainer) {
            if (procurementCart.length === 0) {
                cartItemsContainer.innerHTML = '<p class="cart-empty-state">Your procurement list is empty.</p>';
                checkoutCartBtn.disabled = true;
            } else {
                checkoutCartBtn.disabled = false;
                cartItemsContainer.innerHTML = procurementCart.map((item, index) => `
                    <div class="cart-item">
                        <div class="cart-item-info"><h4>${item.name}</h4><p>SKU: ${item.sku}</p></div>
                        <button type="button" class="btn-remove-item" data-index="${index}">Remove</button>
                    </div>
                `).join('');

                document.querySelectorAll('.btn-remove-item').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        procurementCart.splice(e.target.getAttribute('data-index'), 1);
                        updateCart();
                    });
                });
            }
        }
    }

    document.querySelectorAll('.btn-add-cart').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            const name = e.target.getAttribute('data-name');
            const sku = e.target.getAttribute('data-sku');

            if (!procurementCart.some(item => item.id === id)) {
                procurementCart.push({ id, name, sku });
                updateCart();
                const originalText = e.target.textContent;
                e.target.textContent = "Added ✓";
                e.target.style.backgroundColor = "var(--color-primary)";
                e.target.style.color = "white";
                setTimeout(() => {
                    e.target.textContent = originalText;
                    e.target.style.backgroundColor = "";
                    e.target.style.color = "";
                }, 2000);
            } else {
                alert("This item is already in your procurement list.");
            }
        });
    });

    if (cartIcon && cartModal) {
        cartIcon.addEventListener('click', () => { updateCart(); cartModal.showModal(); });
        closeCartBtn.addEventListener('click', () => cartModal.close());
        cartModal.addEventListener('click', (e) => { if (e.target === cartModal) cartModal.close(); });
    }

    if (clearCartBtn) {
        clearCartBtn.addEventListener('click', () => { procurementCart = []; updateCart(); });
    }

    if (checkoutCartBtn) {
        checkoutCartBtn.addEventListener('click', () => {
            cartModal.close();
            const productSelect = document.getElementById('product-select');
            if (productSelect && procurementCart.length > 1) {
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

    // ======== 4. Quote Modal & Form Validation ========
    const closeQuoteBtn = document.getElementById('close-modal');
    const quoteForm = document.querySelector('.modern-form');

    if (quoteModal) {
        document.querySelectorAll('.btn-quote:not(.btn-add-cart)').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const requestedProduct = e.target.getAttribute('data-product');
                const productSelect = document.getElementById('product-select');
                if (requestedProduct && productSelect) productSelect.value = requestedProduct;
                quoteModal.showModal();
            });
        });

        closeQuoteBtn.addEventListener('click', () => quoteModal.close());
        quoteModal.addEventListener('click', (e) => { if (e.target === quoteModal) quoteModal.close(); });

    }

    // ======== 5. Product Listing Page (PLP) Filtering ========
    const checkboxes = document.querySelectorAll('.filter-checkbox');
    const productCards = document.querySelectorAll('.plp-grid .product-card');
    const plpClearBtn = document.getElementById('clear-filters');

    const urlParams = new URLSearchParams(window.location.search);
    let activeSearchQuery = urlParams.get('search') ? urlParams.get('search').toLowerCase() : '';

    if (activeSearchQuery && globalSearchInput) globalSearchInput.value = activeSearchQuery;

    function filterProducts() {
        if (!productCards.length) return;

        const activeCategories = Array.from(checkboxes).filter(cb => cb.checked && ['diagnostic', 'monitoring', 'surgical'].includes(cb.value)).map(cb => cb.value);
        const activeCerts = Array.from(checkboxes).filter(cb => cb.checked && ['fda', 'iso'].includes(cb.value)).map(cb => cb.value);

        productCards.forEach(card => {
            const cardCategory = card.getAttribute('data-category');
            const cardCerts = card.getAttribute('data-cert') || "";
            const productTitle = card.querySelector('h4').textContent.toLowerCase();

            const matchesCategory = activeCategories.length === 0 || activeCategories.includes(cardCategory);
            const matchesCert = activeCerts.every(cert => cardCerts.includes(cert));
            const matchesSearch = activeSearchQuery === '' || productTitle.includes(activeSearchQuery);

            if (matchesCategory && matchesCert && matchesSearch) card.classList.remove('hidden');
            else card.classList.add('hidden');
        });
    }

    if (checkboxes.length > 0) {
        checkboxes.forEach(cb => cb.addEventListener('change', filterProducts));
        if (plpClearBtn) {
            plpClearBtn.addEventListener('click', () => {
                checkboxes.forEach(cb => cb.checked = false);
                activeSearchQuery = '';
                window.history.pushState({}, '', window.location.pathname);
                if (globalSearchInput) globalSearchInput.value = '';
                filterProducts();
            });
        }
        filterProducts();
    }

    // ======== 6. Product Detail Page (PDP) Logic ========
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

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
    const mainImage = document.getElementById('current-image');
    if (thumbnails.length > 0 && mainImage) {
        thumbnails.forEach(thumb => {
            thumb.addEventListener('click', () => {
                thumbnails.forEach(t => t.classList.remove('active-thumb'));
                thumb.classList.add('active-thumb');
                mainImage.src = thumb.src;
            });
        });
    }

    // ======== 7. Trust Center Logic ========
    const disclosureBtn = document.getElementById('btn-disclosure');
    if (disclosureBtn) {
        disclosureBtn.addEventListener('click', () => window.location.href = "mailto:security@medicore.com?subject=Vulnerability%20Disclosure");
    }

    const params = new URLSearchParams(window.location.search);

    if (params.get('success') === '1') {
        const popup = document.getElementById('success-popup');

        if (popup) {
            popup.classList.remove('hidden');
        }

        // 🔥 remove ?success=1 after showing
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    function closePopup() {
        const popup = document.getElementById('success-popup');
        if (popup) {
            popup.classList.add('hidden');
        }
    }
    console.log("%cMediCore Systems Engaged", "color: #d4af37; font-size: 20px; font-weight: bold;");
});
// ✅ GLOBAL FUNCTION (FIXES BUTTON)
window.closePopup = function () {
    const popup = document.getElementById('success-popup');
    if (popup) {
        popup.classList.add('hidden');
    }
};