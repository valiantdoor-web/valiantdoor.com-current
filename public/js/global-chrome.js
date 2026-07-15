(() => {
  "use strict";

  const PHONE = "(925) 409-4974";
  const PHONE_HREF = "tel:+19254094974";
  const BOOK_URL = "https://book.housecallpro.com/book/Valiant-Garage-Door/ae8e4a137c8c49b4b264073541533a7a?v2=true";
  const currentPath = window.location.pathname.replace(/\/+$/, "") || "/";

  document.querySelectorAll("section").forEach((section) => {
    const heading = section.querySelector(":scope > h2");
    if (heading && ["Search Atlas Intent Covered", "Search Atlas Visibility Gaps Used"].includes(heading.textContent.trim())) {
      section.remove();
    }
  });

  const active = (href) => {
    if (href === "/") return currentPath === "/";
    return currentPath === href || currentPath.startsWith(`${href}/`);
  };

  const navLink = (href, label) =>
    `<a href="${href}"${active(href) ? ' aria-current="page"' : ""}>${label}</a>`;

  const serviceLinks = [
    ["/garage-door-repair", "Garage Door Repair"],
    ["/garage-door-spring-replacement", "Spring Replacement"],
    ["/garage-door-cable-repair", "Cable Repair"],
    ["/garage-door-opener-repair", "Opener Repair"],
    ["/garage-door-openers", "Opener Installation"],
    ["/services/garage-door-maintenance", "Maintenance & Tune-Ups"],
    ["/safety-sensors", "Safety Sensors"],
    ["/services/commercial", "Commercial Service"],
    ["/emergency-garage-door-repair", "Emergency Repair"],
    ["/emergency-after-hours", "After-Hours Emergency"]
  ];
  const servicesActive = active("/services") || serviceLinks.some(([href]) => active(href));
  const servicesMenu = `
    <div class="global-nav-services${servicesActive ? " is-current" : ""}">
      <button class="global-services-toggle" id="globalServicesToggle" type="button" aria-controls="globalServicesMenu" aria-expanded="false">
        <span>Services</span>
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m5 7 5 5 5-5"/></svg>
      </button>
      <div class="global-services-menu" id="globalServicesMenu" aria-labelledby="globalServicesToggle">
        <a class="global-services-all" href="/services"${currentPath === "/services" ? ' aria-current="page"' : ""}>View All Services <span aria-hidden="true">→</span></a>
        <div class="global-services-grid">
          ${serviceLinks.map(([href, label]) => navLink(href, label)).join("")}
        </div>
      </div>
    </div>`;

  const brand = `
    <a class="global-brand" href="/" aria-label="Valiant Garage Door home">
      <img src="/assets/home-optimized/hero-door-shield-black-red-420.webp" alt="" width="48" height="48">
      <span class="global-brand-text"><b>VALIANT</b><small>GARAGE DOOR</small></span>
    </a>`;

  const header = document.createElement("header");
  header.className = "global-site-header";
  header.innerHTML = `
    <div class="global-wrap global-header-inner">
      ${brand}
      <nav class="global-main-nav" id="globalMainNav" aria-label="Primary navigation">
        ${servicesMenu}
        ${navLink("/service-areas", "Service Areas")}
        ${navLink("/repair-guides", "Repair Guides")}
        ${navLink("/community-garage-door-project", "Community Project")}
        ${navLink("/reviews-and-proof", "Reviews & Proof")}
        ${navLink("/idea-certified-garage-door-technician", "About Us")}
        ${navLink("/business-card", "Contact Us")}
      </nav>
      <div class="global-header-actions">
        <a class="global-header-call js-tel" href="${PHONE_HREF}" aria-label="Call Valiant Garage Door at ${PHONE}"><span class="js-phone">${PHONE}</span></a>
        <a class="global-header-book" href="${BOOK_URL}" target="_blank" rel="noopener noreferrer">Book Free Estimate</a>
        <button class="global-nav-toggle" type="button" aria-controls="globalMainNav" aria-expanded="false" aria-label="Open navigation menu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
        </button>
      </div>
    </div>`;

  const footer = document.createElement("footer");
  footer.className = "global-site-footer";
  footer.innerHTML = `
    <div class="global-wrap">
      <div class="global-footer-grid">
        <div class="global-footer-brand">
          ${brand}
          <p>Certified garage door repair, opener service, and safety-focused recommendations for Pleasanton, the Tri-Valley, and surrounding East Bay communities.</p>
          <div class="global-socials" aria-label="Valiant Garage Door social profiles">
            <a href="https://www.google.com/maps/search/?api=1&query=Valiant%20Garage%20Door%203588%20Pimlico%20Dr%20Pleasanton%20CA%2094588&query_place_id=ChIJreu0MBcWcgMRQnyWHvhS94w" target="_blank" rel="noopener noreferrer" aria-label="Google Business Profile"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 12c0-.7-.1-1.4-.2-2H12v4h5.6c-.2 1.3-1 2.4-2.1 3.1v2.6h3.4C20.8 18 22 15.3 22 12z"/></svg></a>
            <a href="https://www.instagram.com/valiantgaragedoor/" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg></a>
            <a href="https://www.facebook.com/ValiantGD/" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 9h3V6h-3c-2 0-3 1.3-3 3v2H9v3h2v7h3v-7h2.5l.5-3H14V9z"/></svg></a>
            <a href="https://www.youtube.com/@Valiantdoor" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 12s0-3-.4-4.4a2.6 2.6 0 0 0-1.8-1.8C18.4 5.4 12 5.4 12 5.4s-6.4 0-7.8.4A2.6 2.6 0 0 0 2.4 7.6C2 9 2 12 2 12s0 3 .4 4.4a2.6 2.6 0 0 0 1.8 1.8c1.4.4 7.8.4 7.8.4s6.4 0 7.8-.4a2.6 2.6 0 0 0 1.8-1.8C22 15 22 12 22 12zm-12 3V9l5 3z"/></svg></a>
          </div>
        </div>
        <nav class="global-footer-column" aria-label="Footer services"><h2>Services</h2><ul><li><a href="/garage-door-repair">Garage Door Repair</a></li><li><a href="/garage-door-spring-replacement">Spring Replacement</a></li><li><a href="/garage-door-openers">Garage Door Openers</a></li><li><a href="/services/garage-door-maintenance">Maintenance</a></li><li><a href="/emergency-garage-door-repair">Emergency Repair</a></li></ul></nav>
        <nav class="global-footer-column" aria-label="Footer service areas"><h2>Service Areas</h2><ul><li><a href="/garage-door-repair-pleasanton">Pleasanton</a></li><li><a href="/garage-door-repair-dublin-ca">Dublin</a></li><li><a href="/garage-door-repair-livermore">Livermore</a></li><li><a href="/garage-door-repair-san-ramon">San Ramon</a></li><li><a href="/garage-door-repair-pleasant-hill">Pleasant Hill</a></li><li><a href="/service-areas">View All Areas</a></li></ul></nav>
        <div class="global-footer-column"><h2>Contact</h2><ul><li><a class="js-tel" href="${PHONE_HREF}"><span class="js-phone">${PHONE}</span></a></li><li><a href="mailto:vm@valiantdoor.com">vm@valiantdoor.com</a></li><li>Pleasanton, California</li><li>Insured</li><li><a href="${BOOK_URL}" target="_blank" rel="noopener noreferrer">Book Free Estimate</a></li></ul></div>
      </div>
      <div class="global-footer-bottom"><span>&copy; 2026 Valiant Garage Door LLC. All Rights Reserved.</span><span><a href="/privacy">Privacy Policy</a> &nbsp;&bull;&nbsp; <a href="/terms">Terms of Service</a></span></div>
    </div>`;

  const existingHeader = document.querySelector("header.site-header, header.global-site-header");
  if (existingHeader) existingHeader.replaceWith(header);
  else {
    const announcement = document.querySelector(".announce, .top-strip, .home-sticky-call");
    if (announcement) announcement.insertAdjacentElement("afterend", header);
    else document.body.prepend(header);
  }

  const enduranceMaxRoutes = new Set([
    "/broken-spring-repair-dublin-ca",
    "/case-studies/broken-springs",
    "/blog/broken-garage-door-spring-repair-pleasanton",
    "/blog/broken-spring-repair-east-bay",
    "/blog/garage-door-spring-replacement-cost",
    "/blog/why-garage-door-springs-break"
  ]);

  const createEnduranceMaxCard = () => {
    const informational = currentPath.startsWith("/blog/") || currentPath.startsWith("/case-studies/");
    const section = document.createElement("section");
    section.className = "endurance-max-section";
    section.setAttribute("aria-labelledby", `endurance-max-${currentPath.replace(/[^a-z0-9]+/gi, "-")}`);
    section.innerHTML = `
      <h2 id="endurance-max-${currentPath.replace(/[^a-z0-9]+/gi, "-")}">A Premium Torsion Spring Option</h2>
      <article class="endurance-max-card">
        <div class="endurance-max-media"><img src="/assets/springs/valiant-endurance-max-torsion-spring.png" alt="Valiant Endurance Max branded torsion spring" width="604" height="610" loading="lazy" decoding="async"></div>
        <div class="endurance-max-copy">
          <p class="endurance-max-kicker">Valiant premium spring system</p>
          <h3>Valiant Endurance Max – Torsion Springs</h3>
          <p class="endurance-max-price">Starting at $149</p>
          <p>A heavy-duty torsion spring option engineered from high-tensile steel for dependable torque, repeated operating cycles, reliable door balance, and strong resistance to wear.</p>
          <ul class="endurance-max-features" aria-label="Endurance Max features"><li>High durability</li><li>Consistent torque</li><li>Wear resistant</li><li>Low maintenance</li></ul>
          <p class="endurance-max-note">Final installed pricing depends on door weight, spring size, cycle rating, spring count, labor, conversions, and required safety corrections.</p>
          <a class="endurance-max-cta" href="${informational ? "/garage-door-spring-replacement" : "/quote"}">${informational ? "Explore Spring Replacement" : "Request a Spring Estimate"}</a>
        </div>
      </article>`;
    return section;
  };

  const existingFooter = document.querySelector("footer.site-footer, footer.global-site-footer, body > footer");
  if (enduranceMaxRoutes.has(currentPath) && !document.querySelector(".endurance-max-section")) {
    const main = document.querySelector("main");
    if (main) main.append(createEnduranceMaxCard());
  }
  if (existingFooter) existingFooter.replaceWith(footer);
  else document.body.append(footer);

  const toggle = header.querySelector(".global-nav-toggle");
  const nav = header.querySelector(".global-main-nav");
  const services = header.querySelector(".global-nav-services");
  const servicesToggle = header.querySelector(".global-services-toggle");
  const setServicesOpen = (open) => {
    services.classList.toggle("is-open", open);
    servicesToggle.setAttribute("aria-expanded", String(open));
  };
  const setOpen = (open) => {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu");
    if (!open) setServicesOpen(false);
  };
  toggle.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));
  servicesToggle.addEventListener("click", () => setServicesOpen(!services.classList.contains("is-open")));
  services.addEventListener("mouseenter", () => {
    if (window.matchMedia("(min-width: 761px) and (hover: hover)").matches) setServicesOpen(true);
  });
  services.addEventListener("mouseleave", () => {
    if (window.matchMedia("(min-width: 761px) and (hover: hover)").matches && !services.contains(document.activeElement)) setServicesOpen(false);
  });
  services.addEventListener("focusout", (event) => {
    if (!services.contains(event.relatedTarget)) setServicesOpen(false);
  });
  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      setServicesOpen(false);
      setOpen(false);
    }
  });
  document.addEventListener("click", (event) => {
    if (!services.contains(event.target)) setServicesOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      const wasServicesOpen = services.classList.contains("is-open");
      setServicesOpen(false);
      setOpen(false);
      if (wasServicesOpen) servicesToggle.focus();
    }
  });
})();
