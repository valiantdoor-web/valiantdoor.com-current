/*
 * Valiant Garage Door - WebMCP tools
 * Exposes client-side "tools" so browser-based AI agents can reliably
 * help visitors get business info, check the service area, request
 * service, book a free estimate, or call. Uses the standard
 * document.modelContext API with feature detection and an idempotency
 * guard so it is safe to load on every page (and more than once).
 *
 * Spec: https://webmachinelearning.github.io/webmcp/
 */
(function () {
  "use strict";

  // Only register once per document, even if loaded twice.
  if (window.__valiantWebMCP) return;

  var mc = typeof document !== "undefined" && document.modelContext;
  // Feature detection: requires a secure context and modelContext support.
  if (!mc || typeof mc.registerTool !== "function") return;

  window.__valiantWebMCP = true;

  var BUSINESS = {
    name: "Valiant Garage Door",
    phone: "9254094974",
    phoneDisplay: "(925) 409-4974",
    email: "vm@valiantdoor.com",
    address: "3588 Pimlico Dr, Pleasanton, CA 94588",
    bookingUrl:
      "https://book.housecallpro.com/book/Valiant-garage-door/ae8e4a137c8c49b4b264073541533a7a?v2=true",
    quoteUrl: "https://www.valiantdoor.com/quote",
    emergency: "24/7 after-hours emergency service, flat-rate $100 service call.",
    warranty: "10-year warranty on garage door repairs and installed parts.",
    rating: "5.0 stars (34 reviews)",
    serviceAreas: [
      "Pleasanton",
      "Dublin",
      "Livermore",
      "Fremont",
      "San Ramon",
      "Danville",
      "Sunol"
    ]
  };

  function text(str) {
    return { content: [{ type: "text", text: str }] };
  }

  function register(def, opts) {
    try {
      var r = mc.registerTool(def, opts);
      if (r && typeof r.catch === "function") r.catch(function () {});
    } catch (e) {
      /* no-op: never break the page for an agent feature */
    }
  }

  // 1) Business info -----------------------------------------------------
  register({
    name: "get_valiant_business_info",
    description:
      "Get Valiant Garage Door's contact details, address, hours, service area, ratings, and warranty. Use this to answer questions about the business.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    execute: function () {
      return text(
        [
          BUSINESS.name,
          "Phone: " + BUSINESS.phoneDisplay + " (" + BUSINESS.phone + ")",
          "Email: " + BUSINESS.email,
          "Address: " + BUSINESS.address,
          "Rating: " + BUSINESS.rating,
          "Service area: " + BUSINESS.serviceAreas.join(", ") + " and nearby East Bay communities.",
          "Emergency: " + BUSINESS.emergency,
          "Warranty: " + BUSINESS.warranty,
          "Book online: " + BUSINESS.bookingUrl
        ].join("\n")
      );
    }
  });

  // 2) Service-area check ------------------------------------------------
  register({
    name: "check_valiant_service_area",
    description:
      "Check whether Valiant Garage Door serves a given city or town in the East Bay. Returns whether it is an immediate service area.",
    inputSchema: {
      type: "object",
      properties: {
        city: {
          type: "string",
          description: "The city or town to check, e.g. 'Dublin' or 'Fremont'."
        }
      },
      required: ["city"],
      additionalProperties: false
    },
    execute: function (args) {
      var city = String((args && args.city) || "").trim();
      if (!city) return text("Please provide a city to check.");
      var match = BUSINESS.serviceAreas.filter(function (c) {
        return c.toLowerCase() === city.toLowerCase();
      })[0];
      if (match) {
        return text(
          match +
            " is an immediate service area for Valiant Garage Door. Book online at " +
            BUSINESS.bookingUrl +
            " or call " +
            BUSINESS.phoneDisplay +
            "."
        );
      }
      return text(
        city +
          " is outside our immediate service areas (" +
          BUSINESS.serviceAreas.join(", ") +
          "), but we may accept nearby East Bay exceptions depending on schedule and route. Call " +
          BUSINESS.phoneDisplay +
          " to confirm."
      );
    }
  });

  // 3) Book a free estimate ---------------------------------------------
  register({
    name: "book_valiant_estimate",
    description:
      "Open Valiant Garage Door's free-estimate instant online booking so the user can schedule a visit.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    execute: function () {
      try {
        window.open(BUSINESS.bookingUrl, "_blank", "noopener");
      } catch (e) {}
      return text(
        "Opening Valiant Garage Door's free-estimate booking page: " + BUSINESS.bookingUrl
      );
    }
  });

  // 4) Call the business -------------------------------------------------
  register({
    name: "call_valiant",
    description:
      "Start a phone call to Valiant Garage Door for immediate or emergency garage door help.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    execute: function () {
      try {
        window.location.href = "tel:" + BUSINESS.phone;
      } catch (e) {}
      return text("Calling Valiant Garage Door at " + BUSINESS.phoneDisplay + ".");
    }
  });

  // 5) Request service (primary, form-like tool) ------------------------
  register({
    name: "request_valiant_service",
    description:
      "Request garage door service from Valiant Garage Door. Collects the problem, city, and urgency, then routes the user to the fastest path (emergency call or online booking).",
    inputSchema: {
      type: "object",
      properties: {
        issue: {
          type: "string",
          description:
            "What's wrong or the service needed, e.g. 'broken spring', 'opener not working', 'new door install'."
        },
        city: {
          type: "string",
          description: "The city where service is needed."
        },
        urgency: {
          type: "string",
          enum: ["emergency", "same_day", "flexible"],
          description: "How urgent the request is.",
          default: "flexible"
        }
      },
      required: ["issue"],
      additionalProperties: false
    },
    execute: function (args) {
      args = args || {};
      var issue = String(args.issue || "").trim() || "garage door service";
      var urgency = String(args.urgency || "flexible");
      var city = String(args.city || "").trim();
      var lines = ["Request noted: " + issue + (city ? " in " + city : "") + "."];
      if (urgency === "emergency") {
        try {
          window.location.href = "tel:" + BUSINESS.phone;
        } catch (e) {}
        lines.push(
          "For emergencies, calling " +
            BUSINESS.phoneDisplay +
            " now is fastest (" +
            BUSINESS.emergency +
            ")."
        );
      } else {
        try {
          window.open(BUSINESS.bookingUrl, "_blank", "noopener");
        } catch (e) {}
        lines.push(
          "Opening free-estimate booking: " +
            BUSINESS.bookingUrl +
            " — or call " +
            BUSINESS.phoneDisplay +
            "."
        );
      }
      return text(lines.join(" "));
    }
  });
})();
