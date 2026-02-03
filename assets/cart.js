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

/*
 * HELPER: Toggle Loading State
 * Disables/Enables inputs and buttons within the cart item row
 */
function toggleRowLoading(row, isLoading) {
    row.classList.toggle('is-loading', isLoading);
    const inputs = row.querySelectorAll('input, button, a');
    inputs.forEach(el => {
        if (isLoading) {
            el.setAttribute('disabled', 'disabled');
            // If it's a link or button, prevent pointer events just in case
            el.style.pointerEvents = 'none';
        } else {
            el.removeAttribute('disabled');
            el.style.pointerEvents = '';
        }
    });
    // Add visual cue
    row.style.opacity = isLoading ? '0.6' : '1';
    row.style.transition = 'opacity 0.2s ease';
}

async function checkAvailable(variant_id) {

    try {
        let response = await fetch("/products/cozy-cotton-sweatpants.js");
        let data = await response.text();
        console.log(data);
    } catch (error) {
        console.log(error);
    }

}

/*
 * UPDATE ITEM QUANTITY
 * Performs the API fetch and handles success/error
 */
function updateLineItemQty(el) {
    const row = el.closest('.js--cart-item');
    const key = el.dataset.key;
    const quantity = parseInt(el.value);

    // 1. Validation
    if (isNaN(quantity) || quantity < 0) return;

    // 2. Capture old value for revert logic
    // defaultValue stores the value before user interaction started or last successful save
    const oldValue = el.defaultValue;

    // 3. Lock UI
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
            // SUCCESS HANDLING

            // Update the default value to the new successful value
            el.defaultValue = quantity;

            if (quantity === 0) {
                row.remove();
                // Check if cart is now empty
                if (cart.item_count === 0) {
                    document.querySelector('#cart-content').innerHTML = emptyCartHtml;
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
            // ERROR HANDLING: Revert value
            console.error('Error updating cart:', error);
            el.value = oldValue;
            alert('There was a problem updating your cart. The quantity has been reverted.');
        })
        .finally(() => {
            // UNLOCK UI (if row typically exists)
            if (document.body.contains(row)) {
                toggleRowLoading(row, false);
                // Refocus input for accessibility/User flow
                if (document.activeElement !== el) el.focus();
            }
        });
}

/*
 * DEBOUNCE HANDLER (for manual typing)
 * Prevents firing request on every keystroke
 */
function debouncedQtyHandler(el) {
    if (el.dataset.debounceTimer) {
        clearTimeout(parseInt(el.dataset.debounceTimer));
    }
    el.dataset.debounceTimer = setTimeout(() => {
        updateLineItemQty(el);
    }, 500); // 500ms wait time
}

/*
 * STEPPER HANDLER (for +/- buttons)
 * Updates UI immediately then calls debounced handler
 */
function qtyStepperHandler(el, type) {
    let newVal = parseInt(el.value);

    if (type === '+') {
        newVal += 1;
    } else if (newVal > 0) {
        newVal -= 1;
    }

    el.value = newVal;
    debouncedQtyHandler(el);
}

function updateCartCounter(cart) {
    document.querySelectorAll('.cart-count').forEach(function (el) {
        el.innerText = cart.item_count;
    });
}