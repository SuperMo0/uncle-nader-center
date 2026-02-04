/**
 * Ammonader Product Page Script
 * سنتر عمو نادر - Product page functionality
 */

(function () {
    'use strict';

    // Product data will be injected from the Liquid template
    let productData = null;
    let currentVariant = null;

    /**
     * Initialize product page
     */
    function initProductPage() {
        const productSection = document.querySelector('[data-product-section]');
        if (!productSection) return;

        // Get product data from script tag
        const productDataScript = document.getElementById('product-json');
        if (productDataScript) {
            try {
                productData = JSON.parse(productDataScript.textContent);
                currentVariant = productData.variants.find(v => v.available) || productData.variants[0];
            } catch (e) {
                console.error('Error parsing product data:', e);
                return;
            }
        }

        initGallery();
        initVariantSelectors();
        initQuantitySelector();
        initAddToCart();
        initTabs();
    }

    /**
     * Initialize image gallery
     */
    function initGallery() {
        const mainImage = document.querySelector('.ammo-product__main-image img');
        const thumbnails = document.querySelectorAll('.ammo-product__thumbnail');

        if (!mainImage || !thumbnails.length) return;

        thumbnails.forEach(thumb => {
            thumb.addEventListener('click', function () {
                const newSrc = this.dataset.src;
                const newSrcset = this.dataset.srcset || '';

                // Update main image
                mainImage.src = newSrc;
                if (newSrcset) mainImage.srcset = newSrcset;

                // Update active state
                thumbnails.forEach(t => t.classList.remove('is-active'));
                this.classList.add('is-active');
            });

            // Keyboard accessibility
            thumb.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.click();
                }
            });
        });

        // Image zoom on hover (optional)
        const zoomContainer = document.querySelector('.ammo-product__main-image');
        if (zoomContainer && zoomContainer.dataset.zoom === 'true') {
            initImageZoom(zoomContainer, mainImage);
        }
    }

    /**
     * Image zoom functionality
     */
    function initImageZoom(container, image) {
        container.addEventListener('mousemove', function (e) {
            const rect = container.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            image.style.transformOrigin = `${x}% ${y}%`;
        });

        container.addEventListener('mouseenter', function () {
            image.style.transform = 'scale(1.5)';
        });

        container.addEventListener('mouseleave', function () {
            image.style.transform = 'scale(1)';
        });
    }

    /**
     * Initialize variant selectors (color swatches & size buttons)
     */
    function initVariantSelectors() {
        const colorOptions = document.querySelectorAll('.ammo-product__color-swatch');
        const sizeOptions = document.querySelectorAll('.ammo-product__size-btn');

        // Color option click handler
        colorOptions.forEach(swatch => {
            swatch.addEventListener('click', function () {
                if (this.classList.contains('is-disabled')) return;

                colorOptions.forEach(s => s.classList.remove('is-selected'));
                this.classList.add('is-selected');

                updateSelectedVariant();
                updateVariantImage(this.dataset.optionValue);
            });
        });

        // Size option click handler
        sizeOptions.forEach(btn => {
            btn.addEventListener('click', function () {
                if (this.classList.contains('is-disabled')) return;

                sizeOptions.forEach(b => b.classList.remove('is-selected'));
                this.classList.add('is-selected');

                updateSelectedVariant();
            });
        });
    }

    /**
     * Update selected variant based on current option selections
     */
    function updateSelectedVariant() {
        if (!productData) return;

        const selectedOptions = getSelectedOptions();

        const variant = findVariantFromOptions(selectedOptions);


        if (variant) {
            currentVariant = variant;
            updateVariantUI(variant);
            updateAvailability(selectedOptions);
        }
    }

    /**
     * Get currently selected options
     */
    function getSelectedOptions() {
        const options = [];

        // Get selected color
        const selectedColor = document.querySelector('.ammo-product__color-swatch.is-selected');
        if (selectedColor) {
            options.push(selectedColor.dataset.optionValue);
        }

        // Get selected size
        const selectedSize = document.querySelector('.ammo-product__size-btn.is-selected');
        if (selectedSize) {
            options.push(selectedSize.dataset.optionValue);
        }

        return options;
    }

    /**
     * Find variant from selected options
     */
    function findVariantFromOptions(options) {
        if (!productData || !productData.variants) return null;
        return productData.variants.find(variant => {
            return options.every((option, index) => {
                return variant.options.find(o => {
                    return o === option;
                });
            });
        });

    }

    /**
     * Update variant availability (grey out unavailable combinations)
     */
    function updateAvailability(selectedOptions) {
        if (!productData) return;

        // Update size availability based on selected color
        const selectedColor = selectedOptions[0];
        if (selectedColor) {
            const sizeButtons = document.querySelectorAll('.ammo-product__size-btn');
            sizeButtons.forEach(btn => {
                const sizeValue = btn.dataset.optionValue;
                const variantExists = productData.variants.find(v =>
                    (
                        v.options[0] === selectedColor &&
                        v.options[1] === sizeValue && v.available
                    )
                    ||
                    (
                        v.options[1] === selectedColor &&
                        v.options[0] === sizeValue && v.available
                    )
                );

                if (variantExists) {
                    btn.classList.remove('is-disabled');
                } else {
                    btn.classList.add('is-disabled');
                }
            });
        }
    }

    /**
     * Update UI when variant changes
     */
    function updateVariantUI(variant) {
        const priceEl = document.querySelector('.ammo-product__price');
        const comparePriceEl = document.querySelector('.ammo-product__compare-price');
        const discountBadge = document.querySelector('.ammo-product__discount-badge');

        if (priceEl) {
            priceEl.textContent = Shopify.formatMoney(variant.price);
        }

        if (comparePriceEl) {
            if (variant.compare_at_price && variant.compare_at_price > variant.price) {
                comparePriceEl.textContent = Shopify.formatMoney(variant.compare_at_price);
                comparePriceEl.style.display = 'inline';

                if (discountBadge) {
                    const discount = Math.round((1 - variant.price / variant.compare_at_price) * 100);
                    discountBadge.textContent = `خصم ${discount}%`;
                    discountBadge.style.display = 'inline-block';
                }
            } else {
                comparePriceEl.style.display = 'none';
                if (discountBadge) discountBadge.style.display = 'none';
            }
        }

        // Update add to cart button
        const addToCartBtn = document.querySelector('.ammo-product__add-btn');
        const variantIdInput = document.querySelector('input[name="id"]');

        if (addToCartBtn) {
            if (variant.available) {
                addToCartBtn.disabled = false;
                addToCartBtn.textContent = 'أضف للسلة';
            } else {
                addToCartBtn.disabled = true;
                addToCartBtn.textContent = 'غير متوفر';
            }
        }

        if (variantIdInput) {
            variantIdInput.value = variant.id;
        }

        // Update URL
        const url = new URL(window.location.href);
        url.searchParams.set('variant', variant.id);
        window.history.replaceState({}, '', url);
    }

    /**
     * Update main image when color variant changes
     */
    function updateVariantImage(colorValue) {
        if (!productData) return;

        // Find variant with this color that has a featured image
        const variantWithImage = productData.variants.find(v =>
            v.options[0] === colorValue && v.featured_image
        );

        if (variantWithImage && variantWithImage.featured_image) {
            const mainImage = document.querySelector('.ammo-product__main-image img');
            if (mainImage) {
                mainImage.src = variantWithImage.featured_image.src;
            }

            // Update thumbnail active state
            const thumbnails = document.querySelectorAll('.ammo-product__thumbnail');
            thumbnails.forEach(thumb => {
                thumb.classList.remove('is-active');
                if (thumb.dataset.src === variantWithImage.featured_image.src) {
                    thumb.classList.add('is-active');
                }
            });
        }
    }

    /**
     * Initialize quantity selector
     */
    function initQuantitySelector() {
        const quantityContainer = document.querySelector('.ammo-product__quantity');
        if (!quantityContainer) return;

        const minusBtn = quantityContainer.querySelector('[data-qty-minus]');
        const plusBtn = quantityContainer.querySelector('[data-qty-plus]');
        const input = quantityContainer.querySelector('input[name="quantity"]');

        if (!minusBtn || !plusBtn || !input) return;

        const min = parseInt(input.min) || 1;
        const max = parseInt(input.max) || 999;

        minusBtn.addEventListener('click', () => {
            const currentVal = parseInt(input.value) || 1;
            if (currentVal > min) {
                input.value = currentVal - 1;
            }
        });

        plusBtn.addEventListener('click', () => {
            const currentVal = parseInt(input.value) || 1;
            if (currentVal < max) {
                input.value = currentVal + 1;
            }
        });

        // Validate on blur
        input.addEventListener('blur', () => {
            let val = parseInt(input.value) || min;
            val = Math.max(min, Math.min(max, val));
            input.value = val;
        });
    }

    /**
     * Initialize add to cart functionality
     */
    function initAddToCart() {
        const form = document.querySelector('.ammo-product__form');
        if (!form) return;

        form.addEventListener('submit', function (e) {
            e.preventDefault();

            const variantId = form.querySelector('input[name="id"]').value;
            const quantity = 1;
            const addBtn = form.querySelector('.ammo-product__add-btn');

            if (variantId && typeof addToCart === 'function') {
                addToCart(parseInt(variantId), quantity, addBtn);
            }

            console.log('here');

        });
    }

    /**
     * Initialize tabs/accordion
     */
    function initTabs() {
        const tabButtons = document.querySelectorAll('.ammo-product__tab-btn');
        const tabPanels = document.querySelectorAll('.ammo-product__tab-panel');

        tabButtons.forEach(btn => {
            btn.addEventListener('click', function () {
                const targetId = this.dataset.tab;

                // Update button states
                tabButtons.forEach(b => b.classList.remove('is-active'));
                this.classList.add('is-active');

                // Update panel visibility
                tabPanels.forEach(panel => {
                    if (panel.id === targetId) {
                        panel.classList.add('is-active');
                    } else {
                        panel.classList.remove('is-active');
                    }
                });
            });
        });

        // Accordion for mobile
        const accordionHeaders = document.querySelectorAll('.ammo-product__accordion-header');
        accordionHeaders.forEach(header => {
            header.addEventListener('click', function () {
                const item = this.closest('.ammo-product__accordion-item');
                const isOpen = item.classList.contains('is-open');

                // Close all items
                document.querySelectorAll('.ammo-product__accordion-item').forEach(i => {
                    i.classList.remove('is-open');
                });

                // Toggle current
                if (!isOpen) {
                    item.classList.add('is-open');
                }
            });
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initProductPage);
    } else {
        initProductPage();
    }

    // Expose for external use if needed
    window.AmmonaderProduct = {
        init: initProductPage,
        updateVariant: updateSelectedVariant
    };

})();
