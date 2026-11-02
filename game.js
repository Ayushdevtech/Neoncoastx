import * as THREE from 'three';

/*
  CITY LIFE 3D — original, lightweight open-city prototype
  Made by AyushDev. All primary characters, buildings, cars and foliage are
  generated from Three.js geometry so the starter project has no heavy model downloads.
*/

const $ = (id) => document.getElementById(id);
const root = $('game-root');
const loadingFill = $('loading-fill');
const loadingText = $('loading-text');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8bc8e7);
scene.fog = new THREE.Fog(0x8bc8e7, 75, 205);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 320);
camera.position.set(0, 8, 17);

const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
root.appendChild(renderer.domElement);

const clock = new THREE.Clock();
const world = new THREE.Group();
scene.add(world);

const mats = {};
function mat(name, color, roughness = 0.88, extra = {}) {
  if (!mats[name]) mats[name] = new THREE.MeshStandardMaterial({ color, roughness, ...extra });
  return mats[name];
}
const M = {
  grass: mat('grass', 0x6fae67), grass2: mat('grass2', 0x7fbd71), road: mat('road', 0x3c4952),
  line: mat('line', 0xe7d8a0), sidewalk: mat('sidewalk', 0xc9c3ae), white: mat('white', 0xf1eee4),
  dark: mat('dark', 0x25313b), window: mat('window', 0x86bdca, .28, { metalness: .12 }),
  glass: mat('glass', 0x8bbac5, .24, { metalness: .18 }), trunk: mat('trunk', 0x76513a), leaf1: mat('leaf1', 0x399b5c),
  leaf2: mat('leaf2', 0x57ae68), leaf3: mat('leaf3', 0x83bd54), yellow: mat('yellow', 0xf1cf72),
  red: mat('red', 0xd65754), rival: mat('rival', 0xb94343), blue: mat('blue', 0x49a9d6),
  gold: mat('gold', 0xe4b85b), black: mat('black', 0x18232b), tire: mat('tire', 0x20252a),
  skin1: mat('skin1', 0xd59b75), skin2: mat('skin2', 0x986a50), skin3: mat('skin3', 0xe0b18b),
  hair1: mat('hair1', 0x302a2b), hair2: mat('hair2', 0x563b2b), hair3: mat('hair3', 0x252b35),
};

function mesh(geometry, material, parent, x = 0, y = 0, z = 0) {
  const obj = new THREE.Mesh(geometry, material);
  obj.position.set(x, y, z);
  obj.castShadow = false;
  obj.receiveShadow = false;
  parent.add(obj);
  return obj;
}
function box(parent, w, h, d, material, x, y, z) {
  return mesh(new THREE.BoxGeometry(w, h, d), material, parent, x, y, z);
}
function cylinder(parent, rt, rb, h, material, x, y, z, segments = 8) {
  return mesh(new THREE.CylinderGeometry(rt, rb, h, segments), material, parent, x, y, z);
}
function sphere(parent, r, material, x, y, z, sx = 1, sy = 1, sz = 1, segments = 10) {
  const s = mesh(new THREE.SphereGeometry(r, segments, Math.max(6, Math.floor(segments * .7))), material, parent, x, y, z);
  s.scale.set(sx, sy, sz);
  return s;
}

// Lighting and sky details.
scene.add(new THREE.HemisphereLight(0xe5f6ff, 0x607d4e, 2.05));
const sunLight = new THREE.DirectionalLight(0xffedcf, 2.25);
sunLight.position.set(-45, 75, 35);
scene.add(sunLight);
const sunBall = sphere(scene, 7, new THREE.MeshBasicMaterial({ color: 0xffe6a2 }), -82, 76, -125, 1, 1, 1, 16);
sunBall.material.fog = false;

// Terrain.
const ground = box(world, 260, .25, 260, M.grass, 0, -.16, 0);
const plaza = box(world, 26, .16, 24, M.grass2, 70, -.01, -72);
const pond = mesh(new THREE.CircleGeometry(7.5, 24), mat('pond', 0x5bafc4, .28), world, 70, .09, -72);
pond.rotation.x = -Math.PI / 2;

// Roads form a readable grid around the central neighbourhood.
const roadLines = [-120, -60, 0, 60, 120];
for (const p of roadLines) {
  box(world, 11.5, .08, 260, M.road, p, .015, 0);
  box(world, 260, .08, 11.5, M.road, 0, .016, p);
  for (let v = -120; v <= 120; v += 24) {
    box(world, .18, .025, 5.3, M.line, p, .07, v);
    box(world, 5.3, .025, .18, M.line, v, .07, p);
  }
  box(world, 13.4, .12, 260, M.sidewalk, p - 7.2, .0, 0);
  box(world, 13.4, .12, 260, M.sidewalk, p + 7.2, .0, 0);
  box(world, 260, .12, 13.4, M.sidewalk, 0, .0, p - 7.2);
  box(world, 260, .12, 13.4, M.sidewalk, 0, .0, p + 7.2);
}

