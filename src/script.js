import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { TextureLoader } from 'three';
import init from './init';
import './style.css';

// --- Интерфейс загрузки и начала игры ---
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
overlay.style.fontFamily = 'Arial, sans-serif';

const title = document.createElement('h1');
title.textContent = 'ХОДИЛКИ БРОДИЛКИ И ТУНТУНТУН САХУР';
title.style.fontSize = '5rem';
title.style.marginBottom = '2rem';

const playButton = document.createElement('button');
playButton.textContent = 'Играть';
playButton.style.fontSize = '2rem';
playButton.style.padding = '1rem 3rem';
playButton.style.border = 'none';
playButton.style.borderRadius = '8px';
playButton.style.backgroundColor = '#ff0000';
playButton.style.color = 'white';
playButton.style.cursor = 'pointer';
playButton.style.boxShadow = '0 0 10px #ff0000';
playButton.addEventListener('mouseenter', () => { playButton.style.backgroundColor = '#cc0000'; });
playButton.addEventListener('mouseleave', () => { playButton.style.backgroundColor = '#ff0000'; });

overlay.appendChild(title);
overlay.appendChild(playButton);
document.body.appendChild(overlay);

const { sizes, camera, scene, canvas, renderer } = init();

let gameStarted = false;

playButton.addEventListener('click', () => {
  overlay.style.display = 'none';
  gameStarted = true;
  backgroundAudio.play().catch(() => { });
  canvas.addEventListener('click', () => {
    if (!isPointerLocked) {
      controls.lock();
      container.requestFullscreen().catch(err => console.error(err));
    }
  });
});

// --- Камера и контроллы ---
camera.position.set(8, 20, 0);
const controls = new PointerLockControls(camera, canvas);
scene.add(controls.getObject());

let isPointerLocked = false;

canvas.addEventListener('pointerdown', (event) => {
  try {
    canvas.setPointerCapture(event.pointerId);
  } catch (e) {
    if (e.name !== 'InvalidStateError') throw e;
  }
});
canvas.addEventListener('click', () => {
  if (!isPointerLocked) {
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
  if (isGrounded && canJump) {
    jumpVelocity = 10;
    isGrounded = false;
    canJump = false;
    setTimeout(() => (canJump = true), 500);
  }
}

const onKeyDown = (event) => {
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
container.requestFullscreen();

window.addEventListener('dblclick', () => {
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



// --- Освещение ---
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0);
hemiLight.position.set(0, 50, 0);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.012);
dirLight.position.set(-8, 12, 8);
dirLight.castShadow = true;
dirLight.shadow.mapSize = new THREE.Vector2(1024, 1024);
dirLight.shadow.camera.near = 0.1;
dirLight.shadow.camera.far = 40;
scene.add(dirLight);

// --- Фонарик ---
let flashlight, isFlashlightOn = false;
function createFlashlight() {
  flashlight = new THREE.SpotLight(0xffffff, 5, 100, Math.PI / 4, 0.5, 1);
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
  isFlashlightOn = !isFlashlightOn;
  if (flashlight) {
    flashlight.visible = isFlashlightOn;
    flashlightSound.currentTime = 0;
    flashlightSound.play().catch(e => console.log('Flashlight sound error:', e));
  }
}
createFlashlight();

// --- Скримеры ---
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

// --- Функции управления прыжком и столкновениями ---
const raycaster = new THREE.Raycaster();
let playerHeight = 10;
let playerRadius = 3;
let isGrounded = false;
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

// --- Создание точек скримера ---
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

// --- Загрузка карты ---
const loader = new GLTFLoader();
const textureLoader = new TextureLoader();
const collisionObjects = [];

loader.load(
  './models/map/scene.gltf',
  (gltf) => {
    gltf.scene.scale.set(30, 30, 30);
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    mapWidth = size.x;
    mapDepth = size.z;
    mapPositions = [];

    for (let x = -1; x <= 1; x++) {
      for (let z = -1; z <= 1; z++) {
        mapPositions.push(new THREE.Vector3(x * (mapWidth - padding), 0, z * (mapDepth - padding)));
      }
    }

    const floorTexture = textureLoader.load('./models/map/textures/Floor_baseColor.jpeg');
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(1, 1);

    for (let x = -1; x <= 1; x++) {
      for (let z = -1; z <= 1; z++) {
        const mapClone = gltf.scene.clone();
        mapClone.position.set(x * (mapWidth - padding), 0, z * (mapDepth - padding));
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
              }
            }
          }
        });
        scene.add(mapClone);

        const floorGeometry = new THREE.PlaneGeometry(mapWidth, mapDepth);
        const floorMaterial = new THREE.MeshStandardMaterial({
          map: floorTexture,
          side: THREE.DoubleSide,
        });
        const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
        floorMesh.rotateX(-Math.PI / 2);
        floorMesh.position.set(x * (mapWidth - padding), 0.01, z * (mapDepth - padding));
        collisionObjects.push(floorMesh);
        scene.add(floorMesh);
      }
    }

    createScarePoints();
  },
  undefined,
  (error) => {
    console.error('Error loading map model:', error);
  },
);

