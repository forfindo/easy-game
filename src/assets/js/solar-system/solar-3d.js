import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {createSunTexture} from "./texture.js";

// 一次点击触及的物体
let intersects;
const rotatingObjectMap = new Map();
const pointers = new Map();
const interactive3DObject = [];
const defaultTargetPosition = new THREE.Vector3(0);
const clickedObjectPosition = new THREE.Vector3();
const container = document.body;
const {clientWidth: width, clientHeight: height} = container;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 10000);
camera.position.set(0, 0, 1000);
scene.add(camera);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(width, height);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);
const controller = new OrbitControls(camera, renderer.domElement);
controller.enableDamping = true;
controller.dampingFactor = 0.05;

// 太阳和光
const pointLight = new THREE.PointLight(0xffffff, 1000000, 0);
pointLight.decay = 2;
scene.add(pointLight);
const sunTexture = createSunTexture();
const sunGeometry = new THREE.SphereGeometry(150, 64, 64);
const sunMaterial = new THREE.MeshBasicMaterial({
  map: sunTexture
})
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);
interactive3DObject.push(sun);

/**
 * 太阳：水星 = 1 : 0.0035
 * 太阳：金星 = 1 : 0.0087
 * 太阳：地球 = 1 : 0.0092
 * 太阳：火星 = 1 : 0.0049
 * 太阳：木星 = 1 : 0.1027
 * 太阳：土星 = 1 : 0.0866
 * 太阳：天王星 = 1 : 0.0367
 * 太阳：海王星 = 1 : 0.0356
 */

/**
 * 水星	0.387	0.379
 * 金星	0.723	0.723
 * 地球	1.000	0.9998
 * 火星	1.524	1.517
 * 木星	5.203	5.190
 * 土星	9.537	9.509
 * 天王星	19.191	19.148
 * 海王星	30.069	30.055
 */

// 地球
const textureLoader = new THREE.TextureLoader();
const earthTexture = textureLoader.load('../assets/images/earth.jpg');
earthTexture.colorSpace = THREE.SRGBColorSpace;
const earthGeometry = new THREE.SphereGeometry(18.4, 32, 32);
const earthMaterial = new THREE.MeshPhysicalMaterial({
  map: earthTexture,
  roughness: 0.5,
  metalness: 0.1,
  clearcoat: 0.1,
  clearcoatRoughness: 0.5,
  reflectivity: 0.5
})
const earth = new THREE.Mesh(earthGeometry, earthMaterial);
earth.position.x = 500;
scene.add(earth);
interactive3DObject.push(earth);

renderer.domElement.addEventListener('pointerdown', (e) => {
  if (!e.isPrimary) {
    return;
  }

  // 射线检测
  const caster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  mouse.x = (e.offsetX / width) * 2 - 1;
  mouse.y = 1 - (e.offsetY / height) * 2;
  caster.setFromCamera(mouse, camera);
  intersects = caster.intersectObjects(interactive3DObject);

  if (intersects.length) {
    const {object} = intersects[0];
    controller.enabled = false;
    rotatingObjectMap.delete(object);
  }

  pointers.set(e.pointerId, {
    start: {
      x: e.offsetX,
      y: e.offsetY,
      mtime: e.timeStamp
    },
    previous: {
      x: e.offsetX,
      y: e.offsetY,
      mtime: e.timeStamp
    }
  });
})

renderer.domElement.addEventListener("pointermove", (e) => {
  if (!e.isPrimary) {
    return;
  }

  const pointer = pointers.get(e.pointerId);
  if (pointer) {
    // 处理点击物体旋转
    if (intersects.length) {
      const {previous} = pointer;
      const {object} = intersects[0];
      const offsetX = e.offsetX - previous.x;
      const offsetY = e.offsetY - previous.y;
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
      const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
      const horizontalQt = new THREE.Quaternion().setFromAxisAngle(up, offsetX * 0.01);
      const verticalQt = new THREE.Quaternion().setFromAxisAngle(right, offsetY * 0.01);
      object.quaternion.premultiply(verticalQt.multiply(horizontalQt));
      rotatingObjectMap.set(object, verticalQt);
    }

    pointer.previous = {
      x: e.offsetX,
      y: e.offsetY,
      mtime: e.timeStamp
    }
  }
})

renderer.domElement.addEventListener('pointerup', (e) => {
  if (!e.isPrimary) {
    return;
  }

  const {start} = pointers.get(e.pointerId) || {};
  if (!start) {
    return;
  }

  const distance = Math.sqrt((e.offsetX - start.x) ** 2 + (e.offsetY - start.y) ** 2);
  if (distance < 5) {
    // 本次点击未移动
    if (intersects.length) {
      const {object} = intersects[0];
      object.getWorldPosition(clickedObjectPosition);
      controller.target = clickedObjectPosition;
    } else {
      controller.target = defaultTargetPosition;
    }
  }
  if (intersects.length) {
    controller.enabled = true;
  }
  intersects = [];
  pointers.delete(e.pointerId);
})

function animate() {
  controller.update();
  // 处理物体旋转阻尼效果
  for (const [object, quaternion] of rotatingObjectMap) {
    if (2 * Math.acos(quaternion.w) < 0.001) {
      rotatingObjectMap.delete(object);
    } else {
      quaternion.slerp(new THREE.Quaternion(), 0.05);
      object.quaternion.premultiply(quaternion);
    }
  }
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();