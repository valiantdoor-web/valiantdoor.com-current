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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
