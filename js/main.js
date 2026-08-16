/* ============================================================
   TIMOTHY WILLIAM FENNEY BUILDING & REMODELING — main.js
   1. GoHighLevel form config
   2. Header / hamburger menu
   3. Saw-blade custom cursor  (spins counterclockwise on scroll)
   4. Scroll cut-line blade    (cuts down the right edge)
   5. Reveal-on-scroll
   6. Before / After sliders
   ============================================================ */

/* ------------------------------------------------------------
   1. GHL CONFIG — paste the GoHighLevel inbound webhook URL here
      (Automations → Workflow → Inbound Webhook trigger), same
      setup as the other construction builds. Leave empty to
      fall back to a mailto: draft while the webhook is pending.
------------------------------------------------------------ */
const GHL_CONFIG = {
  webhookUrl: "", // e.g. "https://services.leadconnectorhq.com/hooks/XXXX/webhook-trigger/XXXX"
  source: "twf-building-website",
};

document.addEventListener("DOMContentLoaded", () => {
  const prefersReducedMotion =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ----------------------------------------------------------
     2. Header + hamburger menu
  ---------------------------------------------------------- */
  const header = document.getElementById("siteHeader");
  const toggle = document.getElementById("menuToggle");
  const overlay = document.getElementById("navOverlay");

  const setMenu = (open) => {
    header.classList.toggle("menu-open", open);
    toggle.classList.toggle("open", open);
    overlay.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
    overlay.setAttribute("aria-hidden", String(!open));
    document.body.style.overflow = open ? "hidden" : "";
  };

  toggle.addEventListener("click", () =>
    setMenu(!overlay.classList.contains("open"))
  );
  overlay.querySelectorAll("[data-navlink]").forEach((a) =>
    a.addEventListener("click", () => setMenu(false))
  );
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setMenu(false);
  });

  const onScrollHeader = () =>
    header.classList.toggle("scrolled", window.scrollY > 40);
  onScrollHeader();

  /* ----------------------------------------------------------
     3. Custom saw-blade cursor
        Follows the mouse; blade rotation is tied to scroll
        position and spins COUNTERCLOCKWISE as you scroll down.
  ---------------------------------------------------------- */
  const cursor = document.getElementById("cursorBlade");
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  let cursorX = -100;
  let cursorY = -100;

  if (finePointer && !prefersReducedMotion) {
    document.body.classList.add("blade-cursor");

    document.addEventListener("mousemove", (e) => {
      cursorX = e.clientX;
      cursorY = e.clientY;
      cursor.style.opacity = "1";
      // Flip to a white blade over dark (navy) sections
      const el = document.elementFromPoint(e.clientX, e.clientY);
      cursor.classList.toggle(
        "on-dark",
        Boolean(el && el.closest(".section-navy, .nav-overlay, .site-footer .dark"))
      );
    });
    document.addEventListener("mouseleave", () => {
      cursor.style.opacity = "0";
    });
  }

  /* ----------------------------------------------------------
     4. Scroll cut-line — blade travels down the dashed line and
        the solid gold "kerf" grows behind it, like a saw cutting
        down through the page. Counterclockwise rotation.
  ---------------------------------------------------------- */
  const cutBlade = document.getElementById("cutlineBlade");
  const cutLine = document.getElementById("cutlineCut");

  // Degrees of blade rotation per pixel scrolled (negative = CCW)
  const SPIN_RATE = -0.45;

  let ticking = false;
  const render = () => {
    ticking = false;
    const doc = document.documentElement;
    const max = Math.max(doc.scrollHeight - window.innerHeight, 1);
    const progress = Math.min(window.scrollY / max, 1);
    const spin = window.scrollY * SPIN_RATE;

    // Cut-line blade position + CCW spin
    const y = progress * window.innerHeight;
    cutBlade.style.transform = `translateY(${y}px) rotate(${spin}deg)`;
    cutLine.style.height = `${progress * 100}%`;

    // Cursor blade position + the same CCW spin
    if (finePointer && !prefersReducedMotion) {
      cursor.style.transform = `translate(${cursorX}px, ${cursorY}px) rotate(${spin}deg)`;
    }

    onScrollHeader();
  };
  const requestRender = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(render);
    }
  };
  document.addEventListener("scroll", requestRender, { passive: true });
  document.addEventListener("mousemove", requestRender, { passive: true });
  render();

  /* ----------------------------------------------------------
     5. Reveal-on-scroll
  ---------------------------------------------------------- */
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

  /* ----------------------------------------------------------
     6. Before / After comparison sliders
        Each [data-ba] block: hidden range input drives --pos,
        which clips the "before" layer and moves the handle.
  ---------------------------------------------------------- */
  document.querySelectorAll("[data-ba]").forEach((figure) => {
    const frame = figure.querySelector(".ba-frame");
    const range = figure.querySelector("[data-ba-range]");
    const setPos = (val) => frame.style.setProperty("--pos", `${val}%`);

    setPos(range.value);
    range.addEventListener("input", () => setPos(range.value));

    // Direct drag anywhere on the frame (mouse + touch)
    const dragTo = (clientX) => {
      const rect = frame.getBoundingClientRect();
      const pct = Math.min(Math.max(((clientX - rect.left) / rect.width) * 100, 0), 100);
      range.value = pct;
      setPos(pct);
    };
    frame.addEventListener("pointerdown", (e) => {
      frame.setPointerCapture(e.pointerId);
      dragTo(e.clientX);
    });
    frame.addEventListener("pointermove", (e) => {
      if (e.buttons > 0) dragTo(e.clientX);
    });
  });

  /* ----------------------------------------------------------
     7. Lead form → GoHighLevel webhook
  ---------------------------------------------------------- */
  const form = document.getElementById("leadForm");
  const status = document.getElementById("formStatus");
  const submitBtn = document.getElementById("leadSubmit");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.className = "form-status";

    if (!form.reportValidity()) return;

    const data = Object.fromEntries(new FormData(form).entries());
    data.source = GHL_CONFIG.source;
    data.page = window.location.href;

    // Webhook not configured yet → open a pre-filled email instead
    if (!GHL_CONFIG.webhookUrl) {
      const body = encodeURIComponent(
        `Name: ${data.full_name}\nPhone: ${data.phone}\nEmail: ${data.email}\n` +
        `Service: ${data.service}\n\n${data.message || ""}`
      );
      window.location.href =
        `mailto:twfbuilding@outlook.com?subject=${encodeURIComponent(
          "Free Estimate Request — " + data.full_name
        )}&body=${body}`;
      status.textContent = "Opening your email app to send the request…";
      return;
    }

    submitBtn.disabled = true;
    status.textContent = "Sending…";
    try {
      const res = await fetch(GHL_CONFIG.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      form.reset();
      status.textContent =
        "Thank you — your request is in. We'll reach out shortly to talk about your project.";
      status.classList.add("ok");
    } catch (err) {
      status.textContent =
        "Something went wrong sending the form. Please call +1 (774) 994-0314 or email twfbuilding@outlook.com.";
      status.classList.add("error");
    } finally {
      submitBtn.disabled = false;
    }
  });

  /* Footer year */
  document.getElementById("year").textContent = new Date().getFullYear();
});
