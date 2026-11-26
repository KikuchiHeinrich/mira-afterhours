(() => {
  const root = document.documentElement;
  const body = document.body;
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

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const smooth = (value) => {
    const progress = clamp(value);
    return progress * progress * (3 - 2 * progress);
  };

  const sceneDemo = document.querySelector("#scene-demo");
  const presetButtons = sceneDemo ? Array.from(sceneDemo.querySelectorAll("[data-preset]")) : [];
  const presetEchoes = document.querySelectorAll("[data-preset-echo]");
  const lightStatus = sceneDemo ? sceneDemo.querySelector("[data-light-status]") : null;
  const sealStatus = sceneDemo ? sceneDemo.querySelector("[data-seal-status]") : null;
  const sealButton = sceneDemo ? sceneDemo.querySelector("[data-seal]") : null;
  const reopenButton = sceneDemo ? sceneDemo.querySelector("[data-reopen]") : null;

  const presetLabels = new Map(presetButtons.map((button) => {
    const label = button.dataset.presetCopy || button.dataset.presetLabel || button.textContent.replace(/\s+/g, " ").trim();
    return [button.dataset.preset, label];
  }));
  const knownPreset = (value) => value === "dim" && presetLabels.has("dim") ? "dim" : "lit";
  const presetStatus = (preset) => preset === "dim"
    ? "布景灯已熄灭 · 观众席仍为空白"
    : "留一盏灯 · 观众席仍为空白";
  let currentPreset = knownPreset(sceneDemo && sceneDemo.dataset.presetState);
  let isSealed = Boolean(sceneDemo && sceneDemo.dataset.sealed === "true");

  function renderSceneControls() {
    if (sceneDemo) {
      sceneDemo.dataset.presetState = currentPreset;
      sceneDemo.dataset.sealed = String(isSealed);
    }
    body.dataset.scenePreset = currentPreset;
    presetButtons.forEach((button) => {
      const active = button.dataset.preset === currentPreset;
      button.setAttribute("aria-pressed", String(active));
      button.disabled = isSealed;
    });
    presetEchoes.forEach((node) => {
      node.textContent = presetLabels.get(currentPreset) || (currentPreset === "dim" ? "调暗布景" : "日常柔光");
    });
    if (lightStatus) {
      lightStatus.textContent = isSealed
        ? "布景灯光已切断 · 观众席仍为空白"
        : presetStatus(currentPreset);
    }
    if (sealButton) sealButton.disabled = isSealed;
    if (reopenButton) reopenButton.disabled = !isSealed;
    if (sealStatus) {
      sealStatus.textContent = isSealed
        ? "布景已封存。灯光已切断。"
        : "布景仍在进行中。可以调整预设，或结束这次模拟。";
    }
  }

  presetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (isSealed) return;
      const selected = button.dataset.preset;
      if (selected !== "lit" && selected !== "dim") return;
      currentPreset = selected;
      renderSceneControls();
    });
  });

  if (sealButton) {
    sealButton.addEventListener("click", () => {
      if (isSealed) return;
      isSealed = true;
      renderSceneControls();
      if (reopenButton) reopenButton.focus({ preventScroll: true });
    });
  }

  if (reopenButton) {
    reopenButton.addEventListener("click", () => {
      if (!isSealed) return;
      isSealed = false;
      renderSceneControls();
      if (sealButton) sealButton.focus({ preventScroll: true });
    });
  }

  renderSceneControls();

  const sceneBeatNodes = Array.from(document.querySelectorAll("[data-scene-beat]"))
    .map((node) => ({ node, beat: Number.parseInt(node.dataset.sceneBeat, 10) }))
    .filter((entry) => Number.isFinite(entry.beat))
    .sort((a, b) => a.beat - b.beat);
  const distinctBeats = Array.from(new Set(sceneBeatNodes.map((entry) => entry.beat)));
  const firstBeat = distinctBeats.length ? distinctBeats[0] : 0;
  const lastBeat = distinctBeats.length ? distinctBeats[distinctBeats.length - 1] : firstBeat;
  const toneOnset = Math.min(firstBeat + 4, lastBeat);

  function updateSceneBeat() {
    if (!sceneBeatNodes.length) {
      body.dataset.sceneBeat = "0";
      root.style.setProperty("--scene-tone", "0");
      return;
    }

    const anchorY = window.innerHeight * 0.46;
    let activeEntry = sceneBeatNodes[0];
    let nearestDistance = Infinity;
    const positions = sceneBeatNodes.map((entry) => {
      const rect = entry.node.getBoundingClientRect();
      if (rect.top <= anchorY && rect.bottom >= anchorY) {
        activeEntry = entry;
        nearestDistance = 0;
      } else if (nearestDistance > 0) {
        const distance = rect.top > anchorY ? rect.top - anchorY : anchorY - rect.bottom;
        if (distance < nearestDistance) {
          nearestDistance = distance;
          activeEntry = entry;
        }
      }
      return { beat: entry.beat, top: window.scrollY + rect.top };
    });
    body.dataset.sceneBeat = String(activeEntry.beat);

    const anchorDocumentY = window.scrollY + anchorY;
    let continuousBeat = positions[0].beat;
    if (anchorDocumentY >= positions[positions.length - 1].top) {
      continuousBeat = positions[positions.length - 1].beat;
    } else {
      for (let index = 0; index < positions.length - 1; index += 1) {
        const current = positions[index];
        const next = positions[index + 1];
        if (anchorDocumentY > next.top) continue;
        const segmentLength = Math.max(1, next.top - current.top);
        const segmentProgress = clamp((anchorDocumentY - current.top) / segmentLength);
        continuousBeat = current.beat + (next.beat - current.beat) * segmentProgress;
        break;
      }
    }

    const toneRange = Math.max(1, lastBeat - toneOnset);
    const sceneTone = continuousBeat < toneOnset ? 0 : clamp((continuousBeat - toneOnset) / toneRange);
    root.style.setProperty("--scene-tone", sceneTone.toFixed(3));
  }

  const replayRunway = document.querySelector("#replay-runway");
  const replaySticky = replayRunway ? replayRunway.querySelector(".replay-sticky") : null;
  const replayWindow = replayRunway ? replayRunway.querySelector(".replay-window") : null;
  const replayCel = replayRunway ? replayRunway.querySelector(".replay-frame-cel") : null;
  const replayRecording = replayRunway ? replayRunway.querySelector(".replay-frame-recording") : null;
  const replayFinale = replayRunway ? replayRunway.querySelector(".replay-frame-finale") : null;
  const replayStatus = replayRunway ? replayRunway.querySelector("[data-replay-phase]") : null;
  const finale = document.querySelector(".finale");
  const replayStatusText = [
    "布景封存 · 观众席无画面",
    "观众席 · 接收到画面",
    "观众席 · 布景已断开",
    "来源：观众席"
  ];
  let renderedReplayPhase = "";
  let framePending = false;

  function setReplayPhase(phase) {
    if (!replayStatus || renderedReplayPhase === String(phase)) return;
    replayStatus.dataset.replayPhase = String(phase);
    replayStatus.textContent = replayStatusText[phase];
    renderedReplayPhase = String(phase);
  }

  function setReplayProperty(name, value) {
    replayWindow.style.setProperty(name, value);
  }

  function updateReplay() {
    if (!replayRunway || !replaySticky || !replayWindow) return;
    const isStickyLayout = window.getComputedStyle(replaySticky).position === "sticky";
    if (reducedMotion || !isStickyLayout) {
      renderedReplayPhase = "static";
      if (replayStatus) {
        replayStatus.dataset.replayPhase = "static";
        replayStatus.textContent = "静态分镜 · 依次展示";
      }
      return;
    }

    const viewportHeight = window.innerHeight;
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const bounds = replayRunway.getBoundingClientRect();
    const stickyHeight = replaySticky.offsetHeight || viewportHeight;
    const travel = Math.max(1, bounds.height - stickyHeight);
    const runwayProgress = clamp(-bounds.top / travel);
    const progress = clamp((runwayProgress - 0.09) / 0.82);
    const eased = smooth(progress);
    const mobile = viewportWidth <= 640;
    const startWidth = Math.min(viewportWidth * (mobile ? 0.86 : 0.34), mobile ? 500 : 520);
    const startHeight = Math.min(viewportHeight * (mobile ? 0.44 : 0.58), mobile ? 380 : 540);
    const startLeft = viewportWidth * (mobile ? 0.5 : 0.32);
    const startTop = viewportHeight * (mobile ? 0.69 : 0.53);

    setReplayProperty("--stage-width", `${(startWidth + (viewportWidth - startWidth) * eased).toFixed(1)}px`);
    setReplayProperty("--stage-height", `${(startHeight + (viewportHeight - startHeight) * eased).toFixed(1)}px`);
    setReplayProperty("--stage-left", `${(startLeft + (viewportWidth * 0.5 - startLeft) * eased).toFixed(1)}px`);
    setReplayProperty("--stage-top", `${(startTop + (viewportHeight * 0.5 - startTop) * eased).toFixed(1)}px`);
    setReplayProperty("--stage-radius", `${(18 * (1 - eased)).toFixed(1)}px`);

    // Keep each outgoing picture visible underneath until the next frame is fully opaque.
    const celOpacity = progress < 0.22 ? 0
      : progress < 0.3 ? smooth((progress - 0.22) / 0.08)
      : 1;
    const recordingOpacity = progress < 0.42 ? 0
      : progress < 0.56 ? smooth((progress - 0.42) / 0.14)
      : 1;
    const finaleOpacity = progress < 0.78 ? 0 : progress < 0.9
      ? smooth((progress - 0.78) / 0.12)
      : 1;
    const settledRecordingOpacity = finaleOpacity >= 1 ? 0 : recordingOpacity;
    const settledCelOpacity = recordingOpacity >= 1 ? 0 : celOpacity;
    if (replayCel) replayCel.style.setProperty("--stage-cel-opacity", settledCelOpacity.toFixed(3));
    if (replayRecording) replayRecording.style.setProperty("--stage-recording-opacity", settledRecordingOpacity.toFixed(3));
    if (replayFinale) replayFinale.style.setProperty("--stage-finale-opacity", finaleOpacity.toFixed(3));

    replayWindow.style.setProperty("--stage-wear-opacity", (smooth((progress - 0.38) / 0.62) * 0.24).toFixed(3));
    replayWindow.style.setProperty("--stage-chrome-opacity", (1 - smooth((progress - 0.28) / 0.3)).toFixed(3));
    replayWindow.style.setProperty("--stage-partition-opacity", (1 - smooth((eased - 0.06) / 0.55)).toFixed(3));
    replayRunway.style.setProperty("--stage-copy-opacity", (1 - smooth((progress - 0.13) / 0.3)).toFixed(3));
    replayRunway.style.setProperty("--stage-note-opacity", smooth((progress - 0.78) / 0.17).toFixed(3));
    replayRunway.style.setProperty("--stage-note-offset", `${((1 - smooth((progress - 0.78) / 0.17)) * 12).toFixed(1)}px`);

    const phase = progress < 0.22 ? 0 : progress < 0.56 ? 1 : progress < 0.8 ? 2 : 3;
    setReplayPhase(phase);
  }

  function updateScrollState() {
    updateSceneBeat();
    updateReplay();
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
