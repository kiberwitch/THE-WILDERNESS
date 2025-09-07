import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { TextureLoader } from 'three';
import init from './init';
import './style.css';

const overlay = document.createElement('div');
overlay.style.position = 'fixed';
overlay.style.top = '0';
overlay.style.left = '0';
overlay.style.width = '100vw';
overlay.style.height = '100vh';
overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
overlay.style.backdropFilter = 'blur(8px)';
overlay.style.display = 'flex';
overlay.style.flexDirection = 'column';
overlay.style.justifyContent = 'center';
overlay.style.alignItems = 'center';
overlay.style.zIndex = '9999';
overlay.style.color = 'white';
overlay.style.userSelect = 'none';
overlay.style.fontFamily = 'HelpMe';
const title = document.createElement('h1');
title.textContent = 'The wilderness';
title.style.fontSize = '5rem';
title.style.marginTop = '3.3rem';
title.style.marginBottom = '2rem';
title.style.letterSpacing = '0.1em';
const playButton = document.createElement('button');
playButton.textContent = 'PLAY';
playButton.style.fontSize = '2rem';
playButton.style.color = 'white';
playButton.style.backgroundColor = 'transparent';
overlay.appendChild(title);
overlay.appendChild(playButton);
document.body.appendChild(overlay);
const { sizes, camera, scene, canvas, renderer } = init();
let gameStarted = false;
let gameLoaded = false;
let gameOver = false;

camera.position.set(8, 20, 0);
const controls = new PointerLockControls(camera, canvas);
scene.add(controls.getObject());
let isPointerLocked = false;
canvas.addEventListener('click', () => {
  if (!isPointerLocked && gameLoaded && !gameOver) {
    controls.lock();
    container.requestFullscreen().catch(err => console.error(err));
  }
});
controls.addEventListener('lock', () => { isPointerLocked = true; });
controls.addEventListener('unlock', () => { isPointerLocked = false; });
document.addEventListener('pointerlockerror', () => {
  console.error('PointerLockControls: Unable to use Pointer Lock API');
});
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let isSprinting = false;
const baseMoveSpeed = 25;
const sprintMoveSpeed = 70;
let currentMoveSpeed = baseMoveSpeed;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
function jump() {
  if (isGridden && canJump) {
    jumpVelocity = 10;
    isGridden = false;
    canJump = false;
    setTimeout(() => (canJump = true), 500);
  }
}
const onKeyDown = (event) => {
  if (!gameLoaded || gameOver) return;
  switch (event.code) {
    case 'KeyW': moveForward = true; break;
    case 'KeyA': moveLeft = true; break;
    case 'KeyS': moveBackward = true; break;
    case 'KeyD': moveRight = true; break;
    case 'Space': jump(); break;
    case 'ShiftLeft':
    case 'ShiftRight':
      isSprinting = true;
      currentMoveSpeed = sprintMoveSpeed;
      break;
    case 'KeyF': toggleFlashlight(); break;
  }
};
const onKeyUp = (event) => {
  if (!gameLoaded || gameOver) return;
  switch (event.code) {
    case 'KeyW': moveForward = false; break;
    case 'KeyA': moveLeft = false; break;
    case 'KeyS': moveBackward = false; break;
    case 'KeyD': moveRight = false; break;
    case 'ShiftLeft':
    case 'ShiftRight':
      isSprinting = false;
      currentMoveSpeed = baseMoveSpeed;
      break;
  }
};
document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);
const container = document.querySelector('.container');
window.addEventListener('dblclick', () => {
  if (!gameLoaded || gameOver) return;
  if (!document.fullscreenElement) {
    container.requestFullscreen().catch(err => console.error(err));
  } else {
    document.exitFullscreen();
  }
});
document.addEventListener('fullscreenchange', () => {
  if (document.fullscreenElement) {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();
    renderer.setSize(sizes.width, sizes.height);
  }
});

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0);
hemiLight.position.set(0, 50, 0);
scene.add(hemiLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.050);
dirLight.position.set(-8, 12, 8);
dirLight.castShadow = true;
dirLight.shadow.mapSize = new THREE.Vector2(1024, 1024);
dirLight.shadow.camera.near = 0.1;
dirLight.shadow.camera.far = 40;
scene.add(dirLight);