const buildings = [];
const buildingPalette = [0xe0b78b, 0xd89b78, 0x9bb8b5, 0xc6c5a6, 0x9faec4, 0xe3d2b1, 0xb8a5bf, 0xc98d78, 0x9eb8a1];
function makeBuilding(x, z, w, d, h, color, style = 0) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  world.add(group);
  const wall = new THREE.MeshStandardMaterial({ color, roughness: .9 });
  const roofColors = [0x725b52, 0x566874, 0x8b735d, 0x65786b];
  const roofMat = mat(`roof-${style}`, roofColors[style % roofColors.length]);
  box(group, w, h, d, wall, 0, h / 2, 0);
  box(group, w + .35, .28, d + .35, roofMat, 0, h + .12, 0);
  box(group, w * .45, .7, d * .34, mat(`roofbox-${style}`, 0xc9c6b8), w * .18, h + .55, -d * .13);
  // Front windows, aligned in simple rows.
  const floors = Math.min(3, Math.max(2, Math.floor((h - 1.4) / 4.2)));
  const columns = Math.min(3, Math.max(2, Math.floor(w / 4.2)));
  for (let fy = 0; fy < floors; fy++) {
    for (let cx = 0; cx < columns; cx++) {
      const wx = -w / 2 + (cx + .5) * (w / columns);
      const wy = 1.1 + fy * ((h - 1.8) / floors);
      box(group, .92, 1.08, .08, M.window, wx, wy, -d / 2 - .045);
    }
  }
  // Entrance and a small canopy.
  box(group, 1.25, 2.15, .12, mat('door-' + style, 0x654a3b), 0, 1.08, -d / 2 - .08);
  box(group, 2.1, .18, 1.0, roofMat, 0, 2.25, -d / 2 - .45);
  // Side windows.
  for (let fy = 0; fy < floors; fy++) {
    box(group, .08, .9, .86, M.window, w / 2 + .05, 1.2 + fy * 3.1, 0);
  }
  buildings.push({ x, z, hx: w / 2 + 1.4, hz: d / 2 + 1.4 });
  return group;
}

// Place homes and city blocks in open spaces between the roads.
for (let ix = -2; ix <= 1; ix++) {
  for (let iz = -2; iz <= 1; iz++) {
    const cx = ix * 60 + 30;
    const cz = iz * 60 + 30;
    if (cx === 90 && cz === -90) continue; // keep the park open
    const w1 = 12 + Math.random() * 7;
    const d1 = 11 + Math.random() * 7;
    const h1 = 9 + Math.random() * 14;
    makeBuilding(cx - 2, cz - 2, w1 + 3, d1 + 3, h1, buildingPalette[Math.floor(Math.random() * buildingPalette.length)], ix + iz + 5);
  }
}
// A taller downtown cluster.
makeBuilding(-26, -27, 15, 14, 29, 0x8ba7b8, 1);
makeBuilding(27, -28, 17, 14, 24, 0xd5b38d, 2);
makeBuilding(-27, 28, 14, 15, 19, 0xb9a4b2, 3);

// Trees: layered rounded crowns create a colourful low-poly neighbourhood.
const treeGroups = [];
function makeTree(x, z, scale = 1, hue = 0) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.scale.setScalar(scale);
  world.add(g);
  cylinder(g, .2, .32, 2.1, M.trunk, 0, 1.0, 0, 7);
  const foliage = [M.leaf1, M.leaf2, M.leaf3][hue % 3];
  sphere(g, 1.02, foliage, 0, 2.35, 0, 1.0, 1.08, 1.0, 8);
  sphere(g, .72, [M.leaf2, M.leaf3, M.leaf1][hue % 3], -.52, 2.1, -.08, 1, .95, 1, 8);
  sphere(g, .72, [M.leaf3, M.leaf1, M.leaf2][hue % 3], .48, 2.12, .1, 1, .95, 1, 8);
  treeGroups.push(g);
  return g;
}
for (let i = 0; i < 62; i++) {
  const x = -112 + Math.random() * 224;
  const z = -112 + Math.random() * 224;
  // Avoid road surfaces and the central spawn space.
  if (roadLines.some(v => Math.abs(x - v) < 9 || Math.abs(z - v) < 9)) continue;
  if (Math.abs(x) < 19 && Math.abs(z) < 19) continue;
  makeTree(x, z, .75 + Math.random() * .55, i % 3);
}
// Park trees, lamp posts and benches.
for (let i = 0; i < 13; i++) {
  const a = (i / 13) * Math.PI * 2;
  makeTree(70 + Math.cos(a) * 12, -72 + Math.sin(a) * 10, .85 + Math.random() * .2, i % 3);
}
for (let i = 0; i < 8; i++) {
  const x = -48 + i * 13;
  const pole = new THREE.Group();
  pole.position.set(x, 0, 13);
  world.add(pole);
  cylinder(pole, .07, .09, 4.3, mat('lamp-post', 0x657178), 0, 2.15, 0, 7);
  sphere(pole, .25, mat('lamp-glow', 0xfff0c4, .3, { emissive: 0x69532c }), 0, 4.35, 0, 1.3, .7, 1.2, 8);
}

