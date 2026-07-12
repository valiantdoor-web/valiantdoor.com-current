// Customer lead capture -> Housecall Pro (via /api/lead).
// Replaces the former SureFire Local / promio.com form hijack.
// Progressive enhancement: if JS or the API fails, the form still submits
// normally to /thank-you so the customer is never blocked.
(function () {
  'use strict';

  var forms = document.querySelectorAll('form[action="/thank-you"]');
  if (!forms.length) return;

  Array.prototype.forEach.call(forms, function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var button = form.querySelector('[type="submit"]');
      var originalLabel = button ? button.textContent : '';
      if (button) {
        button.disabled = true;
        button.textContent = 'Sending...';
      }

      // Collect text fields; skip file inputs (photos can't be forwarded to
      // the lead API), but record whether any were selected.
      var data = { source: window.location.href };
      var hasPhotos = false;
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name || el.disabled) return;
        if (el.type === 'file') {
          if (el.files && el.files.length) hasPhotos = true;
          return;
        }
        if ((el.type === 'checkbox' || el.type === 'radio') && !el.checked) return;
        data[el.name] = el.value;
      });
      if (hasPhotos) data.photos = true;

      fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
      })
        .then(function (res) {
          return res.json().catch(function () {
            return { ok: res.ok };
          });
        })
        .then(function (result) {
          if (result && result.ok) {
            window.location.href = '/thank-you';
          } else {
            showError(form, button, originalLabel, result && result.error);
          }
        })
        .catch(function () {
          showError(form, button, originalLabel);
        });
    });
  });

  function showError(form, button, originalLabel, message) {
    if (button) {
      button.disabled = false;
      button.textContent = originalLabel || 'Submit';
    }
    var existing = form.querySelector('.lead-error');
    if (!existing) {
      existing = document.createElement('p');
      existing.className = 'lead-error';
      existing.setAttribute('role', 'alert');
      existing.style.color = '#b00020';
      existing.style.marginTop = '0.75rem';
      form.appendChild(existing);
    }
    existing.textContent =
      (message || 'Sorry, something went wrong sending your request.') +
      ' You can also call us at (925) 409-4974.';
  }
})();
