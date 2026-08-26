const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector(".site-nav");
const GOOGLE_REVIEW_URL = "https://search.google.com/local/writereview?placeid=ChIJreu0MBcWcgMRQnyWHvhS94w";
const FONT_STYLESHEET_HREF = "https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Inter:wght@300;400;500;600;700&display=swap";
const HOUSECALL_PRO_BOOK_URL = "https://book.housecallpro.com/book/Valiant-garage-door/ae8e4a137c8c49b4b264073541533a7a?v2=true";
const CALLTRACKING_SCRIPT_SRC = "https://app.800.com/calltracking/index.js?token=OFdsQlpNcWtkdi9PUy93a3hHeUkwdz09&backend=https://api.800.com/";
const HOUSECALL_PRO_EXECUTE_CODE_CARD = {
  blocks: [
    {
      "@type": "@builder.io/sdk:Element",
      id: "builder-monck51o0yikess0qhda",
      tagName: "div",
      meta: { naturalWidth: 0 },
      responsiveStyles: {
        large: {
          display: "",
          fontFamily: "Inter, Roboto, Helvetica, Arial, sans-serif",
          fontSize: "13px",
          fontWeight: "400",
          fontStyle: "normal",
          lineHeight: "normal",
          letterSpacing: "normal",
        },
        medium: {
          fontFamily: "",
          fontSize: "",
          fontWeight: "",
          fontStyle: "",
          lineHeight: "",
          letterSpacing: "",
        },
      },
      properties: {},
      children: [],
    },
  ],
};

const loadFontsNonBlocking = () => {
  if (!document.head || document.querySelector('link[data-valiant-fonts="stylesheet"]')) return;

  const ensurePreconnect = (href, crossOrigin = false) => {
    if (document.querySelector(`link[rel="preconnect"][href="${href}"]`)) return;
    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = href;
    if (crossOrigin) link.crossOrigin = "anonymous";
    document.head.appendChild(link);
  };

  ensurePreconnect("https://fonts.googleapis.com");
  ensurePreconnect("https://fonts.gstatic.com", true);

  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = FONT_STYLESHEET_HREF;
  stylesheet.media = "print";
  stylesheet.dataset.valiantFonts = "stylesheet";
  stylesheet.onload = () => {
    stylesheet.media = "all";
  };
  document.head.appendChild(stylesheet);
};

loadFontsNonBlocking();

document.querySelectorAll("a.nav-social-google").forEach((link) => {
  link.href = GOOGLE_REVIEW_URL;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
});

if (navToggle && siteNav) {
  navToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });

  siteNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      siteNav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });
}

const swipePageOrder = ["/", "/services", "/gallery", "/quote"];

const normalizePath = (path) => {
  const trimmed = String(path || "").replace(/\/+$/, "");
  return trimmed || "/";
};

const isDesktopSwipeMode = () =>
  window.matchMedia("(min-width: 981px) and (hover: hover) and (pointer: fine)").matches;

const isMobileSwipeMode = () =>
  window.matchMedia("(max-width: 980px) and (pointer: coarse)").matches;

const isInteractiveTarget = (target) =>
  target instanceof Element &&
  Boolean(target.closest("input, textarea, select, button, a, video, iframe, gmp-map, gmpx-place-picker, [contenteditable=\"true\"], [data-photo-album], [data-no-page-swipe]"));

const setupPageSwipe = () => {
  if (!swipePageOrder.includes(normalizePath(window.location.pathname))) return;

  let isNavigating = false;
  let touchStartX = 0;
  let touchStartY = 0;
  let touchSwipeArmed = false;

  const navigateBy = (direction) => {
    if (isNavigating) return;
    const currentIndex = swipePageOrder.indexOf(normalizePath(window.location.pathname));
    if (currentIndex === -1) return;

    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= swipePageOrder.length) return;

    isNavigating = true;
    window.location.assign(swipePageOrder[targetIndex]);
  };

  window.addEventListener(
    "wheel",
    (event) => {
      if (!isDesktopSwipeMode() || isInteractiveTarget(event.target)) return;
      if (Math.abs(event.deltaX) < 70 || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;

      event.preventDefault();
      navigateBy(event.deltaX > 0 ? 1 : -1);
    },
    { passive: false }
  );

  window.addEventListener(
    "touchstart",
    (event) => {
      if (!isMobileSwipeMode() || event.touches.length !== 1 || isInteractiveTarget(event.target) || siteNav?.classList.contains("is-open")) {
        touchSwipeArmed = false;
        return;
      }

      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
      touchSwipeArmed = true;
    },
    { passive: true }
  );

  window.addEventListener(
    "touchend",
    (event) => {
      if (!touchSwipeArmed || !isMobileSwipeMode() || event.changedTouches.length !== 1) return;

      touchSwipeArmed = false;
      const deltaX = event.changedTouches[0].clientX - touchStartX;
      const deltaY = event.changedTouches[0].clientY - touchStartY;

      if (Math.abs(deltaX) < 80 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.2 || Math.abs(deltaY) > 160) return;

      navigateBy(deltaX < 0 ? 1 : -1);
    },
    { passive: true }
  );

  window.addEventListener(
    "touchcancel",
    () => {
      touchSwipeArmed = false;
    },
    { passive: true }
  );
};

setupPageSwipe();

const setupAddressSelectionHousecallLink = () => {
  const actionButton = document.querySelector("gmpx-icon-button");
  if (!actionButton || actionButton.dataset.housecallBound === "true") return;

  actionButton.dataset.housecallBound = "true";
  actionButton.setAttribute("role", "link");
  actionButton.setAttribute("tabindex", "0");
  actionButton.setAttribute("aria-label", "Book Free Estimate Instantly with Housecall Pro");

  const openHousecall = () => {
    window.open(HOUSECALL_PRO_BOOK_URL, "_blank", "noopener,noreferrer");
  };

  actionButton.addEventListener("click", openHousecall);
  actionButton.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openHousecall();
  });
};

setupAddressSelectionHousecallLink();

const getTrustedScriptURL = (url) => {
  const trustedTypesApi = window.trustedTypes;
  if (!trustedTypesApi?.createPolicy) return url;

  if (!window.__valiantTrustedTypesPolicy) {
    try {
      window.__valiantTrustedTypesPolicy = trustedTypesApi.createPolicy("valiant#scripts", {
        createScriptURL: (value) => value,
      });
    } catch (error) {
      if (typeof trustedTypesApi.getPolicy === "function") {
        window.__valiantTrustedTypesPolicy = trustedTypesApi.getPolicy("valiant#scripts");
      }
    }
  }

  return window.__valiantTrustedTypesPolicy?.createScriptURL(url) || url;
};