let flashlight, isFlashlightOn = false;
function createFlashlight() {
  flashlight = new THREE.SpotLight(0xffffff, 5, 200, Math.PI / 1, 0.5, 1);
  flashlight.position.set(0.1, -0.5, 1.2);
  flashlight.target.position.set(0, 0, -1);
  flashlight.castShadow = true;
  flashlight.shadow.mapSize.width = 1024;
  flashlight.shadow.mapSize.height = 1024;
  flashlight.shadow.camera.near = 0.1;
  flashlight.shadow.camera.far = 100;
  camera.add(flashlight);
  camera.add(flashlight.target);
  flashlight.visible = false;
}
function toggleFlashlight() {
  if (!gameLoaded || gameOver) return;
  isFlashlightOn = !isFlashlightOn;
  if (flashlight) {
    flashlight.visible = isFlashlightOn;
    flashlightSound.currentTime = 0;
    flashlightSound.play().catch(e => console.log('Flashlight sound error:', e));
  }
}
createFlashlight();

const scarePoints = [];
const scareDistance = 5;
let isScreamerActive = false;
let lastScreamerTime = 0;
const screamerCooldown = 30000;
const screamerElement = document.createElement('div');
screamerElement.id = 'screamer';
screamerElement.style.cssText = `
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: black;
  z-index: 2147483647;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  pointer-events: auto;
`;
const screamerImage = document.createElement('img');
screamerImage.id = 'screamer-image';
const screamerImages = [
  './scream/1.jpg',
  './scream/3.webp',
  './scream/4.webp',
  './scream/5.webp',
  './scream/6.webp',
  './scream/7.webp',
  './scream/8.webp',
];
screamerImage.style.cssText = `
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  pointer-events: none;
`;
new Image().src = screamerImage.src;
screamerElement.appendChild(screamerImage);
const screamerAudio = document.createElement('audio');
screamerAudio.id = 'screamer-audio';
const screamerAudios = [
  './audio/horror-scream-high-quality.mp3',
  './audio/horrorboros-scream.mp3',
  './audio/scary-horror-scream-1.mp3',
  './audio/strashnye-zvuki-dyavolskiy-smeh.mp3',
];
screamerAudio.preload = 'auto';
screamerElement.appendChild(screamerAudio);
document.body.appendChild(screamerElement);
function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
async function showScreamer() {
  if (!gameLoaded) return;
  const currentTime = Date.now();
  if (isScreamerActive || currentTime - lastScreamerTime < screamerCooldown) return;
  screamerImage.src = getRandomElement(screamerImages);
  screamerAudio.src = getRandomElement(screamerAudios);
  if (!screamerImage.complete || screamerImage.naturalWidth === 0) {
    await new Promise((resolve) => {
      screamerImage.onload = resolve;
      screamerImage.onerror = resolve;
    });
  }
  canvas.style.display = 'none';
  try {
    await screamerElement.requestFullscreen();
  } catch (e) {
    console.warn('Fullscreen error:', e);
  }
  isScreamerActive = true;
  screamerElement.style.display = 'flex';
  try {
    await screamerAudio.play();
  } catch (e) {
    console.error('Audio play failed:', e);
  }
  controls.unlock();
  lastScreamerTime = currentTime;
}
async function hideScreamer() {
  if (!isScreamerActive) return;
  try {
    await document.exitFullscreen();
  } catch (e) {
    console.warn('Exit fullscreen error:', e);
  }
  screamerElement.style.display = 'none';
  screamerAudio.pause();
  screamerAudio.currentTime = 0;
  canvas.style.display = 'block';
  isScreamerActive = false;
  try {
    await controls.lock();
  } catch (e) {
    console.warn('Controls lock error:', e);
  }
  setTimeout(() => {
    const playerPos = controls.getObject().position;
    for (const point of scarePoints) {
      const dist = playerPos.distanceTo(point.position);
      if (dist < scareDistance) {
        showScreamer();
        break;
      }
    }
  }, screamerCooldown);
}
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) {
    hideScreamer();
  }
});
screamerElement.addEventListener('click', hideScreamer);
screamerAudio.addEventListener('ended', hideScreamer);

