import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js";
import { EffectComposer } from "https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/postprocessing/UnrealBloomPass.js";
import { AfterimagePass } from "https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/postprocessing/AfterimagePass.js";

const visionModule = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3");
const vision = visionModule.default || visionModule;
const { FilesetResolver, HandLandmarker } = vision;

const canvas = document.querySelector("#scene");
const video = document.querySelector("#webcam");
const fullscreenButton = document.querySelector("#fullscreen-toggle");

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance"
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.84;
renderer.autoClear = true;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x02030a, 0.038);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 1.5, 19);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.4,
  0.9,
  0.18
);
bloomPass.threshold = 0.02;
bloomPass.strength = 1.48;
bloomPass.radius = 0.78;
composer.addPass(bloomPass);

const afterimagePass = new AfterimagePass();
afterimagePass.uniforms.damp.value = 0.88;
composer.addPass(afterimagePass);

const palette = {
  background: new THREE.Color(0x010208),
  coreWarm: new THREE.Color(0xffca6d),
  coreHot: new THREE.Color(0xfff4bc),
  ringCool: new THREE.Color(0x90aaf5),
  ringWarm: new THREE.Color(0xf5b98a),
  spaceDust: new THREE.Color(0x9bb0d8)
};

renderer.setClearColor(palette.background, 1);

const clock = new THREE.Clock();

const state = {
  mouse: new THREE.Vector2(),
  mouseSmooth: new THREE.Vector2(),
  openRatio: 0,
  openRatioTarget: 0,
  handVisible: false,
  handLandmarker: null,
  lastHandFrame: 0,
  cameraDistance: 19,
  targetCameraDistance: 19,
  fullscreen: false
};

const saturnGroup = new THREE.Group();
saturnGroup.rotation.x = 0.32;
saturnGroup.rotation.z = 0.1;
scene.add(saturnGroup);

const coreGroup = new THREE.Group();
const ringsGroup = new THREE.Group();
ringsGroup.rotation.x = 0.96;
ringsGroup.rotation.z = 0.12;
saturnGroup.add(coreGroup, ringsGroup);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function smoothstep(min, max, value) {
  const x = clamp((value - min) / (max - min), 0, 1);
  return x * x * (3 - 2 * x);
}

function createParticleMaterial({ additive = true, sizeScale = 1.0, brightness = 1.0 }) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: {
      uPixelRatio: { value: renderer.getPixelRatio() },
      uSizeScale: { value: sizeScale },
      uBrightness: { value: brightness }
    },
    vertexShader: `
      attribute float aSize;
      attribute float aAlpha;
      attribute vec3 aColor;
      varying float vAlpha;
      varying vec3 vColor;
      uniform float uPixelRatio;
      uniform float uSizeScale;
      uniform float uBrightness;

      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float depth = clamp(28.0 / max(8.0, -mvPosition.z), 0.4, 3.0);
        gl_PointSize = aSize * uSizeScale * depth * uPixelRatio;
        gl_Position = projectionMatrix * mvPosition;
        vAlpha = aAlpha * uBrightness;
        vColor = aColor;
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      varying vec3 vColor;

      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float dist = length(uv);
        float halo = smoothstep(0.56, 0.0, dist);
        float core = smoothstep(0.18, 0.0, dist);
        float glow = halo * 0.75 + core * 0.25;
        gl_FragColor = vec4(vColor, glow * vAlpha);
      }
    `
  });
}

function createCoreParticles(count) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const alphas = new Float32Array(count);
  const data = [];

  for (let i = 0; i < count; i += 1) {
    const direction = new THREE.Vector3().randomDirection();
    const radius = Math.pow(Math.random(), 0.72) * 3.25;
    const temp = Math.random();
    const color = palette.coreWarm.clone().lerp(palette.coreHot, temp * temp);

    data.push({
      direction,
      radius,
      orbitOffset: Math.random() * Math.PI * 2,
      waveOffset: Math.random() * Math.PI * 2,
      noiseSeed: Math.random() * 100,
      brightness: 0.22 + Math.random() * 0.55,
      size: 18 + Math.random() * 28
    });

    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
    sizes[i] = data[i].size;
    alphas[i] = data[i].brightness;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1));

  const material = createParticleMaterial({ sizeScale: 1.0, brightness: 1.16 });
  const points = new THREE.Points(geometry, material);
  coreGroup.add(points);

  return { geometry, material, data, points };
}