// Clouds are placed high and kept simple for phone performance.
const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
for (let i = 0; i < 12; i++) {
  const cloud = new THREE.Group();
  const x = (Math.random() - .5) * 220;
  const z = (Math.random() - .5) * 220;
  cloud.position.set(x, 35 + Math.random() * 16, z);
  const size = 1.5 + Math.random() * 1.5;
  sphere(cloud, size, cloudMat, 0, 0, 0, 1.7, .55, .75, 8);
  sphere(cloud, size * .72, cloudMat, -size * .7, -.1, .1, 1.25, .6, .8, 8);
  sphere(cloud, size * .78, cloudMat, size * .7, -.05, -.05, 1.3, .58, .8, 8);
  world.add(cloud);
}

// Articulated citizen rig: head, hair, face, torso, arms and legs all animate.
function makePerson({ shirt = 0x327f9c, pants = 0x293a50, skin = M.skin1, hair = M.hair1, rival = false } = {}) {
  const rootGroup = new THREE.Group();
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: .9 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pants, roughness: .95 });
  const shoeMat = mat('shoe', 0x242a30);
  const whiteEye = mat('eye-white', 0xfaf7ec);
  const pupil = mat('pupil', 0x1d2730);
  const body = box(rootGroup, .63, .79, .36, shirtMat, 0, 1.18, 0);
  box(rootGroup, .18, .2, .18, skin, 0, 1.68, 0);
  sphere(rootGroup, .35, skin, 0, 2.02, -.015, 1, 1.08, .92, 12);
  // Hair cap and a small side fringe.
  sphere(rootGroup, .355, hair, 0, 2.2, .015, 1.04, .58, .99, 10);
  sphere(rootGroup, .19, hair, -.2, 2.16, -.25, 1.1, .55, .65, 8);
  // Eyes, brows and nose on the front (-Z).
  for (const ex of [-.12, .12]) {
    sphere(rootGroup, .055, whiteEye, ex, 2.035, -.317, 1, .85, .4, 8);
    sphere(rootGroup, .026, pupil, ex, 2.03, -.345, 1, 1, .45, 8);
    box(rootGroup, .105, .025, .035, hair, ex, 2.12, -.315);
  }
  sphere(rootGroup, .055, skin, 0, 1.95, -.355, .8, .8, .8, 8);
  // Ears.
  sphere(rootGroup, .07, skin, -.355, 2.01, 0, .75, 1, .8, 8);
  sphere(rootGroup, .07, skin, .355, 2.01, 0, .75, 1, .8, 8);

  const limbs = { arms: [], legs: [] };
  for (const side of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(side * .39, 1.48, 0); rootGroup.add(arm);
    cylinder(arm, .105, .13, .62, shirtMat, 0, -.31, 0, 7);
    sphere(arm, .115, shirtMat, 0, -.62, 0, 1, .9, 1, 7);
    sphere(arm, .105, skin, 0, -.73, -.015, 1, 1, 1, 8);
    limbs.arms.push(arm);

    const leg = new THREE.Group(); leg.position.set(side * .17, .8, 0); rootGroup.add(leg);
    cylinder(leg, .135, .15, .65, pantsMat, 0, -.32, 0, 7);
    sphere(leg, .13, pantsMat, 0, -.64, 0, 1, .85, 1, 7);
    box(leg, .28, .16, .43, shoeMat, 0, -.75, -.11);
    limbs.legs.push(leg);
  }
  if (rival) {
    const marker = new THREE.Group();
    marker.position.y = 2.75;
    sphere(marker, .12, M.rival, 0, 0, 0, .8, .8, .8, 8);
    const halo = mesh(new THREE.TorusGeometry(.25, .035, 5, 16), M.rival, marker, 0, -.04, 0);
    halo.rotation.x = Math.PI / 2;
    rootGroup.add(marker);
    rootGroup.userData.marker = marker;
  }
  rootGroup.userData.limbs = limbs;
  rootGroup.userData.phase = Math.random() * Math.PI * 2;
  rootGroup.userData.moving = false;
  return rootGroup;
}