const loadExternalScript = (url, { defer = false, async = true } = {}) =>
  new Promise((resolve, reject) => {
    const selector = `script[src="${url}"]`;
    const existing = document.querySelector(selector);
    if (existing) {
      if (existing.dataset.valiantLoaded === "true" || existing.readyState === "complete") {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${url}`)), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = getTrustedScriptURL(url);
    script.async = async;
    script.defer = defer;
    script.dataset.valiantManaged = "true";
    script.addEventListener(
      "load",
      () => {
        script.dataset.valiantLoaded = "true";
        resolve();
      },
      { once: true }
    );
    script.addEventListener("error", () => reject(new Error(`Failed to load ${url}`)), { once: true });
    (document.body || document.head || document.documentElement).appendChild(script);
  });

let hasInitializedBotpressEnhancements = false;

const initializeBotpressEnhancements = () => {
  if (hasInitializedBotpressEnhancements) return;
  hasInitializedBotpressEnhancements = true;
  watchBotpressFabSize();
  window.addEventListener("resize", injectBotpressFabSize, { passive: true });
  setupBotpressFallbackAssistant();
};

// The floating chat launcher itself now lives entirely in global-chrome.js
// (#valiant-chat-fab), which is loaded on every page. This used to also have
// a separate, older shield+label launcher (setupBotpressShell) defined here,
// but both launchers rendered simultaneously (stacked, overlapping icons with
// clipped text in the bottom-right corner) since neither knew about the
// other. The duplicate legacy launcher has been removed; global-chrome.js's
// launcher calls window.__valiantInitBotpressEnhancements() (exposed below)
// once it starts loading Botpress, so FAB sizing and the fallback assistant
// still activate regardless of which code path triggers the load.
window.__valiantInitBotpressEnhancements = initializeBotpressEnhancements;

const setupDeferredThirdPartyScripts = () => {
  if (!document.body?.classList.contains("page-home")) return;

  let hasLoadedCallTracking = false;

  const loadCallTracking = () => {
    if (hasLoadedCallTracking) return;
    hasLoadedCallTracking = true;
    interactionEvents.forEach(([eventName, options]) => {
      window.removeEventListener(eventName, loadCallTracking, options);
    });
    loadExternalScript(CALLTRACKING_SCRIPT_SRC);
  };

  const interactionEvents = [
    ["pointerdown", { passive: true, capture: true }],
    ["touchstart", { passive: true, capture: true }],
    ["wheel", { passive: true, capture: true }],
    ["keydown", { capture: true }],
    ["scroll", { passive: true, capture: true }],
  ];

  interactionEvents.forEach(([eventName, options]) => {
    window.addEventListener(eventName, loadCallTracking, { ...options, once: true });
  });
};

const setupDeferredHomeHousecallEmbeds = () => {
  const embedIframes = Array.from(document.querySelectorAll("iframe[data-housecall-src]"));
  if (!embedIframes.length) return;

  embedIframes.forEach((iframe) => {
    const shell = iframe.parentElement?.querySelector('[data-housecall-shell]');

    const hydrateEmbed = () => {
      const src = iframe.dataset.housecallSrc;
      if (!src || iframe.getAttribute("src")) return;
      iframe.src = src;
      iframe.removeAttribute("data-housecall-src");
      iframe.hidden = false;
      if (shell instanceof HTMLElement) shell.hidden = true;
    };

    iframe.hidden = true;

    if (shell instanceof HTMLElement) {
      const button = shell.querySelector('[data-housecall-load]');
      button?.addEventListener('click', hydrateEmbed);
      shell.addEventListener('click', (event) => {
        if (event.target instanceof HTMLElement && event.target.closest('[data-housecall-load]')) return;
        hydrateEmbed();
      });
    }
  });
};


const setupDeferredHomepageTracking = () => {
  if (!document.body?.classList.contains("page-home")) return;
  if (window.__valiantHomepageTrackingDeferred === true) return;
  window.__valiantHomepageTrackingDeferred = true;

  const loadScriptOnce = (src, attrs = {}) =>
    new Promise((resolve) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = getTrustedScriptURL(src);
      script.async = true;
      Object.entries(attrs).forEach(([key, value]) => {
        script.setAttribute(key, value);
      });
      script.addEventListener("load", () => resolve(true), { once: true });
      script.addEventListener("error", () => resolve(false), { once: true });
      (document.head || document.documentElement).appendChild(script);
    });

  const loadBingUet = (tagId) => {
    window.uetq = window.uetq || [];
    window.uetq.push("consent", "default", { ad_storage: "denied" });
    window.uetq.push("consent", "update", { ad_storage: "granted" });
    return loadScriptOnce(`https://bat.bing.net/bat.js?ti=${tagId}`);
  };

  const sendMicrosoftAdsWebhook = () => {
    const endpoint = "https://webhook.botpress.cloud/beb5c93d-f23f-4fed-a204-fe2186a1fd9c";
    const payload = JSON.stringify({
      event: "microsoft_ads_page_view",
      page_url: window.location.href,
      page_path: window.location.pathname,
      page_title: document.title,
      referrer: document.referrer || "",
      timestamp: new Date().toISOString(),
    });
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(endpoint, payload)) return;
      fetch(endpoint, { method: "POST", mode: "no-cors", keepalive: true, body: payload }).catch(() => {});
    } catch (error) {}
  };

  let loaded = false;
  let fallbackTimer = null;

  const loadTracking = () => {
    if (loaded) return;
    loaded = true;
    if (fallbackTimer) {
      window.clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }
    trackingEvents.forEach(([eventName, options]) => {
      window.removeEventListener(eventName, loadTracking, options);
    });

    window.clarity = window.clarity || function clarity() {
      (window.clarity.q = window.clarity.q || []).push(arguments);
    };

    Promise.allSettled([
      loadScriptOnce("https://www.googletagmanager.com/gtm.js?id=GTM-WPJ77LQ8"),
      loadScriptOnce("https://www.clarity.ms/tag/xbiv7tx2p3"),
      loadBingUet("187249335"),
      loadBingUet("187250229"),
    ]).finally(sendMicrosoftAdsWebhook);
  };

  const trackingEvents = [
    ["pointerdown", { passive: true, capture: true }],
    ["touchstart", { passive: true, capture: true }],
    ["keydown", { capture: true }],
  ];

  trackingEvents.forEach(([eventName, options]) => {
    window.addEventListener(eventName, loadTracking, { ...options, once: true });
  });

  fallbackTimer = window.setTimeout(loadTracking, 8000);
};

