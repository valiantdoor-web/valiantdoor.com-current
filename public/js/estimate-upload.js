// Instant estimate photo upload flow (no build step / no third-party CDN).
//
// On submit the browser:
//   1. Downscales each selected photo with a canvas (keeps requests small and
//      well under the serverless body limit, and speeds up mobile uploads).
//   2. Uploads each photo to /api/estimate-photo (stored in private Blob).
//   3. Posts the text fields + photo pathnames to /api/estimate, which emails
//      the photos to the office and forwards the lead to Housecall Pro.
//   4. Fires the Google Ads conversion, then redirects to /thank-you.
//
// Progressive enhancement: if anything fails, the customer sees the office
// phone number so they are never blocked.
(function () {
  'use strict';

  var MAX_PHOTOS = 6;
  var MAX_DIMENSION = 1600;
  var JPEG_QUALITY = 0.85;
  var MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
  var PHONE = '(925) 409-4974';

  var form = document.querySelector('form[data-estimate-upload]');
  if (!form) return;

  var button = form.querySelector('[type="submit"]');
  var originalLabel = button ? button.textContent : 'Submit';
  var status = ensureStatusEl();

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    run().catch(function (err) {
      console.log('[v0] estimate-upload: unexpected error', err && err.message);
      fail('Sorry, something went wrong.');
    });
  });

  async function run() {
    clearError();

    var fields = collectFields();
    if (!fields.phone && !fields.email) {
      fail('Please add a phone number or email so we can reach you.');
      return;
    }

    var fileInput = form.querySelector('input[type="file"]');
    var files = fileInput && fileInput.files ? Array.prototype.slice.call(fileInput.files) : [];
    if (files.length > MAX_PHOTOS) {
      fail('Please select ' + MAX_PHOTOS + ' photos or fewer.');
      return;
    }

    setBusy(true);

    var pathnames = [];
    for (var i = 0; i < files.length; i++) {
      setStatus('Uploading photo ' + (i + 1) + ' of ' + files.length + '...');
      try {
        var prepared = await preparePhoto(files[i]);
        var pathname = await uploadPhoto(prepared);
        if (pathname) pathnames.push(pathname);
      } catch (err) {
        console.log('[v0] estimate-upload: photo failed', err && err.message);
        setBusy(false);
        fail('We could not upload "' + (files[i].name || 'a photo') + '". Please try a JPG or PNG.');
        return;
      }
    }

    setStatus('Sending your request...');
    var payload = {
      name: fields.name,
      phone: fields.phone,
      email: fields.email,
      problem_type: fields.problem_type,
      city: fields.city,
      notes: fields.notes,
      source: window.location.href,
      photoPathnames: pathnames
    };

    var result;
    try {
      var resp = await fetch('/api/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      });
      result = await resp.json().catch(function () {
        return { ok: resp.ok };
      });
    } catch (err) {
      console.log('[v0] estimate-upload: finalize error', err && err.message);
      setBusy(false);
      fail('Your photos uploaded, but sending failed.');
      return;
    }

    if (!result || !result.ok) {
      setBusy(false);
      fail((result && result.error) || 'We could not submit your request.');
      return;
    }

    setStatus('Sent! Redirecting...');
    fireConversionThen(function () {
      window.location.href = '/thank-you';
    });
  }

  function collectFields() {
    var data = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || el.disabled || el.type === 'file') return;
      if ((el.type === 'checkbox' || el.type === 'radio') && !el.checked) return;
      data[el.name] = el.value;
    });
    return data;
  }

  // Downscale a photo to a JPEG and return { filename, contentType, dataBase64 }.
  // Falls back to the original bytes if the image cannot be decoded.
  async function preparePhoto(file) {
    try {
      var bitmap = await loadBitmap(file);
      var scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
      var w = Math.max(1, Math.round(bitmap.width * scale));
      var h = Math.max(1, Math.round(bitmap.height * scale));

      var canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0, w, h);
      if (bitmap.close) bitmap.close();

      var dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
      var base64 = dataUrl.split(',')[1] || '';
      if (base64) {
        return {
          filename: renameToJpg(file.name),
          contentType: 'image/jpeg',
          dataBase64: base64
        };
      }
    } catch (err) {
      console.log('[v0] estimate-upload: downscale failed, using original', err && err.message);
    }

    // Fallback: send original bytes if the type/size are acceptable.
    var type = (file.type || '').toLowerCase();
    if (['image/jpeg', 'image/png', 'image/webp'].indexOf(type) === -1) {
      throw new Error('unsupported_type');
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error('too_large');
    }
    var raw = await fileToBase64(file);
    return { filename: file.name || 'photo', contentType: type, dataBase64: raw };
  }

  async function uploadPhoto(prepared) {
    var resp = await fetch('/api/estimate-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(prepared)
    });
    var json = await resp.json().catch(function () {
      return { ok: resp.ok };
    });
    if (!json || !json.ok || !json.pathname) {
      throw new Error((json && json.error) || 'upload_failed');
    }
    return json.pathname;
  }

  function loadBitmap(file) {
    if (window.createImageBitmap) {
      return window.createImageBitmap(file);
    }
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('decode_failed'));
      };
      img.src = url;
    });
  }

  function fileToBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var res = String(reader.result || '');
        resolve(res.split(',')[1] || '');
      };
      reader.onerror = function () {
        reject(new Error('read_failed'));
      };
      reader.readAsDataURL(file);
    });
  }

  function renameToJpg(name) {
    var base = String(name || 'photo').replace(/\.(jpe?g|png|webp|heic|heif)$/i, '');
    return (base || 'photo') + '.jpg';
  }

  function fireConversionThen(done) {
    var finished = false;
    var finish = function () {
      if (finished) return;
      finished = true;
      done();
    };
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'ads_conversion_Submit_lead_form_1', {
        event_callback: finish,
        event_timeout: 1500
      });
      window.setTimeout(finish, 1500);
    } else {
      finish();
    }
  }

  function setBusy(busy) {
    if (button) {
      button.disabled = busy;
      if (busy) button.textContent = 'Sending...';
      else button.textContent = originalLabel;
    }
  }

  function ensureStatusEl() {
    var el = document.createElement('p');
    el.className = 'estimate-status';
    el.setAttribute('aria-live', 'polite');
    el.style.marginTop = '0.75rem';
    el.style.minHeight = '1.2em';
    form.appendChild(el);
    return el;
  }

  function setStatus(msg) {
    if (status) {
      status.style.color = 'inherit';
      status.textContent = msg;
    }
  }

  function clearError() {
    if (status) status.textContent = '';
  }

  function fail(message) {
    setBusy(false);
    if (status) {
      status.style.color = '#b00020';
      status.setAttribute('role', 'alert');
      status.textContent = message + ' You can also call us at ' + PHONE + '.';
    }
  }
})();