const player = makePerson({ shirt: 0x256e91, pants: 0x29384b, skin: M.skin1, hair: M.hair1 });
player.position.set(0, 0, 6);
world.add(player);

const npcColors = [0x9b6b9d, 0xd28a48, 0x489a77, 0xd5c16a, 0x5e86c0, 0xc17b76, 0x6b9b9a, 0xa4a0c3];
const npcs = [];
for (let i = 0; i < 8; i++) {
  const rival = i < 5;
  const p = makePerson({
    shirt: rival ? 0xb74747 : npcColors[i % npcColors.length],
    pants: rival ? 0x4a3038 : [0x39495d, 0x504337, 0x3b554b, 0x47445f][i % 4],
    skin: [M.skin1, M.skin2, M.skin3][i % 3],
    hair: [M.hair1, M.hair2, M.hair3][i % 3], rival
  });
  p.position.set(-46 + Math.random() * 92, 0, -46 + Math.random() * 92);
  let spawnAttempts = 0;
  while (isBlocked(p.position.x, p.position.z) && spawnAttempts++ < 30) {
    p.position.set(-52 + Math.random() * 104, 0, -52 + Math.random() * 104);
  }
  p.userData.rival = rival;
  p.userData.target = new THREE.Vector3(p.position.x + (Math.random() - .5) * 14, 0, p.position.z + (Math.random() - .5) * 14);
  p.userData.walkSpeed = .7 + Math.random() * .55;
  world.add(p);
  npcs.push(p);
}

// Vehicle creator. Each car has a body, glass cabin, bumpers, lamps and four rolling wheels.
function makeCar(color = 0xc84e48, compact = false) {
  const car = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: .55, metalness: .08 });
  const bodyLength = compact ? 2.9 : 3.35;
  box(car, 1.8, .58, bodyLength, bodyMat, 0, .62, 0);
  box(car, 1.55, .08, bodyLength - .2, mat('car-trim', 0x323b43), 0, .34, 0);
  box(car, 1.32, .63, 1.68, M.glass, 0, 1.15, -.18);
  box(car, 1.38, .1, 1.77, bodyMat, 0, 1.48, -.18);
  box(car, .08, .53, 1.65, bodyMat, -.68, 1.17, -.18);
  box(car, .08, .53, 1.65, bodyMat, .68, 1.17, -.18);
  box(car, 1.72, .14, .16, mat('bumper', 0xadb4b7), 0, .43, -bodyLength / 2 - .02);
  box(car, 1.72, .14, .16, mat('bumper2', 0x7e888d), 0, .43, bodyLength / 2 + .02);
  for (const side of [-1, 1]) {
    box(car, .36, .19, .08, mat('headlamp', 0xffe6a9, .35, { emissive: 0x554322 }), side * .58, .72, -bodyLength / 2 - .075);
    box(car, .32, .16, .08, mat('tail-lamp', 0xd85e54), side * .58, .7, bodyLength / 2 + .075);
  }
  const wheels = [];
  for (const side of [-1, 1]) {
    for (const z of [-bodyLength * .31, bodyLength * .31]) {
      const wh = cylinder(car, .36, .36, .2, M.tire, side * .91, .34, z, 12);
      wh.rotation.z = Math.PI / 2;
      const hub = cylinder(car, .17, .17, .215, mat('wheel-hub', 0xa4b0b8, .55, { metalness: .3 }), side * .91, .34, z, 10);
      hub.rotation.z = Math.PI / 2;
      wheels.push(wh, hub);
    }
  }
  car.userData.wheels = wheels;
  car.userData.speed = 0;
  car.userData.maxSpeed = compact ? 20 : 24;
  return car;
}

// Parked cars available to the player.
const parkedCars = [];
const playerCar = makeCar(0xd65b4d, false);
playerCar.position.set(4, 0, 13);
world.add(playerCar);
parkedCars.push(playerCar);
for (let i = 0; i < 4; i++) {
  const c = makeCar([0x3b80b5, 0xe1bd64, 0x5b9b72, 0x90979d, 0x9c78b6, 0xd16f52, 0xe8e3d6][i], i % 2 === 0);
  if (i % 2 === 0) {
    c.position.set(-55 + i * 15, 0, 6.8);
    c.rotation.y = Math.PI;
  } else {
    c.position.set(6.8, 0, -52 + i * 14);
    c.rotation.y = Math.PI / 2;
  }
  world.add(c); parkedCars.push(c);
}

