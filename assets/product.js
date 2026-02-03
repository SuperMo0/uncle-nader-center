class VariantRadios extends HTMLElement {
  constructor() {
    super();
    this.sectionId = this.dataset.section;
    this.productJson = JSON.parse(document.getElementById(`ProductJSON-${this.sectionId}`).textContent);
    this.addEventListener('change', this.onVariantChange);
  }

  onVariantChange() {
    this.updateOptions();
    this.updateMasterId();
    this.updateMedia();
    this.updatePrice();
    this.updateURL();
  }

  updateOptions() {
    this.options = Array.from(this.querySelectorAll('fieldset'), (fieldset) => {
      return Array.from(fieldset.querySelectorAll('input')).find((radio) => radio.checked).value;
    });
  }

  updateMasterId() {
    this.currentVariant = this.productJson.find((variant) => {
      return !variant.options.map((option, index) => {
        return this.options[index] === option;
      }).includes(false);
    });

    if (this.currentVariant) {
      const input = document.querySelector('input[name="id"]');
      input.value = this.currentVariant.id;
      
      // Update Button
      const btn = document.querySelector('.product-form__submit');
      if (this.currentVariant.available) {
        btn.removeAttribute('disabled');
        btn.textContent = 'أضف إلى السلة';
      } else {
        btn.setAttribute('disabled', 'disabled');
        btn.textContent = 'نفذت الكمية';
      }
    }
  }

  updateMedia() {
    if (!this.currentVariant || !this.currentVariant.featured_media) return;
    
    // Simple image switch logic
    const img = document.getElementById(`ProductImage-${this.sectionId}`);
    if (img && this.currentVariant.featured_media.src) {
        // Shopify variant image URLs differ slightly in JSON structure, ensuring protocol
        img.src = this.currentVariant.featured_media.src.replace('http:', 'https:');
    }
  }

  updatePrice() {
    if (!this.currentVariant) return;
    const priceContainer = document.getElementById(`Price-${this.sectionId}`);
    if(priceContainer) {
        // Format money using Shopify global or simple regex if not available
        if (typeof Shopify !== 'undefined' && Shopify.formatMoney) {
             priceContainer.innerHTML = Shopify.formatMoney(this.currentVariant.price);
        } else {
            // Fallback
             priceContainer.innerHTML = (this.currentVariant.price / 100).toFixed(2) + ' LE';
        }
    }
  }

  updateURL() {
    if (!this.currentVariant) return;
    window.history.replaceState({ }, '', `${this.dataset.url}?variant=${this.currentVariant.id}`);
  }
}

customElements.define('variant-radios', VariantRadios);