const raycaster = new THREE.Raycaster();
let playerHeight = 10;
let playerRadius = 3;
let isGridden = false;
let canJump = true;
let jumpVelocity = 0;
const gravity = -500;
function checkCollisions(position, direction, distance = 1.0) {
  raycaster.set(position, direction.normalize());
  const intersections = raycaster.intersectObjects(collisionObjects, true);
  if (intersections.length > 0 && intersections[0].distance < distance) {
    return true;
  }
  return false;
}
function checkGround(position) {
  const start = position.clone().add(new THREE.Vector3(0, 0.1, 0));
  const end = position.clone().sub(new THREE.Vector3(0, playerHeight + 0.2, 0));
  raycaster.set(start, end.sub(start).normalize());
  const intersections = raycaster.intersectObjects(collisionObjects, true);
  if (intersections.length > 0) {
    const distance = intersections[0].distance;
    if (distance < playerHeight + 0.2) {
      return { hit: true, distance };
    }
  }
  return { hit: false };
}

let mapWidth = 0;
let mapDepth = 0;
let padding = 0.01;
let mapPositions = [];
function createScarePoints() {
  for (let i = 0; i < 600; i++) {
    const x = (Math.random() - 0.5) * mapWidth * 3;
    const z = (Math.random() - 0.5) * mapDepth * 3;
    const geometry = new THREE.CircleGeometry(0.5, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0
    });
    const circle = new THREE.Mesh(geometry, material);
    circle.position.set(x, 10, z);
    circle.rotateX(-Math.PI / 2);
    scene.add(circle);
    scarePoints.push(circle);
    if (i < 10) console.log(`Scare point #${i} position:`, circle.position);
  }
}

const loader = new GLTFLoader();
const textureLoader = new TextureLoader();
const collisionObjects = [];
function loadMap() {
  return new Promise((resolve, reject) => {
    loader.load(
      './models/map/les04.glb',
      (gltf) => {
        gltf.scene.scale.set(30, 30, 30);
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const size = new THREE.Vector3();
        box.getSize(size);
        mapWidth = size.x;
        mapDepth = size.z;
        mapPositions = [];
        const mapClone = gltf.scene.clone();
        mapClone.position.set(0, 0, 0);
        mapClone.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            const isTransparent =
              child.material?.transparent ||
              child.material?.alphaTest > 0 ||
              child.material?.alphaMode === THREE.NormalBlending;
            if (isTransparent) {
              child.material.transparent = true;
              child.material.alphaTest = 0.1;
              child.material.depthWrite = true;
              child.material.needsUpdate = true;
            } else {
              if (!collisionObjects.includes(child)) {
                collisionObjects.push(child);
                updateLoadingProgress('Карта загружена', 33);
              }
            }
          }
        });
        scene.add(mapClone);
        createScarePoints();
        resolve();
      },
      undefined,
      (error) => {
        console.error('Error loading map model:', error);
        reject(error);
      }
    );
  });
}

const platformGeometry = new THREE.CircleGeometry(1, 32);
const platformMaterial = new THREE.MeshStandardMaterial({
  color: 0x888888,
  metalness: 0.3,
  roughness: 0.7
});
const starterPlatform = new THREE.Mesh(platformGeometry, platformMaterial);
starterPlatform.rotation.x = -Math.PI / 2;
starterPlatform.position.set(8, 3, 0);
starterPlatform.receiveShadow = true;
scene.add(starterPlatform);
collisionObjects.push(starterPlatform);

let monster, mixer, actions = {};
let monsterHealth = 100;
const monsterMaxHealth = 100;
const monsterScale = 10;
const baseMonsterHeight = 2;
const baseMonsterRadius = 0.5;
let monsterHeight = baseMonsterHeight * monsterScale;
let monsterRadius = baseMonsterRadius * monsterScale;
let monsterVelocityY = 0;

