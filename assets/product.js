document.addEventListener('DOMContentLoaded', function () {
  const sectionId = document.querySelector('.product-variants') ? document.querySelector('.product-variants').dataset.section : document.querySelector('[id^="ProductJSON-"]').id.replace('ProductJSON-', '');
  const productJsonScript = document.getElementById(`ProductJSON-${sectionId}`);

  if (!productJsonScript) return;

  const productJson = JSON.parse(productJsonScript.textContent);
  const radioInputs = document.querySelectorAll('.js-variant-radio');

  // Add change listeners
  radioInputs.forEach(radio => {
    radio.addEventListener('change', handleVariantChange);
  });

  // Check for add to cart form submission
  const form = document.getElementById('product-form-installment');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      const submitBtn = form.querySelector('[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.setAttribute('disabled', 'disabled');
      submitBtn.textContent = 'جاري الإضافة...';

      const formData = new FormData(form);

      fetch('/cart/add.js', {
        method: 'POST',
        body: formData
      })
        .then(response => {
          return response.json();
        })
        .then(data => {
          // Fetch fresh cart count
          fetch('/cart.js')
            .then(res => res.json())
            .then(cart => {
              // Update cart counter using global function if available
              if (typeof updateCartCounter === 'function') {
                updateCartCounter(cart);
              } else {
                // Fallback: look for generic selector
                const counters = document.querySelectorAll('.cart-count');
                counters.forEach(el => el.textContent = cart.item_count);
              }
            });

          // Provide feedback (optional: shake or change text back)
          submitBtn.textContent = 'تمت الإضافة بنجاح';
          setTimeout(() => {
            submitBtn.removeAttribute('disabled');
            submitBtn.textContent = originalText;
          }, 2000);
        })
        .catch(error => {
          console.error('Error:', error);
          submitBtn.removeAttribute('disabled');
          submitBtn.textContent = originalText;
          alert('حدث خطأ. حاول مرة أخرى.');
        });
    });
  }

  function handleVariantChange() {
    // 1. Get current options
    const fieldsets = document.querySelectorAll('.product-form__input');
    const options = Array.from(fieldsets).map(fieldset => {
      return fieldset.querySelector('input:checked').value;
    });

    // 2. Find matching variant
    const currentVariant = productJson.find(variant => {
      return !variant.options.map((option, index) => {
        return options[index] === option;
      }).includes(false);
    });

    if (currentVariant) {
      updateUI(currentVariant);
      updateURL(currentVariant);
    }
  }

  function updateUI(variant) {
    // Update ID Input
    const input = document.getElementById(`MasterId-${sectionId}`);
    if (input) input.value = variant.id;

    // Update Price
    const priceContainer = document.getElementById(`Price-${sectionId}`);
    if (priceContainer) {
      if (typeof Shopify !== 'undefined' && Shopify.formatMoney) {
        priceContainer.innerHTML = Shopify.formatMoney(variant.price);
      } else {
        priceContainer.innerHTML = (variant.price / 100).toFixed(2) + ' LE';
      }
    }

    // Update Image
    if (variant.featured_media) {
      const img = document.getElementById(`ProductImage-${sectionId}`);
      if (img) {
        img.src = variant.featured_media.src.replace('http:', 'https:');
      }
    }

    // Update Button State
    const btn = document.getElementById(`Submit-${sectionId}`);
    if (btn) {
      if (variant.available) {
        btn.removeAttribute('disabled');
        btn.textContent = 'أضف إلى السلة';
      } else {
        btn.setAttribute('disabled', 'disabled');
        btn.textContent = 'نفذت الكمية';
      }
    }
  }

  function updateURL(variant) {
    if (!variant) return;
    const url = new URL(window.location);
    url.searchParams.set('variant', variant.id);
    window.history.replaceState({}, '', url);
  }

});

// Quantity Stepper Global Function
function updateProductQty(change) {
  // Find the input relative to the clicked button or use ID if unique per section (safe for single product page)
  // We used ID Quantity-{{ section.id }}
  const input = document.querySelector('.input-stepper__input');
  if (!input) return;

  let val = parseInt(input.value) || 1;
  val += change;

  if (val < 1) val = 1;
  input.value = val;
}