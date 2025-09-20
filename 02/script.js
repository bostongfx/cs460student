import {download, upload} from 'loader';

window.onload = () => {
    var r = new X.renderer3D();
    r.init();

    var SIZE = 5;
    var GAP = 20;
    for (let x = -5; x < 6; x++) {
        for (let y = -5; y < 6; y++) {
            for (let z = -5; z < 6; z++) {
                const c = new X.cube();
                c.color = [1, 1, 1];
                c.transform.translateX((SIZE + GAP) * x);
                c.transform.translateY((SIZE + GAP) * y);
                c.transform.translateZ((SIZE + GAP) * z);
                r.add(c);
            }
        }
    }
    r.camera.position = [0, 0, 500];

    var SELECTED_CUBE = null;
    var YOU_SPIN_ME_ROUND = false;

    r.interactor.onMouseMove = (e) => {
        //console.log('test', e.offsetX, e.offsetY);
        const cube_id = r.pick(e.offsetX, e.offsetY);
        if (cube_id !== 0) {
            SELECTED_CUBE = r.get(cube_id);

        }
    }

    // keypress controls
    window.onkeypress = (e) => {
        switch (e.key) {
            // Hides cube
            case 'q':
                if (SELECTED_CUBE === null) {return}
                SELECTED_CUBE.visible = false;
                break;
            // Random Color
            case 'w':
                if (SELECTED_CUBE === null) {return}
                // creates array of random numbers in [0, 1]
                const random_color = new Array(3)
                    .fill(1)
                    .map((x) => x * Math.random());
                SELECTED_CUBE.color = random_color;
                break;
            // Rotate
            case 'e':
                if (SELECTED_CUBE === null) {return}
                SELECTED_CUBE.transform.rotateX(10);
                break;
            // Camera Spin
            case 'b':
                YOU_SPIN_ME_ROUND = !YOU_SPIN_ME_ROUND;
                playSong(song, YOU_SPIN_ME_ROUND);
                break;
            // Download/Uploading scene
            case 'o':
                download(r);
                break;
            case 'l':
                upload(r, "scene.json");
                break;
        }
    }

    // Play song when B is pressed
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

    r.onRender = () => {
        // this gets executed on every frame
        if (YOU_SPIN_ME_ROUND) {
            r.camera.rotate([1,0])
        }
    }
    r.render();
}
