/**
 * physics.js
 * Động cơ tính toán Vật Lí Nhiệt cho Câu 2 & Câu 4 (Phần III - Trả lời ngắn)
 * Đảm bảo tính chính xác tuyệt đối về mặt vật lí và đồng bộ hóa theo tiến trình p ∈ [0, 1].
 */
(function (global) {
  'use strict';

  const DEFAULTS = {
    cau2: {
      m: 0.5,           // kg (mỗi chất: m kg X và m kg nước đá)
      t0: -45,          // °C
      tMeltX: -38.83,   // °C (Thủy ngân)
      tBoilX: 357,      // °C (dữ kiện nhận dạng Hg, không sôi trong miền khảo sát)
      cX: 140,          // J/(kg.K)
      cIce: 2100,       // J/(kg.K)
      lambdaIce: 334000,// J/kg
      tauA: 15.0,       // phút
      tauB: 27.4        // phút
    },
    cau4: {
      tInit: -5,        // °C (nhiệt lượng kế & nước đá)
      tMelt: 0,         // °C
      tSteam: 100,      // °C
      tEq: 25,          // °C (nhiệt độ cân bằng)
      mTotal: 500,      // g (tổng khối lượng nước lúc cân bằng)
      C_nlk: 264,       // J/K (nhiệt dung của nhiệt lượng kế nhôm)
      cIce: 2.09,       // J/(g.K)
      lambdaIce: 334,   // J/g
      cWater: 4.19,     // J/(g.K)
      LSteam: 2260      // J/g (2,26 * 10^3 J/g)
    }
  };

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function lerp(a, b, t) {
    return a + (b - a) * clamp(t, 0, 1);
  }

  /**
   * Tính toàn bộ đại lượng giải bài và trạng thái tức thời tại tiến trình p ∈ [0, 1] cho Câu 2
   */
  function solveCau2(rawParams, p) {
    const cfg = Object.assign({}, DEFAULTS.cau2, rawParams || {});
    // Bảo vệ các ràng buộc vật lí
    const t0 = Math.min(cfg.t0, cfg.tMeltX - 0.5);
    const tauA = Math.max(1, cfg.tauA);
    const tauB = Math.max(tauA + 0.5, cfg.tauB);
    const dTauMeltX = tauB - tauA;
    const dT1 = cfg.tMeltX - t0;

    // Q1 = m * (cX + cIce) * dT1
    const q1PerKg = (cfg.cX + cfg.cIce) * dT1; // J trên 1 kg mỗi chất
    const Q1 = cfg.m * q1PerKg;

    // Công suất đun không đổi P (tính theo J/phút và Watt)
    const powerPerMin = Q1 / tauA;
    const powerWatt = powerPerMin / 60;

    // Q2 = P * (tauB - tauA) = m * lambdaX
    const Q2 = powerPerMin * dTauMeltX;
    const lambdaX = (cfg.cX + cfg.cIce) * dT1 * (dTauMeltX / tauA);
    const aValue = lambdaX / 1000;
    const aRounded = Math.round(aValue * 100) / 100;

    // Thời gian giai đoạn B -> C (lên 0 °C) và C -> T2 (đá tan hoàn toàn)
    const dT3 = 0 - cfg.tMeltX;
    const Q3 = cfg.m * (cfg.cX + cfg.cIce) * dT3; // c_Hg lỏng ≈ 140 J/(kg.K)
    const dTau3 = Q3 / powerPerMin;
    const T1 = tauB + dTau3;

    const Q4 = cfg.m * cfg.lambdaIce;
    const dTau4 = Q4 / powerPerMin;
    const T2 = T1 + dTau4;

    // Chia mốc tiến trình thị giác mượt mà để học sinh dễ quan sát cả 4 giai đoạn
    // [0..0.24]: 0->A | [0.24..0.52]: A->B | [0.52..0.78]: B->C | [0.78..1.0]: C->T2
    const prog = clamp(p, 0, 1);
    let stageIndex = 0;
    let stageName = '';
    let stageDesc = '';
    let temp = t0;
    let tauDisplay = 0;
    let meltXFrac = 0;
    let meltIceFrac = 0;
    let Q_now = 0;

    if (prog < 0.24) {
      const local = prog / 0.24;
      stageIndex = 0;
      stageName = 'Giai đoạn 0 → A: Gia nhiệt hỗn hợp rắn';
      stageDesc = 'Cả chất rắn X (Thủy ngân) và nước đá cùng nhận nhiệt và tăng đều từ ' + t0.toFixed(1) + ' °C lên ' + cfg.tMeltX.toFixed(2) + ' °C.';
      temp = lerp(t0, cfg.tMeltX, local);
      tauDisplay = lerp(0, tauA, local);
      meltXFrac = 0;
      meltIceFrac = 0;
      Q_now = lerp(0, Q1, local);
    } else if (prog < 0.52) {
      const local = (prog - 0.24) / 0.28;
      stageIndex = 1;
      stageName = 'Giai đoạn A → B: Chất rắn X nóng chảy';
      stageDesc = 'Nhiệt độ giữ nguyên ở ' + cfg.tMeltX.toFixed(2) + ' °C. Nước đá chưa tan; toàn bộ nhiệt lượng dùng để làm nóng chảy hoàn toàn chất rắn X!';
      temp = cfg.tMeltX;
      tauDisplay = lerp(tauA, tauB, local);
      meltXFrac = local;
      meltIceFrac = 0;
      Q_now = Q1 + lerp(0, Q2, local);
    } else if (prog < 0.78) {
      const local = (prog - 0.52) / 0.26;
      stageIndex = 2;
      stageName = 'Giai đoạn B → C: Đun nóng lỏng X + đá rắn';
      stageDesc = 'Chất X đã hóa lỏng hoàn toàn (màu bạc ánh kim), cùng với nước đá tiếp tục tăng nhiệt độ từ ' + cfg.tMeltX.toFixed(2) + ' °C lên 0 °C.';
      temp = lerp(cfg.tMeltX, 0, local);
      tauDisplay = lerp(tauB, T1, local);
      meltXFrac = 1;
      meltIceFrac = 0;
      Q_now = Q1 + Q2 + lerp(0, Q3, local);
    } else {
      const local = (prog - 0.78) / 0.22;
      stageIndex = 3;
      stageName = 'Giai đoạn C → T₂: Nước đá bắt đầu nóng chảy';
      stageDesc = 'Tại 0 °C, nước đá nhận nhiệt và tan dần thành nước lỏng nổi phía trên lớp Thủy ngân lỏng. Nhiệt độ sôi 357 °C của X còn rất xa.';
      temp = 0;
      tauDisplay = lerp(T1, T2, local);
      meltXFrac = 1;
      meltIceFrac = local;
      Q_now = Q1 + Q2 + Q3 + lerp(0, Q4, local);
    }

    return {
      params: cfg,
      summary: {
        dT1,
        dTauMeltX,
        Q1,
        Q2,
        Q3,
        Q4,
        powerPerMin,
        powerWatt,
        lambdaX,
        aValue,
        aRounded,
        T1,
        T2
      },
      state: {
        progress: prog,
        stageIndex,
        stageName,
        stageDesc,
        temp,
        tauDisplay,
        meltXFrac,
        meltIceFrac,
        Q_now,
        heaterOn: true
      }
    };
  }

  /**
   * Tính toàn bộ đại lượng giải bài và trạng thái tức thời tại tiến trình p ∈ [0, 1] cho Câu 4
   */
  function solveCau4(rawParams, p) {
    const cfg = Object.assign({}, DEFAULTS.cau4, rawParams || {});
    const tEq = clamp(cfg.tEq, 0.5, 99.0);
    const tInit = Math.min(cfg.tInit, -0.5);

    // Nhiệt lượng kế thu nhiệt từ tInit lên tEq
    const dT_nlk = tEq - tInit;
    const Q_nlk = cfg.C_nlk * dT_nlk;

    // 1 gam nước đá thu: đá ấm lên 0°C + nóng chảy + nước ấm lên tEq
    const qIceWarmPerG = cfg.cIce * (0 - tInit);
    const qIceMeltPerG = cfg.lambdaIce;
    const qWaterWarmPerG = cfg.cWater * (tEq - 0);
    const kThu = qIceWarmPerG + qIceMeltPerG + qWaterWarmPerG;

    // 1 gam hơi nước tỏa: ngưng tụ ở 100°C + nước nguội xuống tEq
    const qSteamCondPerG = cfg.LSteam;
    const qSteamCoolPerG = cfg.cWater * (cfg.tSteam - tEq);
    const kToa = qSteamCondPerG + qSteamCoolPerG;

    // Phương trình: Q_nlk + kThu * (mTotal - m_hn) = kToa * m_hn
    const m_hn = (Q_nlk + kThu * cfg.mTotal) / (kThu + kToa);
    const m_da = cfg.mTotal - m_hn;
    const isValid = m_da > 0 && m_hn > 0;
    const m_hn_rounded = Math.round(m_hn);

    // Giá trị từng thành phần nhiệt lượng tại cân bằng (J)
    const Q_iceWarm = m_da * qIceWarmPerG;
    const Q_iceMelt = m_da * qIceMeltPerG;
    const Q_waterWarm = m_da * qWaterWarmPerG;
    const Q_totalThu = Q_nlk + Q_iceWarm + Q_iceMelt + Q_waterWarm;

    const Q_steamCond = m_hn * qSteamCondPerG;
    const Q_steamCool = m_hn * qSteamCoolPerG;
    const Q_totalToa = Q_steamCond + Q_steamCool;

    // Mô phỏng thực tế quá trình sục hơi nước liên tục từ p = 0 -> 1:
    // Giai đoạn 1 [0..0.16]: Đá & NLK từ tInit -> 0°C
    // Giai đoạn 2 [0.16..0.72]: Đá tan ở 0°C khi hơi 100°C sục vào ngưng tụ
    // Giai đoạn 3 [0.72..1.00]: Toàn bộ nước & NLK tăng từ 0°C -> tEq (25°C)
    const prog = clamp(p, 0, 1);

    // Lượng hơi nước cần để đưa hệ từ tInit lên 0°C:
    const Q_toZero = cfg.C_nlk * (0 - tInit) + m_da * qIceWarmPerG;
    const heatPerGSteamToZero = cfg.LSteam + cfg.cWater * (cfg.tSteam - 0);
    const m_hn_phase1 = Q_toZero / heatPerGSteamToZero;

    // Lượng hơi nước tích lũy đến hết pha đá tan ở 0°C:
    const Q_toMeltDone = Q_toZero + m_da * cfg.lambdaIce;
    const m_hn_phase2 = Q_toMeltDone / heatPerGSteamToZero;

    let stageIndex = 0;
    let stageName = '';
    let stageDesc = '';
    let tempSystem = tInit;
    let tempSteamDrop = cfg.tSteam;
    let meltIceFrac = 0;
    let m_hn_injected = 0;
    let currentWaterMass = m_da; // ban đầu có m_da (g) đá trong cốc
    let Q_absorbed_now = 0;
    let Q_released_now = 0;
    let steamFlowActive = true;

    if (prog < 0.16) {
      const local = prog / 0.16;
      stageIndex = 0;
      stageName = 'Bước 1: Gia nhiệt ban đầu (' + tInit + ' °C → 0 °C)';
      stageDesc = 'Hơi nước 100 °C bắt đầu sục vào, ngưng tụ và truyền nhiệt giúp vỏ nhôm và viên đá (' + m_da.toFixed(1) + ' g) nóng lên 0 °C.';
      tempSystem = lerp(tInit, 0, local);
      meltIceFrac = 0;
      m_hn_injected = lerp(0, m_hn_phase1, local);
      currentWaterMass = m_da + m_hn_injected;
      Q_absorbed_now = lerp(0, Q_toZero, local);
      Q_released_now = Q_absorbed_now;
      tempSteamDrop = lerp(cfg.tSteam, tempSystem, 0.5 + 0.5 * local);
    } else if (prog < 0.72) {
      const local = (prog - 0.16) / 0.56;
      stageIndex = 1;
      stageName = 'Bước 2: Nước đá nóng chảy ở 0 °C';
      stageDesc = 'Nhiệt độ giữ ở 0 °C. Hơi nước liên tục ngưng tụ và nguội về 0 °C, cấp 334 J/g làm tan dần toàn bộ viên nước đá thành nước lỏng.';
      tempSystem = 0;
      meltIceFrac = local;
      m_hn_injected = lerp(m_hn_phase1, m_hn_phase2, local);
      currentWaterMass = m_da + m_hn_injected;
      Q_absorbed_now = lerp(Q_toZero, Q_toMeltDone, local);
      Q_released_now = Q_absorbed_now;
      tempSteamDrop = 0;
    } else {
      const local = (prog - 0.72) / 0.28;
      stageIndex = 2;
      stageName = 'Bước 3: Đạt cân bằng nhiệt (0 °C → ' + tEq + ' °C)';
      stageDesc = 'Đá đã tan hết! Phần hơi nước cuối tiếp tục sục vào cho đến đủ ' + m_hn.toFixed(1) + ' g, đưa cả cốc nhôm và ' + cfg.mTotal + ' g nước đạt cân bằng tại ' + tEq + ' °C.';
      tempSystem = lerp(0, tEq, local);
      meltIceFrac = 1;
      m_hn_injected = lerp(m_hn_phase2, m_hn, local);
      currentWaterMass = m_da + m_hn_injected;
      Q_absorbed_now = lerp(Q_toMeltDone, Q_totalThu, local);
      Q_released_now = Q_absorbed_now;
      tempSteamDrop = tempSystem;
      if (prog >= 0.995) steamFlowActive = false;
    }

    // Mực nước lỏng thực tế (g nước lỏng hiện có trong cốc = đá đã tan + hơi đã ngưng tụ)
    const liquidWaterMass = m_da * meltIceFrac + m_hn_injected;
    const solidIceMass = m_da * (1 - meltIceFrac);

    return {
      params: cfg,
      summary: {
        isValid,
        dT_nlk,
        Q_nlk,
        qIceWarmPerG,
        qIceMeltPerG,
        qWaterWarmPerG,
        kThu,
        qSteamCondPerG,
        qSteamCoolPerG,
        kToa,
        m_hn,
        m_hn_rounded,
        m_da,
        Q_iceWarm,
        Q_iceMelt,
        Q_waterWarm,
        Q_totalThu,
        Q_steamCond,
        Q_steamCool,
        Q_totalToa
      },
      state: {
        progress: prog,
        stageIndex,
        stageName,
        stageDesc,
        tempSystem,
        tempSteamDrop,
        meltIceFrac,
        m_hn_injected,
        currentWaterMass,
        liquidWaterMass,
        solidIceMass,
        Q_absorbed_now,
        Q_released_now,
        steamFlowActive
      }
    };
  }

  global.PhysicsSim = {
    DEFAULTS,
    solveCau2,
    solveCau4,
    clamp,
    lerp
  };
})(window);
