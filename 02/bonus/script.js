import {download, upload} from 'loader';

window.onload = () => {
    var r = new X.renderer3D();
    r.init();

    var SIZE = 5;
    var GAP = 10;
    for (let x = -5; x < 6; x++) {
        for (let y = -5; y < 6; y++) {
            for (let z = -5; z < 6; z++) {
                const s = new X.sphere();
                s.color = [1, 1, 1];
                s.radius = Math.floor(Math.random() * 7) + 1;
                s.transform.translateX((SIZE + GAP) * x);
                s.transform.translateY((SIZE + GAP) * y);
                s.transform.translateZ((SIZE + GAP) * z);
                r.add(s);
            }
        }
    }
    r.camera.position = [0, 0, 300];

    var SELECTED_SPHERE = null;
    var YOU_SPIN_ME_ROUND = false;
    var CAMERA_LOOP_ID = null;
    var CAMERAS = [];


    r.interactor.onMouseMove = (e) => {
        //console.log('test', e.offsetX, e.offsetY);
        const sphere_id = r.pick(e.offsetX, e.offsetY);
        if (sphere_id !== 0) {
            SELECTED_SPHERE = r.get(sphere_id);
        }
    }

    // keypress controls
    window.onkeypress = (e) => {
        switch (e.key) {
            // hide sphere
            case 'q':
                if (SELECTED_SPHERE === null) {return}
                SELECTED_SPHERE.visible = false;
                break;
            // random color picker
            case 'w':
                if (SELECTED_SPHERE === null) {return}
                // functional way of creating an array of 3 random numbers in [0, 1].
                const random_color = new Array(3)
                    .fill(1)
                    .map((x) => x * Math.random());
                SELECTED_SPHERE.color = random_color;
                break;
            // Rotate sphere
            case 'e':
                if (SELECTED_SPHERE === null) {return}
                SELECTED_SPHERE.transform.rotateX(10);
                break;
            // Camera spin.
            case 'b':
                YOU_SPIN_ME_ROUND = !YOU_SPIN_ME_ROUND;
                playSong(song, YOU_SPIN_ME_ROUND);
                break;
            // Download and upload scene.
            case 'o':
                download(r, CAMERAS);
                break;
            case 'l':
                upload(r, "scene.json", CAMERAS);
                break;
            // Camera storing/switching
            case 'c':
                const cam = r.camera.view;
                CAMERAS.push(new Float32Array(Object.values(cam)));
                break;
            case 'v':
                if (CAMERAS.length === 0) {return}
                if (!CAMERA_LOOP_ID) {
                    loopCamera();
                } else {
                    clearInterval(CAMERA_LOOP_ID);
                    CAMERA_LOOP_ID = null;
                }
                break;
        }
    }

    const song = document.getElementById('song');
    function playSong (song, bool) {
        if (bool) {
            song.play();
            const lyrics = "You spin me right round baby right round like a record, baby right round round round"
            lyrics.split(' ').forEach((s) => console.log(s));
        }
        else {
            song.pause();
            song.currentTime=0;
        }
    }


    function loopCamera() {
        //let CAMERAS = CAMERAS.slice(0);
        CAMERA_LOOP_ID = setInterval(() => {
        // get first camera in queue, set it, and enqueue it again
        const newCam = new Float32Array(Object.values(CAMERAS.shift()));
        r.camera.view = newCam.slice(0);
        CAMERAS.push(newCam);
        }, 1000);
    }

    r.onRender = () => {
        // this gets executed on every frame
        //console.log(r.camera.view);
        if(CAMERAS.length >= 1) {
        }
        if (YOU_SPIN_ME_ROUND) {
            r.camera.rotate([1,0])
        }
    }
    r.render();
}
