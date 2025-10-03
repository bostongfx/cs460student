import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';      

var renderer, controls, scene, camera;

// Boolean toggles
var FLICKERING, WIRES;

// Torus colors
const COLOR_1 = '#888888'
const COLOR_2 = '#FFFFFF'

window.onload = function() {

    scene = new THREE.Scene();
  
    // setup the camera
    var fov = 75;
    var ratio = window.innerWidth / window.innerHeight;
    var zNear = 1;
    var zFar = 10000;
    camera = new THREE.PerspectiveCamera( fov, ratio, zNear, zFar );
    camera.position.set(0, 0, 100);
  
    // create renderer and setup the canvas
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );
  
  
  
    renderer.domElement.onmousedown = function( e ){
        //console.log(scene);
        //console.log('Yay! We clicked!');
  
        var pixel_coords = new THREE.Vector2( e.clientX, e.clientY );
  
        //console.log('Pixel coords', pixel_coords);
  
        var vp_coords = new THREE.Vector2( 
                    ( pixel_coords.x / window.innerWidth ) * 2 - 1,  //X
                    -( pixel_coords.y / window.innerHeight ) * 2 + 1) // Y
  
        //console.log('Viewport coords', vp_coords);
  
        var vp_coords_near = new THREE.Vector3( vp_coords.x, vp_coords.y, 0);
  
  
        var raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(vp_coords_near, camera);
        var intersects = raycaster.intersectObject(invisible_plane);
  
        //console.log('Ray to Invisible Plane', intersects[0].point);
  
        // update torus position
        if (e.shiftKey){
            controls.enabled = false
            // store a reference to the last placed torus in the global variable .
            torus = makeTorus()
            scene.add(torus);
            torus.position.set(intersects[0].point.x, intersects[0].point.y, intersects[0].point.z);
        }
    };

    renderer.domElement.onmousemove = (e) => {
        if (e.shiftKey && torus){
            const DELTA = e.movementY * 0.1;
            torus.scale.set(torus.scale.x + DELTA,
                            torus.scale.y + DELTA,
                            torus.scale.z + DELTA);
            if (torus.scale.x < 0) {
                console.log('true');
                torus.material.color.set(COLOR_1);
            } else {
                console.log('false');
                torus.material.color.set(COLOR_2);
            }
        }
    };

    renderer.domElement.onmouseup = function() {
        controls.enabled = true;
        // dereferences the torus after clicking to prevent accidental scaling.
        torus = null;
    }


    FLICKERING = false;
    WIRES = false;
    window.onkeypress = (e) => {
        switch (e.key) {
            case 'f':
                FLICKERING = !(FLICKERING);
                break;
            case 'w':
                // change the material for each obj starting from the first placed torus in the scene.
                WIRES = !(WIRES);
                scene.children.map((obj, i) => {
                    if (i > 3) {
                        obj.material.wireframe = WIRES;
                        return obj;
                    } else { return obj;}
                });
                break;
        }
    }
  
    // setup lights
    var ambientLight = new THREE.AmbientLight();
    scene.add(ambientLight);
  
    var light = new THREE.DirectionalLight( 0xffffff, 5.0 );
    light.position.set( 10, 100, 10 );
    scene.add( light );

    // invisible plane
    const geometry = new THREE.PlaneGeometry( 10000, 10000 );
    const material = new THREE.MeshBasicMaterial( {
        visible: false
    });

    var invisible_plane = new THREE.Mesh( geometry, material );

    scene.add(invisible_plane);

     
    function makeTorus(opt = {color: COLOR_2}) {
        const geometry = new THREE.TorusKnotGeometry(10, 3, 100, 16);
        const material = new THREE.MeshStandardMaterial(opt);
        const torus = new THREE.Mesh(geometry, material);
        return torus
    }
    
    var torus = makeTorus({color: COLOR_1})
    scene.add(torus);
    torus = null;
  
    // interaction
    controls = new OrbitControls( camera, renderer.domElement );
  
    // call animation/rendering loop
    animate();
    
};

function animate() {
  
    requestAnimationFrame( animate );
  
    // and here..
    controls.update();
    renderer.render( scene, camera );


    if (FLICKERING && (scene.children.length > 4)) {
        // change the opacity of each placed torus (4th+ item in the scene)
        scene.children.map((obj, i) => {
            if (i > 3) {
                obj.material.opacity = Math.random();
                obj.material.transparent = true;
                obj.material.needsUpdate = true;
                return obj;
            } else {
                return obj;
            }
        });
    }
};