// --- Создание платформы под игроком ---
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


// --- Загрузка монстра ---
let monster, mixer, actions = {};
let monsterHealth = 100;
const monsterMaxHealth = 100;

const monsterScale = 10;
const baseMonsterHeight = 2;
const baseMonsterRadius = 0.5;
let monsterHeight = baseMonsterHeight * monsterScale;
let monsterRadius = baseMonsterRadius * monsterScale;
let monsterVelocityY = 0;

// UI здоровье монстра
const monsterHealthUI = document.createElement('div');
monsterHealthUI.style.position = 'fixed';
monsterHealthUI.style.top = '20px';
monsterHealthUI.style.left = '20px';
monsterHealthUI.style.color = 'white';
monsterHealthUI.style.fontSize = '24px';
monsterHealthUI.style.fontFamily = 'Arial, sans-serif';
monsterHealthUI.style.textShadow = '0 0 5px black';
monsterHealthUI.style.zIndex = '1000';
document.body.appendChild(monsterHealthUI);

function updateMonsterHealthUI() {
  monsterHealthUI.textContent = `Здоровье монстра: ${monsterHealth}/${monsterMaxHealth}`;
}

loader.load(
  './models/monster/scene.gltf',
  (gltf) => {
    monster = gltf.scene;
    monster.scale.set(monsterScale, monsterScale, monsterScale);

    // Устанавливаем монстра в дальний угол карты
    const mapCornerX = (mapWidth - padding) * 1.5;
    const mapCornerZ = (mapDepth - padding) * 1.5;
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

    updateMonsterHealthUI();
  },
  undefined,
  (error) => {
    console.error('Error loading monster model:', error);
  }
);

// --- Загрузка дробовика ---
let shotgun, shotgunMixer, shotgunActions = {}, currentShotgunAction = null;

let maxAmmo = 4;
let currentAmmo = maxAmmo;
let isReloading = false;
let isShooting = false;

const ammoUI = document.createElement('div');
ammoUI.style.position = 'fixed';
ammoUI.style.bottom = '20px';
ammoUI.style.right = '20px';
ammoUI.style.color = 'white';
ammoUI.style.fontSize = '24px';
ammoUI.style.fontFamily = 'Arial, sans-serif';
ammoUI.style.textShadow = '0 0 5px black';
ammoUI.style.zIndex = '1000';
document.body.appendChild(ammoUI);

function updateAmmoUI() {
  ammoUI.textContent = `Патроны: ${currentAmmo}/${maxAmmo}`;
}

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
  });

  if (shotgunActions.walk) {
    shotgunActions.walk.play();
    currentShotgunAction = shotgunActions.walk;
  }

  updateAmmoUI();
}, undefined, (error) => {
  console.error('Error loading shotgun model:', error);
});

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

// --- Звуки выстрела, перезарядки и пустого выстрела ---
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

// --- Звуковое сопровождение ходьбы и бега ---
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

// --- Обновление игрока ---
function updatePlayer(delta) {
  if (!isPointerLocked) return;

  jumpVelocity += gravity * delta;
  controls.getObject().position.y += jumpVelocity * delta;

  const groundCheck = checkGround(controls.getObject().position);
  if (groundCheck.hit) {
    controls.getObject().position.y -= groundCheck.distance - playerHeight;
    isGrounded = true;
    jumpVelocity = 0;
  } else {
    isGrounded = false;
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
    fadeShotgunAction('walk');
  }
}

