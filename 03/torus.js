import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// core
var renderer, controls, scene, camera;

// state
var invisiblePlane;
var lastObj = null;
var isScaling = false;
var allObjs = [];
var FLICKERING = false;
var WIREFRAME = false;

// config
const HOTPINK = 0xff69b4;
const GREEN   = 0x7cfc00;
const SCALE_SPEED = 0.01;
const MIN_ABS = 0.05;
const MAX_ABS = 6.0;

window.onload = function() {

  // Three.js code goes here
  scene = new THREE.Scene();

  // setup the camera
  var fov = 75;
  var ratio = window.innerWidth / window.innerHeight;
  var zNear = 1;
  var zFar = 10000;
  camera = new THREE.PerspectiveCamera(fov, ratio, zNear, zFar);
  camera.position.set(0, 0, 100);

  // create renderer and setup the canvas
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // setup lights
  var ambientLight = new THREE.AmbientLight();
  scene.add(ambientLight);

  var light = new THREE.DirectionalLight(0xffffff, 5.0);
  light.position.set(10, 100, 10);
  scene.add(light);

  //
  // The invisible plane (for picking)
  //
  var geometry = new THREE.PlaneGeometry(10000, 10000);
  var material = new THREE.MeshBasicMaterial({ visible: false });
  invisiblePlane = new THREE.Mesh(geometry, material);
  scene.add(invisiblePlane);
  //
  //

  // interaction
  controls = new OrbitControls(camera, renderer.domElement);
  hookMouse();
  hookKeys();

  // call animation/rendering loop
  animate();

  // resize
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
};


function hookMouse() {
  // torus SHIFT + click
  renderer.domElement.onmousedown = function(e) {
    if (!e.shiftKey) return;
    controls.enabled = false;

    var p = pickOnPlane(e.clientX, e.clientY);
    if (!p) return;

    var geometry = new THREE.TorusKnotGeometry(12, 3, 160, 24, 2, 3);
    var material = new THREE.MeshStandardMaterial({
      color: HOTPINK, transparent: true, opacity: 1, wireframe: WIREFRAME
    });

    var torus = new THREE.Mesh(geometry, material);
    torus.position.copy(p);
    torus.rotation.x = Math.PI * 0.15;
    torus.rotation.y = Math.PI * 0.10;

    torus.userData.isGreen = false;
    torus.userData.lastSign = 1;

    scene.add(torus);
    allObjs.push(torus);
    lastObj = torus;
    isScaling = true;
  };

  // scale torus
  renderer.domElement.onmousemove = function(e) {
    if (!isScaling || !lastObj) return;

    var next = lastObj.scale.x + (-e.movementY) * SCALE_SPEED;

    var prevSign = lastObj.userData.lastSign;
    var nextSign = Math.sign(next) || prevSign;
    if (prevSign !== nextSign) {
      lastObj.userData.isGreen = !lastObj.userData.isGreen;
      lastObj.material.color.set(lastObj.userData.isGreen ? GREEN : HOTPINK);
      lastObj.userData.lastSign = nextSign;
    }

    var sign = Math.sign(next) || prevSign;
    var mag = THREE.MathUtils.clamp(Math.abs(next), MIN_ABS, MAX_ABS);
    lastObj.scale.set(sign * mag, sign * mag, sign * mag);
  };

  // re-enable controls on mouseup
  renderer.domElement.onmouseup = function() {
    controls.enabled = true;
    isScaling = false;
  };
}

function hookKeys() {
  window.onkeypress = function(e) {
    var k = e.key.toLowerCase();
    if (k === "f") {
      // flicker
      FLICKERING = !FLICKERING;
      if (!FLICKERING) {
        for (var o of allObjs) {
          o.material.opacity = 1;
          o.material.transparent = true;
          o.material.needsUpdate = true;
        }
      }
    }
    if (k === "w") {
      // wireframe
      WIREFRAME = !WIREFRAME;
      for (var o of allObjs) {
        o.material.wireframe = WIREFRAME;
        o.material.needsUpdate = true;
      }
      logSceneStats();
    }
  };
}



function pickOnPlane(cx, cy) {
  var ndc = new THREE.Vector2(
    (cx / window.innerWidth) * 2 - 1,
    -(cy / window.innerHeight) * 2 + 1
  );
  var ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector3(ndc.x, ndc.y, 0), camera);
  var hits = ray.intersectObject(invisiblePlane);
  return (hits && hits.length) ? hits[0].point : null;
}

// estimate vertices, faces, edges
function logSceneStats() {
  var V = 0, F = 0, E = 0;
  for (var o of allObjs) {
    var g = o.geometry;
    var pos = g.getAttribute("position");
    if (!pos) continue;
    var indexed = !!g.index;
    var verts = pos.count;
    var faces = indexed ? g.index.count / 3 : verts / 3;
    var edges = Math.round((3 * faces) / 2);
    V += verts; F += faces; E += edges;
  }
  console.log(`Scene ~ V:${V}  F:${F}  E≈${E}`);
}


function animate() {
  requestAnimationFrame(animate);

  if (FLICKERING && allObjs.length) {
    for (var o of allObjs) {
      o.material.opacity = Math.random();
      o.material.transparent = true;
      o.material.needsUpdate = true;
    }
  }

  controls.update();
  renderer.render(scene, camera);
}