function createRingParticles(bands) {
  const total = bands.reduce((sum, band) => sum + band.count, 0);
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(total * 3);
  const colors = new Float32Array(total * 3);
  const sizes = new Float32Array(total);
  const alphas = new Float32Array(total);
  const data = [];

  let index = 0;
  for (const band of bands) {
    for (let i = 0; i < band.count; i += 1) {
      const colorMix = Math.random();
      const color = palette.ringCool.clone().lerp(palette.ringWarm, band.warmth * 0.5 + colorMix * 0.18);
      const radius = band.inner + Math.pow(Math.random(), 0.72) * (band.outer - band.inner);
      const orbitLift = (Math.random() - 0.5) * band.thickness;
      const eccentricity = 0.86 + Math.random() * 0.14;

      data.push({
        bandIndex: band.index,
        angle: Math.random() * Math.PI * 2,
        radius,
        eccentricity,
        orbitLift,
        speed: band.speed * (0.9 + Math.random() * 0.22),
        size: band.size * (0.6 + Math.random() * 0.8),
        alpha: band.alpha * (0.7 + Math.random() * 0.35),
        wobbleAmp: 0.05 + Math.random() * 0.3,
        wobbleFreq: 0.45 + Math.random() * 1.1,
        swirl: 0.06 + Math.random() * 0.18,
        seed: Math.random() * 1000,
        breakout: 0.3 + Math.random() * 1.2,
        warmth: band.warmth
      });

      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
      sizes[index] = data[index].size;
      alphas[index] = data[index].alpha;
      index += 1;
    }
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1));

  const material = createParticleMaterial({ sizeScale: 0.96, brightness: 1.0 });
  const points = new THREE.Points(geometry, material);
  ringsGroup.add(points);

  return { geometry, material, data, points };
}

function createBackgroundParticles(count) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const alphas = new Float32Array(count);
  const data = [];

  for (let i = 0; i < count; i += 1) {
    data.push({
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 160,
        (Math.random() - 0.5) * 90,
        -40 - Math.random() * 120
      ),
      driftSeed: Math.random() * Math.PI * 2,
      speed: 0.02 + Math.random() * 0.05
    });

    const color = palette.spaceDust.clone().lerp(new THREE.Color(0xffffff), Math.random() * 0.18);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
    sizes[i] = 2 + Math.random() * 4;
    alphas[i] = 0.06 + Math.random() * 0.12;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1));

  const material = createParticleMaterial({ additive: false, sizeScale: 0.45, brightness: 0.55 });
  const points = new THREE.Points(geometry, material);
  scene.add(points);

  return { geometry, material, data, points };
}

const coreSystem = createCoreParticles(11000);
const ringSystem = createRingParticles([
  { index: 0, count: 4800, inner: 5.4, outer: 7.2, thickness: 0.85, speed: 0.62, size: 10, alpha: 0.16, warmth: 0.18 },
  { index: 1, count: 6200, inner: 7.1, outer: 9.9, thickness: 1.05, speed: 0.48, size: 9.5, alpha: 0.14, warmth: 0.12 },
  { index: 2, count: 7600, inner: 9.8, outer: 13.2, thickness: 1.4, speed: 0.34, size: 8.5, alpha: 0.12, warmth: 0.08 }
]);
const backgroundSystem = createBackgroundParticles(2200);

const coreAura = new THREE.PointLight(0xffc878, 4.2, 30, 2);
coreAura.position.set(0, 0, 0);
saturnGroup.add(coreAura);

const coolFill = new THREE.PointLight(0x7d9cff, 2.6, 80, 2);
coolFill.position.set(-6, 5, 16);
scene.add(coolFill);

const ambient = new THREE.AmbientLight(0x0a0f20, 0.4);
scene.add(ambient);

function distance2D(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function computeOpenRatio(landmarks) {
  const thumb = landmarks[4];
  const index = landmarks[8];
  const palmLeft = landmarks[5];
  const palmRight = landmarks[17];
  const wrist = landmarks[0];
  const middleBase = landmarks[9];

  const pinchDistance = distance2D(thumb, index);
  const palmWidth = distance2D(palmLeft, palmRight);
  const palmLength = distance2D(wrist, middleBase);
  const normalizer = Math.max(0.08, palmWidth * 0.7 + palmLength * 0.6);
  const raw = pinchDistance / normalizer;

  return smoothstep(0.12, 0.58, raw);
}

async function initHandTracking() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 960 },
        height: { ideal: 540 }
      },
      audio: false
    });

    video.srcObject = stream;
    await video.play();

    const filesetResolver = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );

    state.handLandmarker = await HandLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
      },
      numHands: 1,
      runningMode: "VIDEO",
      minTrackingConfidence: 0.45,
      minHandDetectionConfidence: 0.45,
      minHandPresenceConfidence: 0.45
    });
  } catch (error) {
    console.error("Hand tracking initialization failed:", error);
  }
}

