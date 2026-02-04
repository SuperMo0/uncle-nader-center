/**
 * Ammonader Cart Script
 * سنتر عمو نادر - Cart functionality for Shopify
 */

var Shopify = Shopify || {};

Shopify.money_format = 'LE {{amount}}';

Shopify.formatMoney = function (cents, format) {
    if (typeof cents == 'string') {
        cents = cents.replace('.', '');
    }
    var value = '';
    var placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
    var formatString = format || this.money_format;

    function defaultOption(opt, def) {
        return typeof opt == 'undefined' ? def : opt;
    }

    function formatWithDelimiters(number, precision, thousands, decimal) {
        precision = defaultOption(precision, 2);
        thousands = defaultOption(thousands, ',');
        decimal = defaultOption(decimal, '.');

        if (isNaN(number) || number == null) {
            return 0;
        }

        number = (number / 100.0).toFixed(precision);

        var parts = number.split('.'),
            dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands),
            cents = parts[1] ? decimal + parts[1] : '';

        return dollars + cents;
    }

    switch (formatString.match(placeholderRegex)[1]) {
        case 'amount':
            value = formatWithDelimiters(cents, 2);
            break;
        case 'amount_no_decimals':
            value = formatWithDelimiters(cents, 0);
            break;
        case 'amount_with_comma_separator':
            value = formatWithDelimiters(cents, 2, '.', ',');
            break;
        case 'amount_no_decimals_with_comma_separator':
            value = formatWithDelimiters(cents, 0, '.', ',');
            break;
    }

    return formatString.replace(placeholderRegex, value);
};

/**
 * Toggle Loading State
 * Disables/Enables inputs and buttons within the cart item row
 */
function toggleRowLoading(row, isLoading) {
    row.classList.toggle('is-loading', isLoading);
    const inputs = row.querySelectorAll('input, button, a');
    inputs.forEach(el => {
        if (isLoading) {
            el.setAttribute('disabled', 'disabled');
            el.style.pointerEvents = 'none';
        } else {
            el.removeAttribute('disabled');
            el.style.pointerEvents = '';
        }
    });
    row.style.opacity = isLoading ? '0.6' : '1';
    row.style.transition = 'opacity 0.2s ease';
}

/**
 * Update Cart Counter in header
 */
function updateCartCounter(cart) {
    document.querySelectorAll('.cart-count').forEach(function (el) {
        el.innerText = cart.item_count;
    });
}

/**
 * Add to Cart - AJAX
 * Used by product page to add items to cart
 */
function addToCart(variantId, quantity, button) {
    // Set loading state if button provided
    if (button) {
        button.classList.add('is-loading');
        button.disabled = true;
        const originalText = button.innerHTML;
        button.innerHTML = '<span class="ammo-spinner"></span> جاري الإضافة...';
        button.dataset.originalText = originalText;
    }

    return fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id: variantId,
            quantity: quantity
        })
    })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw err; });
            }
            return response.json();
        })
        .then(item => {
            // Fetch updated cart
            return fetch('/cart.js').then(r => r.json());
        })
        .then(cart => {
            updateCartCounter(cart);

            // Show success message
            showCartNotification('تمت الإضافة للسلة بنجاح!', 'success');

            // Reset button
            if (button) {
                button.classList.remove('is-loading');
                button.disabled = false;
                button.innerHTML = button.dataset.originalText || 'أضف للسلة';
            }

            return cart;
        })
        .catch(error => {
            console.error('Error adding to cart:', error);
            showCartNotification(error.description || 'حدث خطأ أثناء الإضافة للسلة', 'error');

            // Reset button
            if (button) {
                button.classList.remove('is-loading');
                button.disabled = false;
                button.innerHTML = button.dataset.originalText || 'أضف للسلة';
            }

            throw error;
        });
}

/**
 * Show cart notification
 */
function showCartNotification(message, type) {
    // Remove existing notification
    const existing = document.querySelector('.ammo-cart-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `ammo-cart-notification ammo-cart-notification--${type}`;
    notification.innerHTML = `
    <span>${message}</span>
    <button onclick="this.parentElement.remove()" aria-label="إغلاق">&times;</button>
  `;
    document.body.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.classList.add('ammo-cart-notification--fade');
            setTimeout(() => notification.remove(), 300);
        }
    }, 3000);
}

