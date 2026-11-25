(() => {
  const root = document.documentElement;
  const body = document.body;
  const finale = document.querySelector(".finale");
  const recordingStage = document.querySelector(".threshold");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  root.classList.add("js-enhanced");

  const revealNodes = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reducedMotion) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -5% 0px" });
    revealNodes.forEach((node) => revealObserver.observe(node));
  } else {
    revealNodes.forEach((node) => node.classList.add("is-visible"));
  }

  const demoChoices = document.querySelectorAll(".demo-choice");
  const demoPlaceholder = document.querySelector("#demo-placeholder");
  const demoExchange = document.querySelector("#demo-exchange");
  const demoUser = document.querySelector("#demo-user");
  const demoReply = document.querySelector("#demo-reply");

  demoChoices.forEach((choice) => {
    choice.addEventListener("click", () => {
      demoChoices.forEach((other) => other.setAttribute("aria-pressed", String(other === choice)));
      demoUser.textContent = choice.dataset.demoUser;
      demoReply.textContent = choice.dataset.demoReply;
      demoPlaceholder.hidden = true;
      demoExchange.hidden = false;
    });
  });

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  let framePending = false;

  function updateScrollState() {
    const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const pageProgress = clamp(window.scrollY / scrollable);
    const disturbance = clamp((pageProgress - 0.16) / 0.72);
    const phase = pageProgress < 0.17 ? 0 : pageProgress < 0.37 ? 1 : pageProgress < 0.56 ? 2 : pageProgress < 0.75 ? 3 : 4;

    body.dataset.phase = String(phase);
    root.style.setProperty("--scan-opacity", (disturbance * 0.17).toFixed(3));
    root.style.setProperty("--vignette-opacity", (disturbance * 0.13).toFixed(3));
    root.style.setProperty("--whisper-opacity", (0.58 + disturbance * 0.42).toFixed(3));

    if (recordingStage && !reducedMotion) {
      const bounds = recordingStage.getBoundingClientRect();
      const travel = Math.max(1, bounds.height - window.innerHeight * 0.18);
      const progress = clamp((window.innerHeight * 0.82 - bounds.top) / travel);
      recordingStage.style.setProperty("--recording-opacity", progress.toFixed(3));
    }

    if (finale) {
      if (reducedMotion) {
        finale.style.setProperty("--finale-image-opacity", "1");
        finale.style.setProperty("--finale-copy-opacity", "1");
        finale.style.setProperty("--finale-copy-offset", "0px");
      } else {
        const bounds = finale.getBoundingClientRect();
        const imageProgress = clamp((window.innerHeight - bounds.top) / (window.innerHeight * 1.4));
        const copyProgress = clamp((window.innerHeight * 0.65 - bounds.top) / (window.innerHeight * 1.05));
        finale.style.setProperty("--finale-image-opacity", (0.28 + imageProgress * 0.72).toFixed(3));
        finale.style.setProperty("--finale-copy-opacity", (0.36 + copyProgress * 0.64).toFixed(3));
        finale.style.setProperty("--finale-copy-offset", `${((1 - copyProgress) * 10).toFixed(1)}px`);
      }
    }

    framePending = false;
  }

  function queueScrollState() {
    if (framePending) return;
    framePending = true;
    window.requestAnimationFrame(updateScrollState);
  }

  window.addEventListener("scroll", queueScrollState, { passive: true });
  window.addEventListener("resize", queueScrollState, { passive: true });
  updateScrollState();

  // Keep image fallbacks graceful when artwork is still being reviewed or unavailable.
  document.querySelectorAll("img").forEach((image) => {
    image.addEventListener("error", () => image.classList.add("image-unavailable"), { once: true });
  });
})();