const monsterScreamAudio = document.createElement('audio');
monsterScreamAudio.src = './audio/horror-scream-high-quality.mp3';
monsterScreamAudio.preload = 'auto';
monsterScreamAudio.volume = 1;
document.body.appendChild(monsterScreamAudio);
let hasScreamed = false;
const screamDistance = 15;

let shotgun, shotgunMixer, shotgunActions = {}, currentShotgunAction = null;
let maxAmmo = 4;
let currentAmmo = maxAmmo;
let isReloading = false;
let isShooting = false;
function loadShotgun() {
  return new Promise((resolve, reject) => {
    loader.load('./models/shotgun/scene.gltf', (gltf) => {
      shotgun = gltf.scene;
      shotgun.scale.set(5, 5, 5);
      shotgun.position.set(0.1, -1.5, 0.5);
      shotgun.rotation.set(0, Math.PI, 0);
      camera.add(shotgun);
      shotgunMixer = new THREE.AnimationMixer(shotgun);
      gltf.animations.forEach(clip => {
        const name = clip.name.toLowerCase();
        if (name.includes('sg_fps_walk')) shotgunActions.walk = shotgunMixer.clipAction(clip);
        else if (name.includes('sg_fps_shot')) shotgunActions.shot = shotgunMixer.clipAction(clip);
        else if (name.includes('sg_fps_reload')) shotgunActions.reload = shotgunMixer.clipAction(clip);
        else if (name.includes('sg_fps_idle')) shotgunActions.idle = shotgunMixer.clipAction(clip);
      });
      if (!shotgunActions.idle) {
        shotgunActions.idle = shotgunMixer.clipAction(gltf.animations[0]);
      }
      if (shotgunActions.idle) {
        shotgunActions.idle.play();
        currentShotgunAction = shotgunActions.idle;
      }
      updateLoadingProgress('Дробовик загружен', 66);
      resolve();
    }, undefined, (error) => {
      console.error('Error loading shotgun model:', error);
      reject(error);
    });
  });
}
function fadeShotgunAction(toActionName, duration = 0.2) {
  if (!shotgunMixer || !shotgunActions[toActionName]) return;
  if (currentShotgunAction === shotgunActions[toActionName]) return;
  if (currentShotgunAction) {
    currentShotgunAction.fadeOut(duration);
  }
  currentShotgunAction = shotgunActions[toActionName];
  currentShotgunAction.reset();
  currentShotgunAction.fadeIn(duration);
  currentShotgunAction.play();
}

const shotgunShootAudio = document.createElement('audio');
shotgunShootAudio.src = './audio/gun-shotgun-blast-shot_mkkqx5ed.mp3';
shotgunShootAudio.preload = 'auto';
document.body.appendChild(shotgunShootAudio);
const shotgunReloadAudio = document.createElement('audio');
shotgunReloadAudio.src = './audio/shotgun-movements_zkpxbcv_.mp3';
shotgunReloadAudio.preload = 'auto';
document.body.appendChild(shotgunReloadAudio);
const shotgunEmptyAudio = document.createElement('audio');
shotgunEmptyAudio.src = './audio/toy-shotgun-firing_myx2c5vu.mp3';
shotgunEmptyAudio.preload = 'auto';
document.body.appendChild(shotgunEmptyAudio);

const walkAudio = document.createElement('audio');
walkAudio.src = './audio/4850d7b71b51f16.mp3';
walkAudio.loop = true;
walkAudio.volume = 0.5;
walkAudio.preload = 'auto';
document.body.appendChild(walkAudio);
const runAudio = document.createElement('audio');
runAudio.src = './audio/31390d0092f98a44.mp3';
runAudio.loop = true;
runAudio.volume = 0.9;
runAudio.preload = 'auto';
document.body.appendChild(runAudio);
const flashlightSound = document.createElement('audio');
flashlightSound.src = './audio/flashlight-turn-on_z1iqtc4u.mp3';
flashlightSound.volume = 0.3;
flashlightSound.preload = 'auto';
document.body.appendChild(flashlightSound);

