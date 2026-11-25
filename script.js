(() => {
  const root = document.documentElement;
  const body = document.body;
  const replayRunway = document.querySelector(".replay-runway");
  const replaySticky = document.querySelector(".replay-sticky");
  const replayWindow = document.querySelector(".replay-window");
  const replayStep = document.querySelector("#replay-step");
  const finale = document.querySelector(".finale");
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
  const syncedNodes = document.querySelectorAll("[data-demo-sync]");
  function selectDemo(choice) {
    demoChoices.forEach((other) => other.setAttribute("aria-pressed", String(other === choice)));
    syncedNodes.forEach((node) => {
      node.textContent = node.dataset.demoSync === "user" ? choice.dataset.demoUser : choice.dataset.demoReply;
    });
  }
  demoChoices.forEach((choice) => choice.addEventListener("click", () => selectDemo(choice)));
  const defaultChoice = Array.from(demoChoices).find((choice) => choice.getAttribute("aria-pressed") === "true");
  if (defaultChoice) selectDemo(defaultChoice);

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const smooth = (value) => {
    const progress = clamp(value);
    return progress * progress * (3 - 2 * progress);
  };
  let framePending = false;
  let replayBeat = -1;
  const replayBeatText = [
    "读取封面 · 23:41:24",
    "匹配原始画面 · 23:41:24",
    "录像信号仍在更新",
    "发件人：米拉"
  ];

  function updateScrollState() {
    const viewportHeight = window.innerHeight;
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const scrollable = Math.max(1, document.documentElement.scrollHeight - viewportHeight);
    const pageProgress = clamp(window.scrollY / scrollable);
    const disturbance = clamp((pageProgress - 0.38) / 0.6);
    const phase = pageProgress < 0.25 ? 0 : pageProgress < 0.46 ? 1 : pageProgress < 0.62 ? 2 : pageProgress < 0.78 ? 3 : 4;

    body.dataset.phase = String(phase);
    root.style.setProperty("--scan-opacity", (disturbance * 0.1).toFixed(3));
    root.style.setProperty("--vignette-opacity", (disturbance * 0.1).toFixed(3));
    root.style.setProperty("--whisper-opacity", (0.58 + disturbance * 0.42).toFixed(3));

    if (replayRunway && replayWindow && !reducedMotion) {
      const bounds = replayRunway.getBoundingClientRect();
      const stickyHeight = replaySticky ? replaySticky.offsetHeight : viewportHeight;
      const travel = Math.max(1, bounds.height - stickyHeight);
      const runwayProgress = clamp(-bounds.top / travel);
      const progress = clamp((runwayProgress - 0.08) / 0.84);
      const eased = smooth(progress);
      const mobile = viewportWidth <= 640;
      const startWidth = Math.min(viewportWidth * (mobile ? 0.86 : 0.52), mobile ? 500 : 760);
      const startHeight = Math.min(viewportHeight * (mobile ? 0.44 : 0.58), mobile ? 380 : 540);
      const startLeft = viewportWidth * (mobile ? 0.5 : 0.68);
      const startTop = viewportHeight * (mobile ? 0.69 : 0.53);

      replayWindow.style.setProperty("--stage-width", `${(startWidth + (viewportWidth - startWidth) * eased).toFixed(1)}px`);
      replayWindow.style.setProperty("--stage-height", `${(startHeight + (viewportHeight - startHeight) * eased).toFixed(1)}px`);
      replayWindow.style.setProperty("--stage-left", `${(startLeft + (viewportWidth * 0.5 - startLeft) * eased).toFixed(1)}px`);
      replayWindow.style.setProperty("--stage-top", `${(startTop + (viewportHeight * 0.5 - startTop) * eased).toFixed(1)}px`);
      replayWindow.style.setProperty("--stage-radius", `${(18 * (1 - eased)).toFixed(1)}px`);

      let celOpacity = 0;
      let recordingOpacity = 0;
      let finaleOpacity = 0;
      if (progress < 0.42) {
        const crossfade = smooth(progress / 0.42);
        celOpacity = 1;
        recordingOpacity = crossfade;
      } else if (progress < 0.72) {
        celOpacity = 0;
        recordingOpacity = 1;
      } else {
        const crossfade = smooth((progress - 0.72) / 0.28);
        celOpacity = 0;
        recordingOpacity = 1;
        finaleOpacity = crossfade;
      }
      replayWindow.style.setProperty("--stage-cel-opacity", celOpacity.toFixed(3));
      replayWindow.style.setProperty("--stage-recording-opacity", recordingOpacity.toFixed(3));
      replayWindow.style.setProperty("--stage-finale-opacity", finaleOpacity.toFixed(3));
      replayWindow.style.setProperty("--stage-wear-opacity", (smooth((progress - 0.2) / 0.8) * 0.3).toFixed(3));
      replayWindow.style.setProperty("--stage-chrome-opacity", (1 - smooth((progress - 0.24) / 0.24)).toFixed(3));
      replayRunway.style.setProperty("--stage-copy-opacity", (1 - smooth((progress - 0.16) / 0.34)).toFixed(3));
      replayRunway.style.setProperty("--stage-note-opacity", smooth((progress - 0.78) / 0.18).toFixed(3));
      replayRunway.style.setProperty("--stage-note-offset", `${((1 - smooth((progress - 0.78) / 0.18)) * 14).toFixed(1)}px`);

      const beat = progress < 0.24 ? 0 : progress < 0.48 ? 1 : progress < 0.78 ? 2 : 3;
      if (beat !== replayBeat && replayStep) {
        replayStep.textContent = replayBeatText[beat];
        replayBeat = beat;
      }
    }

    if (finale) {
      finale.style.setProperty("--finale-image-opacity", "1");
      finale.style.setProperty("--finale-copy-opacity", "1");
      finale.style.setProperty("--finale-copy-offset", "0px");
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

  document.querySelectorAll("img").forEach((image) => {
    image.addEventListener("error", () => image.classList.add("image-unavailable"), { once: true });
  });
})();