setupDeferredHomepageTracking();

const setupProjectMapShells = () => {
  const iframes = Array.from(document.querySelectorAll('.valiant-project-map-iframe[data-project-map-src]'));
  if (!iframes.length) return;
  iframes.forEach((iframe) => {
    const shell = iframe.parentElement?.querySelector('[data-project-map-shell]');
    const hydrate = () => {
      const src = iframe.dataset.projectMapSrc;
      if (!src || iframe.getAttribute('src')) return;
      iframe.src = src;
      iframe.removeAttribute('data-project-map-src');
      iframe.hidden = false;
      if (shell instanceof HTMLElement) shell.hidden = true;
    };
    const button = shell?.querySelector('[data-project-map-load]');
    button?.addEventListener('click', hydrate);
    shell?.addEventListener('click', (event) => {
      if (event.target instanceof HTMLElement && event.target.closest('[data-project-map-load]')) return;
      hydrate();
    });
  });
};

setupProjectMapShells();

setupDeferredHomeHousecallEmbeds();
setupDeferredThirdPartyScripts();

const setupPhotoAlbum = () => {
  const album = document.querySelector("[data-photo-album]");
  if (!album) return;

  const track = album.querySelector("[data-photo-album-track]");
  const slides = Array.from(album.querySelectorAll("[data-photo-album-slide]"));
  const thumbButtons = Array.from(album.querySelectorAll("[data-photo-album-thumb]"));
  const counter = album.querySelector("[data-photo-album-counter]");
  const navButtons = Array.from(album.querySelectorAll("[data-photo-album-nav]"));
  if (!track || !slides.length) return;

  const clampIndex = (index) => Math.max(0, Math.min(index, slides.length - 1));
  let activeIndex = 0;
  let rafId = null;

  const updateAlbum = (index, options = {}) => {
    const { shouldScroll = true } = options;
    activeIndex = clampIndex(index);

    slides.forEach((slide, slideIndex) => {
      slide.classList.toggle("is-active", slideIndex === activeIndex);
      slide.setAttribute("aria-hidden", slideIndex === activeIndex ? "false" : "true");
    });

    thumbButtons.forEach((button, buttonIndex) => {
      const isActive = buttonIndex === activeIndex;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-current", isActive ? "true" : "false");
    });

    if (counter) {
      counter.textContent = `${activeIndex + 1} / ${slides.length}`;
    }

    if (shouldScroll) {
      track.scrollTo({
        left: activeIndex * track.clientWidth,
        behavior: "smooth",
      });
    }
  };

  const updateFromScrollPosition = () => {
    if (!track.clientWidth) return;
    const nextIndex = clampIndex(Math.round(track.scrollLeft / track.clientWidth));
    if (nextIndex !== activeIndex) {
      updateAlbum(nextIndex, { shouldScroll: false });
    }
  };

  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const direction = Number(button.dataset.photoAlbumNav || 0);
      updateAlbum(activeIndex + direction);
    });
  });

  thumbButtons.forEach((button, index) => {
    button.addEventListener("click", () => updateAlbum(index));
  });

  track.addEventListener(
    "scroll",
    () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateFromScrollPosition);
    },
    { passive: true }
  );

  track.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      updateAlbum(activeIndex + 1);
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      updateAlbum(activeIndex - 1);
    }
  });

  window.addEventListener("resize", () => updateAlbum(activeIndex, { shouldScroll: true }));

  updateAlbum(0, { shouldScroll: false });
};

setupPhotoAlbum();

let extendedGoogleMapsLibraryPromise = null;

const loadExtendedGoogleMapsLibrary = () => {
  if (!window.customElements) return Promise.resolve(false);
  if (window.customElements.get("gmp-map") && window.customElements.get("gmpx-place-picker")) {
    return Promise.resolve(true);
  }

  if (!extendedGoogleMapsLibraryPromise) {
    extendedGoogleMapsLibraryPromise = new Promise((resolve) => {
      const existingScript = document.querySelector("[data-google-extended-maps]");
      if (existingScript instanceof HTMLScriptElement) {
        if (window.customElements.get("gmp-map") && window.customElements.get("gmpx-place-picker")) {
          resolve(true);
          return;
        }
        existingScript.addEventListener("load", () => resolve(true), { once: true });
        existingScript.addEventListener("error", () => resolve(false), { once: true });
        return;
      }

      // Load the Google Maps web-component bundle only when the service-area map is
      // near view so the homepage hero and core copy are not competing with map JS.
      const script = document.createElement("script");
      script.type = "module";
      script.src = "https://ajax.googleapis.com/ajax/libs/@googlemaps/extended-component-library/0.6.11/index.min.js";
      script.dataset.googleExtendedMaps = "true";
      script.addEventListener("load", () => resolve(true), { once: true });
      script.addEventListener("error", () => resolve(false), { once: true });
      document.head.appendChild(script);
    });
  }

  return extendedGoogleMapsLibraryPromise;
};

const waitForCustomElement = (tagName, timeoutMs = 8000) => {
  if (!window.customElements) return Promise.resolve(false);
  if (window.customElements.get(tagName)) return Promise.resolve(true);

  return Promise.race([
    window.customElements.whenDefined(tagName).then(() => true),
    new Promise((resolve) => window.setTimeout(() => resolve(false), timeoutMs)),
  ]);
};

const waitForMapDemand = (mapElement) =>
  new Promise((resolve) => {
    let settled = false;

    const cleanup = () => {
      window.removeEventListener("scroll", maybeResolve);
      window.removeEventListener("resize", maybeResolve);
      mapElement.removeEventListener("pointerenter", resolveNow);
      mapElement.removeEventListener("touchstart", resolveNow);
      mapElement.removeEventListener("focusin", resolveNow);
      mapElement.removeEventListener("click", resolveNow);
    };

    const resolveNow = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };

    const maybeResolve = () => {
      const rect = mapElement.getBoundingClientRect();
      if (rect.top <= window.innerHeight + 48 && rect.bottom >= -48) {
        resolveNow();
      }
    };

    // Keep the map library out of first paint. We only load it when users scroll
    // near the service-area section or interact with the map card itself.
    window.addEventListener("scroll", maybeResolve, { passive: true });
    window.addEventListener("resize", maybeResolve, { passive: true });
    mapElement.addEventListener("pointerenter", resolveNow, { once: true });
    mapElement.addEventListener("touchstart", resolveNow, { once: true, passive: true });
    mapElement.addEventListener("focusin", resolveNow, { once: true });
    mapElement.addEventListener("click", resolveNow, { once: true });
  });