// A few slow traffic cars add movement to the streets.
const traffic = [];
for (let i = 0; i < 3; i++) {
  const c = makeCar([0x5b83a1, 0xb8b9b3, 0xc66d55, 0x668f7b, 0xdbc17c][i], true);
  c.position.set(-110 + Math.random() * 220, 0, i % 2 === 0 ? -4.5 : 4.5);
  c.rotation.y = i % 2 === 0 ? 0 : Math.PI;
  c.userData.trafficDir = i % 2 === 0 ? 1 : -1;
  c.userData.trafficLane = c.position.z;
  c.userData.trafficSpeed = 5 + Math.random() * 4;
  world.add(c); traffic.push(c);
}

// Input state.
const keys = new Set();
const input = { x: 0, y: 0, run: false, jump: false };
let active = false;
let paused = false;
let inCar = false;
let currentCar = null;
let jumpVelocity = 0;
let playerGroundY = 0;
let rivalsTagged = 0;
let credits = 250;
let toastTimer = 0;
let lastMapUpdate = 0;
let joyPointer = null;
const joy = { x: 0, y: 0 };

function showToast(message) {
  const el = $('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}
function updateHud() {
  $('mission-count').textContent = `${rivalsTagged} / 5`;
  $('credits').textContent = String(credits).padStart(6, '0');
  $('speed-panel').classList.toggle('hidden', !inCar || !active);
  $('speed-value').textContent = currentCar ? Math.round(Math.abs(currentCar.userData.speed) * 3.6) : 0;
  $('drive-btn').querySelector('span:last-child').textContent = inCar ? 'EXIT' : 'DRIVE';
  $('mission-text').textContent = rivalsTagged >= 5 ? 'CITY CHALLENGE CLEAR' : 'TAG 5 RIVALS';
}
function setPlaying() {
  active = true;
  paused = false;
  $('intro-screen').classList.add('hidden');
  $('pause-screen').classList.add('hidden');
  ['topbar', 'map-panel', 'touch-controls', 'desktop-hints'].forEach(id => $(id).classList.remove('hidden'));
  updateHud();
  showToast('WELCOME TO THE CITY');
  requestLandscape();
}
function requestLandscape() {
  try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); } catch (_) {}
}
function updateOrientation() {
  const portraitPhone = window.innerWidth < 900 && window.innerHeight > window.innerWidth;
  $('rotate-screen').classList.toggle('hidden', !portraitPhone || !active);
}
function enterPause() {
  if (!active) return;
  paused = true;
  $('pause-screen').classList.remove('hidden');
}
function resumeGame() {
  paused = false;
  $('pause-screen').classList.add('hidden');
  requestLandscape();
}

$('start-btn').addEventListener('click', setPlaying);
$('intro-close').addEventListener('click', setPlaying);
$('how-btn').addEventListener('click', () => $('how-panel').classList.remove('hidden'));
$('how-close').addEventListener('click', () => $('how-panel').classList.add('hidden'));
$('pause-btn').addEventListener('click', enterPause);
$('resume-btn').addEventListener('click', resumeGame);
$('restart-btn').addEventListener('click', () => location.reload());

// Fullscreen on double-tap / desktop hotkey; no forced browser navigation.
function toggleFullscreen() {
  const target = document.documentElement;
  if (!document.fullscreenElement && target.requestFullscreen) target.requestFullscreen().catch(() => {});
  else if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
}

window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) e.preventDefault();
  keys.add(key);
  if (key === 'shift') input.run = true;
  if (key === ' ' && !e.repeat) doJump();
  if (key === 'e' && !e.repeat) toggleDrive();
  if (key === 'f' && !e.repeat) doTag();
  if (key === 'escape' && active) paused ? resumeGame() : enterPause();
  if (key === 'f11') { e.preventDefault(); toggleFullscreen(); }
});
window.addEventListener('keyup', (e) => {
  const key = e.key.toLowerCase(); keys.delete(key);
  if (key === 'shift') input.run = false;
});

