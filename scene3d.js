/**
 * scene3d.js
 * Sân khấu Mô phỏng Vật Lí Nhiệt 3D (Three.js PBR + Cutaway + Chuyển pha + Vi mô)
 * Hỗ trợ đầy đủ cho Câu 2 (Thủy ngân X + Nước đá) và Câu 4 (Nhiệt lượng kế Nhôm + Đá + Hơi nước)
 */
(function (global) {
  'use strict';

  function createRadialSpriteTexture(innerColor, midColor, outerColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
    g.addColorStop(0, innerColor);
    g.addColorStop(0.45, midColor);
    g.addColorStop(1, outerColor);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  function createStudioEnvironment(renderer) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Nền studio xanh đêm tinh tế với các mảng softbox phản chiếu
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#1e3a5f');
    grad.addColorStop(0.45, '#0f172a');
    grad.addColorStop(0.55, '#1e293b');
    grad.addColorStop(1, '#090d16');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    // Đèn softbox trên cao (giúp kim loại bạc & nhôm phản chiếu cực thật)
    ctx.fillStyle = 'rgba(255, 250, 240, 0.92)';
    ctx.fillRect(70, 18, 150, 38);
    ctx.fillStyle = 'rgba(186, 230, 253, 0.85)';
    ctx.fillRect(290, 22, 160, 32);

    // Dải ánh sáng cạnh (Rim strips)
    ctx.fillStyle = 'rgba(56, 189, 248, 0.55)';
    ctx.fillRect(18, 72, 26, 95);
    ctx.fillStyle = 'rgba(251, 146, 60, 0.45)';
    ctx.fillRect(465, 76, 26, 90);

    const eqTex = new THREE.CanvasTexture(canvas);
    eqTex.mapping = THREE.EquirectangularReflectionMapping;
    eqTex.encoding = THREE.sRGBEncoding;

    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const envRT = pmrem.fromEquirectangular(eqTex);
    eqTex.dispose();
    pmrem.dispose();
    return envRT.texture;
  }

  function createWorkbenchTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#141e30';
    ctx.fillRect(0, 0, 1024, 1024);

    // Vân đá nhẹ phòng thí nghiệm
    for (let i = 0; i < 2400; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const r = Math.random() * 2.2;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(148, 163, 184, 0.035)' : 'rgba(15, 23, 42, 0.06)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Lưới thước đo phòng Lab
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.10)';
    ctx.lineWidth = 1;
    const step = 64;
    for (let x = 0; x <= 1024; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1024);
      ctx.stroke();
    }
    for (let y = 0; y <= 1024; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();
    }

    // Vạch khung chính
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
    ctx.lineWidth = 2;
    ctx.strokeRect(48, 48, 928, 928);

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  function createFoamTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#eab308';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1600; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const r = 1 + Math.random() * 2.5;
      ctx.fillStyle = i % 3 === 0 ? '#fef08a' : '#ca8a04';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 2);
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  function createBrushedMetalTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 2) {
      const v = 185 + Math.floor(Math.random() * 45);
      ctx.fillStyle = 'rgb(' + v + ',' + (v + 4) + ',' + (v + 10) + ')';
      ctx.fillRect(0, y, 256, 1);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  /**
   * Tạo mặt cắt thành ống/cốc hình trụ mở góc cutaway để nhìn xuyên vào bên trong
   * Góc mở hướng ra phía trước (+Z) giúp camera nhìn thẳng vào lõi vật chất
   */
  function createCutawayShell(rInner, rOuter, height, openAngleRad, material, capMaterial) {
    const group = new THREE.Group();
    const arcLen = Math.PI * 2 - openAngleRad;
    // Đặt góc mở đối xứng qua +Z (tức từ +openAngle/2 quanh hết vòng về -openAngle/2)
    // Trong Three.js CylinderGeometry thetaStart=0 là hướng +Z, chạy ngược chiều kim đồng hồ quanh +Y
    const thetaStart = openAngleRad * 0.5;

    const pts = [
      new THREE.Vector2(rInner, 0),
      new THREE.Vector2(rOuter, 0),
      new THREE.Vector2(rOuter, height),
      new THREE.Vector2(rInner, height),
      new THREE.Vector2(rInner, 0)
    ];
    // LatheGeometry phiStart=0 là +X, chạy theo +Z? Kiểm tra: Lathe (sin(phi), y, cos(phi)) -> phi=0 là +Z!
    const shellGeo = new THREE.LatheGeometry(pts, 56, thetaStart, arcLen);
    const shellMesh = new THREE.Mesh(shellGeo, material);
    shellMesh.castShadow = true;
    shellMesh.receiveShadow = true;
    group.add(shellMesh);

    // Hai mặt cắt đứng bịt kín độ dày thành cốc tại phi = thetaStart và phi = thetaStart + arcLen
    const wallWidth = rOuter - rInner;
    const capGeo = new THREE.PlaneGeometry(wallWidth, height);
    const matToUse = capMaterial || material;

    function makeCap(phi, flip) {
      const mesh = new THREE.Mesh(capGeo, matToUse);
      const rMid = (rInner + rOuter) * 0.5;
      mesh.position.set(Math.sin(phi) * rMid, height * 0.5, Math.cos(phi) * rMid);
      mesh.rotation.y = phi + (flip ? -Math.PI / 2 : Math.PI / 2);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    }
    group.add(makeCap(thetaStart, true));
    group.add(makeCap(thetaStart + arcLen, false));

    return group;
  }

  /**
   * Tạo bề mặt chất lỏng dạng lưới có thể nhấp nhô gợn sóng
   */
  function createRippleDisc(radius, radialSegs, material) {
    // Tạo geometry đĩa nhiều vòng đồng tâm để gợn sóng mượt!
    const rings = radialSegs || 14;
    const segs = 40;
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    positions.push(0, 0, 0);
    normals.push(0, 1, 0);
    uvs.push(0.5, 0.5);

    for (let r = 1; r <= rings; r++) {
      const rad = (r / rings) * radius;
      for (let s = 0; s < segs; s++) {
        const a = (s / segs) * Math.PI * 2;
        const x = Math.cos(a) * rad;
        const z = Math.sin(a) * rad;
        positions.push(x, 0, z);
        normals.push(0, 1, 0);
        uvs.push(0.5 + (x / radius) * 0.5, 0.5 + (z / radius) * 0.5);
      }
    }

    for (let s = 0; s < segs; s++) {
      const next = (s + 1) % segs;
      indices.push(0, 1 + next, 1 + s);
    }

    for (let r = 1; r < rings; r++) {
      const row1 = 1 + (r - 1) * segs;
      const row2 = 1 + r * segs;
      for (let s = 0; s < segs; s++) {
        const next = (s + 1) % segs;
        indices.push(row1 + s, row1 + next, row2 + s);
        indices.push(row1 + next, row2 + next, row2 + s);
      }
    }

    const customGeo = new THREE.BufferGeometry();
    customGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    customGeo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    customGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    customGeo.setIndex(indices);

    const mesh = new THREE.Mesh(customGeo, material);
    mesh.userData.radius = radius;
    return mesh;
  }

  function animateRippleDisc(mesh, time, amp, freq) {
    const pos = mesh.geometry.attributes.position;
    const rMax = mesh.userData.radius || 1;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const dist = Math.sqrt(x * x + z * z);
      const fade = 1 - Math.pow(dist / rMax, 2) * 0.65;
      // Dùng cos(dist * freq - phase) để triệt tiêu điểm nhọn ở tâm r=0 (không tạo tia sao lưới)
      const y =
        (Math.cos(dist * freq - time * 4.2) * 0.65 +
          Math.cos(x * freq * 0.72 + time * 3.1) * 0.35) *
        amp *
        fade;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
  }

  /**
   * Màn hình LCD Canvas động (cập nhật text sắc nét cho thiết bị đo 3D)
   */
  function createDynamicScreen(widthPx, heightPx) {
    const canvas = document.createElement('canvas');
    canvas.width = widthPx;
    canvas.height = heightPx;
    const ctx = canvas.getContext('2d');
    const tex = new THREE.CanvasTexture(canvas);
    tex.encoding = THREE.sRGBEncoding;
    return { canvas, ctx, tex, lastSig: '' };
  }

  /**
   * Class chính quản lý toàn bộ Scene 3D
   */
  class LabScene3D {
    constructor(container) {
      this.container = container;
      this.activeProblem = 'cau2';
      this.cutaway = true;
      this.showVectors = true;
      this.showMolecules = true;
      this.showLabels = true;
      this.lastData = null;
      this.clockTime = 0;
      this.lastScreenUpdate = -1;

      // Camera orbit state
      this.camState = {
        theta: 0.28,
        phi: 1.15,
        radius: 10.7,
        target: new THREE.Vector3(-0.1, 1.55, 0)
      };
      this.camGoal = {
        theta: 0.28,
        phi: 1.15,
        radius: 10.7,
        target: new THREE.Vector3(-0.1, 1.55, 0)
      };

      this._initRenderer();
      this._initEnvironmentAndBench();
      this._initCau2Rig();
      this._initCau4Rig();
      this._initMolecularPod();
      this._initOrbitEvents();

      this.switchProblem('cau2', true);
      this.resize();
    }

    _initRenderer() {
      const w = this.container.clientWidth || 800;
      const h = this.container.clientHeight || 600;

      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance'
      });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.setSize(w, h);
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.outputEncoding = THREE.sRGBEncoding;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.16;

      this.container.appendChild(this.renderer.domElement);

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color('#0c1424');
      this.scene.fog = new THREE.FogExp2('#0c1424', 0.022);
      this.scene.environment = createStudioEnvironment(this.renderer);

      this.camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);

      // Ánh sáng 3 điểm chuẩn Studio Lab
      const hemi = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.9);
      this.scene.add(hemi);

      const keyLight = new THREE.DirectionalLight(0xfffbeb, 1.45);
      keyLight.position.set(5.5, 9.5, 6.5);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(2048, 2048);
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 25;
      keyLight.shadow.camera.left = -7;
      keyLight.shadow.camera.right = 7;
      keyLight.shadow.camera.top = 7;
      keyLight.shadow.camera.bottom = -5;
      keyLight.shadow.bias = -0.0005;
      this.scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.85);
      rimLight.position.set(-6, 5.5, -5.5);
      this.scene.add(rimLight);

      const fillLight = new THREE.DirectionalLight(0xfef3c7, 0.35);
      fillLight.position.set(0, 2.5, 7.5);
      this.scene.add(fillLight);

      this.sprites = {
        glow: createRadialSpriteTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0.45)', 'rgba(255,255,255,0)'),
        bubble: createRadialSpriteTexture('rgba(224,242,254,0.9)', 'rgba(125,211,252,0.55)', 'rgba(56,189,248,0)')
      };
    }

    _initEnvironmentAndBench() {
      // Mặt bàn thí nghiệm
      const benchTex = createWorkbenchTexture();
      const benchGeo = new THREE.BoxGeometry(16, 0.36, 9.5);
      const benchMat = new THREE.MeshStandardMaterial({
        map: benchTex,
        roughness: 0.42,
        metalness: 0.18
      });
      const bench = new THREE.Mesh(benchGeo, benchMat);
      bench.position.set(0, -0.18, 0);
      bench.receiveShadow = true;
      this.scene.add(bench);

      // Viền nhôm quanh mặt bàn
      const trimGeo = new THREE.BoxGeometry(16.1, 0.12, 9.6);
      const trimMat = new THREE.MeshStandardMaterial({
        color: '#64748b',
        metalness: 0.8,
        roughness: 0.25
      });
      const trim = new THREE.Mesh(trimGeo, trimMat);
      trim.position.set(0, -0.05, 0);
      this.scene.add(trim);

      // Chân đế lót nhẹ dưới bàn
      const floorGeo = new THREE.PlaneGeometry(60, 60);
      const floorMat = new THREE.MeshStandardMaterial({ color: '#070b14', roughness: 0.95 });
      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -2.2;
      this.scene.add(floor);
    }

    /**
     * =========================================================================
     * MÔ HÌNH 3D CÂU 2: NHIỆT LƯỢNG KẾ ĐIỆN + THỦY NGÂN (X) + NƯỚC ĐÁ
     * =========================================================================
     */
    _initCau2Rig() {
      const root = new THREE.Group();
      this.scene.add(root);
      this.cau2Group = root;
      this.cau2 = { anchors: {} };

      const foamTex = createFoamTexture();
      const metalTex = createBrushedMetalTexture();

      // 1. Tấm đệm cách nhiệt đặt nhiệt lượng kế
      const padMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(1.75, 1.85, 0.12, 48),
        new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.85, metalness: 0.1 })
      );
      padMesh.position.set(0, 0.06, 0);
      padMesh.receiveShadow = true;
      padMesh.castShadow = true;
      root.add(padMesh);

      // 2. Nhiệt lượng kế 3 lớp có mặt cắt 115° hướng về camera
      const calGroup = new THREE.Group();
      calGroup.position.set(0, 0.12, 0);
      root.add(calGroup);

      const openAngle = 1.95; // ~112 deg
      const outerMat = new THREE.MeshStandardMaterial({
        color: '#1d4ed8',
        metalness: 0.45,
        roughness: 0.28,
        side: THREE.DoubleSide
      });
      const outerCapMat = new THREE.MeshStandardMaterial({ color: '#3b82f6', roughness: 0.4, side: THREE.DoubleSide });
      const foamMat = new THREE.MeshStandardMaterial({
        map: foamTex,
        roughness: 0.92,
        metalness: 0.0,
        side: THREE.DoubleSide
      });
      const innerMat = new THREE.MeshStandardMaterial({
        map: metalTex,
        color: '#e2e8f0',
        metalness: 0.88,
        roughness: 0.18,
        side: THREE.DoubleSide
      });

      const calHeight = 2.95;
      // Vỏ ngoài
      calGroup.add(createCutawayShell(1.48, 1.58, calHeight, openAngle, outerMat, outerCapMat));
      // Lớp cách nhiệt xốp
      calGroup.add(createCutawayShell(1.26, 1.48, calHeight - 0.04, openAngle, foamMat, foamMat));
      // Lòng thép không gỉ
      calGroup.add(createCutawayShell(1.18, 1.26, calHeight - 0.08, openAngle, innerMat, innerMat));

      // Đáy 3 lớp
      const baseOuter = new THREE.Mesh(new THREE.CylinderGeometry(1.58, 1.58, 0.1, 48), outerMat);
      baseOuter.position.y = 0.05;
      calGroup.add(baseOuter);

      const baseFoam = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.12, 48), foamMat);
      baseFoam.position.y = 0.16;
      calGroup.add(baseFoam);

      const baseInner = new THREE.Mesh(new THREE.CylinderGeometry(1.24, 1.24, 0.06, 48), innerMat);
      baseInner.position.y = 0.25;
      calGroup.add(baseInner);

      // Gân thép đai ngoài và 2 quai cầm
      [-0.02, 0.8, 2.1].forEach((yOffset) => {
        const rib = new THREE.Mesh(
          new THREE.TorusGeometry(1.58, 0.032, 12, 48, Math.PI * 2 - openAngle),
          new THREE.MeshStandardMaterial({ color: '#93c5fd', metalness: 0.7, roughness: 0.25 })
        );
        rib.rotation.x = Math.PI / 2;
        rib.rotation.z = Math.PI / 2 + openAngle * 0.5;
        rib.position.y = 0.55 + yOffset;
        calGroup.add(rib);
      });

      [-1, 1].forEach((side) => {
        const handle = new THREE.Mesh(
          new THREE.TorusGeometry(0.28, 0.048, 12, 24, Math.PI),
          new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.7 })
        );
        handle.position.set(side * 1.58, 1.9, -0.2);
        handle.rotation.z = side * -Math.PI / 2;
        calGroup.add(handle);
      });

      // Cửa kính đóng khi tắt chế độ Cutaway
      const glassCoverGeo = new THREE.CylinderGeometry(1.57, 1.57, calHeight, 32, 1, true, -openAngle * 0.5, openAngle);
      const glassCoverMat = new THREE.MeshPhysicalMaterial({
        color: '#bae6fd',
        transparent: true,
        opacity: 0.22,
        roughness: 0.08,
        metalness: 0.05,
        side: THREE.DoubleSide
      });
      const glassCover = new THREE.Mesh(glassCoverGeo, glassCoverMat);
      glassCover.position.y = calHeight * 0.5;
      glassCover.visible = false;
      calGroup.add(glassCover);
      this.cau2.glassCover = glassCover;

      // Nắp Acrylic trong suốt phía trên
      const lidMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(1.56, 1.56, 0.09, 48),
        new THREE.MeshPhysicalMaterial({
          color: '#e0f2fe',
          transparent: true,
          opacity: 0.34,
          roughness: 0.1,
          metalness: 0.05
        })
      );
      lidMesh.position.y = calHeight + 0.04;
      calGroup.add(lidMesh);

      // Gioăng cao su quanh nắp
      const lidRim = new THREE.Mesh(
        new THREE.TorusGeometry(1.55, 0.04, 12, 48),
        new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.75 })
      );
      lidRim.rotation.x = Math.PI / 2;
      lidRim.position.y = calHeight + 0.04;
      calGroup.add(lidRim);

      // 3. Dây đun điện xoắn ốc 3D nổi rõ ở đáy lòng cốc
      const coilPts = [];
      const turns = 4.5;
      const coilPtsCount = 120;
      for (let i = 0; i <= coilPtsCount; i++) {
        const t = i / coilPtsCount;
        const ang = t * Math.PI * 2 * turns;
        const rad = 0.34 + Math.sin(t * Math.PI) * 0.42;
        coilPts.push(new THREE.Vector3(Math.cos(ang) * rad, 0.39 + Math.sin(ang * 2) * 0.022, Math.sin(ang) * rad));
      }
      const coilGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coilPts), 120, 0.044, 12, false);
      const coilMat = new THREE.MeshStandardMaterial({
        color: '#ea580c',
        emissive: new THREE.Color('#ff5a1f'),
        emissiveIntensity: 1.75,
        metalness: 0.55,
        roughness: 0.25
      });
      const coilMesh = new THREE.Mesh(coilGeo, coilMat);
      calGroup.add(coilMesh);
      this.cau2.coilMat = coilMat;

      // Đèn PointLight phát ra từ dây đun
      const coilLight = new THREE.PointLight(0xff6b2b, 1.8, 3.2);
      coilLight.position.set(0, 0.55, 0);
      calGroup.add(coilLight);
      this.cau2.coilLight = coilLight;

      // Hai trụ đồng dẫn điện xuyên từ dây đun lên nắp
      const brassMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.88, roughness: 0.2 });
      [-0.45, 0.45].forEach((xPos) => {
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.75, 16), brassMat);
        rod.position.set(xPos, 1.72, -0.55);
        calGroup.add(rod);
        const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 6), brassMat);
        nut.position.set(xPos, calHeight + 0.13, -0.55);
        calGroup.add(nut);
      });

      // 4. Trục khuấy cơ học quay đều
      const stirrerGroup = new THREE.Group();
      stirrerGroup.position.set(0, 0.3, -0.15);
      calGroup.add(stirrerGroup);
      const steelMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.9, roughness: 0.15 });
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 2.95, 16), steelMat);
      shaft.position.y = 1.48;
      stirrerGroup.add(shaft);
      for (let i = 0; i < 2; i++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.08, 0.02), steelMat);
        blade.position.y = 0.55 + i * 0.65;
        blade.rotation.y = (i * Math.PI) / 2;
        blade.rotation.x = 0.25;
        stirrerGroup.add(blade);
      }
      const motorHead = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.18, 0.28, 24),
        new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.6, roughness: 0.35 })
      );
      motorHead.position.set(0, calHeight + 0.2, -0.15);
      calGroup.add(motorHead);
      this.cau2.stirrer = stirrerGroup;

      // 5. CHẤT X (THỦY NGÂN - Hg) ở tầng dưới
      // - Thể lỏng: bể kim loại bạc ánh crom gợn sóng
      const hgGroup = new THREE.Group();
      hgGroup.position.set(0, 0.29, 0);
      calGroup.add(hgGroup);

      const hgMat = new THREE.MeshStandardMaterial({
        color: '#e2e8f0',
        metalness: 0.96,
        roughness: 0.08
      });
      const hgPoolBody = new THREE.Mesh(new THREE.CylinderGeometry(1.16, 1.16, 1.0, 48), hgMat);
      hgPoolBody.position.y = 0.5;
      hgPoolBody.scale.y = 0.01;
      hgGroup.add(hgPoolBody);

      const hgTopSurface = createRippleDisc(1.16, 14, hgMat);
      hgTopSurface.position.y = 0.01;
      hgGroup.add(hgTopSurface);
      this.cau2.hgPoolBody = hgPoolBody;
      this.cau2.hgTopSurface = hgTopSurface;

      // - Thể rắn: các khối tinh thể kim loại bạc ánh thép nổi bật dưới đáy
      const hgSolidGroup = new THREE.Group();
      hgGroup.add(hgSolidGroup);
      const hgSolidMat = new THREE.MeshStandardMaterial({
        color: '#e2e8f0',
        emissive: new THREE.Color('#334155'),
        emissiveIntensity: 0.24,
        metalness: 0.9,
        roughness: 0.18,
        flatShading: true
      });
      const hgCrystals = [];
      const hgPositions = [
        [0, 0.34, 0.2, 0.46],
        [-0.56, 0.30, 0.36, 0.38],
        [0.54, 0.30, 0.32, 0.40],
        [-0.45, 0.28, -0.45, 0.36],
        [0.48, 0.28, -0.42, 0.37],
        [0.05, 0.27, -0.62, 0.33],
        [-0.1, 0.32, 0.68, 0.34]
      ];
      hgPositions.forEach((p, idx) => {
        const g = new THREE.DodecahedronGeometry(p[3], 0);
        const mesh = new THREE.Mesh(g, hgSolidMat);
        mesh.position.set(p[0], p[1], p[2]);
        mesh.rotation.set(idx * 0.7, idx * 1.1, idx * 0.4);
        mesh.scale.set(1.18, 0.88, 1.08);
        mesh.castShadow = true;
        mesh.userData.basePos = new THREE.Vector3(p[0], p[1], p[2]);
        mesh.userData.phase = idx * 1.3;
        hgSolidGroup.add(mesh);
        hgCrystals.push(mesh);
      });
      this.cau2.hgCrystals = hgCrystals;

      // 6. NƯỚC ĐÁ & NƯỚC LỎNG ở tầng trên (nổi trên Thủy ngân)
      const waterLayerGroup = new THREE.Group();
      waterLayerGroup.position.set(0, 1.02, 0);
      calGroup.add(waterLayerGroup);
      this.cau2.waterLayerGroup = waterLayerGroup;

      const liquidWaterMat = new THREE.MeshPhysicalMaterial({
        color: '#38bdf8',
        transparent: true,
        opacity: 0.56,
        roughness: 0.1,
        metalness: 0.05,
        side: THREE.DoubleSide
      });
      const waterBody = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 1.0, 48), liquidWaterMat);
      waterBody.position.y = 0.5;
      waterBody.visible = false;
      waterLayerGroup.add(waterBody);

      const waterTop = createRippleDisc(1.15, 12, liquidWaterMat);
      waterTop.visible = false;
      waterLayerGroup.add(waterTop);
      this.cau2.waterBody = waterBody;
      this.cau2.waterTop = waterTop;

      // Các khối tinh thể Nước đá màu xanh băng trong mờ (nhìn xuyên xuống lớp Hg bên dưới!)
      const iceMat = new THREE.MeshPhysicalMaterial({
        color: '#38bdf8',
        emissive: new THREE.Color('#0284c7'),
        emissiveIntensity: 0.24,
        transparent: true,
        opacity: 0.62,
        roughness: 0.1,
        metalness: 0.05,
        flatShading: true
      });
      const iceBlocks = [];
      const iceCoords = [
        [0, 0.42, 0.08, 0.44],
        [-0.54, 0.36, 0.24, 0.34],
        [0.52, 0.36, 0.22, 0.36],
        [-0.38, 0.34, -0.5, 0.34],
        [0.42, 0.35, -0.46, 0.35],
        [0.02, 0.78, -0.05, 0.34],
        [-0.35, 0.72, 0.22, 0.26],
        [0.34, 0.74, 0.18, 0.28]
      ];
      iceCoords.forEach((p, idx) => {
        const geo = idx % 2 === 0 ? new THREE.IcosahedronGeometry(p[3], 0) : new THREE.BoxGeometry(p[3] * 1.4, p[3] * 1.1, p[3] * 1.3);
        const mesh = new THREE.Mesh(geo, iceMat);
        mesh.position.set(p[0], p[1], p[2]);
        mesh.rotation.set(idx * 0.5, idx * 0.9, idx * 0.3);
        mesh.castShadow = true;
        mesh.userData.basePos = new THREE.Vector3(p[0], p[1], p[2]);
        mesh.userData.phase = idx * 1.7;
        waterLayerGroup.add(mesh);
        iceBlocks.push(mesh);
      });
      this.cau2.iceBlocks = iceBlocks;

      // 7. Bộ nguồn điện công suất không đổi (bên trái)
      const psuGroup = new THREE.Group();
      psuGroup.position.set(-3.3, 0, -0.2);
      psuGroup.rotation.y = 0.28;
      root.add(psuGroup);

      const psuBody = new THREE.Mesh(
        new THREE.BoxGeometry(1.75, 1.35, 1.3),
        new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.45, roughness: 0.42 })
      );
      psuBody.position.y = 0.68;
      psuBody.castShadow = true;
      psuBody.receiveShadow = true;
      psuGroup.add(psuBody);

      const psuBezel = new THREE.Mesh(
        new THREE.BoxGeometry(1.62, 1.22, 0.06),
        new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.5, roughness: 0.35 })
      );
      psuBezel.position.set(0, 0.68, 0.64);
      psuGroup.add(psuBezel);

      this.cau2.psuScreen = createDynamicScreen(320, 160);
      const psuDisplay = new THREE.Mesh(
        new THREE.PlaneGeometry(1.3, 0.62),
        new THREE.MeshBasicMaterial({ map: this.cau2.psuScreen.tex })
      );
      psuDisplay.position.set(0, 0.88, 0.68);
      psuGroup.add(psuDisplay);

      // Nút gạt LED đỏ + núm vặn trên hộp nguồn
      const ledSwitch = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.14, 0.08),
        new THREE.MeshStandardMaterial({ color: '#ef4444', emissive: '#ef4444', emissiveIntensity: 1.4 })
      );
      ledSwitch.position.set(-0.48, 0.34, 0.67);
      psuGroup.add(ledSwitch);

      const knob = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, 0.12, 24),
        new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.8, roughness: 0.25 })
      );
      knob.rotation.x = Math.PI / 2;
      knob.position.set(0.42, 0.34, 0.68);
      psuGroup.add(knob);

      // Dây cáp điện đỏ & đen nối từ PSU lên 2 cọc đồng của Nhiệt lượng kế
      function makeCable(start, mid1, mid2, end, color) {
        const curve = new THREE.CatmullRomCurve3([start, mid1, mid2, end]);
        const tube = new THREE.Mesh(
          new THREE.TubeGeometry(curve, 36, 0.038, 10, false),
          new THREE.MeshStandardMaterial({ color, roughness: 0.55 })
        );
        tube.castShadow = true;
        return tube;
      }
      root.add(makeCable(
        new THREE.Vector3(-2.6, 0.35, 0.3),
        new THREE.Vector3(-2.0, 0.15, 0.8),
        new THREE.Vector3(-1.3, 2.5, -0.5),
        new THREE.Vector3(-0.45, 3.2, -0.55),
        '#ef4444'
      ));
      root.add(makeCable(
        new THREE.Vector3(-2.4, 0.28, -0.1),
        new THREE.Vector3(-1.7, 0.1, -0.8),
        new THREE.Vector3(-0.9, 2.7, -0.9),
        new THREE.Vector3(0.45, 3.2, -0.55),
        '#0f172a'
      ));

      // 8. Nhiệt kế số cắm xuyên nắp + Đồng hồ bấm giờ lab bên phải
      const thermGroup = new THREE.Group();
      thermGroup.position.set(0.65, 0.5, 0.15);
      calGroup.add(thermGroup);

      const probeRod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 2.95, 12),
        steelMat
      );
      probeRod.position.y = 1.48;
      thermGroup.add(probeRod);

      // Cột hiển thị nhiệt độ phát sáng màu dọc thân nhiệt kế
      const thermGlowMat = new THREE.MeshStandardMaterial({
        color: '#38bdf8',
        emissive: '#38bdf8',
        emissiveIntensity: 0.9
      });
      const thermFill = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 1.0, 12), thermGlowMat);
      thermFill.position.y = 2.4;
      thermGroup.add(thermFill);
      this.cau2.thermFill = thermFill;
      this.cau2.thermGlowMat = thermGlowMat;

      // Đầu đọc LCD nhiệt kế (hạ gọn để không bị che bởi thanh công cụ góc phải)
      const thermHead = new THREE.Mesh(
        new THREE.BoxGeometry(1.18, 0.56, 0.18),
        new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.5, roughness: 0.3 })
      );
      thermHead.position.set(0, 3.02, 0);
      thermGroup.add(thermHead);

      this.cau2.thermScreen = createDynamicScreen(280, 130);
      const thermLcd = new THREE.Mesh(
        new THREE.PlaneGeometry(1.06, 0.44),
        new THREE.MeshBasicMaterial({ map: this.cau2.thermScreen.tex })
      );
      thermLcd.position.set(0, 3.02, 0.095);
      thermGroup.add(thermLcd);

      // Đồng hồ bấm giờ bên phải
      const timerGroup = new THREE.Group();
      timerGroup.position.set(2.85, 0, 0.45);
      timerGroup.rotation.y = -0.35;
      root.add(timerGroup);

      const timerStand = new THREE.Mesh(
        new THREE.BoxGeometry(1.25, 0.2, 0.85),
        new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.5, roughness: 0.4 })
      );
      timerStand.position.y = 0.1;
      timerStand.castShadow = true;
      timerGroup.add(timerStand);

      const timerBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.75, 0.75, 0.28, 36),
        new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.72, roughness: 0.25 })
      );
      timerBody.rotation.x = Math.PI / 2 - 0.18;
      timerBody.position.set(0, 1.05, 0);
      timerBody.castShadow = true;
      timerGroup.add(timerBody);

      this.cau2.timerScreen = createDynamicScreen(320, 320);
      const timerFace = new THREE.Mesh(
        new THREE.CircleGeometry(0.67, 36),
        new THREE.MeshBasicMaterial({ map: this.cau2.timerScreen.tex })
      );
      timerFace.position.set(0, 1.08, 0.155);
      timerFace.rotation.x = -0.18;
      timerGroup.add(timerFace);

      // 9. Hạt đối lưu nhiệt + Sương lạnh + Mũi tên dòng nhiệt
      this.cau2.heatParticles = this._createParticleCloud(60, 0xfb923c, 0.11, this.sprites.glow, calGroup, {
        minR: 0.1, maxR: 1.05, minY: 0.35, maxY: 2.3
      });
      this.cau2.frostParticles = this._createParticleCloud(40, 0xbae6fd, 0.1, this.sprites.glow, calGroup, {
        minR: 0.2, maxR: 1.05, minY: 0.9, maxY: 2.4
      });

      this.cau2.heatArrows = this._createFlowArrows(calGroup, [
        { pos: [-0.45, 0.62, 0.55], color: 0xf97316, group: 'toX' },
        { pos: [0.45, 0.62, 0.55], color: 0xf97316, group: 'toX' },
        { pos: [-0.35, 1.35, 0.58], color: 0x38bdf8, group: 'toIce' },
        { pos: [0.35, 1.35, 0.58], color: 0x38bdf8, group: 'toIce' }
      ]);

      // Điểm neo chú thích 3D (giãn cách thoáng, không đè chữ)
      this.cau2.anchors = {
        solidX: new THREE.Vector3(-0.82, 0.95, 0.65),
        ice: new THREE.Vector3(0.45, 1.98, 0.58),
        coil: new THREE.Vector3(0.35, 0.25, 1.05),
        psu: new THREE.Vector3(-3.3, 1.55, 0),
        timer: new THREE.Vector3(2.85, 1.95, 0.45),
        therm: new THREE.Vector3(0.65, 3.35, 0.15)
      };
    }

    /**
     * =========================================================================
     * MÔ HÌNH 3D CÂU 4: BÌNH SINH HƠI 100°C + NHIỆT LƯỢNG KẾ NHÔM + ĐÁ + CÂN
     * =========================================================================
     */
    _initCau4Rig() {
      const root = new THREE.Group();
      this.scene.add(root);
      this.cau4Group = root;
      this.cau4 = { anchors: {} };

      const metalTex = createBrushedMetalTexture();

      // --- CỤM TRÁI: KIỀNG ĐUN 3 CHÂN + NGỌN LỬA BUNSEN + BÌNH CẦU SINH HƠI 100°C ---
      const boilerGroup = new THREE.Group();
      boilerGroup.position.set(-2.95, 0, -0.15);
      root.add(boilerGroup);

      // Chân đèn Bunsen + đầu đốt kim loại
      const ironMat = new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.72, roughness: 0.38 });
      const brass4Mat = new THREE.MeshStandardMaterial({ color: '#d97706', metalness: 0.85, roughness: 0.24 });

      const bunsenBase = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.44, 0.1, 24), ironMat);
      bunsenBase.position.y = 0.05;
      boilerGroup.add(bunsenBase);
      const bunsenTube = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.34, 16), brass4Mat);
      bunsenTube.position.y = 0.24;
      boilerGroup.add(bunsenTube);

      // Ngọn lửa Bunsen 2 lớp (xanh nhiệt nóng + lõi cam sáng)
      const flameOuter = new THREE.Mesh(
        new THREE.ConeGeometry(0.24, 0.52, 20),
        new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.65 })
      );
      flameOuter.position.y = 0.64;
      boilerGroup.add(flameOuter);
      const flameInner = new THREE.Mesh(
        new THREE.ConeGeometry(0.14, 0.38, 16),
        new THREE.MeshBasicMaterial({ color: '#fb923c', transparent: true, opacity: 0.92 })
      );
      flameInner.position.y = 0.58;
      boilerGroup.add(flameInner);
      this.cau4.flameOuter = flameOuter;
      this.cau4.flameInner = flameInner;

      // Vòng kiềng 3 chân đỡ lưới amiăng chịu nhiệt
      const tripodRing = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.045, 10, 32), ironMat);
      tripodRing.rotation.x = Math.PI / 2;
      tripodRing.position.y = 0.88;
      tripodRing.castShadow = true;
      boilerGroup.add(tripodRing);

      for (let k = 0; k < 3; k++) {
        const ang = (k / 3) * Math.PI * 2 + 0.4;
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.042, 0.96, 10), ironMat);
        leg.position.set(Math.cos(ang) * 0.78, 0.44, Math.sin(ang) * 0.78);
        leg.rotation.z = Math.cos(ang) * 0.14;
        leg.rotation.x = -Math.sin(ang) * 0.14;
        leg.castShadow = true;
        boilerGroup.add(leg);
      }

      // Lưới tản nhiệt gốm phát ánh đỏ cam
      const burnerPlate = new THREE.Mesh(
        new THREE.CylinderGeometry(0.72, 0.72, 0.05, 28),
        new THREE.MeshStandardMaterial({
          color: '#7c2d12',
          emissive: '#ff5a1f',
          emissiveIntensity: 1.5,
          roughness: 0.45
        })
      );
      burnerPlate.position.y = 0.91;
      boilerGroup.add(burnerPlate);

      const burnerLight = new THREE.PointLight(0xff6b2b, 1.85, 4.0);
      burnerLight.position.set(0, 0.9, 0.2);
      boilerGroup.add(burnerLight);
      this.cau4.burnerLight = burnerLight;

      // Bình cầu đáy tròn thủy tinh borosilicate đặt trên kiềng đun
      const flaskPts = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0.45, 0.03),
        new THREE.Vector2(0.84, 0.34),
        new THREE.Vector2(0.88, 0.72),
        new THREE.Vector2(0.68, 1.08),
        new THREE.Vector2(0.24, 1.38),
        new THREE.Vector2(0.24, 1.88),
        new THREE.Vector2(0.31, 1.94)
      ];
      const flaskMat = new THREE.MeshPhysicalMaterial({
        color: '#e0f2fe',
        transparent: true,
        opacity: 0.3,
        roughness: 0.06,
        metalness: 0.05,
        side: THREE.DoubleSide
      });
      const flask = new THREE.Mesh(new THREE.LatheGeometry(flaskPts, 40), flaskMat);
      flask.position.y = 0.94;
      boilerGroup.add(flask);

      // Nước sôi bên trong bình cầu (màu xanh ngọc ánh cam)
      const boilWaterMat = new THREE.MeshPhysicalMaterial({
        color: '#38bdf8',
        transparent: true,
        opacity: 0.6,
        roughness: 0.1
      });
      const boilBody = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.56, 0.65, 36), boilWaterMat);
      boilBody.position.y = 1.3;
      boilerGroup.add(boilBody);
      const boilTop = createRippleDisc(0.78, 10, boilWaterMat);
      boilTop.position.y = 1.63;
      boilerGroup.add(boilTop);
      this.cau4.boilTop = boilTop;

      // Bọt khí nước sôi trong bình
      this.cau4.boilBubbles = this._createParticleCloud(46, 0xe0f2fe, 0.085, this.sprites.bubble, boilerGroup, {
        minR: 0.05, maxR: 0.66, minY: 1.0, maxY: 1.62
      });

      // Nút cao su đỏ & Cổ kẹp bình
      const stopper = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.21, 0.22, 24),
        new THREE.MeshStandardMaterial({ color: '#e11d48', roughness: 0.65 })
      );
      stopper.position.y = 2.86;
      boilerGroup.add(stopper);

      // Bảng hiển thị nhiệt độ bình hơi 100°C đặt nghiêng phía trước kiềng đun
      const boilerPedestal = new THREE.Mesh(
        new THREE.BoxGeometry(1.12, 0.48, 0.14),
        new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.4, roughness: 0.4 })
      );
      boilerPedestal.position.set(0.05, 0.34, 1.08);
      boilerPedestal.rotation.x = -0.45;
      boilerPedestal.rotation.y = 0.18;
      boilerGroup.add(boilerPedestal);

      this.cau4.boilerScreen = createDynamicScreen(240, 100);
      const boilerLcd = new THREE.Mesh(
        new THREE.PlaneGeometry(1.02, 0.42),
        new THREE.MeshBasicMaterial({ map: this.cau4.boilerScreen.tex })
      );
      boilerLcd.position.set(0.07, 0.38, 1.15);
      boilerLcd.rotation.x = -0.45;
      boilerLcd.rotation.y = 0.18;
      boilerGroup.add(boilerLcd);

      // --- ỐNG DẪN HƠI ĐỒNG BỌC CÁCH NHIỆT TỪ BÌNH SANG CỐC NHÔM ---
      const pipeCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-2.95, 2.94, -0.15),
        new THREE.Vector3(-2.95, 3.45, -0.15),
        new THREE.Vector3(-1.6, 3.62, -0.15),
        new THREE.Vector3(-0.22, 3.42, -0.15),
        new THREE.Vector3(-0.22, 1.32, -0.15)
      ]);
      this.cau4.pipeCurve = pipeCurve;

      const pipeMat = new THREE.MeshPhysicalMaterial({
        color: '#fed7aa',
        transparent: true,
        opacity: 0.48,
        roughness: 0.12
      });
      const pipeMesh = new THREE.Mesh(new THREE.TubeGeometry(pipeCurve, 64, 0.08, 16, false), pipeMat);
      root.add(pipeMesh);

      // Đầu vòi đồng sục hơi nhúng vào cốc
      const nozzleTip = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.24, 16), brass4Mat);
      nozzleTip.position.set(-0.22, 1.24, -0.15);
      root.add(nozzleTip);

      // Van khóa hơi nước 3D màu đỏ
      const valveGroup = new THREE.Group();
      valveGroup.position.set(-1.6, 3.62, -0.15);
      root.add(valveGroup);
      const valveRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.15, 0.036, 12, 24),
        new THREE.MeshStandardMaterial({ color: '#f43f5e', roughness: 0.35 })
      );
      valveRing.position.y = 0.16;
      valveGroup.add(valveRing);
      const valveStem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.18, 12),
        brass4Mat
      );
      valveStem.position.y = 0.08;
      valveGroup.add(valveStem);
      this.cau4.valveGroup = valveGroup;

      // Các hạt hơi chạy dọc ống dẫn hơi
      this.cau4.pipeSteamMotes = [];
      const moteGeo = new THREE.SphereGeometry(0.052, 8, 8);
      const moteMat = new THREE.MeshBasicMaterial({ color: '#fff7ed', transparent: true, opacity: 0.88 });
      for (let i = 0; i < 24; i++) {
        const m = new THREE.Mesh(moteGeo, moteMat);
        m.userData.t = i / 24;
        root.add(m);
        this.cau4.pipeSteamMotes.push(m);
      }

      // --- CỤM GIỮA: CÂN ĐIỆN TỬ MẶT NGHIÊNG LỚN + NHIỆT LƯỢNG KẾ NHÔM LỘ THIÊN ---
      const scaleGroup = new THREE.Group();
      scaleGroup.position.set(0.35, 0, 0);
      root.add(scaleGroup);

      // 4 chân đệm cao su dưới cân
      [[-1.25, -1.1], [1.25, -1.1], [-1.25, 1.1], [1.25, 1.1]].forEach(([fx, fz]) => {
        const foot = new THREE.Mesh(
          new THREE.CylinderGeometry(0.16, 0.18, 0.12, 16),
          new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.8 })
        );
        foot.position.set(fx, 0.06, fz);
        scaleGroup.add(foot);
      });

      // Thân cân điện tử hợp kim trắng-xám mảnh gọn
      const scaleBody = new THREE.Mesh(
        new THREE.BoxGeometry(3.05, 0.3, 2.75),
        new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.35, roughness: 0.32 })
      );
      scaleBody.position.set(0, 0.27, -0.08);
      scaleBody.castShadow = true;
      scaleBody.receiveShadow = true;
      scaleGroup.add(scaleBody);

      // Bảng điều khiển LCD nhô hẳn ra phía trước + nghiêng 32 độ hướng thẳng về camera (tránh bị thanh timeline che!)
      const scalePanel = new THREE.Mesh(
        new THREE.BoxGeometry(2.38, 0.56, 0.24),
        new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.45, roughness: 0.35 })
      );
      scalePanel.position.set(0, 0.38, 1.48);
      scalePanel.rotation.x = -0.56;
      scalePanel.castShadow = true;
      scaleGroup.add(scalePanel);

      this.cau4.scaleScreen = createDynamicScreen(420, 110);
      const scaleLcd = new THREE.Mesh(
        new THREE.PlaneGeometry(2.16, 0.46),
        new THREE.MeshBasicMaterial({ map: this.cau4.scaleScreen.tex })
      );
      scaleLcd.position.set(0, 0.45, 1.59);
      scaleLcd.rotation.x = -0.56;
      scaleGroup.add(scaleLcd);

      // Đĩa cân inox sáng bóng
      const platter = new THREE.Mesh(
        new THREE.CylinderGeometry(1.38, 1.44, 0.08, 48),
        new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.92, roughness: 0.14 })
      );
      platter.position.set(0, 0.46, -0.08);
      platter.receiveShadow = true;
      scaleGroup.add(platter);

      // Nhiệt lượng kế BẰNG NHÔM đặt trên đĩa cân: áo bọc đỏ tía thấp + cốc nhôm bạc nhô cao rõ nét!
      const cal4 = new THREE.Group();
      cal4.position.set(0, 0.5, -0.08);
      scaleGroup.add(cal4);

      const openAngle4 = 2.25;
      const jacketH = 1.42;
      const aluHeight = 2.38;

      const jacket4Mat = new THREE.MeshStandardMaterial({
        color: '#9f1239',
        metalness: 0.35,
        roughness: 0.38,
        side: THREE.DoubleSide
      });
      const darkRimMat = new THREE.MeshStandardMaterial({
        color: '#1e293b',
        metalness: 0.65,
        roughness: 0.3,
        side: THREE.DoubleSide
      });
      // Cốc nhôm bên trong (kim loại nhôm sáng phay, đổi ánh nhiệt nhẹ từ xanh lạnh -> ngọc)
      const aluMat = new THREE.MeshStandardMaterial({
        map: metalTex,
        color: '#f1f5f9',
        emissive: new THREE.Color('#0284c7'),
        emissiveIntensity: 0.12,
        metalness: 0.9,
        roughness: 0.2,
        side: THREE.DoubleSide
      });
      this.cau4.aluMat = aluMat;

      // Vỏ đỡ bảo vệ màu đỏ rượu thấp ở nửa dưới (khác hẳn bình xanh xốp vàng của Câu 2!)
      cal4.add(createCutawayShell(1.24, 1.36, jacketH, openAngle4, jacket4Mat, darkRimMat));
      // Viền đồng trang trí trên miệng áo đỏ rượu (cùng góc cắt cutaway để không chắn mặt trước)
      const brassCollar4 = createCutawayShell(1.22, 1.38, 0.075, openAngle4, brass4Mat, brass4Mat);
      brassCollar4.position.y = jacketH;
      cal4.add(brassCollar4);

      // Lòng cốc NHÔM cao vươn hẳn lên trên (hở phần trên cho thấy chất liệu nhôm sáng đặc trưng)
      cal4.add(createCutawayShell(1.06, 1.18, aluHeight, openAngle4, aluMat, aluMat));

      // Đai nhận diện xanh ngọc ở cổ cốc nhôm
      const aluBand = createCutawayShell(1.18, 1.21, 0.16, openAngle4, new THREE.MeshStandardMaterial({
        color: '#10b981', metalness: 0.5, roughness: 0.28, side: THREE.DoubleSide
      }));
      aluBand.position.y = aluHeight - 0.32;
      cal4.add(aluBand);

      // Đáy cốc nhôm & chân đế
      const c4Base = new THREE.Mesh(new THREE.CylinderGeometry(1.36, 1.36, 0.1, 48), darkRimMat);
      c4Base.position.y = 0.05;
      cal4.add(c4Base);
      const c4AluBase = new THREE.Mesh(new THREE.CylinderGeometry(1.16, 1.16, 0.1, 48), aluMat);
      c4AluBase.position.y = 0.22;
      cal4.add(c4AluBase);

      // Vỏ kính khi tắt Cutaway
      const glassCover4 = new THREE.Mesh(
        new THREE.CylinderGeometry(1.2, 1.2, aluHeight, 32, 1, true, -openAngle4 * 0.5, openAngle4),
        new THREE.MeshPhysicalMaterial({
          color: '#e2e8f0',
          transparent: true,
          opacity: 0.22,
          roughness: 0.08,
          side: THREE.DoubleSide
        })
      );
      glassCover4.position.y = aluHeight * 0.5;
      glassCover4.visible = false;
      cal4.add(glassCover4);
      this.cau4.glassCover = glassCover4;

      // Nắp kính trên miệng cốc nhôm
      const lid4 = new THREE.Mesh(
        new THREE.CylinderGeometry(1.2, 1.2, 0.07, 48),
        new THREE.MeshPhysicalMaterial({ color: '#ecfeff', transparent: true, opacity: 0.36, roughness: 0.1 })
      );
      lid4.position.y = aluHeight + 0.035;
      cal4.add(lid4);

      // Thước chia vạch khối lượng nước (0..500g) gắn cạnh mặt cắt phải
      this.cau4.gaugeScreen = createDynamicScreen(110, 320);
      const gaugeMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.4, 1.68),
        new THREE.MeshBasicMaterial({ map: this.cau4.gaugeScreen.tex, transparent: true })
      );
      gaugeMesh.position.set(0.9, 1.15, 0.72);
      gaugeMesh.rotation.y = -0.15;
      cal4.add(gaugeMesh);

      // Nước lỏng trong cốc nhôm (dâng từ 0 lên 500 g)
      const water4Mat = new THREE.MeshPhysicalMaterial({
        color: '#38bdf8',
        transparent: true,
        opacity: 0.54,
        roughness: 0.08,
        metalness: 0.04,
        side: THREE.DoubleSide
      });
      const water4Body = new THREE.Mesh(new THREE.CylinderGeometry(1.04, 1.04, 1.0, 44), water4Mat);
      water4Body.position.y = 0.27;
      water4Body.visible = false;
      cal4.add(water4Body);

      const water4Top = createRippleDisc(1.04, 12, water4Mat);
      water4Top.position.y = 0.28;
      water4Top.visible = false;
      cal4.add(water4Top);
      this.cau4.waterBody = water4Body;
      this.cau4.waterTop = water4Top;
      this.cau4.waterMat = water4Mat;

      // MỘT VIÊN NƯỚC ĐÁ LỚN ở -5°C (Khối băng tảng góc cạnh sắc nét, khác hẳn các viên nhỏ Câu 2)
      const ice4Group = new THREE.Group();
      ice4Group.position.set(0.22, 0.72, 0.05);
      cal4.add(ice4Group);
      const ice4Mat = new THREE.MeshPhysicalMaterial({
        color: '#a5f3fc',
        emissive: new THREE.Color('#0284c7'),
        emissiveIntensity: 0.26,
        transparent: true,
        opacity: 0.88,
        roughness: 0.1,
        flatShading: true
      });
      const mainIce = new THREE.Mesh(new THREE.DodecahedronGeometry(0.58, 0), ice4Mat);
      mainIce.scale.set(1.22, 0.94, 1.08);
      mainIce.castShadow = true;
      ice4Group.add(mainIce);
      const subIce1 = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), ice4Mat);
      subIce1.position.set(-0.24, -0.08, 0.2);
      subIce1.rotation.set(0.4, 0.6, 0.2);
      ice4Group.add(subIce1);
      this.cau4.iceGroup = ice4Group;
      this.cau4.iceMat = ice4Mat;

      // Hạt sương lạnh quanh đá + đám mây hơi nước sục ra từ đúng đầu vòi phun (-0.57, 0.8, -0.07)
      this.cau4.frostCloud = this._createParticleCloud(34, 0xe0f2fe, 0.1, this.sprites.glow, cal4, {
        minR: 0.1, maxR: 0.88, minY: 0.45, maxY: 1.7
      });
      const steamOrigin = new THREE.Group();
      steamOrigin.position.set(-0.57, 0, -0.07);
      cal4.add(steamOrigin);
      this.cau4.steamPlume = this._createParticleCloud(55, 0xffedd5, 0.17, this.sprites.glow, steamOrigin, {
        minR: 0.02, maxR: 0.36, minY: 0.68, maxY: 2.0
      });

      // --- CỤM PHẢI: NHIỆT KẾ KÉP THEO DÕI CÂN BẰNG ---
      const dualMeter = new THREE.Group();
      dualMeter.position.set(3.25, 0, 0.35);
      dualMeter.rotation.y = -0.3;
      root.add(dualMeter);

      const meterStand = new THREE.Mesh(
        new THREE.BoxGeometry(1.55, 1.95, 0.48),
        new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.45, roughness: 0.4 })
      );
      meterStand.position.y = 0.98;
      meterStand.castShadow = true;
      dualMeter.add(meterStand);

      this.cau4.dualScreen = createDynamicScreen(320, 380);
      const dualLcd = new THREE.Mesh(
        new THREE.PlaneGeometry(1.36, 1.65),
        new THREE.MeshBasicMaterial({ map: this.cau4.dualScreen.tex })
      );
      dualLcd.position.set(0, 1.0, 0.25);
      dualMeter.add(dualLcd);

      // Dây cảm biến nối từ đồng hồ sang cốc nhôm
      const sensorCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(2.55, 1.2, 0.25),
        new THREE.Vector3(1.85, 2.25, 0.1),
        new THREE.Vector3(0.95, 2.95, -0.08),
        new THREE.Vector3(0.82, 1.25, -0.08)
      ]);
      root.add(new THREE.Mesh(
        new THREE.TubeGeometry(sensorCurve, 32, 0.026, 8, false),
        new THREE.MeshStandardMaterial({ color: '#38bdf8', roughness: 0.5 })
      ));

      // Mũi tên dòng nhiệt Q_tỏa (hơi) -> Q_thu (nhôm + đá)
      this.cau4.heatArrows = this._createFlowArrows(root, [
        { pos: [-1.45, 3.28, 0.15], color: 0xf43f5e, group: 'steamToa', rotZ: -Math.PI / 2 },
        { pos: [-0.08, 2.2, 0.45], color: 0xf97316, group: 'steamToa', rotZ: Math.PI },
        { pos: [0.68, 1.35, 0.55], color: 0x38bdf8, group: 'cupThu', rotZ: 0 },
        { pos: [0.35, 1.05, 0.58], color: 0x22d3ee, group: 'iceThu', rotZ: Math.PI / 2 }
      ]);

      this.cau4.anchors = {
        boiler: new THREE.Vector3(-2.95, 2.85, -0.15),
        calorimeter: new THREE.Vector3(0.35, 3.05, -0.45),
        ice: new THREE.Vector3(0.62, 1.45, 0.32),
        nozzle: new THREE.Vector3(-0.22, 1.45, 0.2),
        scale: new THREE.Vector3(-0.85, 0.85, 1.45),
        dualMeter: new THREE.Vector3(3.25, 2.1, 0.35)
      };
    }

    /**
     * =========================================================================
     * KÍNH LÚP SOI PHÂN TỬ VI MÔ 3D (Molecular Lens Pod - Bay góc trên phải)
     * =========================================================================
     */
    _initMolecularPod() {
      const pod = new THREE.Group();
      pod.position.set(2.55, 2.95, -0.55);
      this.scene.add(pod);
      this.molPod = pod;

      // Quả cầu kính trong suốt
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.76, 32, 24),
        new THREE.MeshPhysicalMaterial({
          color: '#bae6fd',
          transparent: true,
          opacity: 0.16,
          roughness: 0.08,
          metalness: 0.1
        })
      );
      pod.add(dome);

      // Vòng kim loại bao quanh kính lúp
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.77, 0.032, 12, 48),
        new THREE.MeshStandardMaterial({ color: '#38bdf8', emissive: '#0284c7', emissiveIntensity: 0.5, metalness: 0.8, roughness: 0.2 })
      );
      pod.add(ring);

      this.molAtoms = [];
      const sphereGeo = new THREE.SphereGeometry(0.072, 14, 14);

      // 18 hạt tầng dưới / nhóm A (X hoặc Đá) và 18 hạt tầng trên / nhóm B (Đá hoặc Hơi)
      for (let i = 0; i < 36; i++) {
        const isGroupA = i < 18;
        const mat = new THREE.MeshStandardMaterial({
          color: isGroupA ? '#e2e8f0' : '#38bdf8',
          emissive: new THREE.Color(isGroupA ? '#64748b' : '#0284c7'),
          emissiveIntensity: 0.25,
          metalness: isGroupA ? 0.85 : 0.2,
          roughness: 0.25
        });
        const atom = new THREE.Mesh(sphereGeo, mat);
        const idx = isGroupA ? i : i - 18;
        const gx = (idx % 3) - 1;
        const gy = Math.floor((idx % 9) / 3) - 1;
        const gz = Math.floor(idx / 9) - 0.5;

        const baseLocal = new THREE.Vector3(
          gx * 0.21,
          (isGroupA ? -0.27 : 0.27) + gy * 0.14,
          gz * 0.21
        );
        atom.position.copy(baseLocal);
        atom.userData = {
          isGroupA,
          base: baseLocal.clone(),
          vel: new THREE.Vector3(
            (Math.random() - 0.5) * 1.4,
            (Math.random() - 0.5) * 1.4,
            (Math.random() - 0.5) * 1.4
          ),
          phase: Math.random() * Math.PI * 2
        };
        pod.add(atom);
        this.molAtoms.push(atom);
      }
    }

    _createParticleCloud(count, hexColor, size, mapTex, parent, bounds) {
      const geo = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const seeds = [];
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const r = bounds.minR + Math.random() * (bounds.maxR - bounds.minR);
        const y = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
        positions[i * 3] = Math.cos(ang) * r;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = Math.sin(ang) * r;
        seeds.push({
          ang,
          r,
          speed: 0.5 + Math.random() * 0.9,
          phase: Math.random() * Math.PI * 2
        });
      }
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        color: hexColor,
        size,
        map: mapTex,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const pts = new THREE.Points(geo, mat);
      pts.userData = { bounds, seeds };
      parent.add(pts);
      return pts;
    }

    _animateParticleCloud(pts, dt, speedScale, opacity) {
      if (!pts) return;
      pts.material.opacity = opacity;
      pts.visible = opacity > 0.03;
      if (!pts.visible) return;

      const { bounds, seeds } = pts.userData;
      const pos = pts.geometry.attributes.position;
      for (let i = 0; i < seeds.length; i++) {
        const s = seeds[i];
        let y = pos.getY(i) + dt * s.speed * speedScale;
        if (y > bounds.maxY) {
          y = bounds.minY + (y - bounds.maxY) % (bounds.maxY - bounds.minY);
        }
        const wobble = Math.sin(this.clockTime * 3.0 + s.phase) * 0.04;
        pos.setXYZ(i, Math.cos(s.ang) * (s.r + wobble), y, Math.sin(s.ang) * (s.r + wobble));
      }
      pos.needsUpdate = true;
    }

    _createFlowArrows(parent, specs) {
      const arrows = [];
      const coneGeo = new THREE.ConeGeometry(0.085, 0.22, 12);
      const shaftGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.26, 8);

      specs.forEach((sp, idx) => {
        const g = new THREE.Group();
        const mat = new THREE.MeshBasicMaterial({ color: sp.color, transparent: true, opacity: 0.92 });
        const shaft = new THREE.Mesh(shaftGeo, mat);
        shaft.position.y = -0.12;
        const head = new THREE.Mesh(coneGeo, mat);
        head.position.y = 0.08;
        g.add(shaft, head);
        g.position.set(sp.pos[0], sp.pos[1], sp.pos[2]);
        if (sp.rotZ) g.rotation.z = sp.rotZ;
        g.userData = { basePos: new THREE.Vector3(sp.pos[0], sp.pos[1], sp.pos[2]), group: sp.group, phase: idx * 0.9 };
        parent.add(g);
        arrows.push(g);
      });
      return arrows;
    }

    /**
     * Chuyển đổi qua lại giữa Câu 2 và Câu 4
     */
    switchProblem(probId, immediate) {
      this.activeProblem = probId;
      this.cau2Group.visible = probId === 'cau2';
      this.cau4Group.visible = probId === 'cau4';
      this.lastScreenUpdate = -1;
      this.setCameraPreset('overview', immediate);
    }

    setCutaway(enabled) {
      this.cutaway = enabled;
      if (this.cau2.glassCover) this.cau2.glassCover.visible = !enabled;
      if (this.cau4.glassCover) this.cau4.glassCover.visible = !enabled;
    }

    setShowVectors(enabled) {
      this.showVectors = enabled;
    }

    setShowMolecules(enabled) {
      this.showMolecules = enabled;
      this.molPod.visible = enabled;
    }

    setShowLabels(enabled) {
      this.showLabels = enabled;
    }

    setCameraPreset(preset, immediate) {
      const is2 = this.activeProblem === 'cau2';
      if (preset === 'overview') {
        this.camGoal.theta = is2 ? 0.28 : -0.18;
        this.camGoal.phi = is2 ? 1.15 : 1.13;
        this.camGoal.radius = is2 ? 10.7 : 11.4;
        this.camGoal.target.set(is2 ? -0.05 : 0.05, 1.55, 0);
      } else if (preset === 'core') {
        this.camGoal.theta = 0.14;
        this.camGoal.phi = 1.24;
        this.camGoal.radius = 5.4;
        this.camGoal.target.set(is2 ? 0 : 0.35, 1.5, 0);
      } else if (preset === 'top') {
        this.camGoal.theta = 0.05;
        this.camGoal.phi = 0.52;
        this.camGoal.radius = 8.4;
        this.camGoal.target.set(is2 ? 0 : 0.1, 1.2, 0);
      } else if (preset === 'heater') {
        if (is2) {
          this.camGoal.theta = -0.35;
          this.camGoal.phi = 1.25;
          this.camGoal.radius = 6.2;
          this.camGoal.target.set(-1.5, 0.9, 0);
        } else {
          this.camGoal.theta = -0.25;
          this.camGoal.phi = 1.18;
          this.camGoal.radius = 6.4;
          this.camGoal.target.set(-2.3, 1.45, -0.1);
        }
      }
      if (immediate) {
        this.camState.theta = this.camGoal.theta;
        this.camState.phi = this.camGoal.phi;
        this.camState.radius = this.camGoal.radius;
        this.camState.target.copy(this.camGoal.target);
      }
    }

    /**
     * Cập nhật toàn bộ vật liệu, mực chất lỏng, màn hình LCD 3D theo dữ liệu giải bài hiện tại
     */
    updateData(simResult) {
      this.lastData = simResult;
    }

    _updateCau2Visuals(dt, sim) {
      const { state, summary, params } = sim;
      const t = this.clockTime;

      // Dây đun sáng cam ấm & khuấy quay đều
      this.cau2.coilMat.emissiveIntensity = 1.15 + Math.sin(t * 4.5) * 0.32;
      this.cau2.coilLight.intensity = 1.5 + Math.sin(t * 4.5) * 0.35;
      this.cau2.stirrer.rotation.y += dt * 2.1;

      // Mực Thủy ngân (X) lỏng & tinh thể rắn
      const hgMelt = state.meltXFrac;
      const hgPoolH = 0.03 + hgMelt * 0.68;
      this.cau2.hgPoolBody.scale.y = hgPoolH;
      this.cau2.hgPoolBody.position.y = hgPoolH * 0.5;
      this.cau2.hgTopSurface.position.y = hgPoolH;
      this.cau2.hgTopSurface.visible = hgMelt > 0.01;
      if (this.cau2.hgTopSurface.visible) {
        animateRippleDisc(this.cau2.hgTopSurface, t, 0.015 + 0.008 * Math.sin(t), 9.0);
      }

      // Tinh thể rắn X rung động nhiệt mạnh hơn khi tiến tới -38.83°C rồi tan biến
      const tempNormX = PhysicsSim.clamp((state.temp - params.t0) / (params.tMeltX - params.t0), 0, 1);
      const jitterX = 0.004 + tempNormX * 0.014;
      this.cau2.hgCrystals.forEach((c) => {
        const scale = Math.max(0.001, 1 - hgMelt);
        c.visible = hgMelt < 0.985;
        c.scale.set(1.18 * scale, 0.88 * scale, 1.08 * scale);
        c.position.set(
          c.userData.basePos.x + Math.sin(t * 28 + c.userData.phase) * jitterX,
          c.userData.basePos.y * scale + Math.cos(t * 24 + c.userData.phase) * jitterX * 0.4,
          c.userData.basePos.z + Math.cos(t * 26 + c.userData.phase) * jitterX
        );
      });

      // Tầng nước đá & nước lỏng nằm phía trên Thủy ngân
      const iceMelt = state.meltIceFrac;
      const waterLayerY = 0.3 + Math.max(0.68, hgPoolH + 0.06);
      this.cau2.waterLayerGroup.position.y = waterLayerY;

      const waterH = 0.02 + iceMelt * 0.88;
      this.cau2.waterBody.visible = iceMelt > 0.01;
      this.cau2.waterTop.visible = iceMelt > 0.01;
      this.cau2.waterBody.scale.y = waterH;
      this.cau2.waterBody.position.y = waterH * 0.5;
      this.cau2.waterTop.position.y = waterH;
      if (this.cau2.waterTop.visible) {
        animateRippleDisc(this.cau2.waterTop, t + 1.2, 0.02, 7.5);
      }

      const iceJitter = 0.003 + PhysicsSim.clamp((state.temp - params.t0) / (0 - params.t0), 0, 1) * 0.012;
      this.cau2.iceBlocks.forEach((b) => {
        const s = Math.max(0.001, 1 - iceMelt * 0.96);
        b.visible = iceMelt < 0.99;
        b.scale.setScalar(s);
        const floatBob = iceMelt > 0.05 ? Math.sin(t * 2.2 + b.userData.phase) * 0.035 * iceMelt : 0;
        const targetY = iceMelt > 0.05
          ? PhysicsSim.lerp(b.userData.basePos.y, waterH - 0.1 * s, iceMelt * 0.65)
          : b.userData.basePos.y;
        b.position.set(
          b.userData.basePos.x + Math.sin(t * 25 + b.userData.phase) * iceJitter,
          targetY + floatBob,
          b.userData.basePos.z + Math.cos(t * 23 + b.userData.phase) * iceJitter
        );
      });

      // Cột nhiệt kế & hạt đối lưu / sương lạnh
      const tempFrac = PhysicsSim.clamp((state.temp - params.t0) / (0 - params.t0), 0, 1);
      const colH = 0.3 + tempFrac * 2.3;
      this.cau2.thermFill.scale.y = colH;
      this.cau2.thermFill.position.y = 0.4 + colH * 0.5;
      const tColor = new THREE.Color('#38bdf8').lerp(new THREE.Color('#34d399'), tempFrac);
      this.cau2.thermGlowMat.color.copy(tColor);
      this.cau2.thermGlowMat.emissive.copy(tColor);

      this._animateParticleCloud(this.cau2.heatParticles, dt, 0.75, 0.65);
      this._animateParticleCloud(this.cau2.frostParticles, dt, -0.35, 0.5 * (1 - tempFrac));

      // Mũi tên dòng nhiệt theo đúng giai đoạn
      this.cau2.heatArrows.forEach((arr) => {
        arr.visible = this.showVectors;
        if (!this.showVectors) return;
        const activeToX = state.stageIndex === 0 || state.stageIndex === 1 || state.stageIndex === 2;
        const activeToIce = state.stageIndex === 0 || state.stageIndex === 2 || state.stageIndex === 3;
        const isOn = arr.userData.group === 'toX' ? activeToX : activeToIce;
        arr.visible = isOn;
        const bob = ((t * 0.9 + arr.userData.phase) % 1) * 0.25;
        arr.position.y = arr.userData.basePos.y + bob;
        arr.children.forEach((ch) => { ch.material.opacity = 1 - bob * 2.8; });
      });

      // Cập nhật màn hình 3D (mỗi ~80ms để mượt)
      if (t - this.lastScreenUpdate > 0.08) {
        this._drawCau2Screens(sim);
      }

      // Cập nhật hạt phân tử vi mô 3D
      this._updateMoleculesCau2(dt, sim);
    }

    _drawCau2Screens(sim) {
      const { state, summary, params } = sim;

      // 1. Màn hình Bộ Nguồn PSU
      const psu = this.cau2.psuScreen;
      const psuSig = state.Q_now.toFixed(0) + '_' + params.m;
      if (psu.lastSig !== psuSig) {
        psu.lastSig = psuSig;
        const ctx = psu.ctx;
        ctx.fillStyle = '#061524';
        ctx.fillRect(0, 0, 320, 160);
        ctx.strokeStyle = '#0ea5e9';
        ctx.lineWidth = 4;
        ctx.strokeRect(4, 4, 312, 152);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 20px monospace';
        ctx.fillText('NGUỒN ĐUN P = CONST', 18, 34);
        ctx.fillStyle = '#fb923c';
        ctx.font = 'bold 34px monospace';
        ctx.fillText('P = ' + summary.powerWatt.toFixed(2) + ' W', 18, 82);
        ctx.fillStyle = '#a7f3d0';
        ctx.font = 'bold 22px monospace';
        ctx.fillText('Q = ' + (state.Q_now / 1000).toFixed(2) + ' kJ', 18, 128);
        psu.tex.needsUpdate = true;
      }

      // 2. Màn hình Nhiệt kế
      const th = this.cau2.thermScreen;
      const thSig = state.temp.toFixed(2);
      if (th.lastSig !== thSig) {
        th.lastSig = thSig;
        const ctx = th.ctx;
        ctx.fillStyle = '#08111e';
        ctx.fillRect(0, 0, 280, 130);
        ctx.strokeStyle = state.stageIndex === 1 ? '#fbbf24' : '#38bdf8';
        ctx.lineWidth = 4;
        ctx.strokeRect(4, 4, 272, 122);
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('NHIỆT ĐỘ HỖN HỢP', 20, 32);
        ctx.fillStyle = state.stageIndex === 1 ? '#fde047' : '#e0f2fe';
        ctx.font = 'bold 46px monospace';
        ctx.fillText(state.temp.toFixed(2) + '°C', 20, 94);
        th.tex.needsUpdate = true;
      }

      // 3. Đồng hồ bấm giờ tròn
      const tm = this.cau2.timerScreen;
      const tmSig = state.tauDisplay.toFixed(1);
      if (tm.lastSig !== tmSig) {
        tm.lastSig = tmSig;
        const ctx = tm.ctx;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 320, 320);
        ctx.beginPath();
        ctx.arc(160, 160, 148, 0, Math.PI * 2);
        ctx.fillStyle = '#111827';
        ctx.fill();
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#38bdf8';
        ctx.stroke();

        // Vạch chia 12 mốc
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
          ctx.beginPath();
          ctx.moveTo(160 + Math.cos(a) * 122, 160 + Math.sin(a) * 122);
          ctx.lineTo(160 + Math.cos(a) * 138, 160 + Math.sin(a) * 138);
          ctx.strokeStyle = i % 3 === 0 ? '#f8fafc' : '#64748b';
          ctx.lineWidth = i % 3 === 0 ? 4 : 2;
          ctx.stroke();
        }

        // Kim quay
        const handAng = ((state.tauDisplay % 60) / 60) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(160, 160);
        ctx.lineTo(160 + Math.cos(handAng) * 112, 160 + Math.sin(handAng) * 112);
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(160, 160, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#f8fafc';
        ctx.fill();

        // Hộp số giữa mặt đồng hồ
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(68, 198, 184, 54);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.strokeRect(68, 198, 184, 54);
        ctx.fillStyle = '#67e8f9';
        ctx.font = 'bold 26px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(state.tauDisplay.toFixed(1) + ' ph', 160, 233);
        ctx.textAlign = 'left';
        tm.tex.needsUpdate = true;
      }
    }

    _updateCau4Visuals(dt, sim) {
      const { state, summary, params } = sim;
      const t = this.clockTime;

      // Bình sinh hơi sôi sùng sục + ngọn lửa Bunsen bập bùng
      animateRippleDisc(this.cau4.boilTop, t, 0.025, 10);
      this._animateParticleCloud(this.cau4.boilBubbles, dt, 1.4, 0.85);
      this.cau4.burnerLight.intensity = 1.6 + Math.sin(t * 7.0) * 0.32;
      if (this.cau4.flameOuter) {
        this.cau4.flameOuter.scale.set(1 + Math.sin(t * 14) * 0.08, 1 + Math.cos(t * 17) * 0.14, 1 + Math.sin(t * 15) * 0.08);
      }
      if (this.cau4.flameInner) {
        this.cau4.flameInner.scale.set(1 + Math.cos(t * 19) * 0.07, 1 + Math.sin(t * 21) * 0.16, 1);
      }

      // Van hơi mở khi đang sục hơi
      const valveTarget = state.steamFlowActive ? 0 : Math.PI * 0.5;
      this.cau4.valveGroup.rotation.y = PhysicsSim.lerp(this.cau4.valveGroup.rotation.y, valveTarget, 0.15);

      // Các hạt hơi chạy dọc đường ống CatmullRom
      this.cau4.pipeSteamMotes.forEach((m) => {
        m.visible = state.steamFlowActive;
        if (!state.steamFlowActive) return;
        m.userData.t = (m.userData.t + dt * 0.65) % 1;
        const p = this.cau4.pipeCurve.getPointAt(m.userData.t);
        m.position.copy(p);
      });

      // Cốc nhôm đổi ánh nhiệt từ lạnh (-5°C) -> 0°C -> cân bằng (25°C)
      const tempNorm = PhysicsSim.clamp((state.tempSystem - params.tInit) / (params.tEq - params.tInit), 0, 1);
      const cupColor = new THREE.Color('#0284c7').lerp(new THREE.Color('#10b981'), tempNorm);
      this.cau4.aluMat.emissive.copy(cupColor);
      this.cau4.aluMat.emissiveIntensity = 0.1 + 0.12 * Math.sin(t * 2.5);

      // Mực nước lỏng dâng lên đến 500 g
      const waterFrac = PhysicsSim.clamp(state.liquidWaterMass / Math.max(1, params.mTotal), 0, 1);
      const waterH = 0.02 + waterFrac * 1.45;
      this.cau4.waterBody.visible = waterFrac > 0.008;
      this.cau4.waterTop.visible = waterFrac > 0.008;
      this.cau4.waterBody.scale.y = waterH;
      this.cau4.waterBody.position.y = 0.27 + waterH * 0.5;
      this.cau4.waterTop.position.y = 0.27 + waterH;
      if (this.cau4.waterTop.visible) {
        animateRippleDisc(this.cau4.waterTop, t, state.steamFlowActive ? 0.024 : 0.006, 8.5);
      }
      // Màu nước chuyển nhẹ từ xanh băng sang xanh ngọc khi đạt 25°C
      const wCol = new THREE.Color('#38bdf8').lerp(new THREE.Color('#2dd4bf'), tempNorm);
      this.cau4.waterMat.color.copy(wCol);

      // Viên nước đá co nhỏ dần và nổi dập dềnh theo mực nước
      const iceScale = Math.max(0.001, Math.cbrt(1 - state.meltIceFrac));
      this.cau4.iceGroup.visible = state.meltIceFrac < 0.99;
      this.cau4.iceGroup.scale.setScalar(iceScale);
      const iceY = 0.27 + Math.max(0.42 * iceScale, waterH - 0.16 * iceScale);
      const bob = waterFrac > 0.25 ? Math.sin(t * 2.3) * 0.035 : 0;
      this.cau4.iceGroup.position.set(0.22, iceY + bob, 0.08);
      this.cau4.iceGroup.rotation.y += dt * (waterFrac > 0.2 ? 0.35 : 0.04);

      // Sương lạnh & luồng hơi ngưng tụ phun từ vòi
      this._animateParticleCloud(this.cau4.frostCloud, dt, -0.35, 0.55 * (1 - state.meltIceFrac));
      this._animateParticleCloud(this.cau4.steamPlume, dt, 1.15, state.steamFlowActive ? 0.78 : 0);

      // Mũi tên dòng nhiệt
      this.cau4.heatArrows.forEach((arr) => {
        arr.visible = this.showVectors && state.steamFlowActive;
        if (!arr.visible) return;
        const flow = ((t * 1.1 + arr.userData.phase) % 1) * 0.26;
        if (arr.userData.group === 'steamToa') {
          arr.position.x = arr.userData.basePos.x + flow;
        } else {
          arr.position.y = arr.userData.basePos.y + flow * 0.7;
        }
        arr.children.forEach((c) => { c.material.opacity = 1 - flow * 2.6; });
      });

      if (t - this.lastScreenUpdate > 0.08) {
        this._drawCau4Screens(sim);
      }

      this._updateMoleculesCau4(dt, sim);
    }

    _drawCau4Screens(sim) {
      const { state, summary, params } = sim;

      // 1. Màn hình Bình sinh hơi
      const bs = this.cau4.boilerScreen;
      const bSig = params.tSteam + '_' + state.m_hn_injected.toFixed(1);
      if (bs.lastSig !== bSig) {
        bs.lastSig = bSig;
        const ctx = bs.ctx;
        ctx.fillStyle = '#1c0d07';
        ctx.fillRect(0, 0, 240, 100);
        ctx.strokeStyle = '#fb923c';
        ctx.lineWidth = 4;
        ctx.strokeRect(3, 3, 234, 94);
        ctx.fillStyle = '#fed7aa';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('HƠI NƯỚC: ' + params.tSteam + ' °C', 14, 34);
        ctx.fillStyle = '#fb7185';
        ctx.font = 'bold 26px monospace';
        ctx.fillText('m_hn = ' + state.m_hn_injected.toFixed(1) + ' g', 14, 76);
        bs.tex.needsUpdate = true;
      }

      // 2. Màn hình Cân Điện Tử
      const sc = this.cau4.scaleScreen;
      const scSig = state.currentWaterMass.toFixed(1) + '_' + state.m_hn_injected.toFixed(1);
      if (sc.lastSig !== scSig) {
        sc.lastSig = scSig;
        const ctx = sc.ctx;
        ctx.fillStyle = '#06202a';
        ctx.fillRect(0, 0, 420, 110);
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 4;
        ctx.strokeRect(4, 4, 412, 102);
        ctx.fillStyle = '#67e8f9';
        ctx.font = 'bold 19px sans-serif';
        ctx.fillText('TỔNG KHỐI LƯỢNG TRONG CỐC', 18, 32);
        ctx.fillStyle = '#34d399';
        ctx.font = 'bold 42px monospace';
        ctx.fillText(state.currentWaterMass.toFixed(1) + ' g', 18, 86);
        ctx.fillStyle = '#fda4af';
        ctx.font = 'bold 20px monospace';
        ctx.fillText('+Hơi: ' + state.m_hn_injected.toFixed(1) + 'g', 245, 82);
        sc.tex.needsUpdate = true;
      }

      // 3. Thước chia gam bên thành cốc
      const gs = this.cau4.gaugeScreen;
      const gSig = String(params.mTotal);
      if (gs.lastSig !== gSig) {
        gs.lastSig = gSig;
        const ctx = gs.ctx;
        ctx.clearRect(0, 0, 110, 320);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
        ctx.fillRect(0, 0, 110, 320);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, 108, 318);
        ctx.fillStyle = '#e0f2fe';
        ctx.font = 'bold 18px monospace';
        for (let k = 1; k <= 5; k++) {
          const val = Math.round((k / 5) * params.mTotal);
          const y = 300 - (k / 5) * 260;
          ctx.fillRect(8, y, 22, 3);
          ctx.fillText(val + 'g', 36, y + 6);
        }
        gs.tex.needsUpdate = true;
      }

      // 4. Bộ Đo Nhiệt Độ Kép (Cân bằng nhiệt)
      const dm = this.cau4.dualScreen;
      const dSig = state.tempSystem.toFixed(1) + '_' + state.tempSteamDrop.toFixed(1);
      if (dm.lastSig !== dSig) {
        dm.lastSig = dSig;
        const ctx = dm.ctx;
        ctx.fillStyle = '#09111e';
        ctx.fillRect(0, 0, 320, 380);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 4;
        ctx.strokeRect(4, 4, 312, 372);

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('NHIỆT KẾ KÉP PHÒNG LAB', 22, 38);

        // Kênh thu nhiệt (Nhôm + Đá)
        ctx.fillStyle = 'rgba(14, 165, 233, 0.16)';
        ctx.fillRect(18, 58, 284, 134);
        ctx.fillStyle = '#7dd3fc';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('NHÔM (C=264) & NƯỚC ĐÁ', 30, 88);
        ctx.fillStyle = '#34d399';
        ctx.font = 'bold 54px monospace';
        ctx.fillText(state.tempSystem.toFixed(1) + ' °C', 30, 158);

        // Kênh tỏa nhiệt (Hơi nước)
        ctx.fillStyle = 'rgba(244, 63, 94, 0.16)';
        ctx.fillRect(18, 212, 284, 140);
        ctx.fillStyle = '#fda4af';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('HƠI NƯỚC 100°C → NGƯNG', 30, 244);
        ctx.fillStyle = '#fb923c';
        ctx.font = 'bold 42px monospace';
        ctx.fillText('→ ' + state.tempSteamDrop.toFixed(1) + ' °C', 30, 310);
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '15px sans-serif';
        ctx.fillText('Đích cân bằng: ' + params.tEq + ' °C', 30, 338);
        dm.tex.needsUpdate = true;
      }
    }

    _updateMoleculesCau2(dt, sim) {
      if (!this.showMolecules) return;
      const { state } = sim;
      const t = this.clockTime;
      const xLiquid = state.meltXFrac > 0.25;
      const iceLiquid = state.meltIceFrac > 0.25;

      this.molAtoms.forEach((a) => {
        if (a.userData.isGroupA) {
          // Chất X (bạc)
          a.material.color.set('#e2e8f0');
          a.material.emissive.set('#64748b');
          if (!xLiquid) {
            const vib = 0.015 + state.stageIndex * 0.01;
            a.position.set(
              a.userData.base.x + Math.sin(t * 26 + a.userData.phase) * vib,
              a.userData.base.y + Math.cos(t * 22 + a.userData.phase) * vib,
              a.userData.base.z + Math.sin(t * 24 + a.userData.phase) * vib
            );
          } else {
            a.position.addScaledVector(a.userData.vel, dt * 0.65);
            if (a.position.x > 0.42 || a.position.x < -0.42) a.userData.vel.x *= -1;
            if (a.position.y > -0.05 || a.position.y < -0.48) a.userData.vel.y *= -1;
            if (a.position.z > 0.42 || a.position.z < -0.42) a.userData.vel.z *= -1;
          }
        } else {
          // Nước đá / Nước (xanh cyan)
          a.material.color.set('#38bdf8');
          a.material.emissive.set('#0284c7');
          if (!iceLiquid) {
            const vib = 0.01 + state.stageIndex * 0.012;
            a.position.set(
              a.userData.base.x + Math.sin(t * 20 + a.userData.phase) * vib,
              a.userData.base.y + Math.cos(t * 19 + a.userData.phase) * vib,
              a.userData.base.z + Math.sin(t * 21 + a.userData.phase) * vib
            );
          } else {
            a.position.addScaledVector(a.userData.vel, dt * 0.65);
            if (a.position.x > 0.42 || a.position.x < -0.42) a.userData.vel.x *= -1;
            if (a.position.y > 0.48 || a.position.y < 0.05) a.userData.vel.y *= -1;
            if (a.position.z > 0.42 || a.position.z < -0.42) a.userData.vel.z *= -1;
          }
        }
      });
    }

    _updateMoleculesCau4(dt, sim) {
      if (!this.showMolecules) return;
      const { state } = sim;
      const t = this.clockTime;
      const melted = state.meltIceFrac > 0.35;

      this.molAtoms.forEach((a) => {
        if (a.userData.isGroupA) {
          // Phân tử H2O của Đá -> Nước (Xanh băng -> Ngọc)
          a.material.color.set(melted ? '#2dd4bf' : '#7dd3fc');
          a.material.emissive.set('#0284c7');
          if (!melted) {
            const vib = 0.012 + state.progress * 0.018;
            a.position.set(
              a.userData.base.x + Math.sin(t * 22 + a.userData.phase) * vib,
              a.userData.base.y + Math.cos(t * 20 + a.userData.phase) * vib,
              a.userData.base.z + Math.sin(t * 25 + a.userData.phase) * vib
            );
          } else {
            a.position.addScaledVector(a.userData.vel, dt * 0.75);
            if (a.position.x > 0.44 || a.position.x < -0.44) a.userData.vel.x *= -1;
            if (a.position.y > 0.2 || a.position.y < -0.48) a.userData.vel.y *= -1;
            if (a.position.z > 0.44 || a.position.z < -0.44) a.userData.vel.z *= -1;
          }
        } else {
          // Phân tử Hơi nước 100°C bay nhanh -> truyền động năng -> chậm dần về cân bằng
          const speedMult = PhysicsSim.lerp(1.65, 0.68, state.progress);
          const col = new THREE.Color('#fb7185').lerp(new THREE.Color('#34d399'), state.progress);
          a.material.color.copy(col);
          a.material.emissive.copy(col);
          a.position.addScaledVector(a.userData.vel, dt * speedMult);
          if (a.position.length() > 0.56) {
            a.position.setLength(0.56);
            a.userData.vel.negate();
          }
        }
      });
    }

    /**
     * Tính tọa độ màn hình 2D cho các nhãn chú thích 3D
     */
    getProjectedAnnotations() {
      if (!this.showLabels) return [];
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      const result = [];

      const st = this.lastData ? this.lastData.state : null;
      const curTemp = st ? (this.activeProblem === 'cau4' ? st.tempSystem : st.temp) : null;
      const curTempStr = typeof curTemp === 'number' ? curTemp.toFixed(1) + '°C' : '';
      const iceLbl =
        st && st.meltIceFrac >= 0.99
          ? 'Nước đã tan hết'
          : curTempStr
            ? 'Viên đá (' + curTempStr + ')'
            : 'Viên đá';
      const cau2IceLbl =
        st && st.meltIceFrac >= 0.99
          ? 'Nước lỏng (m kg)'
          : curTempStr
            ? 'Nước đá m kg (' + curTempStr + ')'
            : 'Nước đá (m kg)';

      const items =
        this.activeProblem === 'cau2'
          ? [
              { id: 'solidX', text: 'Chất X (Hg, −38,83°C)', anchor: this.cau2.anchors.solidX, tone: 'silver' },
              { id: 'ice', text: cau2IceLbl, anchor: this.cau2.anchors.ice, tone: 'cyan' },
              { id: 'coil', text: 'Dây đun (P = const)', anchor: this.cau2.anchors.coil, tone: 'amber' },
              { id: 'psu', text: 'Nguồn ổn công suất', anchor: this.cau2.anchors.psu, tone: 'amber' },
              { id: 'timer', text: 'Đồng hồ τ (phút)', anchor: this.cau2.anchors.timer, tone: 'cyan' }
            ]
          : [
              { id: 'boiler', text: 'Bình sinh hơi 100 °C', anchor: this.cau4.anchors.boiler, tone: 'coral' },
              { id: 'cal', text: 'NLK Nhôm (C = 264 J/K)', anchor: this.cau4.anchors.calorimeter, tone: 'emerald' },
              { id: 'ice', text: iceLbl, anchor: this.cau4.anchors.ice, tone: 'cyan' },
              { id: 'scale', text: 'Cân điện tử (→ 500 g)', anchor: this.cau4.anchors.scale, tone: 'emerald' },
              { id: 'dual', text: 'Nhiệt kế kép → 25 °C', anchor: this.cau4.anchors.dualMeter, tone: 'amber' }
            ];

      if (this.showMolecules) {
        items.push({
          id: 'mol',
          text: 'Soi phân tử 3D',
          anchor: this.molPod.position.clone().add(new THREE.Vector3(0, 0.92, 0)),
          tone: 'cyan'
        });
      }

      const v = new THREE.Vector3();
      items.forEach((it) => {
        v.copy(it.anchor).project(this.camera);
        if (v.z > -1 && v.z < 1) {
          const x = (v.x * 0.5 + 0.5) * w;
          const y = (-v.y * 0.5 + 0.5) * h;
          if (x > 30 && x < w - 30 && y > 30 && y < h - 30) {
            result.push({ id: it.id, text: it.text, x, y, tone: it.tone });
          }
        }
      });
      return result;
    }

    /**
     * Render mỗi khung hình
     */
    renderFrame(dt) {
      const safeDt = Math.min(dt, 0.05);
      this.clockTime += safeDt;

      // Damped Orbit Camera Interpolation
      this.camState.theta += (this.camGoal.theta - this.camState.theta) * 0.1;
      this.camState.phi += (this.camGoal.phi - this.camState.phi) * 0.1;
      this.camState.radius += (this.camGoal.radius - this.camState.radius) * 0.1;
      this.camState.target.lerp(this.camGoal.target, 0.1);

      const sinPhi = Math.sin(this.camState.phi);
      this.camera.position.set(
        this.camState.target.x + this.camState.radius * sinPhi * Math.sin(this.camState.theta),
        this.camState.target.y + this.camState.radius * Math.cos(this.camState.phi),
        this.camState.target.z + this.camState.radius * sinPhi * Math.cos(this.camState.theta)
      );
      this.camera.lookAt(this.camState.target);

      // Lắc nhẹ kính lúp phân tử
      if (this.molPod && this.molPod.visible) {
        this.molPod.position.y = 2.95 + Math.sin(this.clockTime * 1.4) * 0.06;
      }

      if (this.lastData) {
        if (this.activeProblem === 'cau2') {
          this._updateCau2Visuals(safeDt, this.lastData);
        } else {
          this._updateCau4Visuals(safeDt, this.lastData);
        }
        if (this.clockTime - this.lastScreenUpdate > 0.08) {
          this.lastScreenUpdate = this.clockTime;
        }
      }

      this.renderer.render(this.scene, this.camera);
    }

    _initOrbitEvents() {
      const dom = this.renderer.domElement;
      let dragging = false;
      let mode = 'orbit';
      let lastX = 0;
      let lastY = 0;
      let lastTouchDist = 0;

      dom.addEventListener('contextmenu', (e) => e.preventDefault());

      dom.addEventListener('pointerdown', (e) => {
        dragging = true;
        mode = e.button === 2 || e.shiftKey ? 'pan' : 'orbit';
        lastX = e.clientX;
        lastY = e.clientY;
        dom.setPointerCapture(e.pointerId);
      });

      dom.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;

        if (mode === 'orbit') {
          this.camGoal.theta -= dx * 0.0075;
          this.camGoal.phi = PhysicsSim.clamp(this.camGoal.phi - dy * 0.0065, 0.25, 1.48);
        } else {
          const right = new THREE.Vector3();
          this.camera.getWorldDirection(right);
          right.cross(this.camera.up).normalize();
          this.camGoal.target.addScaledVector(right, -dx * 0.008);
          this.camGoal.target.y = PhysicsSim.clamp(this.camGoal.target.y + dy * 0.008, 0.3, 4.2);
        }
      });

      dom.addEventListener('pointerup', () => { dragging = false; });
      dom.addEventListener('pointercancel', () => { dragging = false; });

      dom.addEventListener('wheel', (e) => {
        e.preventDefault();
        this.camGoal.radius = PhysicsSim.clamp(this.camGoal.radius + e.deltaY * 0.006, 4.0, 16.5);
      }, { passive: false });

      dom.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          lastTouchDist = Math.hypot(dx, dy);
        }
      }, { passive: true });

      dom.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          const dist = Math.hypot(dx, dy);
          this.camGoal.radius = PhysicsSim.clamp(this.camGoal.radius - (dist - lastTouchDist) * 0.02, 4.0, 16.5);
          lastTouchDist = dist;
        }
      }, { passive: true });
    }

    resize() {
      const w = this.container.clientWidth || 640;
      const h = this.container.clientHeight || 480;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    }
  }

  global.LabScene3D = LabScene3D;
})(window);
