const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector(".site-nav");
const GOOGLE_REVIEW_URL = "https://search.google.com/local/writereview?placeid=ChIJreu0MBcWcgMRQnyWHvhS94w";

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

const setupHousecallChat = () => {
  if (!document.body || document.querySelector("#hcp-chat-prompt")) return;

  // Load the chat widget only after user intent so it does not tax LCP/INP on first paint.
  let chatLoader = null;

  const loadChatWidget = () => {
    if (chatLoader) return chatLoader;

    chatLoader = new Promise((resolve) => {
      const existingScript = document.querySelector("#housecall-pro-chat-bubble");
      if (existingScript) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.id = "housecall-pro-chat-bubble";
      script.src = "https://chat.housecallpro.com/proChat.js";
      script.type = "text/javascript";
      script.defer = true;
      script.dataset.color = "#0E6FBE";
      script.dataset.organization = "544de216-f35f-4c0b-835a-7950591bbd80";
      script.addEventListener("load", () => resolve(), { once: true });
      script.addEventListener("error", () => resolve(), { once: true });
      document.body.appendChild(script);
    });

    return chatLoader;
  };

  const prompt = document.createElement("button");
  prompt.type = "button";
  prompt.id = "hcp-chat-prompt";
  prompt.className = "hcp-chat-prompt";
  prompt.textContent = "Chat with us now";
  prompt.setAttribute("aria-label", "Open chat");

  const openChat = async () => {
    await loadChatWidget();
    window.setTimeout(() => {
      const chatTrigger = document.querySelector(
        '[aria-label*="chat" i], [class*="chat"], [id*="chat"], iframe[src*="housecallpro"], iframe[src*="prochat"]'
      );
      if (chatTrigger instanceof HTMLElement) chatTrigger.click();
      else window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }, 250);
  };

  prompt.addEventListener("click", openChat);
  prompt.addEventListener("pointerenter", loadChatWidget, { once: true });
  prompt.addEventListener("focus", loadChatWidget, { once: true });
  document.body.appendChild(prompt);
};

setupHousecallChat();

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

loadReviews();