// Touch joystick with pointer capture; the knob is clamped to the ring.
const joystick = $('joystick');
const knob = $('joy-knob');
function setJoystick(clientX, clientY) {
  const r = joystick.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  let dx = clientX - cx, dy = clientY - cy;
  const max = r.width * .34;
  const len = Math.hypot(dx, dy);
  if (len > max) { dx *= max / len; dy *= max / len; }
  joy.x = dx / max;
  joy.y = dy / max;
  knob.style.transform = `translate(${dx}px, ${dy}px)`;
}
function resetJoystick() { joy.x = 0; joy.y = 0; joyPointer = null; knob.style.transform = 'translate(0px, 0px)'; }
joystick.addEventListener('pointerdown', (e) => { joyPointer = e.pointerId; joystick.setPointerCapture(e.pointerId); setJoystick(e.clientX, e.clientY); });
joystick.addEventListener('pointermove', (e) => { if (joyPointer === e.pointerId) setJoystick(e.clientX, e.clientY); });
joystick.addEventListener('pointerup', (e) => { if (joyPointer === e.pointerId) resetJoystick(); });
joystick.addEventListener('pointercancel', resetJoystick);

function bindHoldButton(id, down, up = () => {}) {
  const el = $(id);
  el.addEventListener('pointerdown', (e) => { e.preventDefault(); down(); el.classList.add('active'); });
  const release = () => { up(); el.classList.remove('active'); };
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);
  el.addEventListener('pointerleave', (e) => { if (e.buttons === 0) release(); });
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}
bindHoldButton('run-btn', () => { input.run = true; }, () => { input.run = false; });
bindHoldButton('jump-btn', doJump);
$('tag-btn').addEventListener('click', doTag);
$('drive-btn').addEventListener('click', toggleDrive);

function doJump() {
  if (!active || paused || inCar || player.position.y > .04) return;
  jumpVelocity = 6.4;
}
function isBlocked(x, z) {
  for (const b of buildings) if (Math.abs(x - b.x) < b.hx && Math.abs(z - b.z) < b.hz) return true;
  return false;
}
function toggleDrive() {
  if (!active || paused) return;
  if (inCar) {
    const offset = new THREE.Vector3(2.3, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), currentCar.rotation.y);
    player.position.copy(currentCar.position).add(offset);
    player.position.y = 0;
    player.visible = true;
    currentCar.userData.speed = 0;
    currentCar = null;
    inCar = false;
    showToast('YOU ARE BACK ON FOOT');
    updateHud();
    return;
  }
  let nearest = null, distance = 999;
  for (const car of parkedCars) {
    if (car.userData === undefined) continue;
    const d = car.position.distanceTo(player.position);
    if (d < distance) { distance = d; nearest = car; }
  }
  if (nearest && distance < 8) {
    currentCar = nearest;
    inCar = true;
    player.visible = false;
    currentCar.userData.speed = 0;
    showToast('VEHICLE READY — DRIVE AROUND');
    updateHud();
  } else showToast('MOVE CLOSER TO A PARKED CAR');
}
function doTag() {
  if (!active || paused || inCar) return;
  let nearest = null, best = 7.5;
  for (const p of npcs) {
    if (!p.userData.rival) continue;
    const d = p.position.distanceTo(player.position);
    if (d < best) { best = d; nearest = p; }
  }
  if (!nearest) { showToast('GET CLOSER TO A RED-MARKED RIVAL'); return; }
  nearest.userData.rival = false;
  nearest.userData.safePulse = 1.0;
  nearest.userData.target.set(70 + (Math.random() - .5) * 20, 0, -72 + (Math.random() - .5) * 20);
  if (nearest.userData.marker) nearest.remove(nearest.userData.marker);
  nearest.userData.marker = null;
  nearest.children[0].material.color.setHex(npcColors[Math.floor(Math.random() * npcColors.length)]);
  rivalsTagged++;
  credits += 100;
  updateHud();
  showToast(rivalsTagged >= 5 ? 'CHALLENGE COMPLETE — NICE WORK' : 'RIVAL TAGGED — SENT TO THE SAFE ZONE');
}