// --- Управление монстром ---
function updateMonsterPhysics(delta) {
  if (!monster) return;

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
  if (!monster) return;

  const totalWidth = (mapWidth - padding) * 3;
  const totalDepth = (mapDepth - padding) * 3;

  const minX = -totalWidth / 2 + monsterRadius;
  const maxX = totalWidth / 2 - monsterRadius;
  const minZ = -totalDepth / 2 + monsterRadius;
  const maxZ = totalDepth / 2 - monsterRadius;

  monster.position.x = THREE.MathUtils.clamp(monster.position.x, minX, maxX);
  monster.position.z = THREE.MathUtils.clamp(monster.position.z, minZ, maxZ);
}

const monsterScreamAudio = document.createElement('audio');
monsterScreamAudio.src = './audio/horror-scream-high-quality.mp3';
monsterScreamAudio.preload = 'auto';
monsterScreamAudio.volume = 1;
document.body.appendChild(monsterScreamAudio);

let hasScreamed = false;
const screamDistance = 15;

function updateMonsterAI(delta) {
  if (!monster || monsterHealth <= 0) return;

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

// --- Проверка попадания в монстра ---
function checkMonsterHit() {
  if (!monster || monsterHealth <= 0) return false;
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const intersects = raycaster.intersectObject(monster, true);
  if (intersects.length > 0) {
    monsterHealth -= 25;
    updateMonsterHealthUI();

    if (monsterHealth <= 0) {
      if (actions.idle) {
        mixer.stopAllAction();
        actions.idle.play();
      }
      monster.position.set(0, -100, 0);
    }
    return true;
  }
  return false;
}

// --- Обработка выстрела ---
function handleShoot() {
  if (isReloading || isShooting || currentAmmo <= 0) {
    if (currentAmmo <= 0) {
      shotgunEmptyAudio.currentTime = 0;
      shotgunEmptyAudio.play().catch(e => console.warn('Failed to play empty sound:', e));
    }
    return;
  }
  isShooting = true;
  currentAmmo--;
  updateAmmoUI();
  fadeShotgunAction('shot');
  shotgunShootAudio.currentTime = 0;
  shotgunShootAudio.play().catch(e => console.warn('Failed to play shoot sound:', e));
  checkMonsterHit();
  setTimeout(() => {
    fadeShotgunAction('walk');
    isShooting = false;
  }, 700);
}

// --- Обработка перезарядки ---
function handleReload() {
  if (isReloading || isShooting || currentAmmo === maxAmmo) return;
  isReloading = true;
  fadeShotgunAction('reload');
  shotgunReloadAudio.currentTime = 0;
  shotgunReloadAudio.play().catch(e => console.warn('Failed to play reload sound:', e));
  const reloadDuration = (shotgunActions.reload?._clip.duration * 1000) || 2000;
  setTimeout(() => {
    currentAmmo = maxAmmo;
    updateAmmoUI();
    fadeShotgunAction('walk');
    isReloading = false;
    shotgunReloadAudio.pause();
    shotgunReloadAudio.currentTime = 0;
  }, reloadDuration);
}

// --- Обработчики управления ---
document.addEventListener('mousedown', (event) => {
  if (!isPointerLocked || !gameStarted || event.button !== 0) return;
  handleShoot();
});
document.addEventListener('keydown', (event) => {
  if (!isPointerLocked || !gameStarted) return;
  if (event.code === 'KeyR') handleReload();
});

// --- Главный цикл ---
let previousTime = performance.now();

function animate() {
  const time = performance.now();
  const delta = (time - previousTime) / 1000;
  previousTime = time;

  if (!isScreamerActive) {
    const playerPos = controls.getObject().position;
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

// --- Обработка ресайза и фуллскрина ---
window.addEventListener('resize', () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

window.addEventListener('dblclick', () => {
  if (!document.fullscreenElement) {
    canvas.requestFullscreen().catch(err => console.error(err));
  } else {
    document.exitFullscreen();
  }
});

// --- Фоновая музыка ---
const backgroundAudio = document.createElement('audio');
backgroundAudio.src = './audio/predsmertnyiy-krik-ptits-uletayuschih-ot-smertelnoy-opasnosti-40620.mp3';
backgroundAudio.loop = true;
backgroundAudio.volume = 0.3;
backgroundAudio.preload = 'auto';
backgroundAudio.autoplay = true;
document.body.appendChild(backgroundAudio);
backgroundAudio.play().catch(e => {
  console.log('Background music play interrupted:', e);
});

canvas.addEventListener('click', () => {
  if (backgroundAudio.paused) {
    backgroundAudio.play().catch(e => {
      console.log('Background music play interrupted:', e);
    });
  }
});