const setupServiceAreaMap = async () => {
  const mapElement = document.querySelector("[data-service-area-map]");
  if (!mapElement || !window.customElements) return;

  try {
    await waitForMapDemand(mapElement);

    const libraryLoaded = await loadExtendedGoogleMapsLibrary();
    if (!libraryLoaded) return;

    const [mapDefined, pickerDefined] = await Promise.all([
      waitForCustomElement("gmp-map"),
      waitForCustomElement("gmpx-place-picker"),
    ]);
    if (!mapDefined || !pickerDefined) return;

    const marker = mapElement.querySelector("gmp-advanced-marker");
    const placePicker = mapElement.querySelector("gmpx-place-picker");
    if (!marker || !placePicker || !mapElement.innerMap || !window.google?.maps?.InfoWindow) return;

    const defaultLocation = { lat: 37.6805, lng: -121.9284 };
    const infoWindow = new google.maps.InfoWindow();

    mapElement.innerMap.setOptions({
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    marker.position = defaultLocation;

    placePicker.addEventListener("gmpx-placechange", () => {
      const place = placePicker.value;
      if (!place?.location) {
        infoWindow.close();
        marker.position = defaultLocation;
        mapElement.center = defaultLocation;
        mapElement.zoom = 10;
        return;
      }

      if (place.viewport) {
        mapElement.innerMap.fitBounds(place.viewport);
      } else {
        mapElement.center = place.location;
        mapElement.zoom = 16;
      }

      marker.position = place.location;
      infoWindow.setContent(
        `<strong>${place.displayName || "Selected location"}</strong><br><span>${place.formattedAddress || ""}</span>`
      );
      infoWindow.open(mapElement.innerMap, marker);
    });
  } catch (error) {
    console.warn("Service area map could not be initialized.", error);
  }
};

setupServiceAreaMap();

const revealItems = document.querySelectorAll("[data-reveal]");
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );

  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("revealed"));
}

const encodeForm = (form) => new URLSearchParams(new FormData(form));