// Player and traffic updates.
const tempVec = new THREE.Vector3();
const cameraOffset = new THREE.Vector3();
function updatePlayer(dt, t) {
  if (inCar && currentCar) {
    const forward = (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - joy.y;
    const turn = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0) + joy.x;
    const c = currentCar;
    const targetSpeed = forward * c.userData.maxSpeed;
    c.userData.speed += (targetSpeed - c.userData.speed) * Math.min(1, dt * (forward === 0 ? 2.7 : 1.7));
    c.rotation.y += turn * dt * (0.6 + Math.abs(c.userData.speed) * .035) * Math.sign(c.userData.speed || 1);
    const dir = new THREE.Vector3(Math.sin(c.rotation.y), 0, -Math.cos(c.rotation.y));
    const nx = THREE.MathUtils.clamp(c.position.x + dir.x * c.userData.speed * dt, -125, 125);
    const nz = THREE.MathUtils.clamp(c.position.z + dir.z * c.userData.speed * dt, -125, 125);
    if (isBlocked(nx, nz)) c.userData.speed *= -.18;
    else { c.position.x = nx; c.position.z = nz; }
    for (const w of c.userData.wheels) w.rotation.x += c.userData.speed * dt * .8;
    $('speed-value').textContent = Math.round(Math.abs(c.userData.speed) * 3.6);
    return;
  }

  const kx = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
  const ky = (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0);
  const mx = THREE.MathUtils.clamp(kx + joy.x, -1, 1);
  const my = THREE.MathUtils.clamp(ky - joy.y, -1, 1);
  const moving = Math.abs(mx) + Math.abs(my) > .08;
  const speed = input.run || keys.has('shift') ? 9.1 : 5.3;
  if (moving) {
    const len = Math.hypot(mx, my) || 1;
    const dx = (mx / len) * speed * dt;
    const dz = -(my / len) * speed * dt;
    const nx = THREE.MathUtils.clamp(player.position.x + dx, -124, 124);
    const nz = THREE.MathUtils.clamp(player.position.z + dz, -124, 124);
    if (!isBlocked(nx, player.position.z)) player.position.x = nx;
    if (!isBlocked(player.position.x, nz)) player.position.z = nz;
    player.rotation.y = Math.atan2(dx, -dz);
  }
  jumpVelocity -= 15.5 * dt;
  player.position.y += jumpVelocity * dt;
  if (player.position.y < playerGroundY) { player.position.y = playerGroundY; jumpVelocity = 0; }
  const limbs = player.userData.limbs;
  const wave = moving ? Math.sin(t * (input.run || keys.has('shift') ? 13 : 9)) : 0;
  limbs.legs[0].rotation.x = wave * .58; limbs.legs[1].rotation.x = -wave * .58;
  limbs.arms[0].rotation.x = -wave * .48; limbs.arms[1].rotation.x = wave * .48;
  // Keep the character grounded between jumps; limb animation provides the walk cycle.
}
function updateNpcs(dt, t) {
  for (const p of npcs) {
    const target = p.userData.target;
    const d = Math.hypot(target.x - p.position.x, target.z - p.position.z);
    if (d < 1.7 || p.position.distanceTo(player.position) < 3.8) {
      p.userData.target.set(-50 + Math.random() * 100, 0, -50 + Math.random() * 100);
    }
    const dx = target.x - p.position.x, dz = target.z - p.position.z;
    const len = Math.hypot(dx, dz) || 1;
    const step = Math.min(d, p.userData.walkSpeed * dt);
    if (d > .2) {
      const nx = p.position.x + dx / len * step;
      const nz = p.position.z + dz / len * step;
      if (!isBlocked(nx, nz)) {
        p.position.x = nx; p.position.z = nz;
        p.rotation.y = Math.atan2(dx, dz);
      } else {
        p.userData.target.set(-50 + Math.random() * 100, 0, -50 + Math.random() * 100);
      }
    }
    const wave = Math.sin(t * 5 + p.userData.phase) * .35;
    p.userData.limbs.legs[0].rotation.x = wave;
    p.userData.limbs.legs[1].rotation.x = -wave;
    p.userData.limbs.arms[0].rotation.x = -wave * .7;
    p.userData.limbs.arms[1].rotation.x = wave * .7;
  }
}
function updateTraffic(dt) {
  for (const c of traffic) {
    c.position.x += c.userData.trafficSpeed * c.userData.trafficDir * dt;
    if (c.position.x > 128) c.position.x = -128;
    if (c.position.x < -128) c.position.x = 128;
    for (const w of c.userData.wheels) w.rotation.x += c.userData.trafficSpeed * dt * .7;
  }
}
function updateCamera(dt) {
  const focus = inCar && currentCar ? currentCar.position : player.position;
  const yaw = inCar && currentCar ? currentCar.rotation.y : player.rotation.y;
  cameraOffset.set(0, inCar ? 8.6 : 7.8, inCar ? 15.5 : 12.8).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  tempVec.copy(focus).add(cameraOffset);
  camera.position.lerp(tempVec, 1 - Math.pow(.001, dt));
  const lookAt = focus.clone(); lookAt.y += inCar ? 1.1 : 1.45;
  camera.lookAt(lookAt);
}