function updateFootstepSounds() {
  if (!gameLoaded || gameOver) return;
  const isMoving = moveForward || moveBackward || moveLeft || moveRight;
  if (!gameStarted || !isPointerLocked) {
    if (!walkAudio.paused) walkAudio.pause();
    if (!runAudio.paused) runAudio.pause();
    return;
  }
  if (isMoving) {
    if (isSprinting) {
      if (!walkAudio.paused) walkAudio.pause();
      if (runAudio.paused) runAudio.play();
    }
    else {
      if (!runAudio.paused) runAudio.pause();
      if (walkAudio.paused) walkAudio.play();
    }
  } else {
    if (!walkAudio.paused) walkAudio.pause();
    if (!runAudio.paused) runAudio.pause();
  }
}

function updatePlayer(delta) {
  if (!isPointerLocked || !gameLoaded || gameOver) return;
  jumpVelocity += gravity * delta;
  controls.getObject().position.y += jumpVelocity * delta;
  const groundCheck = checkGround(controls.getObject().position);
  if (groundCheck.hit) {
    controls.getObject().position.y -= groundCheck.distance - playerHeight;
    isGridden = true;
    jumpVelocity = 0;
  } else {
    isGridden = false;
  }
  direction.z = Number(moveForward) - Number(moveBackward);
  direction.x = Number(moveRight) - Number(moveLeft);
  direction.normalize();
  const moveX = direction.x * currentMoveSpeed * delta;
  const moveZ = direction.z * currentMoveSpeed * delta;
  const position = controls.getObject().position.clone();
  const lookDirection = controls.getDirection(new THREE.Vector3());
  if (moveZ !== 0) {
    const forwardDir = new THREE.Vector3(lookDirection.x, 0, lookDirection.z).normalize();
    if (!checkCollisions(position, forwardDir.multiplyScalar(Math.sign(moveZ)), Math.abs(moveZ) + playerRadius)) {
      controls.moveForward(moveZ);
    }
  }
  if (moveX !== 0) {
    const rightDir = new THREE.Vector3().crossVectors(new THREE.Vector3(lookDirection.x, 0, lookDirection.z).normalize(), new THREE.Vector3(0, 1, 0)).normalize();
    if (!checkCollisions(position, rightDir.multiplyScalar(Math.sign(moveX)), Math.abs(moveX) + playerRadius)) {
      controls.moveRight(moveX);
    }
  }
  const isMoving = moveForward || moveBackward || moveLeft || moveRight;
  if (!isShooting && !isReloading) {
    if (isMoving) {
      if (isSprinting) {
        fadeShotgunAction('walk');
      } else {
        fadeShotgunAction('idle');
      }
    } else {
      fadeShotgunAction('idle');
    }
  }
}

function updateMonsterPhysics(delta) {
  if (!monster || !gameLoaded || gameOver) return;
  const origin = new THREE.Vector3(monster.position.x, 100, monster.position.z);
  const direction = new THREE.Vector3(0, -1, 0);
  raycaster.set(origin, direction);
  const intersects = raycaster.intersectObjects(collisionObjects, true);
  if (intersects.length > 0) {
    const groundY = intersects[0].point.y;
    monster.position.y = groundY + monsterHeight / 2;
  }
}
function clampMonsterPosition() {
  if (!monster || !gameLoaded || gameOver) return;
  const totalWidth = mapWidth;
  const totalDepth = mapDepth;
  const minX = -totalWidth / 2 + monsterRadius;
  const maxX = totalWidth / 2 - monsterRadius;
  const minZ = -totalDepth / 2 + monsterRadius;
  const maxZ = totalDepth / 2 - monsterRadius;
  monster.position.x = THREE.MathUtils.clamp(monster.position.x, minX, maxX);
  monster.position.z = THREE.MathUtils.clamp(monster.position.z, minZ, maxZ);
}
function updateMonsterAI(delta) {
  if (!monster || monsterHealth <= 0 || !gameLoaded || gameOver) return;
  let playerPos = controls.getObject().position;
  let directionToPlayer = new THREE.Vector3().subVectors(playerPos, monster.position);
  directionToPlayer.y = 0;
  const distance = directionToPlayer.length();
  if (distance < screamDistance && !hasScreamed) {
    monsterScreamAudio.currentTime = 0;
    monsterScreamAudio.play().catch(e => console.warn('Monster scream audio playback failed:', e));
    hasScreamed = true;
  }
  if (distance > screamDistance + 5) {
    hasScreamed = false;
  }
  if (distance > 0.1) {
    directionToPlayer.normalize();
    const chaseSpeed = 40;
    const moveDistance = chaseSpeed * delta;
    const proposedPosition = monster.position.clone().add(directionToPlayer.clone().multiplyScalar(moveDistance));
    const moveDir = directionToPlayer.clone();
    if (!checkCollisions(monster.position, moveDir, moveDistance + monsterRadius)) {
      monster.position.copy(proposedPosition);
    }
    clampMonsterPosition();
    monster.lookAt(playerPos.x, monster.position.y, playerPos.z);
    if (isSprinting) {
      if (actions.dash && !actions.dash.isRunning()) fadeToAction(actions.dash);
    } else {
      if (actions.walk && !actions.walk.isRunning()) fadeToAction(actions.walk);
    }
  } else {
    if (actions.idle && !actions.idle.isRunning()) fadeToAction(actions.idle);
  }
}
function fadeToAction(action, duration = 0.3) {
  if (!mixer || !action) return;
  mixer.stopAllAction();
  action.reset();
  action.fadeIn(duration);
  action.play();
}

