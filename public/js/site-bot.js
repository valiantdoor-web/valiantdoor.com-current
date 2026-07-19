/*
 * Standalone Botpress webchat loader.
 * Use on pages that must NOT receive the shared site header/footer chrome
 * (e.g. the standalone /business-card NFC page). Behaviour matches the
 * bot initializer in global-chrome.js: idempotent, timeout + retry safe.
 */
(function () {
  "use strict";

  var INJECT_URL = "https://cdn.botpress.cloud/webchat/v3.6/inject.js";
  var CONFIG_URL = "https://files.bpcontent.cloud/2026/05/01/11/20260501112742-4945ZV3N.js";
  var MAX_ATTEMPTS = 3;
  var LOAD_TIMEOUT = 12000;
  var started = false;

  function findScript(url) {
    var scripts = document.getElementsByTagName("script");
    for (var i = 0; i < scripts.length; i += 1) {
      if (scripts[i].src && scripts[i].src.split("?")[0] === url) return scripts[i];
    }
    return null;
  }

  function loadScript(url, id, attempt) {
    return new Promise(function (resolve, reject) {
      var existing = findScript(url);
      if (existing && existing.dataset.valiantLoaded === "true") {
        resolve(existing);
        return;
      }

      var script = existing || document.createElement("script");
      var timer = window.setTimeout(function () {
        reject(new Error(id + " timed out"));
      }, LOAD_TIMEOUT);

      var finish = function () {
        window.clearTimeout(timer);
        script.dataset.valiantLoaded = "true";
        resolve(script);
      };
      var fail = function () {
        window.clearTimeout(timer);
        script.remove();
        reject(new Error(id + " failed to load"));
      };

      script.addEventListener("load", finish, { once: true });
      script.addEventListener("error", fail, { once: true });

      if (!existing) {
        script.id = id;
        script.src = url + (attempt > 1 ? "?retry=" + attempt : "");
        script.async = false;
        script.crossOrigin = "anonymous";
        document.body.appendChild(script);
      } else if (url === INJECT_URL && window.botpress) {
        finish();
      }
    });
  }

  function botIsMounted() {
    return Boolean(
      document.querySelector('iframe[src*="botpress"], #bp-web-widget-container, [data-botpress-webchat]')
    );
  }

  function start() {
    if (started || botIsMounted()) return Promise.resolve();
    started = true;

    var attempt = 0;
    function tryOnce() {
      attempt += 1;
      return Promise.resolve()
        .then(function () {
          if (!window.botpress) return loadScript(INJECT_URL, "valiant-botpress-runtime", attempt);
        })
        .then(function () {
          if (!window.botpress) throw new Error("Botpress runtime unavailable");
          if (!botIsMounted()) {
            var staleConfig = findScript(CONFIG_URL);
            if (staleConfig && staleConfig.dataset.valiantLoaded !== "true") staleConfig.remove();
            return loadScript(CONFIG_URL, "valiant-botpress-config", attempt);
          }
        })
        .catch(function () {
          if (attempt >= MAX_ATTEMPTS) return;
          return new Promise(function (resolve) {
            window.setTimeout(resolve, attempt * 1000);
          }).then(tryOnce);
        });
    }
    return tryOnce();
  }

  // Add accessible names to the Botpress chat widget images (injected at runtime).
  // Fixes Lighthouse "image without [alt]" and "ARIA role should be appropriate".
  function patchBotpressA11y() {
    var label = function (img, text) {
      if (!img || img.dataset.valiantA11y === "true") return;
      img.setAttribute("alt", text);
      img.setAttribute("aria-label", text);
      img.dataset.valiantA11y = "true";
    };
    var patch = function () {
      var fab = document.querySelectorAll("img.bpFabImage");
      for (var i = 0; i < fab.length; i += 1) label(fab[i], "Open chat with Valiant Garage Door");
      var av = document.querySelectorAll("img.bpMessagePreviewAvatarImage");
      for (var j = 0; j < av.length; j += 1) label(av[j], "Valiant Garage Door chat assistant");
    };
    patch();
    var observer = new MutationObserver(patch);
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(function () {
      observer.disconnect();
    }, 60000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      start();
      patchBotpressA11y();
    }, { once: true });
  } else {
    start();
    patchBotpressA11y();
  }
})();
