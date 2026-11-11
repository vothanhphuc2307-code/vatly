/**
 * solver-ui.js
 * Bảng Mô Hình Giải Bài Tương Tác + Đồ thị SVG đồng bộ + Thanh Cân Bằng Năng Lượng + Sandbox
 */
(function (global) {
  'use strict';

  function fmt(num, dec) {
    return Number(num).toLocaleString('vi-VN', {
      minimumFractionDigits: dec,
      maximumFractionDigits: dec
    });
  }

  function fracHTML(numHtml, denHtml) {
    return (
      '<span class="math-frac">' +
      '<span class="num">' + numHtml + '</span>' +
      '<span class="den">' + denHtml + '</span>' +
      '</span>'
    );
  }

  class SolverUI {
    constructor(opts) {
      this.root = opts.container;
      this.onJumpProgress = opts.onJumpProgress || function () {};
      this.onParamsChange = opts.onParamsChange || function () {};
      this.onResetParams = opts.onResetParams || function () {};
      this.activeProblem = 'cau2';
      this.quizHideAnswer = false;
      this.sandboxOpen = false;
      this.renderedProblem = null;
      this.lastParamSig = '';
      this.builtSandboxKey = '';
      this._initLayoutShell();
    }

    _initLayoutShell() {
      this.root.innerHTML = '<div id="solver-problem-slot"></div><div id="solver-sandbox-slot"></div><div id="solver-body-slot"></div>';
      this.problemSlot = this.root.querySelector('#solver-problem-slot');
      this.sandboxSlot = this.root.querySelector('#solver-sandbox-slot');
      this.bodySlot = this.root.querySelector('#solver-body-slot');
    }

    setProblem(probId) {
      this.activeProblem = probId;
      this.renderedProblem = null;
      this.builtSandboxKey = '';
    }

    render(simResult) {
      const prob = this.activeProblem;
      const sandboxKey = prob + '_' + this.sandboxOpen;
      if (this.builtSandboxKey !== sandboxKey) {
        this.builtSandboxKey = sandboxKey;
        this._renderSandboxSlot(simResult.params);
      } else {
        this._syncSandboxValues(simResult.params);
      }

      const paramSig = JSON.stringify(simResult.params) + '_' + this.quizHideAnswer + '_' + this.sandboxOpen;

      if (this.renderedProblem !== prob || this.lastParamSig !== paramSig) {
        this.renderedProblem = prob;
        this.lastParamSig = paramSig;
        if (prob === 'cau2') {
          this._buildCau2DOM(simResult);
        } else {
          this._buildCau4DOM(simResult);
        }
      }

      if (prob === 'cau2') {
        this._updateCau2Dynamic(simResult);
      } else {
        this._updateCau4Dynamic(simResult);
      }
    }

    _renderSandboxSlot(params) {
      if (!this.sandboxOpen) {
        this.sandboxSlot.innerHTML = '';
        return;
      }
      if (this.activeProblem === 'cau2') {
        this.sandboxSlot.innerHTML = this._buildCau2SandboxHTML(params, false);
        this._bindCau2Events();
      } else {
        this.sandboxSlot.innerHTML = this._buildCau4SandboxHTML(params, false);
        this._bindCau4Events();
      }
      const resetBtn = document.getElementById('btn-reset-params');
      if (resetBtn) {
        resetBtn.onclick = () => {
          this.builtSandboxKey = '';
          this.lastParamSig = '';
          this.onResetParams();
        };
      }
    }

    _syncSandboxValues(params) {
      if (!this.sandboxOpen) return;
      if (this.activeProblem === 'cau2') {
        const mEl = document.getElementById('sb-val-m');
        const t0El = document.getElementById('sb-val-t0');
        const aEl = document.getElementById('sb-val-tauA');
        const bEl = document.getElementById('sb-val-tauB');
        if (mEl) mEl.textContent = fmt(params.m, 2) + ' kg';
        if (t0El) t0El.textContent = fmt(params.t0, 0) + ' °C';
        if (aEl) aEl.textContent = fmt(params.tauA, 1) + ' ph';
        if (bEl) bEl.textContent = fmt(params.tauB, 1) + ' ph';
      } else {
        const eqEl = document.getElementById('sb4-val-tEq');
        const mEl = document.getElementById('sb4-val-mTotal');
        const cEl = document.getElementById('sb4-val-C');
        if (eqEl) eqEl.textContent = fmt(params.tEq, 0) + ' °C';
        if (mEl) mEl.textContent = fmt(params.mTotal, 0) + ' g';
        if (cEl) cEl.textContent = fmt(params.C_nlk, 0) + ' J/K';
      }
    }

    /* ======================================================================
     * GIAO DIỆN GIẢI BÀI CÂU 2
     * ====================================================================== */
    _buildCau2DOM(sim) {
      const { params, summary } = sim;

      this.problemSlot.innerHTML = `
          <section class="panel-card problem-box">
            <div class="card-header-row">
              <span class="tag-pill tag-blue">ĐỀ BÀI CÂU 2 · TRẢ LỜI NGẮN</span>
              <div class="mini-actions">
                <button class="chip-btn ${this.sandboxOpen ? 'active' : ''}" id="btn-toggle-sandbox">
                  ⚙ Thử thay số
                </button>
                <button class="chip-btn ${this.quizHideAnswer ? 'active' : ''}" id="btn-toggle-quiz">
                  ${this.quizHideAnswer ? '👁 Hiện đáp số' : '🙈 Ẩn đáp số tự giải'}
                </button>
              </div>
            </div>
            <p class="problem-text">
              Đun hỗn hợp gồm <b>m (kg)</b> chất rắn <b>X</b> (dễ nóng chảy, nhiệt độ sôi khoảng
              <span class="data-chip hint-chip" title="Dữ kiện nhận dạng Thủy ngân (Hg) và cho biết X chưa hề sôi trong đoạn từ -45°C đến 0°C!">357 °C</span>)
              và <b>m (kg)</b> nước đá trong nhiệt lượng kế cách nhiệt bằng dây đun công suất không đổi.
              Nhiệt độ ban đầu là <b>${fmt(params.t0, 0)} °C</b>. Cho c<sub>đá</sub> = ${fmt(params.cIce, 0)} J/(kg·K),
              c<sub>X</sub> = ${fmt(params.cX, 0)} J/(kg·K). Tính <b>a</b> với λ<sub>X</sub> = a·10³ J/kg
              <i>(làm tròn đến hàng phần trăm)</i>.
            </p>
            <div class="data-pills-row">
              <span class="pill pill-silver">t<sub>nc(X)</sub> = ${fmt(params.tMeltX, 2)} °C (Thủy ngân)</span>
              <span class="pill pill-amber">τ<sub>A</sub> = ${fmt(params.tauA, 1)} ph</span>
              <span class="pill pill-amber">τ<sub>B</sub> = ${fmt(params.tauB, 1)} ph</span>
              <span class="pill pill-cyan">m mỗi chất = ${fmt(params.m, 2)} kg (tự triệt tiêu)</span>
            </div>
          </section>
      `;

      this.bodySlot.innerHTML = `
        <div class="solver-stack">

          <!-- Đồ thị tương tác SVG -->
          <section class="panel-card">
            <div class="card-header-row">
              <h3 class="section-title">📈 Đồ thị t (°C) theo thời gian τ (phút)</h3>
              <span class="hint-sub">Click lên từng đoạn đồ thị để tua mô hình 3D</span>
            </div>
            <div class="svg-wrap" id="cau2-svg-wrap">
              ${this._buildCau2SVG(sim)}
            </div>
          </section>

          <!-- Các bước giải chi tiết đồng bộ 3D -->
          <section class="panel-card">
            <div class="card-header-row">
              <h3 class="section-title">🧮 Mô hình Giải bài từng bước</h3>
              <span class="live-badge" id="cau2-stage-pill">Đang chạy...</span>
            </div>

            <div class="steps-list">
              <div class="step-item" data-stage="0" id="c2-step-0">
                <div class="step-head">
                  <span class="step-num">1</span>
                  <span class="step-title">Đoạn 0 → A (0 → ${fmt(params.tauA, 1)} phút): Hỗn hợp rắn tăng nhiệt</span>
                </div>
                <div class="step-body">
                  Cả <b>m (kg) chất rắn X</b> và <b>m (kg) nước đá</b> cùng tăng nhiệt độ Δt₁ = ${fmt(params.tMeltX, 2)} − (${fmt(params.t0, 0)}) = <b>${fmt(summary.dT1, 2)} °C</b>:
                  <div class="formula-line">
                    Q₁ = m·(c<sub>X</sub> + c<sub>đá</sub>)·Δt₁ = m·(${params.cX} + ${params.cIce})·${fmt(summary.dT1, 2)} = <b>${fmt(summary.dT1 * (params.cX + params.cIce), 1)}·m</b> (J) = P · ${fmt(params.tauA, 1)}
                  </div>
                </div>
              </div>

              <div class="step-item" data-stage="1" id="c2-step-1">
                <div class="step-head">
                  <span class="step-num">2</span>
                  <span class="step-title">Đoạn A → B (${fmt(params.tauA, 1)} → ${fmt(params.tauB, 1)} phút): Chỉ chất X nóng chảy</span>
                </div>
                <div class="step-body">
                  Nhiệt độ giữ không đổi ở <b>${fmt(params.tMeltX, 2)} °C</b> (nước đá vẫn rắn, chưa thu nhiệt). Thời gian nóng chảy Δτ₂ = ${fmt(params.tauB, 1)} − ${fmt(params.tauA, 1)} = <b>${fmt(summary.dTauMeltX, 1)} phút</b>:
                  <div class="formula-line">
                    Q₂ = m · λ<sub>X</sub> = P · Δτ₂ = P · ${fmt(summary.dTauMeltX, 1)}
                  </div>
                </div>
              </div>

              <div class="step-item" data-stage="2" id="c2-step-2">
                <div class="step-head">
                  <span class="step-num">3</span>
                  <span class="step-title">Lập tỉ số triệt tiêu khối lượng m & công suất P</span>
                </div>
                <div class="step-body">
                  Vì công suất P không đổi nên nhiệt lượng tỉ lệ thuận với thời gian đun:
                  <div class="formula-line">
                    ${fracHTML('Q₂', 'Q₁')} = ${fracHTML('m · λ<sub>X</sub>', 'm·(c<sub>X</sub> + c<sub>đá</sub>)·Δt₁')} = ${fracHTML('Δτ₂', 'τ₁')}
                    &nbsp;⇒&nbsp; λ<sub>X</sub> = (${params.cX} + ${params.cIce}) · ${fmt(summary.dT1, 2)} · ${fracHTML(fmt(summary.dTauMeltX, 1), fmt(params.tauA, 1))}
                  </div>
                  <div class="formula-line result-sub ${this.quizHideAnswer ? 'blurred-ans' : ''}">
                    λ<sub>X</sub> ≈ <b>${fmt(summary.lambdaX, 2)} J/kg</b> = <b>${fmt(summary.aValue, 3)}·10³ J/kg</b>
                  </div>
                </div>
              </div>

              <div class="step-item" data-stage="3" id="c2-step-3">
                <div class="step-head">
                  <span class="step-num">4</span>
                  <span class="step-title">Đoạn B → C → T₂ (Diễn biến thực tế tiếp theo)</span>
                </div>
                <div class="step-body">
                  Lỏng X và nước đá cùng tăng từ ${fmt(params.tMeltX, 2)} °C lên 0 °C (điểm C), rồi nước đá tan chảy tại 0 °C (đến T₂). Điểm sôi 357 °C của X còn rất xa.
                </div>
              </div>
            </div>

            <!-- Hộp Đáp số & Bẫy đề thi -->
            <div class="answer-banner ${this.quizHideAnswer ? 'blurred-ans' : ''}">
              <div>
                <div class="ans-label">ĐÁP ÁN PHẦN TRẢ LỜI NGẮN</div>
                <div class="ans-value">a = ${fmt(summary.aRounded, 2)}</div>
              </div>
              <div class="ans-fact">
                <b>Nhận dạng thực tế:</b> Chất X chính là <b>Thủy ngân (Hg)</b> — kim loại duy nhất ở thể lỏng ở nhiệt độ phòng, nóng chảy ở −38,83 °C, sôi ở 357 °C, λ<sub>Hg</sub> ≈ 11,4 kJ/kg!
              </div>
            </div>

            <div class="trap-box">
              <div class="trap-title">⚠ Lưu ý tránh 2 bẫy phổ biến khi giải nháp:</div>
              <ul>
                <li><b>Bẫy 1 (Dữ kiện 357 °C):</b> Đây là nhiệt độ sôi của Thủy ngân để nhận biết chất X chưa bị bay hơi; <b>không lấy (357 + 45)</b> vì đồ thị chỉ chạy đến 0 °C!</li>
                <li><b>Bẫy 2 (Quên nước đá trong đoạn 0 → A):</b> Ở −45 °C đến −38,83 °C, cả <b>m kg nước đá (2100)</b> và <b>m kg chất X (140)</b> nằm chung nhiệt lượng kế nên cùng tăng nhiệt!</li>
              </ul>
            </div>
          </section>
        </div>
      `;

      this._bindCommonEvents();
    }

    _buildCau2SandboxHTML(params) {
      return `
        <div class="sandbox-drawer">
          <div class="sandbox-row">
            <label>Khối lượng m mỗi chất: <b id="sb-val-m">${fmt(params.m, 2)} kg</b></label>
            <input type="range" min="0.1" max="2.0" step="0.05" value="${params.m}" data-key="m">
          </div>
          <div class="sandbox-row">
            <label>Nhiệt độ ban đầu t₀: <b id="sb-val-t0">${fmt(params.t0, 0)} °C</b></label>
            <input type="range" min="-70" max="-41" step="1" value="${params.t0}" data-key="t0">
          </div>
          <div class="sandbox-row">
            <label>Thời điểm A (τ<sub>A</sub>): <b id="sb-val-tauA">${fmt(params.tauA, 1)} ph</b></label>
            <input type="range" min="5" max="22" step="0.5" value="${params.tauA}" data-key="tauA">
          </div>
          <div class="sandbox-row">
            <label>Thời điểm B (τ<sub>B</sub>): <b id="sb-val-tauB">${fmt(params.tauB, 1)} ph</b></label>
            <input type="range" min="16" max="45" step="0.2" value="${params.tauB}" data-key="tauB">
          </div>
          <div class="sandbox-foot">
            <small>Thử kéo slider <b>m</b> để thấy giá trị <b>a</b> hoàn toàn KHÔNG đổi!</small>
            <button class="chip-btn" id="btn-reset-params">↺ Khôi phục đề gốc</button>
          </div>
        </div>
      `;
    }

    _buildCau2SVG(sim) {
      const { params, summary } = sim;
      // Tọa độ đồ thị SVG 480 x 210
      // X: 0->56, A->145, B->245, C(T1)->348, T2->422
      // Y: 0°C -> 34, -38.83°C -> 106, -45°C -> 165
      return `
        <svg viewBox="0 0 480 212" class="physics-svg" id="cau2-svg">
          <defs>
            <linearGradient id="area0A" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.28"/>
              <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.02"/>
            </linearGradient>
            <linearGradient id="areaAB" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.28"/>
              <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.02"/>
            </linearGradient>
          </defs>

          <!-- Vùng highlight tương tác -->
          <polygon points="56,165 145,106 145,165" fill="url(#area0A)" class="svg-zone" data-p="0.12" />
          <rect x="145" y="106" width="100" height="59" fill="url(#areaAB)" class="svg-zone" data-p="0.38" />
          <polygon points="245,106 348,34 348,165 245,165" fill="rgba(45,212,191,0.08)" class="svg-zone" data-p="0.65" />
          <rect x="348" y="34" width="74" height="131" fill="rgba(56,189,248,0.08)" class="svg-zone" data-p="0.89" />

          <!-- Trục tọa độ -->
          <line x1="56" y1="18" x2="56" y2="170" stroke="#94a3b8" stroke-width="2" />
          <polygon points="56,10 51,21 61,21" fill="#94a3b8" />
          <line x1="46" y1="165" x2="454" y2="165" stroke="#94a3b8" stroke-width="2" />
          <polygon points="462,165 451,160 451,170" fill="#94a3b8" />

          <!-- Đường gióng nét đứt -->
          <line x1="56" y1="34" x2="422" y2="34" stroke="#475569" stroke-dasharray="4 4" stroke-width="1.2" />
          <line x1="56" y1="106" x2="245" y2="106" stroke="#475569" stroke-dasharray="4 4" stroke-width="1.2" />
          <line x1="145" y1="106" x2="145" y2="165" stroke="#475569" stroke-dasharray="4 4" stroke-width="1.2" />
          <line x1="245" y1="106" x2="245" y2="165" stroke="#475569" stroke-dasharray="4 4" stroke-width="1.2" />
          <line x1="348" y1="34" x2="348" y2="165" stroke="#475569" stroke-dasharray="4 4" stroke-width="1.2" />
          <line x1="422" y1="34" x2="422" y2="165" stroke="#475569" stroke-dasharray="4 4" stroke-width="1.2" />

          <!-- Đường đồ thị chính -->
          <polyline points="56,165 145,106 245,106 348,34 422,34"
            fill="none" stroke="#38bdf8" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round" />
          <!-- Nhấn mạnh đoạn AB nóng chảy X -->
          <line x1="145" y1="106" x2="245" y2="106" stroke="#fbbf24" stroke-width="4" stroke-linecap="round" />

          <!-- Các điểm mốc -->
          <circle cx="56" cy="165" r="4" fill="#38bdf8" />
          <circle cx="145" cy="106" r="4.5" fill="#fbbf24" />
          <circle cx="245" cy="106" r="4.5" fill="#fbbf24" />
          <circle cx="348" cy="34" r="4.5" fill="#34d399" />

          <!-- Chú thích Δt1 và Δτ2 -->
          <text x="112" y="155" fill="#7dd3fc" font-size="10.5" font-weight="600" text-anchor="middle">Δt₁=${fmt(summary.dT1, 2)}°</text>
          <text x="195" y="132" fill="#fde047" font-size="11" font-weight="700" text-anchor="middle">X nóng chảy</text>
          <text x="195" y="147" fill="#fef08a" font-size="10.5" font-weight="600" text-anchor="middle">Δτ₂ = ${fmt(summary.dTauMeltX, 1)} ph</text>
          <text x="387" y="24" fill="#7dd3fc" font-size="10.5" font-weight="600" text-anchor="middle">Đá tan (0°C)</text>

          <!-- Nhãn trục & điểm -->
          <text x="66" y="18" fill="#e2e8f0" font-size="12" font-weight="700">t (°C)</text>
          <text x="472" y="198" fill="#e2e8f0" font-size="12" font-weight="700" text-anchor="end">τ (phút)</text>

          <text x="48" y="38" fill="#cbd5e1" font-size="11" text-anchor="end">0</text>
          <text x="48" y="110" fill="#fde047" font-size="11" font-weight="700" text-anchor="end">${fmt(params.tMeltX, 2)}</text>
          <text x="48" y="169" fill="#cbd5e1" font-size="11" text-anchor="end">${fmt(params.t0, 0)}</text>

          <text x="139" y="95" fill="#f8fafc" font-size="12" font-weight="700" text-anchor="middle">A</text>
          <text x="251" y="95" fill="#f8fafc" font-size="12" font-weight="700" text-anchor="middle">B</text>
          <text x="348" y="24" fill="#f8fafc" font-size="12" font-weight="700" text-anchor="middle">C</text>

          <text x="56" y="182" fill="#94a3b8" font-size="11" text-anchor="middle">0</text>
          <text x="145" y="182" fill="#fde047" font-size="11" font-weight="700" text-anchor="middle">${fmt(params.tauA, 1)}</text>
          <text x="245" y="182" fill="#fde047" font-size="11" font-weight="700" text-anchor="middle">${fmt(params.tauB, 1)}</text>
          <text x="348" y="182" fill="#94a3b8" font-size="11" text-anchor="middle">T₁</text>
          <text x="422" y="182" fill="#94a3b8" font-size="11" text-anchor="middle">T₂</text>

          <!-- Con trỏ động theo thời gian thực -->
          <line id="c2-cursor-line" x1="56" y1="30" x2="56" y2="165" stroke="#fb7185" stroke-width="1.4" stroke-dasharray="3 3" />
          <circle id="c2-cursor-glow" cx="56" cy="165" r="10" fill="rgba(251,113,133,0.35)" />
          <circle id="c2-cursor-dot" cx="56" cy="165" r="5" fill="#fb7185" stroke="#fff" stroke-width="1.8" />
        </svg>
      `;
    }

    _updateCau2Dynamic(sim) {
      const { state } = sim;
      const p = state.progress;

      // Tính vị trí con trỏ dọc theo 4 đoạn polyline của đồ thị SVG
      let cx = 56;
      let cy = 165;
      if (p < 0.24) {
        const u = p / 0.24;
        cx = PhysicsSim.lerp(56, 145, u);
        cy = PhysicsSim.lerp(165, 106, u);
      } else if (p < 0.52) {
        const u = (p - 0.24) / 0.28;
        cx = PhysicsSim.lerp(145, 245, u);
        cy = 106;
      } else if (p < 0.78) {
        const u = (p - 0.52) / 0.26;
        cx = PhysicsSim.lerp(245, 348, u);
        cy = PhysicsSim.lerp(106, 34, u);
      } else {
        const u = (p - 0.78) / 0.22;
        cx = PhysicsSim.lerp(348, 422, u);
        cy = 34;
      }

      const dot = document.getElementById('c2-cursor-dot');
      const glow = document.getElementById('c2-cursor-glow');
      const line = document.getElementById('c2-cursor-line');
      if (dot && glow && line) {
        dot.setAttribute('cx', cx.toFixed(1));
        dot.setAttribute('cy', cy.toFixed(1));
        glow.setAttribute('cx', cx.toFixed(1));
        glow.setAttribute('cy', cy.toFixed(1));
        line.setAttribute('x1', cx.toFixed(1));
        line.setAttribute('x2', cx.toFixed(1));
      }

      const pill = document.getElementById('cau2-stage-pill');
      if (pill) pill.textContent = state.stageName;

      for (let i = 0; i < 4; i++) {
        const el = document.getElementById('c2-step-' + i);
        if (el) el.classList.toggle('active-step', i === state.stageIndex);
      }
    }

    /* ======================================================================
     * GIAO DIỆN GIẢI BÀI CÂU 4
     * ====================================================================== */
    _buildCau4DOM(sim) {
      const { params, summary } = sim;

      this.problemSlot.innerHTML = `
          <section class="panel-card problem-box">
            <div class="card-header-row">
              <span class="tag-pill tag-emerald">ĐỀ BÀI CÂU 4 · TRẢ LỜI NGẮN</span>
              <div class="mini-actions">
                <button class="chip-btn ${this.sandboxOpen ? 'active' : ''}" id="btn-toggle-sandbox">
                  ⚙ Thử thay số
                </button>
                <button class="chip-btn ${this.quizHideAnswer ? 'active' : ''}" id="btn-toggle-quiz">
                  ${this.quizHideAnswer ? '👁 Hiện đáp số' : '🙈 Ẩn đáp số tự giải'}
                </button>
              </div>
            </div>
            <p class="problem-text">
              Nhiệt lượng kế bằng nhôm (nhiệt dung <b>C = ${fmt(params.C_nlk, 0)} J/K</b>) chứa viên nước đá nặng <b>m<sub>đ</sub> (g)</b>
              cùng ở <b>${fmt(params.tInit, 0)} °C</b>. Cho <b>m<sub>hn</sub> (g)</b> hơi nước ở <b>${fmt(params.tSteam, 0)} °C</b> vào;
              khi cân bằng nhiệt ở <b>${fmt(params.tEq, 0)} °C</b> thì có <b>${fmt(params.mTotal, 0)} (g)</b> nước.
              Tính khối lượng hơi nước <b>m<sub>hn</sub></b> <i>(làm tròn đến hàng đơn vị)</i>.
            </p>
            <div class="data-pills-row">
              <span class="pill pill-cyan">c<sub>đá</sub> = 2,09 J/g·K</span>
              <span class="pill pill-cyan">λ<sub>đá</sub> = 334 J/g</span>
              <span class="pill pill-emerald">c<sub>nước</sub> = 4,19 J/g·K</span>
              <span class="pill pill-coral">L = 2,26·10³ J/g</span>
            </div>
          </section>
      `;

      this.bodySlot.innerHTML = `
        <div class="solver-stack">

          <!-- Giản đồ Nhiệt độ & Biểu đồ Cân bằng Năng lượng -->
          <section class="panel-card">
            <div class="card-header-row">
              <h3 class="section-title">⚖ Giản đồ Nhiệt độ & Cân bằng Nhiệt lượng</h3>
              <span class="hint-sub" id="c4-q-total-label">Q<sub>cb</sub> = ${fmt(summary.Q_totalThu, 0)} J</span>
            </div>
            ${this._buildCau4DiagramHTML(sim)}
          </section>

          <!-- Các bước giải chi tiết -->
          <section class="panel-card">
            <div class="card-header-row">
              <h3 class="section-title">🧮 Mô hình Giải bài: Q<sub>thu</sub> = Q<sub>tỏa</sub></h3>
              <span class="live-badge" id="cau4-stage-pill">Đang chạy...</span>
            </div>

            ${
              !summary.isValid
                ? '<div class="trap-box">⚠ Thông số Sandbox hiện tại khiến nước không cân bằng ở thể lỏng hoàn toàn. Hãy chỉnh lại t<sub>cb</sub> hoặc khối lượng!</div>'
                : ''
            }

            <div class="steps-list">
              <div class="step-item" data-stage="0" id="c4-step-0">
                <div class="step-head">
                  <span class="step-num">1</span>
                  <span class="step-title">Bảo toàn khối lượng nước sau cân bằng</span>
                </div>
                <div class="step-body">
                  Toàn bộ đá tan chảy thành nước và hơi nước ngưng tụ thành nước:
                  <div class="formula-line">
                    m<sub>đ</sub> + m<sub>hn</sub> = ${fmt(params.mTotal, 0)} g &nbsp;⇒&nbsp; <b>m<sub>đ</sub> = ${fmt(params.mTotal, 0)} − m<sub>hn</sub></b> (g)
                  </div>
                </div>
              </div>

              <div class="step-item" data-stage="1" id="c4-step-1">
                <div class="step-head">
                  <span class="step-num">2</span>
                  <span class="step-title">Tổng nhiệt lượng thu vào Q<sub>thu</sub> (Nhôm + Đá qua 3 chặng)</span>
                </div>
                <div class="step-body">
                  <ul class="compact-list">
                    <li>Nhiệt lượng kế nhôm (${params.tInit} → ${params.tEq} °C): <b>Q<sub>nlk</sub> = ${params.C_nlk} · ${fmt(summary.dT_nlk, 0)} = ${fmt(summary.Q_nlk, 0)} J</b></li>
                    <li>Đá ấm (${params.tInit} → 0 °C): m<sub>đ</sub>·2,09·${fmt(0 - params.tInit, 0)} = <b>${fmt(summary.qIceWarmPerG, 2)}·m<sub>đ</sub></b></li>
                    <li>Đá nóng chảy (0 °C): <b>334·m<sub>đ</sub></b></li>
                    <li>Nước từ đá ấm (0 → ${params.tEq} °C): m<sub>đ</sub>·4,19·${fmt(params.tEq, 0)} = <b>${fmt(summary.qWaterWarmPerG, 2)}·m<sub>đ</sub></b></li>
                  </ul>
                  <div class="formula-line">
                    Q<sub>thu</sub> = ${fmt(summary.Q_nlk, 0)} + <b>${fmt(summary.kThu, 2)}</b>·(${fmt(params.mTotal, 0)} − m<sub>hn</sub>)
                  </div>
                </div>
              </div>

              <div class="step-item" data-stage="2" id="c4-step-2">
                <div class="step-head">
                  <span class="step-num">3</span>
                  <span class="step-title">Tổng nhiệt lượng tỏa ra Q<sub>tỏa</sub> (Hơi ngưng tụ + Nguội)</span>
                </div>
                <div class="step-body">
                  <ul class="compact-list">
                    <li>Hơi ngưng tụ tại 100 °C: <b>2 260·m<sub>hn</sub></b></li>
                    <li>Nước nguội (${params.tSteam} → ${params.tEq} °C): m<sub>hn</sub>·4,19·${fmt(params.tSteam - params.tEq, 0)} = <b>${fmt(summary.qSteamCoolPerG, 2)}·m<sub>hn</sub></b></li>
                  </ul>
                  <div class="formula-line">
                    Q<sub>tỏa</sub> = (2 260 + ${fmt(summary.qSteamCoolPerG, 2)})·m<sub>hn</sub> = <b>${fmt(summary.kToa, 2)}·m<sub>hn</sub></b>
                  </div>
                </div>
              </div>

              <div class="step-item" data-stage="3" id="c4-step-3">
                <div class="step-head">
                  <span class="step-num">4</span>
                  <span class="step-title">Giải phương trình cân bằng nhiệt: Q<sub>thu</sub> = Q<sub>tỏa</sub></span>
                </div>
                <div class="step-body">
                  <div class="formula-line">
                    ${fmt(summary.Q_nlk, 0)} + ${fmt(summary.kThu * params.mTotal, 0)} = (${fmt(summary.kToa, 2)} + ${fmt(summary.kThu, 2)})·m<sub>hn</sub>
                  </div>
                  <div class="formula-line result-sub ${this.quizHideAnswer ? 'blurred-ans' : ''}">
                    m<sub>hn</sub> = ${fracHTML(fmt(summary.Q_nlk + summary.kThu * params.mTotal, 0), fmt(summary.kToa + summary.kThu, 2))} ≈ <b>${fmt(summary.m_hn, 2)} g</b>
                    &nbsp;(khi đó m<sub>đ</sub> ≈ ${fmt(summary.m_da, 2)} g)
                  </div>
                </div>
              </div>
            </div>

            <div class="answer-banner ${this.quizHideAnswer ? 'blurred-ans' : ''}">
              <div>
                <div class="ans-label">ĐÁP ÁN PHẦN TRẢ LỜI NGẮN</div>
                <div class="ans-value">m<sub>hn</sub> ≈ ${summary.m_hn_rounded} g</div>
              </div>
              <div class="ans-fact">
                Chỉ cần <b>~${summary.m_hn_rounded} g hơi nước</b> (≈ 15% tổng lượng nước) đã làm tan chảy hoàn toàn <b>${fmt(summary.m_da, 1)} g đá</b> và đưa cả hệ lên ${params.tEq} °C nhờ nhiệt hóa hơi L = 2 260 J/g cực lớn!
              </div>
            </div>

            <div class="trap-box">
              <div class="trap-title">⚠ Lưu ý tránh 3 bẫy phổ biến khi giải nháp:</div>
              <ul>
                <li><b>Bẫy 1 (Độ tăng nhiệt của đá):</b> Không viết <code>m<sub>đ</sub>·2,09·30</code>! Đá chỉ tăng <b>5 °C</b> (từ −5 lên 0 °C) rồi tan, sau đó thành <b>nước lỏng</b> mới tăng <b>25 °C</b> với c = 4,19!</li>
                <li><b>Bẫy 2 (Nhiệt dung C = 264 J/K):</b> Đã là C = m·c của cốc nhôm nên chỉ nhân với Δt = 30 K, không nhân thêm khối lượng.</li>
                <li><b>Bẫy 3 (Hơi ngưng tụ nguội tiếp):</b> Sau khi hóa lỏng ở 100 °C, lượng nước m<sub>hn</sub> đó còn tỏa thêm nhiệt khi hạ từ 100 °C xuống 25 °C.</li>
              </ul>
            </div>
          </section>
        </div>
      `;

      this._bindCommonEvents();
    }

    _buildCau4SandboxHTML(params) {
      return `
        <div class="sandbox-drawer">
          <div class="sandbox-row">
            <label>Nhiệt độ cân bằng t<sub>cb</sub>: <b id="sb4-val-tEq">${fmt(params.tEq, 0)} °C</b></label>
            <input type="range" min="5" max="60" step="1" value="${params.tEq}" data-key="tEq">
          </div>
          <div class="sandbox-row">
            <label>Tổng lượng nước cuối: <b id="sb4-val-mTotal">${fmt(params.mTotal, 0)} g</b></label>
            <input type="range" min="200" max="1000" step="20" value="${params.mTotal}" data-key="mTotal">
          </div>
          <div class="sandbox-row">
            <label>Nhiệt dung NLK Nhôm (C): <b id="sb4-val-C">${fmt(params.C_nlk, 0)} J/K</b></label>
            <input type="range" min="50" max="600" step="10" value="${params.C_nlk}" data-key="C_nlk">
          </div>
          <div class="sandbox-foot">
            <small>Quan sát mực nước và tỉ lệ hơi cần thiết thay đổi tức thì trong 3D!</small>
            <button class="chip-btn" id="btn-reset-params">↺ Khôi phục đề gốc</button>
          </div>
        </div>
      `;
    }

    _buildCau4DiagramHTML(sim) {
      const { params, summary } = sim;
      const tot = Math.max(1, summary.Q_totalThu);
      const pNlk = (summary.Q_nlk / tot) * 100;
      const pIceWarm = (summary.Q_iceWarm / tot) * 100;
      const pIceMelt = (summary.Q_iceMelt / tot) * 100;
      const pWaterWarm = (summary.Q_waterWarm / tot) * 100;
      const pSteamCond = (summary.Q_steamCond / tot) * 100;
      const pSteamCool = (summary.Q_steamCool / tot) * 100;

      return `
        <div class="diagram-c4">
          <svg viewBox="0 0 480 124" class="physics-svg">
            <!-- Đường trục nhiệt độ ngang -->
            <line x1="28" y1="62" x2="452" y2="62" stroke="#475569" stroke-width="2" />
            <!-- Các mốc nhiệt độ -->
            <circle cx="48" cy="62" r="5" fill="#38bdf8" />
            <text x="48" y="84" fill="#7dd3fc" font-size="11" font-weight="700" text-anchor="middle">${params.tInit}°C</text>

            <circle cx="132" cy="62" r="5" fill="#bae6fd" />
            <text x="132" y="84" fill="#bae6fd" font-size="11" font-weight="700" text-anchor="middle">0°C (Tan)</text>

            <circle cx="255" cy="62" r="7" fill="#34d399" stroke="#fff" stroke-width="2" />
            <text x="255" y="86" fill="#34d399" font-size="12" font-weight="700" text-anchor="middle">Cân bằng ${params.tEq}°C</text>

            <circle cx="430" cy="62" r="5" fill="#fb7185" />
            <text x="430" y="84" fill="#fda4af" font-size="11" font-weight="700" text-anchor="middle">100°C (Hơi)</text>

            <!-- Cung mũi tên Q_thu (trái -> giữa) -->
            <path d="M 48 54 Q 150 12 250 53" fill="none" stroke="#38bdf8" stroke-width="2.4" class="svg-zone" data-p="0.45" />
            <text x="148" y="24" fill="#7dd3fc" font-size="11" font-weight="700" text-anchor="middle">Q_thu: Nhôm + Đá + Nước</text>

            <!-- Cung mũi tên Q_tỏa (phải -> giữa) -->
            <path d="M 430 54 Q 345 12 262 53" fill="none" stroke="#fb7185" stroke-width="2.4" class="svg-zone" data-p="0.86" />
            <text x="348" y="24" fill="#fda4af" font-size="11" font-weight="700" text-anchor="middle">Q_tỏa: Hơi ngưng + Nguội</text>

            <!-- Con trỏ tiến trình trên sơ đồ -->
            <circle id="c4-prog-dot" cx="48" cy="62" r="6" fill="#fbbf24" />
            <text id="c4-prog-lbl" x="240" y="112" fill="#e2e8f0" font-size="11" text-anchor="middle">Tiến trình thực tế: 0%</text>
          </svg>

          <!-- Thanh phân rã tỉ trọng năng lượng Q_thu vs Q_tỏa -->
          <div class="energy-bars">
            <div class="ebar-row">
              <div class="ebar-meta"><span><b>Q<sub>thu</sub></b></span><span id="c4-qthu-val">0 / ${fmt(tot, 0)} J</span></div>
              <div class="ebar-track">
                <div class="ebar-seg seg-nlk" style="width:${pNlk.toFixed(1)}%" title="Nhôm NLK: ${fmt(summary.Q_nlk, 0)} J"></div>
                <div class="ebar-seg seg-icew" style="width:${pIceWarm.toFixed(1)}%" title="Đá ấm lên 0°C: ${fmt(summary.Q_iceWarm, 0)} J"></div>
                <div class="ebar-seg seg-melt" style="width:${pIceMelt.toFixed(1)}%" title="Đá nóng chảy: ${fmt(summary.Q_iceMelt, 0)} J"></div>
                <div class="ebar-seg seg-watw" style="width:${pWaterWarm.toFixed(1)}%" title="Nước lên 25°C: ${fmt(summary.Q_waterWarm, 0)} J"></div>
                <div class="ebar-mask" id="c4-mask-thu"></div>
              </div>
              <div class="ebar-legend">
                <span><i class="dot seg-nlk"></i>Nhôm (${pNlk.toFixed(1)}%)</span>
                <span><i class="dot seg-icew"></i>Đá ấm (${pIceWarm.toFixed(1)}%)</span>
                <span><i class="dot seg-melt"></i>Đá tan (${pIceMelt.toFixed(1)}%)</span>
                <span><i class="dot seg-watw"></i>Nước ấm (${pWaterWarm.toFixed(1)}%)</span>
              </div>
            </div>

            <div class="ebar-row">
              <div class="ebar-meta"><span><b>Q<sub>tỏa</sub></b></span><span id="c4-qtoa-val">0 / ${fmt(tot, 0)} J</span></div>
              <div class="ebar-track">
                <div class="ebar-seg seg-cond" style="width:${pSteamCond.toFixed(1)}%" title="Hơi ngưng tụ 100°C: ${fmt(summary.Q_steamCond, 0)} J"></div>
                <div class="ebar-seg seg-cool" style="width:${pSteamCool.toFixed(1)}%" title="Nước nguội xuống 25°C: ${fmt(summary.Q_steamCool, 0)} J"></div>
                <div class="ebar-mask" id="c4-mask-toa"></div>
              </div>
              <div class="ebar-legend">
                <span><i class="dot seg-cond"></i>Hơi ngưng tụ 100°C (${pSteamCond.toFixed(1)}%)</span>
                <span><i class="dot seg-cool"></i>Nước nguội về ${params.tEq}°C (${pSteamCool.toFixed(1)}%)</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    _updateCau4Dynamic(sim) {
      const { state, summary, params } = sim;
      const tot = Math.max(1, summary.Q_totalThu);
      const pctDone = PhysicsSim.clamp((state.Q_absorbed_now / tot) * 100, 0, 100);

      const maskThu = document.getElementById('c4-mask-thu');
      const maskToa = document.getElementById('c4-mask-toa');
      if (maskThu) maskThu.style.width = (100 - pctDone).toFixed(1) + '%';
      if (maskToa) maskToa.style.width = (100 - pctDone).toFixed(1) + '%';

      const qThuEl = document.getElementById('c4-qthu-val');
      const qToaEl = document.getElementById('c4-qtoa-val');
      if (qThuEl) qThuEl.textContent = fmt(state.Q_absorbed_now, 0) + ' / ' + fmt(tot, 0) + ' J';
      if (qToaEl) qToaEl.textContent = fmt(state.Q_released_now, 0) + ' / ' + fmt(tot, 0) + ' J';

      const pill = document.getElementById('cau4-stage-pill');
      if (pill) pill.textContent = state.stageName;

      // Highlight bước giải liên quan
      for (let i = 0; i < 4; i++) {
        const el = document.getElementById('c4-step-' + i);
        if (!el) continue;
        const active =
          (state.stageIndex === 0 && (i === 0 || i === 1)) ||
          (state.stageIndex === 1 && (i === 1 || i === 2)) ||
          (state.stageIndex === 2 && i === 3);
        el.classList.toggle('active-step', active);
      }

      // Di chuyển con trỏ nhiệt độ trên trục ngang
      const dot = document.getElementById('c4-prog-dot');
      const lbl = document.getElementById('c4-prog-lbl');
      if (dot && lbl) {
        let cx = 48;
        if (state.tempSystem <= 0) {
          const u = PhysicsSim.clamp((state.tempSystem - params.tInit) / (0 - params.tInit), 0, 1);
          cx = PhysicsSim.lerp(48, 132, u);
        } else {
          const u = PhysicsSim.clamp(state.tempSystem / params.tEq, 0, 1);
          cx = PhysicsSim.lerp(132, 255, u);
        }
        dot.setAttribute('cx', cx.toFixed(1));
        lbl.textContent =
          'Nhiệt độ cốc: ' +
          state.tempSystem.toFixed(1) +
          ' °C · Đã sục ' +
          state.m_hn_injected.toFixed(1) +
          ' g hơi · Tổng nước+đá: ' +
          state.currentWaterMass.toFixed(1) +
          ' g';
      }
    }

    _bindCommonEvents() {
      const sbBtn = document.getElementById('btn-toggle-sandbox');
      if (sbBtn) {
        sbBtn.onclick = () => {
          this.sandboxOpen = !this.sandboxOpen;
          this.lastParamSig = '';
          this.onParamsChange({});
        };
      }
      const qzBtn = document.getElementById('btn-toggle-quiz');
      if (qzBtn) {
        qzBtn.onclick = () => {
          this.quizHideAnswer = !this.quizHideAnswer;
          this.lastParamSig = '';
          this.onParamsChange({});
        };
      }
      const resetBtn = document.getElementById('btn-reset-params');
      if (resetBtn) {
        resetBtn.onclick = () => {
          this.lastParamSig = '';
          this.onResetParams();
        };
      }

      this.root.querySelectorAll('.svg-zone').forEach((zone) => {
        zone.addEventListener('click', () => {
          const p = parseFloat(zone.getAttribute('data-p'));
          if (!isNaN(p)) this.onJumpProgress(p);
        });
      });

      this.root.querySelectorAll('.step-item').forEach((el) => {
        el.addEventListener('click', () => {
          const st = parseInt(el.getAttribute('data-stage'), 10);
          if (this.activeProblem === 'cau2') {
            const targets = [0.12, 0.38, 0.48, 0.88];
            this.onJumpProgress(targets[st] || 0);
          } else {
            const targets = [0.08, 0.44, 0.78, 0.99];
            this.onJumpProgress(targets[st] || 0);
          }
        });
      });
    }

    _bindCau2Events() {
      this.root.querySelectorAll('.sandbox-drawer input[type="range"]').forEach((inp) => {
        inp.addEventListener('input', () => {
          const key = inp.getAttribute('data-key');
          const val = parseFloat(inp.value);
          this.onParamsChange({ [key]: val });
        });
      });
    }

    _bindCau4Events() {
      this.root.querySelectorAll('.sandbox-drawer input[type="range"]').forEach((inp) => {
        inp.addEventListener('input', () => {
          const key = inp.getAttribute('data-key');
          const val = parseFloat(inp.value);
          this.onParamsChange({ [key]: val });
        });
      });
    }
  }

  global.SolverUI = SolverUI;
})(window);