const handleFormSubmit = (form, messages) => {
  const status = form.querySelector(".form-status");
  const submitButton = form.querySelector("button[type=\"submit\"]");

  form.addEventListener("submit", async (event) => {
    if (!form.action) return;
    event.preventDefault();

    if (status) {
      status.textContent = messages.loading;
      status.classList.remove("is-error", "is-success");
    }
    if (submitButton) submitButton.disabled = true;

    try {
      const response = await fetch(form.action, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body: encodeForm(form),
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      if (status) {
        status.textContent = messages.success;
        status.classList.add("is-success");
      }
      form.reset();
    } catch (error) {
      if (status) {
        status.textContent = messages.error;
        status.classList.add("is-error");
      }
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
};

const reviewForm = document.querySelector("#review-form");
if (reviewForm) {
  handleFormSubmit(reviewForm, {
    loading: "Submitting your review...",
    success: "Thanks! Reviews are posted after verification.",
    error: "Unable to submit. Please try again in a moment.",
  });
}

const reviewsList = document.querySelector("#reviews-list");
const createStar = (filled) => {
  const star = document.createElement("span");
  star.className = filled ? "star filled" : "star";
  return star;
};

const renderReviews = (reviews) => {
  if (!reviewsList) return;
  reviewsList.innerHTML = "";

  if (!reviews.length) {
    const empty = document.createElement("p");
    empty.className = "reviews-empty";
    empty.textContent = "No reviews yet. Be the first to share your experience.";
    reviewsList.appendChild(empty);
    return;
  }

  reviews.forEach((review) => {
    const card = document.createElement("article");
    card.className = "review-card";

    const meta = document.createElement("div");
    meta.className = "review-meta";

    const name = document.createElement("span");
    name.textContent = review.name;

    const stars = document.createElement("div");
    stars.className = "stars";
    const rating = Number(review.rating) || 0;
    for (let i = 1; i <= 5; i += 1) {
      stars.appendChild(createStar(i <= rating));
    }

    meta.appendChild(name);
    meta.appendChild(stars);

    const location = document.createElement("div");
    location.className = "review-location";
    location.textContent = review.city ? review.city : "";

    const body = document.createElement("p");
    body.className = "review-body";
    body.textContent = review.message;

    card.appendChild(meta);
    if (review.city) card.appendChild(location);
    card.appendChild(body);

    reviewsList.appendChild(card);
  });
};

const loadReviews = async () => {
  if (!reviewsList) return;
  try {
    const response = await fetch("/api/reviews", {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error("Failed");
    const data = await response.json();
    renderReviews(Array.isArray(data.reviews) ? data.reviews : []);
  } catch (error) {
    if (!reviewsList) return;
    reviewsList.innerHTML = "";
    const empty = document.createElement("p");
    empty.className = "reviews-empty";
    empty.textContent = "Reviews will appear here soon.";
    reviewsList.appendChild(empty);
  }
};

const BOTPRESS_FAB_IMAGE_SRC = "/assets/valiant-bot-widget-static-shield-20260629.png";
const BOTPRESS_FAB_PATH = window.location.pathname.replace(/\/+$/, "") || "/";
const BOTPRESS_FAB_SCALE = BOTPRESS_FAB_PATH === "/services" ? 2 : 1;
const BOTPRESS_FAB_WRAPPER_SIZE = 192 * BOTPRESS_FAB_SCALE;
const BOTPRESS_FAB_IMAGE_HEIGHT = 186 * BOTPRESS_FAB_SCALE;
const BOTPRESS_FAB_IMAGE_MAX = 190 * BOTPRESS_FAB_SCALE;
const BOTPRESS_FAB_ICON_WIDTH = 176 * BOTPRESS_FAB_SCALE;
const BOTPRESS_FAB_MOBILE_WRAPPER_SIZE = 122;
const BOTPRESS_FAB_MOBILE_IMAGE_HEIGHT = 118;
const BOTPRESS_FAB_MOBILE_IMAGE_MAX = 120;
const BOTPRESS_FAB_MOBILE_ICON_WIDTH = 116;
const isBotpressFabMobile = () => window.matchMedia("(max-width: 760px)").matches;

const BOTPRESS_FAB_SIZE_STYLE = `
    .bpFab,
    .bpFabWrapper,
    #fab-root {
      width: ${BOTPRESS_FAB_WRAPPER_SIZE}px !important;
      height: ${BOTPRESS_FAB_WRAPPER_SIZE}px !important;
    }

    .bpFabImage,
    img.bpFabImage,
    img[role="button"] {
      width: auto !important;
      height: ${BOTPRESS_FAB_IMAGE_HEIGHT}px !important;
      max-width: ${BOTPRESS_FAB_IMAGE_MAX}px !important;
      max-height: ${BOTPRESS_FAB_IMAGE_MAX}px !important;
      object-fit: contain !important;
      transform: none !important;
    }

    .bpFabIcon {
      width: ${BOTPRESS_FAB_ICON_WIDTH}px !important;
      height: ${BOTPRESS_FAB_IMAGE_HEIGHT}px !important;
      max-width: ${BOTPRESS_FAB_IMAGE_MAX}px !important;
      max-height: ${BOTPRESS_FAB_IMAGE_MAX}px !important;
    }

    @media (max-width: 760px) {
      .bpFab,
      .bpFabWrapper,
      #fab-root {
        width: ${BOTPRESS_FAB_MOBILE_WRAPPER_SIZE}px !important;
        height: ${BOTPRESS_FAB_MOBILE_WRAPPER_SIZE}px !important;
        right: 2px !important;
        bottom: 2px !important;
      }

      .bpFabImage,
      img.bpFabImage,
      img[role="button"] {
        height: ${BOTPRESS_FAB_MOBILE_IMAGE_HEIGHT}px !important;
        max-width: ${BOTPRESS_FAB_MOBILE_IMAGE_MAX}px !important;
        max-height: ${BOTPRESS_FAB_MOBILE_IMAGE_MAX}px !important;
      }

      .bpFabIcon {
        width: ${BOTPRESS_FAB_MOBILE_ICON_WIDTH}px !important;
        height: ${BOTPRESS_FAB_MOBILE_IMAGE_HEIGHT}px !important;
        max-width: ${BOTPRESS_FAB_MOBILE_IMAGE_MAX}px !important;
        max-height: ${BOTPRESS_FAB_MOBILE_IMAGE_MAX}px !important;
      }

      .bpWebchat.bpOpen,
      .bpWebchat.bpOpen.bpFABWebchat {
        left: 8px !important;
        right: 8px !important;
        top: 60px !important;
        bottom: 8px !important;
        width: calc(100vw - 16px) !important;
        max-width: calc(100vw - 16px) !important;
        height: calc(100dvh - 68px) !important;
        max-height: calc(100dvh - 68px) !important;
      }

      .bpWebchat.bpOpen .bpContainer,
      .bpWebchat.bpOpen .bpHeaderContainer,
      .bpWebchat.bpOpen .bpHeaderContentContainer,
      .bpWebchat.bpOpen .bpMessageListContainer,
      .bpWebchat.bpOpen .bpComposerContainer {
        width: 100% !important;
        max-width: 100% !important;
      }

      .bpWebchat.bpOpen .bpHeaderContentActionsIcons,
      .bpWebchat.bpOpen svg[aria-label="Close Chatbot Button"] {
        flex-shrink: 0 !important;
      }
    }
  `;

const injectBotpressFabSize = () => {
  let foundTarget = false;

  const appendStyle = (root) => {
    if (!root || root.querySelector('#valiant-botpress-fab-size')) return;
    const style = document.createElement('style');
    style.id = 'valiant-botpress-fab-size';
    style.textContent = BOTPRESS_FAB_SIZE_STYLE;
    root.appendChild(style);
  };

  const tuneFabImages = (root) => {
    const isMobile = isBotpressFabMobile();
    const wrapperSize = isMobile ? BOTPRESS_FAB_MOBILE_WRAPPER_SIZE : BOTPRESS_FAB_WRAPPER_SIZE;
    const imageHeight = isMobile ? BOTPRESS_FAB_MOBILE_IMAGE_HEIGHT : BOTPRESS_FAB_IMAGE_HEIGHT;
    const imageMax = isMobile ? BOTPRESS_FAB_MOBILE_IMAGE_MAX : BOTPRESS_FAB_IMAGE_MAX;

    root.querySelectorAll('.bpFab, .bpFabWrapper, #fab-root').forEach((fab) => {
      fab.style.setProperty('width', `${wrapperSize}px`, 'important');
      fab.style.setProperty('height', `${wrapperSize}px`, 'important');
      if (isMobile) {
        fab.style.setProperty('right', '0', 'important');
        fab.style.setProperty('bottom', '0', 'important');
      }
    });

    root.querySelectorAll('.bpFabImage, img.bpFabImage, img[role="button"]').forEach((img) => {
      if (!(img instanceof HTMLImageElement)) return;
      img.src = BOTPRESS_FAB_IMAGE_SRC;
      img.style.setProperty('width', 'auto', 'important');
      img.style.setProperty('height', `${imageHeight}px`, 'important');
      img.style.setProperty('max-width', `${imageMax}px`, 'important');
      img.style.setProperty('max-height', `${imageMax}px`, 'important');
      img.style.setProperty('object-fit', 'contain', 'important');
      img.style.setProperty('transform', 'none', 'important');
    });
  };

  const visitRoot = (root) => {
    if (!root || !root.querySelectorAll) return;
    if (root.querySelector('.bpFab, .bpFabWrapper, .bpFabImage, img[role="button"]')) {
      foundTarget = true;
      appendStyle(root.head || root);
      tuneFabImages(root);
    }

    root.querySelectorAll('*').forEach((node) => {
      if (!node.shadowRoot) return;
      visitRoot(node.shadowRoot);
    });
  };

  if (document.head) appendStyle(document.head);
  visitRoot(document);

  return foundTarget;
};

const canObserveNode = (node) => typeof Node === "function" && node instanceof Node;

const watchBotpressFabSize = () => {
  if (injectBotpressFabSize()) return;
  if (!canObserveNode(document.documentElement)) return;

  const stopWatching = () => {
    observer.disconnect();
    window.clearInterval(interval);
  };

  const retry = () => {
    if (!injectBotpressFabSize()) return;
    stopWatching();
  };

  const observer = new MutationObserver(retry);
  const interval = window.setInterval(retry, 250);

  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setTimeout(stopWatching, 15000);
};


const HCP_BOOK_URL = "https://book.housecallpro.com/book/Valiant-Garage-Door/ae8e4a137c8c49b4b264073541533a7a?v2=true";
const VALIANT_PHONE = "(925) 409-4974";
const VALIANT_BOOK_CTA = " Book Free Estimate Instantly: " + HCP_BOOK_URL + " or call " + VALIANT_PHONE + ".";

const createValiantBotFallbackReply = (messageText) => {
  const t = String(messageText || "").toLowerCase();

  // Service areas
  if (/\b(areas?|serve|service areas?|city|cities|where|location|cover)\b/.test(t)) {
    return "Valiant Garage Door serves Pleasanton, Dublin, Livermore, Fremont, San Ramon, Danville, Sunol, Pleasant Hill, Alamo, Blackhawk, Castro Valley, Hayward, Newark, and nearby East Bay communities." + VALIANT_BOOK_CTA;
  }

  // Emergency / urgent
  if (/\b(emergency|stuck|trapped|off.?track|won'?t close|won'?t open|broken cable|unsafe|urgent|now|asap|help)\b/.test(t)) {
    return "If your garage door is stuck, off track, unsafe, or will not open or close, stop using it immediately. Do not force the door or opener. Valiant Garage Door offers same-day emergency repair across the East Bay. Call " + VALIANT_PHONE + " right now or book emergency service instantly: " + HCP_BOOK_URL;
  }

  // Springs
  if (/\b(spring|springs|torsion|extension|snapped|heavy|broke.*spring)\b/.test(t)) {
    return "Broken garage door spring? Do not force the door. Valiant Garage Door handles torsion and extension spring replacement with balance and safety testing. Spring repair typically runs $159 to $249 depending on type and size. Most repairs take 30 to 60 minutes." + VALIANT_BOOK_CTA;
  }

  // Cables
  if (/\b(cable|cables|snapped cable|frayed)\b/.test(t)) {
    return "A snapped or frayed garage door cable is a safety hazard. Stop using the door and keep it closed. Valiant Garage Door replaces cables same-day across the East Bay." + VALIANT_BOOK_CTA;
  }

  // Openers
  if (/\b(opener|remote|keypad|sensor|motor|liftmaster|genie|chamberlain|chain|belt|drive)\b/.test(t)) {
    return "Valiant Garage Door repairs and installs LiftMaster, Chamberlain, and Genie openers. Services include diagnostics, remotes, keypads, safety sensors, travel limits, force settings, and motor replacement. New opener installation starts at $229 for standard overhead and $249 for wall-mount." + VALIANT_BOOK_CTA;
  }

  // Pricing
  if (/\b(price|cost|quote|estimate|how much|rate|fee|charge|pricing)\b/.test(t)) {
    return "Here are typical starting prices:\n• Spring replacement: $159 to $249\n• Opener installation: $229 to $249 (starting labor)\n• Off-track repair: varies by damage\n• Cable repair: varies by door type\nFinal pricing depends on parts, door size, and labor. Get an itemized estimate with photos: " + HCP_BOOK_URL + " or call " + VALIANT_PHONE;
  }

  // Maintenance
  if (/\b(maintenance|tune.?up|inspect|lubricat|balance|tune|service|check.?up|prevent)\b/.test(t)) {
    return "Regular maintenance extends door life and prevents emergencies. Valiant Garage Door offers tune-ups including roller inspection, track alignment, lubrication, balance testing, and safety sensor checks." + VALIANT_BOOK_CTA;
  }

  // Commercial
  if (/\b(commercial|business|warehouse|industrial|storefront|loading dock|roll.?up|sectional)\b/.test(t)) {
    return "Yes, Valiant Garage Door handles commercial and light-commercial garage doors including sectional doors, rolling steel, and loading dock doors across the East Bay." + VALIANT_BOOK_CTA;
  }

  // New doors / installation
  if (/\b(install|installation|new door|replace.*door|door replacement|custom|carriage|design)\b/.test(t)) {
    return "Valiant Garage Door installs custom and new garage doors including carriage house and modern designs. We help you choose the right door for your home, handle removal of the old door, and complete installation with balance and safety testing." + VALIANT_BOOK_CTA;
  }

  // Noise
  if (/\b(noise|noisy|loud|squeak|grind|bang|rattle|sound)\b/.test(t)) {
    return "A noisy garage door usually means worn rollers, loose hardware, or lack of lubrication. Valiant Garage Door can diagnose and fix the source of the noise with a tune-up." + VALIANT_BOOK_CTA;
  }

  // Booking / appointment
  if (/\b(book|appointment|schedule|availability|today|same.?day|when|how soon|time)\b/.test(t)) {
    return "You can book instantly: " + HCP_BOOK_URL + "\nOr call " + VALIANT_PHONE + " for same-day scheduling. Most repairs are completed the same day across Pleasanton, Dublin, Livermore, Fremont, San Ramon, and nearby East Bay cities.";
  }

  // Hours
  if (/\b(hours?|open|closed|when.*available|today)\b/.test(t)) {
    return "Valiant Garage Door offers same-day and emergency repair service. Call " + VALIANT_PHONE + " for current availability or book instantly: " + HCP_BOOK_URL;
  }

  // Reviews / reputation
  if (/\b(review|reviews|rating|google|trust|reputation|experience|years)\b/.test(t)) {
    return "Valiant Garage Door has 12+ years of hands-on experience, over 10,000 garage doors serviced, and a strong Google Business Profile rating. We are licensed, insured, and trusted across the East Bay." + VALIANT_BOOK_CTA;
  }

  // Warranty
  if (/\b(warranty|guarantee|guaranteed)\b/.test(t)) {
    return "Valiant Garage Door stands behind our work. Parts and labor warranties vary by service. Ask your technician for specific warranty details on your repair." + VALIANT_BOOK_CTA;
  }

  // Contact
  if (/\b(contact|phone|call|number|email|reach|address)\b/.test(t)) {
    return "Call Valiant Garage Door at " + VALIANT_PHONE + "\nEmail: vm@valiantdoor.com\nAddress: 3588 Pimlico Dr, Pleasanton, CA 94588\nBook online: " + HCP_BOOK_URL;
  }

  // Default / general
  return "Valiant Garage Door can help with garage door repair, spring replacement, opener repair and installation, cable repair, off-track repair, maintenance and tune-ups, commercial service, custom doors, and 24/7 emergency repair across Pleasanton, Dublin, Livermore, Fremont, San Ramon, and nearby East Bay cities. Tell us your city and what is wrong with the door, or book instantly: " + HCP_BOOK_URL + " or call " + VALIANT_PHONE + ".";
};

const setupBotpressFallbackAssistant = () => {
  const processedMessages = new Set();
  const pendingMessages = new Map();

  const getBotpressShadowRoot = () => {
    const host = document.querySelector(".bpChatContainer #fab-root");
    return host?.shadowRoot || null;
  };

  const ensureFallbackStyles = (shadow) => {
    if (!shadow || shadow.querySelector("#valiant-botpress-fallback-style")) return;

    const style = document.createElement("style");
    style.id = "valiant-botpress-fallback-style";
    style.textContent = `
      .valiant-botpress-fallback-message {
        list-style: none !important;
        display: flex !important;
        justify-content: flex-start !important;
        width: 100% !important;
        margin: 10px 0 !important;
        padding: 0 17px !important;
      }

      .valiant-botpress-fallback-bubble {
        width: auto !important;
        max-width: min(302px, calc(100% - 20px)) !important;
        padding: 10px 14px !important;
        border: 1px solid rgba(255, 204, 102, 0.28) !important;
        border-radius: 14px !important;
        background: #191715 !important;
        color: #f2f1f0 !important;
        font-family: Inter, system-ui, -apple-system, sans-serif !important;
        font-size: 14px !important;
        line-height: 1.42 !important;
        box-shadow: 0 8px 18px rgba(0, 0, 0, 0.24) !important;
        white-space: pre-wrap !important;
      }

      .valiant-botpress-hcp-card {
        display: flex !important;
        flex-direction: column !important;
        gap: 10px !important;
        width: auto !important;
        max-width: min(302px, calc(100% - 20px)) !important;
        margin: 8px 0 0 !important;
        padding: 12px 14px !important;
        border: 1px solid rgba(255, 204, 102, 0.28) !important;
        border-radius: 14px !important;
        background: rgba(25, 23, 21, 0.96) !important;
        color: #f2f1f0 !important;
      }

      .valiant-botpress-hcp-card-title {
        margin: 0 !important;
        color: #ffdb94 !important;
        font-size: 12px !important;
        font-weight: 700 !important;
        letter-spacing: 0.08em !important;
        text-transform: uppercase !important;
      }

      .valiant-botpress-hcp-card-copy {
        margin: 0 !important;
        color: #f2f1f0 !important;
      }

      .valiant-botpress-hcp-card-actions {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 8px !important;
      }

      .valiant-botpress-hcp-card-actions a {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        min-height: 36px !important;
        padding: 8px 12px !important;
        border-radius: 999px !important;
        border: 1px solid rgba(255, 204, 102, 0.5) !important;
        color: #191715 !important;
        background: #ffdb94 !important;
        font-size: 12px !important;
        font-weight: 700 !important;
        text-decoration: none !important;
      }

      .valiant-botpress-hcp-card-actions a.valiant-botpress-hcp-secondary {
        color: #ffdb94 !important;
        background: transparent !important;
      }
    `;
    shadow.appendChild(style);
  };

  const createHousecallProExecuteCodeCard = () => {
    const cardBlock = HOUSECALL_PRO_EXECUTE_CODE_CARD.blocks[0] || {};
    const styles = cardBlock.responsiveStyles?.large || {};
    const card = document.createElement(cardBlock.tagName || "div");
    card.className = "valiant-botpress-hcp-card";
    card.dataset.builderId = cardBlock.id || "";
    card.dataset.builderType = cardBlock["@type"] || "";

    Object.assign(card.style, {
      fontFamily: styles.fontFamily || "",
      fontSize: styles.fontSize || "",
      fontWeight: styles.fontWeight || "",
      fontStyle: styles.fontStyle || "",
      lineHeight: styles.lineHeight || "",
      letterSpacing: styles.letterSpacing || "",
      display: styles.display || "",
    });

    const title = document.createElement("p");
    title.className = "valiant-botpress-hcp-card-title";
    title.textContent = "Housecall Pro";

    const copy = document.createElement("p");
    copy.className = "valiant-botpress-hcp-card-copy";
    copy.textContent = "Book your free estimate instantly.";

    const actions = document.createElement("div");
    actions.className = "valiant-botpress-hcp-card-actions";

    const bookLink = document.createElement("a");
    bookLink.href = HOUSECALL_PRO_BOOK_URL;
    bookLink.target = "_blank";
    bookLink.rel = "noopener noreferrer";
    bookLink.textContent = "Book Free Estimate Instantly";

    actions.appendChild(bookLink);

    card.appendChild(title);
    card.appendChild(copy);
    card.appendChild(actions);
    return card;
  };

  const getMessageViewport = (shadow) =>
    shadow?.querySelector(".bpMessageListViewport") || shadow?.querySelector(".bpMessageListContainer");

  const getLastUserMessage = (shadow) => {
    const userMessages = Array.from(shadow?.querySelectorAll(".bpMessageDeliveryStatus .bpMessageBlocksTextText") || []);
    const lastMessage = userMessages.at(-1);
    const text = lastMessage?.textContent?.trim();
    return text ? { element: lastMessage, text } : null;
  };

  const hasReplyAfterUserMessage = (viewport, userElement) => {
    if (!viewport || !userElement) return true;

    const userContainer = userElement.closest(".bpMessageContainer");
    if (!userContainer) return true;

    let node = userContainer.nextElementSibling;
    while (node) {
      const text = node.textContent?.trim() || "";
      if (text && node.matches(".bpMessageContainer:not(.bpMessageDeliveryStatus)")) {
        return true;
      }
      node = node.nextElementSibling;
    }

    return false;
  };

  const scrollMessagesToBottom = (viewport) => {
    const scrollTarget = viewport?.closest(".bpMessageListContainer") || viewport;
    if (scrollTarget && "scrollTop" in scrollTarget) {
      scrollTarget.scrollTop = scrollTarget.scrollHeight;
    }
  };

  const appendFallbackReply = (shadow, message) => {
    const viewport = getMessageViewport(shadow);
    if (!viewport || viewport.querySelector(`[data-valiant-fallback-for="${CSS.escape(message.text)}"]`)) return;
    if (hasReplyAfterUserMessage(viewport, message.element)) return;

    ensureFallbackStyles(shadow);

    const wrapper = document.createElement("div");
    wrapper.className = "valiant-botpress-fallback-message";
    wrapper.dataset.valiantFallbackFor = message.text;

    const bubble = document.createElement("div");
    bubble.className = "valiant-botpress-fallback-bubble";
    bubble.textContent = createValiantBotFallbackReply(message.text);
    const executeCodeCard = createHousecallProExecuteCodeCard();

    wrapper.appendChild(bubble);
    wrapper.appendChild(executeCodeCard);
    message.element.closest(".bpMessageContainer")?.insertAdjacentElement("afterend", wrapper);
    scrollMessagesToBottom(viewport);
  };

  const scheduleFallbackIfNeeded = () => {
    const shadow = getBotpressShadowRoot();
    const lastUserMessage = getLastUserMessage(shadow);
    if (!shadow || !lastUserMessage || processedMessages.has(lastUserMessage.text)) return;

    const viewport = getMessageViewport(shadow);
    if (hasReplyAfterUserMessage(viewport, lastUserMessage.element)) {
      processedMessages.add(lastUserMessage.text);
      pendingMessages.delete(lastUserMessage.text);
      return;
    }

    const firstSeenAt = pendingMessages.get(lastUserMessage.text) || Date.now();
    pendingMessages.set(lastUserMessage.text, firstSeenAt);
    if (Date.now() - firstSeenAt < 8000) return;

    processedMessages.add(lastUserMessage.text);
    pendingMessages.delete(lastUserMessage.text);
    appendFallbackReply(shadow, lastUserMessage);
  };

  const attachObserver = () => {
    const shadow = getBotpressShadowRoot();
    if (!canObserveNode(shadow)) return false;

    ensureFallbackStyles(shadow);
    const observer = new MutationObserver(scheduleFallbackIfNeeded);
    observer.observe(shadow, { childList: true, subtree: true, characterData: true });
    scheduleFallbackIfNeeded();
    window.setInterval(scheduleFallbackIfNeeded, 2000);
    return true;
  };

  if (attachObserver()) return;

  if (!canObserveNode(document.documentElement)) return;
  const observer = new MutationObserver(() => {
    if (!attachObserver()) return;
    observer.disconnect();
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setTimeout(() => observer.disconnect(), 15000);
};

loadReviews();
const setupDeferredGoogleMapEmbeds = () => {
  const mapFrames = Array.from(document.querySelectorAll('iframe[data-map-src]'));
  if (!mapFrames.length) return;
  const loadMapFrame = (frame) => {
    if (!frame.dataset.mapSrc || frame.dataset.mapLoaded === 'true') return;
    frame.src = frame.dataset.mapSrc;
    frame.dataset.mapLoaded = 'true';
  };
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        loadMapFrame(entry.target);
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '180px 0px' });
    mapFrames.forEach((frame) => observer.observe(frame));
    return;
  }
  mapFrames.forEach(loadMapFrame);
};

setupDeferredGoogleMapEmbeds();

const setupNextdoorClickIdStorage = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const clickId = params.get("ndclid");
    if (clickId) window.localStorage.setItem("valiant_nextdoor_click_id", clickId);
  } catch (error) {}
};

setupNextdoorClickIdStorage();

const setupNextdoorCapiLead = () => {
  if (normalizePath(window.location.pathname) !== "/thank-you") return;

  const readStorage = (storage, key) => {
    try {
      return storage.getItem(key) || "";
    } catch (error) {
      return "";
    }
  };

  const writeStorage = (storage, key, value) => {
    try {
      storage.setItem(key, value);
    } catch (error) {}
  };

  const params = new URLSearchParams(window.location.search);
  const contactInformation = params.get("contact_information") || "";
  const name = params.get("name") || "";
  const nameParts = name.trim().split(/\s+/).filter(Boolean);
  const emailFromContact = /@/.test(contactInformation) ? contactInformation : "";
  const phoneFromContact = /\d{7,}/.test(contactInformation.replace(/\D/g, "")) ? contactInformation : "";

  let externalId = readStorage(window.localStorage, "valiant_nextdoor_external_id");
  if (!externalId) {
    externalId = window.crypto?.randomUUID ? window.crypto.randomUUID() : `valiant-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    writeStorage(window.localStorage, "valiant_nextdoor_external_id", externalId);
  }

  const eventStorageKey = `valiant_nextdoor_capi_lead:${window.location.pathname}:${window.location.search}`;
  if (readStorage(window.sessionStorage, eventStorageKey)) return;

  const eventId = window.crypto?.randomUUID ? window.crypto.randomUUID() : `lead-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  writeStorage(window.sessionStorage, eventStorageKey, eventId);

  const payload = {
    event_name: "lead",
    event_id: eventId,
    action_source: "website",
    action_source_url: `${window.location.origin}${window.location.pathname}`,
    customer: {
      email: params.get("email") || emailFromContact,
      phone_number: params.get("phone") || params.get("phone_number") || phoneFromContact,
      first_name: params.get("first_name") || nameParts[0] || "",
      last_name: params.get("last_name") || nameParts.slice(1).join(" ") || "",
      date_of_birth: params.get("date_of_birth") || "",
      gender: params.get("gender") || "",
      street_address: params.get("street_address") || "",
      city: params.get("city") || "",
      state: params.get("state") || "CA",
      zip_code: params.get("zip_code") || params.get("zip") || "",
      country: params.get("country") || "US",
      external_id: externalId,
      click_id: params.get("ndclid") || readStorage(window.localStorage, "valiant_nextdoor_click_id")
    },
    custom: {
      conversion_type: "service_booking",
      booking_status: "booked",
      problem_type: params.get("problem_type") || "",
      source_path: window.location.pathname
    }
  };

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: "service_booking_complete",
    booking_status: "booked",
    traffic_source: params.get("utm_source") || "",
    problem_type: params.get("problem_type") || ""
  });

  fetch("/api/nextdoor-capi", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
    keepalive: true
  }).catch(() => {});
};

setupNextdoorCapiLead();

const setupGoogleAdsQuoteConversion = () => {
  if (normalizePath(window.location.pathname) !== "/quote") return;

  const fireLeadConversion = () => {
    if (typeof window.gtag !== "function") return;
    window.gtag("event", "ads_conversion_Submit_lead_form_1");
  };

  Array.from(
    document.querySelectorAll('a[href*="book.housecallpro.com/book/Valiant-garage-door"]')
  ).forEach((link) => {
    if (link.dataset.valiantAdsLeadBound === "true") return;
    link.dataset.valiantAdsLeadBound = "true";
    link.addEventListener("click", fireLeadConversion);
  });
};

setupGoogleAdsQuoteConversion();