// Minimap updates at a low frequency to save mobile rendering time.
const mapCanvas = $('minimap');
const mapCtx = mapCanvas.getContext('2d');
function drawMap() {
  const w = mapCanvas.width, h = mapCanvas.height;
  mapCtx.fillStyle = '#477a64'; mapCtx.fillRect(0, 0, w, h);
  const focus = inCar && currentCar ? currentCar.position : player.position;
  const scale = 1.05;
  const cx = w / 2, cy = h / 2;
  mapCtx.fillStyle = '#46535c';
  for (let v = -120; v <= 120; v += 60) {
    const px = cx + (v - focus.x) * scale;
    const py = cy + (v - focus.z) * scale;
    mapCtx.fillRect(px - 6, 0, 12, h);
    mapCtx.fillRect(0, py - 6, w, 12);
  }
  mapCtx.strokeStyle = '#e5d7a0'; mapCtx.lineWidth = 1;
  for (let v = -120; v <= 120; v += 60) {
    const px = cx + (v - focus.x) * scale;
    const py = cy + (v - focus.z) * scale;
    mapCtx.setLineDash([3, 4]);
    mapCtx.beginPath(); mapCtx.moveTo(px, 0); mapCtx.lineTo(px, h); mapCtx.stroke();
    mapCtx.beginPath(); mapCtx.moveTo(0, py); mapCtx.lineTo(w, py); mapCtx.stroke();
  }
  mapCtx.setLineDash([]);
  for (const p of npcs) {
    if (p.userData.rival) {
      const px = cx + (p.position.x - focus.x) * scale;
      const py = cy + (p.position.z - focus.z) * scale;
      if (px > 0 && px < w && py > 0 && py < h) {
        mapCtx.fillStyle = '#f26b61'; mapCtx.beginPath(); mapCtx.arc(px, py, 3.1, 0, Math.PI * 2); mapCtx.fill();
      }
    }
  }
  mapCtx.save(); mapCtx.translate(cx, cy);
  mapCtx.rotate(-(inCar && currentCar ? currentCar.rotation.y : player.rotation.y));
  mapCtx.fillStyle = '#f6dc91'; mapCtx.beginPath(); mapCtx.moveTo(0, -9); mapCtx.lineTo(6, 7); mapCtx.lineTo(0, 4); mapCtx.lineTo(-6, 7); mapCtx.closePath(); mapCtx.fill();
  mapCtx.restore();
  mapCtx.strokeStyle = '#ffffff75'; mapCtx.strokeRect(.5, .5, w - 1, h - 1);
}

function resize() {
  const width = Math.max(1, window.innerWidth), height = Math.max(1, window.innerHeight);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(width, height);
  updateOrientation();
}
window.addEventListener('resize', resize, { passive: true });
window.addEventListener('orientationchange', () => setTimeout(resize, 160), { passive: true });

// Keep the world animated even behind the intro screen so the first view feels alive.
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), .035);
  const t = clock.elapsedTime;
  if (active && !paused && $('rotate-screen').classList.contains('hidden')) {
    updatePlayer(dt, t);
    updateNpcs(dt, t);
    updateTraffic(dt);
    updateCamera(dt);
    if (t - lastMapUpdate > .18) { drawMap(); lastMapUpdate = t; }
    if (inCar && currentCar) $('speed-value').textContent = Math.round(Math.abs(currentCar.userData.speed) * 3.6);
  } else {
    // Idle camera drift during the title screen.
    if (!active) {
      camera.position.x = Math.sin(t * .09) * 3;
      camera.position.y = 8.5 + Math.sin(t * .14) * .25;
      camera.position.z = 18 + Math.cos(t * .09) * 2;
      camera.lookAt(0, 1.2, 0);
      for (const p of npcs) {
        p.userData.limbs.arms[0].rotation.x = Math.sin(t * 2 + p.userData.phase) * .12;
        p.userData.limbs.arms[1].rotation.x = -Math.sin(t * 2 + p.userData.phase) * .12;
      }
    }
  }
  renderer.render(scene, camera);
}

function finishLoading() {
  loadingFill.style.width = '100%';
  loadingText.textContent = 'CITY READY';
  setTimeout(() => { $('loading-screen').classList.add('done'); }, 300);
  setTimeout(() => { $('loading-screen').remove(); }, 850);
}
loadingFill.style.width = '35%';
loadingText.textContent = 'CREATING THE CITY...';
requestAnimationFrame(() => {
  loadingFill.style.width = '72%';
  loadingText.textContent = 'ADDING PEOPLE AND VEHICLES...';
  requestAnimationFrame(() => {
    drawMap();
    finishLoading();
    animate();
    updateOrientation();
  });
});

// A few mobile browser guardrails.
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('visibilitychange', () => { if (document.hidden && active && !paused) enterPause(); });
