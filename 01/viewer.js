import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const pageContainer = document.querySelector('.demo');

const loader = new GLTFLoader();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, pageContainer.clientWidth / 1000, 0.1, 1000);
camera.position.set(5,2,5);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(pageContainer.clientWidth, 1000);
renderer.setAnimationLoop(animate);
document.getElementById('bonus').appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);

const light = new THREE.DirectionalLight(0xffffff, 2);
light.position.set(10,10,10);
scene.add(light);

loader.load('models/skull.glb', function(gltf) {
  gltf.scene.position.set(0,-2,0);
  scene.add(gltf.scene);

}, undefined, function (error) {

  console.error(error);

} );

loader.load('models/sword.glb', function(gltf) {
  gltf.scene.position.set(0,-8,0);
  scene.add(gltf.scene);

}, undefined, function(error) {
  console.error(error);

} );

loader.load('models/macero.glb', function(gltf) {
  gltf.scene.position.set(0,-14,0);
  scene.add(gltf.scene);
  
}, undefined, function(error) {
  console.error(error);

} );


function animate() {
    controls.update();
    renderer.render(scene, camera);
}
animate();