function updateHandTracking(now) {
  if (!state.handLandmarker || video.readyState < 2 || now - state.lastHandFrame < 30) {
    return;
  }

  state.lastHandFrame = now;
  const results = state.handLandmarker.detectForVideo(video, now);

  if (results.landmarks && results.landmarks.length > 0) {
    state.handVisible = true;
    state.openRatioTarget = computeOpenRatio(results.landmarks[0]);
  } else {
    state.handVisible = false;
    state.openRatioTarget *= 0.96;
  }
}

function updateCore(elapsed, expansion, chaos, breakdown) {
  const positions = coreSystem.geometry.attributes.position.array;
  const scaleDrop = 1.0 - Math.pow(state.openRatio, 1.6) * 0.1;

  for (let i = 0; i < coreSystem.data.length; i += 1) {
    const particle = coreSystem.data[i];
    const breathing = 1 + Math.sin(elapsed * 0.8 + particle.waveOffset) * 0.025;
    const radial = particle.radius * breathing * expansion * scaleDrop;
    const drift = Math.sin(elapsed * 0.36 + particle.orbitOffset) * 0.08;
    const chaosNoise = chaos * (
      Math.sin(elapsed * 7.0 + particle.noiseSeed) * 0.12 +
      Math.cos(elapsed * 8.6 + particle.noiseSeed * 1.7) * 0.1
    );
    const breakdownPush = breakdown * breakdown * (0.4 + particle.radius * 0.18);
    const dir = particle.direction;

    positions[i * 3] = dir.x * (radial + drift + chaosNoise + breakdownPush);
    positions[i * 3 + 1] = dir.y * (radial + drift * 0.6 + chaosNoise * 0.9 + breakdownPush);
    positions[i * 3 + 2] = dir.z * (radial + drift + chaosNoise + breakdownPush);
  }

  coreSystem.geometry.attributes.position.needsUpdate = true;
  coreSystem.material.uniforms.uBrightness.value = 1.16 + chaos * 0.35 + breakdown * 0.4;
}

function updateRings(elapsed, expansion, chaos, breakdown) {
  const positions = ringSystem.geometry.attributes.position.array;
  const bandPulse = 1 + Math.sin(elapsed * 0.46) * 0.016;

  for (let i = 0; i < ringSystem.data.length; i += 1) {
    const particle = ringSystem.data[i];
    const bandFactor = particle.bandIndex / 2;
    const orbitalStretch = 1 + Math.pow(state.openRatio, 1.75) * (0.14 + bandFactor * 0.18);
    const radius = particle.radius * expansion * orbitalStretch * bandPulse;
    const angle = particle.angle + elapsed * particle.speed;
    const wobble = Math.sin(angle * 3.0 + particle.seed * 0.002 + elapsed * particle.wobbleFreq) * particle.wobbleAmp;
    const ellipticX = Math.cos(angle) * radius * particle.eccentricity;
    const ellipticZ = Math.sin(angle) * radius;
    const vertical = particle.orbitLift + Math.sin(angle * 2.4 + particle.seed * 0.001) * 0.18 + wobble;

    const flowX = Math.sin(elapsed * 0.65 + particle.seed * 0.004 + angle) * particle.swirl;
    const flowZ = Math.cos(elapsed * 0.55 + particle.seed * 0.006 + angle * 0.6) * particle.swirl;
    const chaosJitter = chaos * chaos * 0.7;

    const jitterX =
      Math.sin(elapsed * 11.0 + particle.seed * 0.03) * chaosJitter * particle.breakout +
      Math.cos(elapsed * 15.0 + particle.seed * 0.02) * breakdown * particle.breakout * 0.95;
    const jitterY =
      Math.sin(elapsed * 13.0 + particle.seed * 0.025) * chaosJitter * particle.breakout * 0.55;
    const jitterZ =
      Math.cos(elapsed * 10.5 + particle.seed * 0.035) * chaosJitter * particle.breakout +
      Math.sin(elapsed * 14.0 + particle.seed * 0.015) * breakdown * particle.breakout;

    const baseVector = new THREE.Vector3(ellipticX, vertical, ellipticZ);
    const outward = baseVector.normalize().multiplyScalar(breakdown * breakdown * particle.breakout * (1.2 + bandFactor * 2.2));

    positions[i * 3] = ellipticX + flowX + jitterX + outward.x;
    positions[i * 3 + 1] = vertical + jitterY + outward.y * 0.55;
    positions[i * 3 + 2] = ellipticZ + flowZ + jitterZ + outward.z;
  }

  ringSystem.geometry.attributes.position.needsUpdate = true;
  ringSystem.material.uniforms.uBrightness.value = 0.98 + chaos * 0.28 + breakdown * 0.5;
}