const timerElement = document.getElementById('timer');
let startTime = 0;
let timerInterval = null;

let elapsedTime = 0;

function updateTimerDisplay(milliseconds) {
  const minutes = Math.floor(milliseconds / 60000).toString().padStart(2, '0');
  const seconds = Math.floor((milliseconds % 60000) / 1000).toString().padStart(2, '0');
  if (timerElement) timerElement.textContent = `Time: ${minutes}:${seconds}`;
}


const savedTimeStr = localStorage.getItem('lastRunTime');
if (savedTimeStr) {
  elapsedTime = parseInt(savedTimeStr, 10) || 0;
  updateTimerDisplay(elapsedTime);
}


function startTimer() {
  startTime = Date.now() - elapsedTime; 
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    elapsedTime = Date.now() - startTime;
    updateTimerDisplay(elapsedTime);
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  if (startTime) {
    elapsedTime = Date.now() - startTime;
    localStorage.setItem('lastRunTime', elapsedTime.toString());
  }
}

function endGame() {
  gameOver = true;
  stopTimer();
  controls.unlock();
  isPointerLocked = false;
  gameStarted = false;
  gameLoaded = false;
  moveForward = false;
  moveBackward = false;
  moveLeft = false;
  moveRight = false;
  isSprinting = false;
  currentMoveSpeed = baseMoveSpeed;
  controls.getObject().position.set(8, 20, 0);

  setTimeout(() => {
    window.location.reload();
  }, 100);
}

function checkMonsterHit() {
  if (!monster || monsterHealth <= 0 || !gameLoaded || gameOver) return false;
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const intersects = raycaster.intersectObject(monster, true);
  if (intersects.length > 0) {
    monsterHealth -= 25;
    if (monsterHealth <= 0) {
      monsterHealth = monsterMaxHealth;
      const mapCornerX = (mapWidth - padding) * 0.4;
      const mapCornerZ = (mapDepth - padding) * 0.4;
      monster.position.set(mapCornerX, 0, mapCornerZ);
      if (actions.idle) {
        mixer.stopAllAction();
        actions.idle.play();
      }
    }
    return true;
  }
  return false;
}

