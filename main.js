/**
 * main.js
 * Điều phối vòng lặp 60fps, đồng bộ Mô hình Thực tế 3D <-> Mô hình Giải bài <-> Timeline
 */
(function () {
  'use strict';

  window.addEventListener('DOMContentLoaded', () => {
    if (typeof THREE === 'undefined') {
      document.body.innerHTML =
        '<div style="padding:40px;color:#fff;font-family:sans-serif;text-align:center;">' +
        '<h2>Không thể tải thư viện Three.js</h2>' +
        '<p>Kiểm tra lại file <code>vendor/three.min.js</code> trong thư mục dự án.</p></div>';
      return;
    }

    const viewportEl = document.getElementById('viewport-3d');
    const solverEl = document.getElementById('solver-panel');
    const annotationsEl = document.getElementById('annotations-layer');
    const scrubberEl = document.getElementById('timeline-slider');
    const playBtn = document.getElementById('btn-play');
    const resetBtn = document.getElementById('btn-reset-sim');
    const speedBtn = document.getElementById('btn-speed');
    const stageMarkersEl = document.getElementById('stage-markers');

    // HUD elements over 3D viewport
    const hudTemp = document.getElementById('hud-temp');
    const hudMetricLabel = document.getElementById('hud-metric-label');
    const hudMetricVal = document.getElementById('hud-metric-val');
    const hudPhaseTitle = document.getElementById('hud-phase-title');
    const hudPhaseDesc = document.getElementById('hud-phase-desc');

    const urlParams = new URLSearchParams(window.location.search);
    const initProb = urlParams.get('prob') === 'cau4' ? 'cau4' : 'cau2';
    const initPRaw = parseFloat(urlParams.get('p'));
    const initP = !isNaN(initPRaw) ? PhysicsSim.clamp(initPRaw, 0, 1) : (initProb === 'cau2' ? 0.34 : 0.42);
    const initPaused = urlParams.get('paused') === '1';

    const appState = {
      problem: initProb,
      progress: initP,
      playing: !initPaused,
      speed: 1.0,
      params: {
        cau2: Object.assign({}, PhysicsSim.DEFAULTS.cau2),
        cau4: Object.assign({}, PhysicsSim.DEFAULTS.cau4)
      }
    };

    const scene3D = new LabScene3D(viewportEl);
    scene3D.switchProblem(initProb, true);
    const solverUI = new SolverUI({
      container: solverEl,
      onJumpProgress: (p) => {
        appState.progress = PhysicsSim.clamp(p, 0, 1);
        syncAll();
      },
      onParamsChange: (patch) => {
        Object.assign(appState.params[appState.problem], patch);
        syncAll();
      },
      onResetParams: () => {
        appState.params[appState.problem] = Object.assign({}, PhysicsSim.DEFAULTS[appState.problem]);
        syncAll();
      }
    });
    solverUI.setProblem(initProb);
    document.querySelectorAll('.prob-tab').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-prob') === initProb);
    });
    if (!appState.playing) playBtn.textContent = '▶ Phát mô phỏng';

    const STAGE_MARKS = {
      cau2: [
        { label: '0→A: Rắn nóng lên', p: 0.12 },
        { label: 'A→B: X nóng chảy', p: 0.38 },
        { label: 'B→C: Lên 0 °C', p: 0.65 },
        { label: 'C→T₂: Đá tan', p: 0.89 }
      ],
      cau4: [
        { label: '−5 → 0 °C', p: 0.08 },
        { label: 'Đá nóng chảy (0 °C)', p: 0.44 },
        { label: 'Cân bằng 25 °C', p: 0.99 }
      ]
    };

    function renderStageMarkers() {
      const list = STAGE_MARKS[appState.problem];
      stageMarkersEl.innerHTML = list
        .map(
          (m) =>
            `<button class="stage-chip" data-p="${m.p}">${m.label}</button>`
        )
        .join('');

      stageMarkersEl.querySelectorAll('.stage-chip').forEach((btn) => {
        btn.addEventListener('click', () => {
          appState.progress = parseFloat(btn.getAttribute('data-p'));
          syncAll();
        });
      });
    }

    function computeCurrentSim() {
      if (appState.problem === 'cau2') {
        return PhysicsSim.solveCau2(appState.params.cau2, appState.progress);
      }
      return PhysicsSim.solveCau4(appState.params.cau4, appState.progress);
    }

    function updateHUD(sim) {
      const { state, params } = sim;
      if (appState.problem === 'cau2') {
        hudTemp.textContent = state.temp.toFixed(2) + ' °C';
        hudMetricLabel.textContent = 'Thời gian τ';
        hudMetricVal.textContent = state.tauDisplay.toFixed(1) + ' phút';
      } else {
        hudTemp.textContent = state.tempSystem.toFixed(1) + ' °C';
        hudMetricLabel.textContent = 'Hơi đã sục / Tổng nước';
        hudMetricVal.textContent =
          state.m_hn_injected.toFixed(1) + ' g / ' + state.currentWaterMass.toFixed(1) + ' g';
      }
      hudPhaseTitle.textContent = state.stageName;
      hudPhaseDesc.textContent = state.stageDesc;
      scrubberEl.value = Math.round(appState.progress * 1000);

      // Highlight active stage marker chip
      const chips = stageMarkersEl.querySelectorAll('.stage-chip');
      chips.forEach((c, idx) => {
        c.classList.toggle('active', idx === state.stageIndex);
      });
    }

    // Pool of annotation elements for zero-GC smooth tracking
    const pinPool = new Map();
    function updateAnnotations() {
      const pins = scene3D.getProjectedAnnotations();
      const activeIds = new Set(pins.map((p) => p.id));

      for (const [id, el] of pinPool.entries()) {
        if (!activeIds.has(id)) {
          el.style.display = 'none';
        }
      }

      pins.forEach((p) => {
        let el = pinPool.get(p.id);
        if (!el) {
          el = document.createElement('div');
          el.className = 'pin-3d';
          annotationsEl.appendChild(el);
          pinPool.set(p.id, el);
        }
        el.style.display = 'flex';
        el.className = 'pin-3d pin-' + p.tone;
        el.textContent = p.text;
        el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -120%)`;
      });
    }

    function syncAll() {
      const sim = computeCurrentSim();
      scene3D.updateData(sim);
      solverUI.render(sim);
      updateHUD(sim);
    }

    // Switch Problem tabs
    document.querySelectorAll('.prob-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        const prob = btn.getAttribute('data-prob');
        if (prob === appState.problem) return;
        document.querySelectorAll('.prob-tab').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        appState.problem = prob;
        appState.progress = prob === 'cau2' ? 0.34 : 0.42;
        appState.playing = true;
        playBtn.textContent = '⏸ Tạm dừng';
        scene3D.switchProblem(prob);
        solverUI.setProblem(prob);
        renderStageMarkers();
        syncAll();
      });
    });

    // Layout mode toggle (Song song vs Toàn cảnh 3D)
    document.querySelectorAll('.layout-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-layout');
        document.querySelectorAll('.layout-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        document.body.classList.toggle('mode-3d-full', mode === 'full3d');
        setTimeout(() => scene3D.resize(), 60);
      });
    });

    // Camera Presets
    document.querySelectorAll('.cam-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.cam-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        scene3D.setCameraPreset(btn.getAttribute('data-cam'));
      });
    });

    // 3D Layer Toggles
    function bindToggle(id, initial, fn) {
      const el = document.getElementById(id);
      let state = initial;
      el.classList.toggle('active', state);
      el.addEventListener('click', () => {
        state = !state;
        el.classList.toggle('active', state);
        fn(state);
      });
    }
    bindToggle('tog-cutaway', true, (v) => scene3D.setCutaway(v));
    bindToggle('tog-vectors', true, (v) => scene3D.setShowVectors(v));
    bindToggle('tog-molecules', true, (v) => scene3D.setShowMolecules(v));
    bindToggle('tog-labels', true, (v) => scene3D.setShowLabels(v));

    // Playback controls
    playBtn.addEventListener('click', () => {
      if (appState.progress >= 0.998 && !appState.playing) {
        appState.progress = 0;
      }
      appState.playing = !appState.playing;
      playBtn.textContent = appState.playing ? '⏸ Tạm dừng' : '▶ Phát mô phỏng';
    });

    resetBtn.addEventListener('click', () => {
      appState.progress = 0;
      appState.playing = true;
      playBtn.textContent = '⏸ Tạm dừng';
      syncAll();
    });

    const SPEEDS = [0.5, 1.0, 2.0];
    let speedIdx = 1;
    speedBtn.addEventListener('click', () => {
      speedIdx = (speedIdx + 1) % SPEEDS.length;
      appState.speed = SPEEDS[speedIdx];
      speedBtn.textContent = appState.speed + 'x';
    });

    scrubberEl.addEventListener('input', () => {
      appState.playing = false;
      playBtn.textContent = '▶ Phát mô phỏng';
      appState.progress = parseFloat(scrubberEl.value) / 1000;
      syncAll();
    });

    window.addEventListener('resize', () => scene3D.resize());

    // Initial mount
    renderStageMarkers();
    syncAll();

    // Animation loop
    let lastTs = performance.now();
    function tick(now) {
      const dt = Math.max(0, Math.min((now - lastTs) / 1000, 0.05));
      lastTs = now;

      if (appState.playing) {
        appState.progress += dt * 0.055 * appState.speed;
        if (appState.progress >= 1) {
          appState.progress = 1;
          appState.playing = false;
          playBtn.textContent = '↺ Phát lại';
        }
        syncAll();
      }

      scene3D.renderFrame(dt);
      updateAnnotations();
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
})();