function updateBackground(elapsed) {
  const positions = backgroundSystem.geometry.attributes.position.array;

  for (let i = 0; i < backgroundSystem.data.length; i += 1) {
    const particle = backgroundSystem.data[i];
    positions[i * 3] = particle.position.x + Math.sin(elapsed * particle.speed + particle.driftSeed) * 0.9;
    positions[i * 3 + 1] = particle.position.y + Math.cos(elapsed * particle.speed * 0.8 + particle.driftSeed) * 0.6;
    positions[i * 3 + 2] = particle.position.z;
  }

  backgroundSystem.geometry.attributes.position.needsUpdate = true;
}

function updateCamera(elapsed, delta) {
  state.mouseSmooth.lerp(state.mouse, 1 - Math.pow(0.002, delta * 60));
  state.cameraDistance = THREE.MathUtils.damp(state.cameraDistance, state.targetCameraDistance, 3.4, delta);

  const targetPosition = new THREE.Vector3(
    Math.sin(elapsed * 0.12) * 1.8 + state.mouseSmooth.x * 1.35,
    1.2 + Math.cos(elapsed * 0.1) * 0.8 + state.mouseSmooth.y * 0.8,
    state.cameraDistance
  );

  camera.position.lerp(targetPosition, 1 - Math.pow(0.001, delta * 60));
  camera.lookAt(
    state.mouseSmooth.x * 0.9,
    state.mouseSmooth.y * 0.3,
    0
  );

  const depthFactor = smoothstep(14.5, 9.0, state.cameraDistance);
  scene.fog.density = THREE.MathUtils.lerp(0.03, 0.05, depthFactor);
  bloomPass.strength = THREE.MathUtils.lerp(1.3, 1.7, depthFactor);
  renderer.toneMappingExposure = THREE.MathUtils.lerp(0.92, 0.74, depthFactor);
}

function animate() {
  const delta = Math.min(clock.getDelta(), 0.033);
  const elapsed = clock.elapsedTime;

  updateHandTracking(performance.now());

  state.openRatio = THREE.MathUtils.damp(state.openRatio, state.openRatioTarget, 5.8, delta);

  const breathing = 1 + Math.sin(elapsed * 0.64) * 0.022 + Math.sin(elapsed * 0.23 + 1.2) * 0.014;
  const expansion = breathing + Math.pow(state.openRatio, 1.8) * 0.44;
  const chaos = smoothstep(0.75, 0.95, state.openRatio);
  const breakdown = smoothstep(0.9, 1.0, state.openRatio);

  saturnGroup.position.y = Math.sin(elapsed * 0.18) * 0.24;
  saturnGroup.rotation.y = Math.sin(elapsed * 0.12) * 0.08 + state.mouseSmooth.x * 0.08;
  saturnGroup.rotation.z = 0.1 + Math.cos(elapsed * 0.1) * 0.02;
  coreGroup.scale.setScalar(1 + Math.pow(state.openRatio, 1.4) * 0.08);
  ringsGroup.scale.setScalar(1 + Math.pow(state.openRatio, 1.75) * 0.12);

  coreAura.intensity = 4.2 + state.openRatio * 2.8 + breakdown * 2.5;
  coreAura.distance = 30 + state.openRatio * 5;
  coolFill.intensity = 2.4 + chaos * 1.4;

  updateCore(elapsed, expansion, chaos, breakdown);
  updateRings(elapsed, expansion, chaos, breakdown);
  updateBackground(elapsed);
  updateCamera(elapsed, delta);

  composer.render();
  requestAnimationFrame(animate);
}

fullscreenButton.addEventListener("click", async () => {
  if (!document.fullscreenElement) {
    await document.documentElement.requestFullscreen();
  } else {
    await document.exitFullscreen();
  }
});

window.addEventListener("pointermove", (event) => {
  state.mouse.x = (event.clientX / window.innerWidth - 0.5) * 2;
  state.mouse.y = -(event.clientY / window.innerHeight - 0.5) * 2;
});

window.addEventListener("wheel", (event) => {
  state.targetCameraDistance = clamp(state.targetCameraDistance + event.deltaY * 0.01, 9.5, 24);
}, { passive: true });

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  bloomPass.setSize(window.innerWidth, window.innerHeight);

  coreSystem.material.uniforms.uPixelRatio.value = renderer.getPixelRatio();
  ringSystem.material.uniforms.uPixelRatio.value = renderer.getPixelRatio();
  backgroundSystem.material.uniforms.uPixelRatio.value = renderer.getPixelRatio();
});

await initHandTracking();
animate();