function handleShoot() {
  if (!gameLoaded || gameOver) return;
  if (isReloading || isShooting || currentAmmo <= 0) {
    if (currentAmmo <= 0) {
      shotgunEmptyAudio.currentTime = 0;
      shotgunEmptyAudio.play().catch(e => console.warn('Failed to play empty sound:', e));
    }
    return;
  }
  isShooting = true;
  currentAmmo--;
  fadeShotgunAction('shot');
  shotgunShootAudio.currentTime = 0;
  shotgunShootAudio.play().catch(e => console.warn('Failed to play shoot sound:', e));
  checkMonsterHit();
  setTimeout(() => {
    const isMoving = moveForward || moveBackward || moveLeft || moveRight;
    if (isMoving) {
      fadeShotgunAction('walk');
    } else {
      fadeShotgunAction('idle');
    }
    isShooting = false;
  }, 700);
}
function handleReload() {
  if (!gameLoaded || gameOver) return;
  if (isReloading || isShooting || currentAmmo === maxAmmo) return;
  isReloading = true;
  fadeShotgunAction('reload');
  shotgunReloadAudio.currentTime = 0;
  shotgunReloadAudio.play().catch(e => console.warn('Failed to play reload sound:', e));
  const reloadDuration = (shotgunActions.reload?._clip.duration * 1000) || 2000;
  setTimeout(() => {
    currentAmmo = maxAmmo;
    const isMoving = moveForward || moveBackward || moveLeft || moveRight;
    if (isMoving) {
      fadeShotgunAction('walk');
    } else {
      fadeShotgunAction('idle');
    }
    isReloading = false;
    shotgunReloadAudio.pause();
    shotgunReloadAudio.currentTime = 0;
  }, reloadDuration);
}
document.addEventListener('mousedown', (event) => {
  if (!isPointerLocked || !gameStarted || event.button !== 0 || !gameLoaded || gameOver) return;
  handleShoot();
});
document.addEventListener('keydown', (event) => {
  if (!isPointerLocked || !gameStarted || !gameLoaded || gameOver) return;
  if (event.code === 'KeyR') handleReload();
});

let loadingText, progressBar, progressFill, statusText;
function createLoadingUI() {
  const loadingContainer = document.createElement('div');
  loadingContainer.style.position = 'fixed';
  loadingContainer.style.top = '0';
  loadingContainer.style.left = '0';
  loadingContainer.style.width = '100vw';
  loadingContainer.style.height = '100vh';
  loadingContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
  loadingContainer.style.display = 'flex';
  loadingContainer.style.flexDirection = 'column';
  loadingContainer.style.justifyContent = 'center';
  loadingContainer.style.alignItems = 'center';
  loadingContainer.style.zIndex = '10000';
  loadingContainer.style.color = 'white';
  loadingContainer.style.fontFamily = 'HelpMe';
  loadingContainer.id = 'loading-container';

  const lastRunTime = localStorage.getItem('lastRunTime');
  if (lastRunTime) {
    const timeMs = parseInt(lastRunTime, 10);
    const minutes = Math.floor(timeMs / 60000).toString().padStart(2, '0');
    const seconds = Math.floor((timeMs % 60000) / 1000).toString().padStart(2, '0');
    const timeSurvivedText = document.createElement('div');
    timeSurvivedText.style.fontSize = '1.8rem';
    timeSurvivedText.style.marginBottom = '1rem';
    timeSurvivedText.style.color = '#fff';
    timeSurvivedText.textContent = `Last run time: ${minutes}:${seconds}`;
    loadingContainer.appendChild(timeSurvivedText);
  }
  loadingText = document.createElement('h2');
  loadingText.style.fontSize = '3rem';
  loadingText.style.marginBottom = '2rem';
  loadingText.style.color = '#ff0000';
  statusText = document.createElement('div');
  statusText.textContent = 'Подготовка...';
  statusText.style.fontSize = '1.5rem';
  statusText.style.marginBottom = '1rem';
  statusText.style.color = '#ccc';
  const progressContainer = document.createElement('div');
  progressContainer.style.width = '50%';
  progressContainer.style.height = '30px';
  progressContainer.style.backgroundColor = '#333';
  progressContainer.style.borderRadius = '15px';
  progressContainer.style.overflow = 'hidden';
  progressContainer.style.marginBottom = '1rem';
  progressFill = document.createElement('div');
  progressFill.style.width = '0%';
  progressFill.style.height = '100%';
  progressFill.style.backgroundColor = '#ff0000';
  progressFill.style.transition = 'width 0.3s ease';
  progressContainer.appendChild(progressFill);
  progressBar = document.createElement('div');
  progressBar.textContent = '0%';
  progressBar.style.fontSize = '1.2rem';
  progressBar.style.color = '#fff';
  loadingContainer.appendChild(loadingText);
  loadingContainer.appendChild(statusText);
  loadingContainer.appendChild(progressContainer);
  loadingContainer.appendChild(progressBar);
  document.body.appendChild(loadingContainer);
}
function updateLoadingProgress(status, percent) {
  if (statusText) statusText.textContent = status;
  if (progressFill) progressFill.style.width = percent + '%';
  if (progressBar) progressBar.textContent = Math.round(percent) + '%';
}
function removeLoadingUI() {
  const loadingContainer = document.getElementById('loading-container');
  if (loadingContainer) {
    loadingContainer.style.opacity = '0';
    loadingContainer.style.transition = 'opacity 0.5s ease';
    setTimeout(() => {
      if (loadingContainer.parentNode) {
        loadingContainer.parentNode.removeChild(loadingContainer);
      }
    }, 500);
  }
}

