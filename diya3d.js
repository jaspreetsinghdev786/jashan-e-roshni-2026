/* Real-time 3D diya (Three.js r149, classic build). Exposes window.initDiya(canvas). */
(function () {
  'use strict';

  function initDiya(canvas, opts) {
    var THREE = window.THREE;
    if (!THREE) return null;
    opts = opts || {};
    var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) { return null; }
    if (!renderer.getContext()) return null;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;
    
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
    camera.position.set(0, 3.4, 10.4);
    camera.lookAt(0, 0.55, 0);

    /* ---------- environment (soft studio with warm and magenta panels) ---------- */
    var pm = new THREE.PMREMGenerator(renderer);
    var envScene = new THREE.Scene();
    envScene.add(new THREE.Mesh(new THREE.BoxGeometry(12, 12, 12), new THREE.MeshBasicMaterial({ color: 0x2a1020, side: THREE.BackSide })));
    function panel(c, k, x, y, z, w, h) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.lookAt(0, 0, 0); envScene.add(m);
    }
    panel(0xffb061, 7, -5, 3, 3, 4, 2.5);
    panel(0xff3d8b, 4, 5, 2, -3, 4, 3);
    panel(0xfff2dd, 3, 0, 5.5, 0, 5, 5);
    panel(0xffd9a0, 3, 4, 0.5, 5, 2.5, 2.5);
    scene.environment = pm.fromScene(envScene, 0.04).texture;
    pm.dispose();

    /* ---------- textures ---------- */
    function noiseTexture() {
      var c = document.createElement('canvas'); c.width = c.height = 256;
      var x = c.getContext('2d'), d = x.createImageData(256, 256);
      for (var i = 0; i < d.data.length; i += 4) {
        var v = 110 + Math.random() * 110 | 0;
        d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255;
      }
      x.putImageData(d, 0, 0);
      var t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 6);
      return t;
    }
    function radialTexture(stops) {
      var c = document.createElement('canvas'); c.width = c.height = 256;
      var x = c.getContext('2d'), g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
      stops.forEach(function (s) { g.addColorStop(s[0], s[1]); });
      x.fillStyle = g; x.fillRect(0, 0, 256, 256);
      return new THREE.CanvasTexture(c);
    }
    // painted clay: terracotta body, gold bands, cream dot ring. v runs along the lathe profile.
    function bowlColorMap() {
      var W = 1024, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H;
      var x = c.getContext('2d');
      var g = x.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#9c3a14'); g.addColorStop(0.5, '#b8481c'); g.addColorStop(1, '#8d3112');
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      for (var i = 0; i < 9000; i++) {
        x.fillStyle = 'rgba(' + (Math.random() > 0.5 ? '255,200,150' : '60,15,0') + ',' + (Math.random() * 0.03) + ')';
        x.fillRect(Math.random() * W, Math.random() * H, 2, 2);
      }
      function band(v, h, col) { x.fillStyle = col; x.fillRect(0, (1 - v) * H - h / 2, W, h); }
      band(0.37, 9, '#f0b53a'); band(0.33, 4, '#f0b53a'); band(0.20, 9, '#f0b53a'); band(0.16, 4, '#f0b53a');
      for (var k = 0; k < 40; k++) {
        var px = (k + 0.5) * W / 40, py = (1 - 0.285) * H;
        x.fillStyle = '#ffe9c2'; x.beginPath(); x.arc(px, py, 6, 0, 6.283); x.fill();
        x.fillStyle = '#f0b53a'; x.beginPath(); x.arc(px + W / 80, py + 22, 3.5, 0, 6.283); x.fill();
        x.beginPath(); x.arc(px + W / 80, py - 22, 3.5, 0, 6.283); x.fill();
      }
      var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
      return t;
    }

    /* ---------- bowl ---------- */
    var V = function (x, y) { return new THREE.Vector2(x, y); };
    var outer = new THREE.SplineCurve([V(0.001, 0), V(0.55, 0.03), V(1.05, 0.2), V(1.45, 0.58), V(1.62, 0.98)]).getPoints(44);
    var lip = new THREE.SplineCurve([V(1.62, 0.98), V(1.65, 1.05), V(1.56, 1.1)]).getPoints(8);
    var inner = new THREE.SplineCurve([V(1.56, 1.1), V(1.44, 0.98), V(1.1, 0.66), V(0.6, 0.46), V(0.001, 0.4)]).getPoints(44);
    var bowlGeo = new THREE.LatheGeometry(outer.concat(lip, inner), 128);
    var pos = bowlGeo.attributes.position;
    for (var i = 0; i < pos.count; i++) {   // pinch a spout for the wick
      var px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i);
      var a = Math.atan2(pz, px);
      var w = Math.exp(-(a * a) / 0.085);
      var hf = Math.min(Math.max((py - 0.6) / 0.5, 0), 1); hf = hf * hf * (3 - 2 * hf);
      pos.setX(i, px + w * hf * 0.62);
      pos.setY(i, py + w * hf * 0.07);
      pos.setZ(i, pz * (1 - w * hf * 0.42));
    }
    bowlGeo.computeVertexNormals();
    var noise = noiseTexture();
    var bowl = new THREE.Mesh(bowlGeo, new THREE.MeshPhysicalMaterial({
      map: bowlColorMap(), bumpMap: noise, bumpScale: 0.12, roughness: 0.6, metalness: 0.02,
      clearcoat: 0.3, clearcoatRoughness: 0.5, envMapIntensity: 0.55, side: THREE.DoubleSide
    }));
    
    var oil = new THREE.Mesh(new THREE.CircleGeometry(1.15, 64), new THREE.MeshPhysicalMaterial({
      color: 0x3a1704, roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03,
      emissive: 0xff7a1a, emissiveIntensity: 0.1, envMapIntensity: 1.2
    }));
    oil.rotation.x = -Math.PI / 2; oil.position.y = 0.655;

    var wick = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.42, 12),
      new THREE.MeshStandardMaterial({ color: 0xf3e6cc, roughness: 0.9 }));
    wick.position.set(1.94, 1.12, 0); wick.rotation.z = -0.55;
    var wickTip = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), new THREE.MeshBasicMaterial({ color: 0xff7a2a }));
    wickTip.position.set(2.04, 1.31, 0);

    /* ---------- flame ---------- */
    var flameUniforms = { uTime: { value: 0 }, uA: { value: new THREE.Color(0xfff6d0) }, uB: { value: new THREE.Color(0xff8a1f) }, uGain: { value: 1 } };
    function flameMaterial(a, b, gain) {
      return new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uTime: flameUniforms.uTime, uA: { value: new THREE.Color(a) }, uB: { value: new THREE.Color(b) }, uGain: { value: gain } },
        vertexShader: [
          'uniform float uTime; varying vec3 vN; varying float vY;',
          'void main(){ vY = position.y / 1.3; vec3 p = position;',
          ' float s = pow(vY, 1.4);',
          ' p.x += (sin(uTime*7.0 + p.y*5.0) * 0.045 + sin(uTime*13.0 + p.y*9.0) * 0.02) * s;',
          ' p.z += (cos(uTime*6.0 + p.y*4.0) * 0.04) * s;',
          ' p.y *= 1.0 + 0.06 * sin(uTime*11.0);',
          ' vN = normalize(normalMatrix * normal);',
          ' gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }'
        ].join('\n'),
        fragmentShader: [
          'uniform vec3 uA; uniform vec3 uB; uniform float uGain; varying vec3 vN; varying float vY;',
          'void main(){ float rim = 1.0 - abs(vN.z);',
          ' vec3 col = mix(uA, uB, clamp(vY * 0.9 + rim * 0.9, 0.0, 1.0));',
          ' float al = (1.0 - rim * 0.75) * (1.0 - vY * 0.25) * uGain;',
          ' gl_FragColor = vec4(col, al); }'
        ].join('\n')
      });
    }
    var flameProfile = [];
    for (var f = 0; f <= 28; f++) {
      var t = f / 28;
      flameProfile.push(new THREE.Vector2(0.001 + 0.28 * Math.sin(Math.PI * Math.pow(t, 0.72)) * (1 - 0.3 * t), t * 1.3));
    }
    var flameGeo = new THREE.LatheGeometry(flameProfile, 28);
    var flameOuter = new THREE.Mesh(flameGeo, flameMaterial(0xffd27a, 0xff6a14, 0.95));
    var flameCore = new THREE.Mesh(flameGeo, flameMaterial(0xffffff, 0xffd98a, 1.0));
    flameCore.scale.set(0.5, 0.62, 0.5);
    var flameBlue = new THREE.Mesh(flameGeo, flameMaterial(0x6f8cff, 0x3d4fff, 0.55));
    flameBlue.scale.set(0.34, 0.2, 0.34);
    var flame = new THREE.Group();
    flame.add(flameOuter, flameCore, flameBlue);
    flame.position.set(2.04, 1.3, 0);
    flame.scale.setScalar(0.95);

    var glowTex = radialTexture([[0, 'rgba(255,200,110,1)'], [0.25, 'rgba(255,150,60,.55)'], [1, 'rgba(255,120,40,0)']]);
    function glowSprite(size, op) {
      var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: op }));
      s.scale.set(size, size, 1); return s;
    }
    var glowA = glowSprite(2.6, 0.9), glowB = glowSprite(7.5, 0.28);
    glowA.position.copy(flame.position); glowA.position.y += 0.4;
    glowB.position.copy(glowA.position);

    var flameLight = new THREE.PointLight(0xff9a3c, 1.15, 14, 2);
    flameLight.position.set(2.0, 1.7, 0.2);
    
    /* ---------- scene dressing ---------- */
    var shadowTex = radialTexture([[0, 'rgba(0,0,0,.65)'], [0.55, 'rgba(0,0,0,.25)'], [1, 'rgba(0,0,0,0)']]);
    var contact = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 4.6), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
    contact.rotation.x = -Math.PI / 2; contact.position.set(0.2, -0.012, 0);
    var poolTex = radialTexture([[0, 'rgba(255,170,80,.55)'], [0.5, 'rgba(255,120,40,.18)'], [1, 'rgba(255,100,30,0)']]);
    var pool = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    pool.rotation.x = -Math.PI / 2; pool.position.set(1.0, -0.006, 0);
    
    var key = new THREE.DirectionalLight(0xffe0c0, 0.8); key.position.set(-5, 7, 4);
    var rim = new THREE.DirectionalLight(0xff3d8b, 1.1); rim.position.set(5, 3, -5);
    var hemi = new THREE.HemisphereLight(0xffd9b8, 0x3a0f2c, 0.35);

    // embers
    var N = 46, ePos = new Float32Array(N * 3), eVel = [], eLife = new Float32Array(N);
    function respawn(i) {
      ePos[i * 3] = 2.04 + (Math.random() - 0.5) * 0.15; ePos[i * 3 + 1] = 1.6 + Math.random() * 0.2; ePos[i * 3 + 2] = (Math.random() - 0.5) * 0.15;
      eVel[i] = [(Math.random() - 0.5) * 0.004, 0.006 + Math.random() * 0.012, (Math.random() - 0.5) * 0.004];
      eLife[i] = Math.random();
    }
    for (var e = 0; e < N; e++) { respawn(e); ePos[e * 3 + 1] += Math.random() * 2; }
    var eGeo = new THREE.BufferGeometry(); eGeo.setAttribute('position', new THREE.BufferAttribute(ePos, 3));
    var embers = new THREE.Points(eGeo, new THREE.PointsMaterial({ map: glowTex, size: 0.2, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9, color: 0xffb454 }));

    var rig = new THREE.Group();
    rig.add(bowl, oil, wick, wickTip, flame, glowA, glowB, flameLight, embers);
    rig.position.x = -0.85;
    var world = new THREE.Group();
    world.add(rig, contact, pool);
    scene.add(world, key, rim, hemi);

    /* ---------- interaction ---------- */
    var yaw = -0.45, targetYaw = -0.45, vel = 0, dragging = false, lastX = 0, tiltX = 0, tiltY = 0, tx = 0, ty = 0;
    canvas.style.touchAction = 'pan-y';
    canvas.style.cursor = 'grab';
    canvas.addEventListener('pointerdown', function (ev) { dragging = true; lastX = ev.clientX; canvas.setPointerCapture(ev.pointerId); canvas.style.cursor = 'grabbing'; });
    canvas.addEventListener('pointerup', function () { dragging = false; canvas.style.cursor = 'grab'; });
    canvas.addEventListener('pointercancel', function () { dragging = false; });
    canvas.addEventListener('pointermove', function (ev) {
      var r = canvas.getBoundingClientRect();
      tx = ((ev.clientX - r.left) / r.width - 0.5); ty = ((ev.clientY - r.top) / r.height - 0.5);
      if (dragging) { var dx = ev.clientX - lastX; lastX = ev.clientX; vel = dx * 0.008; targetYaw += vel; if (reduced) draw(0); }
    });
    canvas.addEventListener('pointerleave', function () { tx = 0; ty = 0; });

    /* ---------- loop ---------- */
    var running = false, visible = true, raf = 0, clock = new THREE.Clock(), elapsed = 0;
    function resize() {
      var w = canvas.clientWidth || 600, h = canvas.clientHeight || 600;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.position.z = w / h < 0.9 ? 13 : 10.4;
      camera.updateProjectionMatrix();
    }
    function draw(dt) {
      elapsed += dt;
      flameUniforms.uTime.value = elapsed;
      var fl = 1 + Math.sin(elapsed * 17) * 0.05 + Math.sin(elapsed * 29) * 0.04 + Math.sin(elapsed * 7) * 0.03;
      flameLight.intensity = 1.15 * fl;
      glowA.material.opacity = 0.85 * fl; glowB.material.opacity = 0.26 * fl;
      flame.scale.set(0.95 * (1 + (fl - 1) * 0.4), 0.95 * fl, 0.95 * (1 + (fl - 1) * 0.4));
      pool.material.opacity = 0.8 + (fl - 1) * 2;
      if (!dragging) { targetYaw += vel; vel *= 0.94; }
      var idle = reduced ? 0 : Math.sin(elapsed * 0.35) * 0.32;
      yaw += ((targetYaw + idle) - yaw) * 0.08;
      tiltX += (ty * 0.14 - tiltX) * 0.06; tiltY += (tx * 0.35 - tiltY) * 0.06;
      world.rotation.y = yaw + tiltY;
      world.rotation.x = tiltX;
      var p = eGeo.attributes.position.array;
      for (var i = 0; i < N; i++) {
        p[i * 3] += eVel[i][0] + Math.sin(elapsed * 2 + i) * 0.0015; p[i * 3 + 1] += eVel[i][1]; p[i * 3 + 2] += eVel[i][2];
        eLife[i] -= 0.004; if (eLife[i] <= 0 || p[i * 3 + 1] > 4.6) respawn(i);
      }
      eGeo.attributes.position.needsUpdate = true;
      renderer.render(scene, camera);
    }
    function tick() {
      if (!running) return;
      raf = requestAnimationFrame(tick);
      draw(Math.min(clock.getDelta(), 0.05));
    }
    function start() { if (running || reduced) return; running = true; clock.getDelta(); tick(); }
    function stop() { running = false; cancelAnimationFrame(raf); }
    function sync() { (visible && !document.hidden) ? start() : stop(); }

    resize();
    var ro = new ResizeObserver(function () { resize(); if (reduced) draw(0); });
    ro.observe(canvas);
    var io = new IntersectionObserver(function (es) { visible = es[0].isIntersecting; sync(); }, { threshold: 0.05 });
    io.observe(canvas);
    document.addEventListener('visibilitychange', sync);
    draw(0.016);
    sync();
    canvas.dataset.ready = '1';

    return {
      dispose: function () { stop(); ro.disconnect(); io.disconnect(); renderer.dispose(); }
    };
  }

  window.initDiya = initDiya;
})();