/**
 * Update Line Item Quantity
 * Performs the API fetch and handles success/error
 */
function updateLineItemQty(el) {
    const row = el.closest('.js--cart-item');
    const key = el.dataset.key;
    let quantity = parseInt(el.value);
    const errorEl = row.querySelector('.cart-item__error-text');

    if (isNaN(quantity) || quantity < 0) return;

    // Reset error state
    if (errorEl) {
        errorEl.style.display = 'none';
        errorEl.textContent = '';
    }

    // Capture old value for revert logic
    const oldValue = el.defaultValue;

    // Check Max / Inventory Limit
    const max = parseInt(el.max);
    if (!isNaN(max) && quantity > max) {
        quantity = max;
        el.value = max;

        if (errorEl) {
            errorEl.textContent = `متاح فقط ${max} قطع.`;
            errorEl.style.display = 'block';
        }
    }

    // Lock UI
    toggleRowLoading(row, true);

    const data = {
        id: key,
        quantity: quantity,
    };

    fetch('/cart/change.js', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
        .then((response) => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then((cart) => {
            // Update the default value to the new successful value
            el.defaultValue = quantity;

            if (quantity === 0) {
                row.remove();
                // Check if cart is now empty
                if (cart.item_count === 0) {
                    const cartContent = document.querySelector('#cart-content');
                    if (cartContent) {
                        cartContent.innerHTML = '<p class="cart-empty">السلة فارغة</p>';
                    }
                }
            } else {
                // Find the updated item to get the new line price
                const item = cart.items.find(i => i.key === key);
                if (item) {
                    row.querySelectorAll('.js--cart-item-total').forEach(totalEl => {
                        totalEl.innerHTML = Shopify.formatMoney(item.final_line_price);
                    });
                }
            }

            // Update Global Cart Totals
            document.querySelectorAll('.js--cart-total').forEach(totalEl => {
                totalEl.innerHTML = Shopify.formatMoney(cart.total_price);
            });

            // Update Cart Counter (Header)
            updateCartCounter(cart);
        })
        .catch((error) => {
            console.error('Error updating cart:', error);
            el.value = oldValue;

            if (errorEl) {
                errorEl.textContent = 'حدث خطأ أثناء تحديث السلة. تم استعادة الكمية السابقة.';
                errorEl.style.display = 'block';
            }
        })
        .finally(() => {
            if (document.body.contains(row)) {
                toggleRowLoading(row, false);
                if (document.activeElement !== el) el.focus();
            }
        });
}

/**
 * Debounce Handler (for manual typing)
 * Prevents firing request on every keystroke
 */
function debouncedQtyHandler(el) {
    if (el.dataset.debounceTimer) {
        clearTimeout(parseInt(el.dataset.debounceTimer));
    }
    el.dataset.debounceTimer = setTimeout(() => {
        updateLineItemQty(el);
    }, 500);
}

/**
 * Stepper Handler (for +/- buttons)
 * Updates UI immediately then calls debounced handler
 */
function qtyStepperHandler(el, type) {
    let newVal = parseInt(el.value);
    const maxVal = el.hasAttribute('max') ? parseInt(el.getAttribute('max')) : 999;

    if (type === '+') {
        if (newVal < maxVal) {
            newVal += 1;
        } else {
            const row = el.closest('.js--cart-item');
            const errorEl = row.querySelector('.cart-item__error-text');
            if (errorEl) {
                errorEl.textContent = `متاح فقط ${maxVal} قطع.`;
                errorEl.style.display = 'block';
            }
            return;
        }
    } else if (newVal > 0) {
        newVal -= 1;
        const row = el.closest('.js--cart-item');
        const errorEl = row.querySelector('.cart-item__error-text');
        if (errorEl) errorEl.style.display = 'none';
    }

    el.value = newVal;
    debouncedQtyHandler(el);
}