let previousTime = performance.now();
function animate() {
  const time = performance.now();
  const delta = (time - previousTime) / 1000;
  previousTime = time;
  if (!isScreamerActive && gameLoaded && !gameOver) {
    const playerPos = controls.getObject().position;
    if (monster) {
      const distToMonster = playerPos.distanceTo(monster.position);
      if (distToMonster < playerRadius + monsterRadius) {
        endGame();
      }
    }
    for (const point of scarePoints) {
      const dist = playerPos.distanceTo(point.position);
      if (dist < scareDistance && Date.now() - lastScreamerTime > screamerCooldown) {
        console.log('Scare triggered at distance:', dist);
        showScreamer();
        break;
      }
    }
    updatePlayer(delta);
    updateFootstepSounds();
    updateMonsterPhysics(delta);
    updateMonsterAI(delta);
    if (mixer) mixer.update(delta);
    if (shotgunMixer) shotgunMixer.update(delta);
  }
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

window.addEventListener('resize', () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
window.addEventListener('dblclick', () => {
  if (!gameLoaded || gameOver) return;
  if (!document.fullscreenElement) {
    canvas.requestFullscreen().catch(err => console.error(err));
  } else {
    document.exitFullscreen();
  }
});

async function loadGame() {
  try {
    updateLoadingProgress('', 0);
    await loadMap();
    updateLoadingProgress('', 33);
    await loadShotgun();
    updateLoadingProgress('', 66);
    await new Promise((resolve, reject) => {
      loader.load(
        './models/monster/scene.gltf',
        (gltf) => {
          monster = gltf.scene;
          monster.scale.set(monsterScale, monsterScale, monsterScale);
          const mapCornerX = (mapWidth - padding) * 0.4;
          const mapCornerZ = (mapDepth - padding) * 0.4;
          monster.position.set(mapCornerX, 0, mapCornerZ);
          monster.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          scene.add(monster);
          if (gltf.animations && gltf.animations.length) {
            mixer = new THREE.AnimationMixer(monster);
            gltf.animations.forEach((clip) => {
              const name = clip.name.toLowerCase();
              if (name.includes('dash'))
                actions.dash = mixer.clipAction(clip);
              else if (name.includes('walk'))
                actions.walk = mixer.clipAction(clip);
              else if (name.includes('idle'))
                actions.idle = mixer.clipAction(clip);
            });
            if (!actions.walk) actions.walk = mixer.clipAction(gltf.animations[0]);
            if (!actions.idle) actions.idle = actions.walk;
            if (!actions.dash) actions.dash = actions.walk;
            actions.idle.play();
          }
          updateLoadingProgress('', 100);
          resolve();
        },
        undefined,
        (error) => {
          console.error('Error loading monster model:', error);
          reject(error);
        }
      );
    });
    gameLoaded = true;
    gameOver = false;
    removeLoadingUI();
  } catch (error) {
    console.error('Ошибка загрузки игры:', error);
  }
}

playButton.addEventListener('click', async () => {
  createLoadingUI();
  overlay.style.display = 'none';
  gameStarted = true;
  startTimer();
  await loadGame();
  canvas.addEventListener('click', () => {
    if (!isPointerLocked && gameLoaded && !gameOver) {
      controls.lock();
      container.requestFullscreen().catch(err => console.error(err));
    }
  });
});
