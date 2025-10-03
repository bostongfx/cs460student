function download(r, CAMERAS) {

  // get all objects
  var ALL_OBJECTS = [];

  for (var i = 0; i<r.Ha.length; i++) {
    // note: r.Ha are all objects in the scene

    if (!r.Ha[i].visible)
      continue;

    var type = r.Ha[i].g; // g is the type as string
    var color = r.Ha[i].color;
    var matrix = r.Ha[i].transform.matrix;
    var radius = r.Ha[i].radius;
    var lengthX = r.Ha[i].lengthX;
    var lengthY = r.Ha[i].lengthY;
    var lengthZ = r.Ha[i].lengthZ;
    ALL_OBJECTS.push([type, color, matrix, radius, lengthX, lengthY, lengthZ]);

  }


  // create JSON object
  var out = {};
  out['objects'] = ALL_OBJECTS;
  if (typeof CAMERAS == 'undefined' || CAMERAS.length == 0) {
    var CAMERAS = [r.camera.view];
  }
  out['camera'] = CAMERAS; //r.camera.view;

  // from https://stackoverflow.com/a/30800715
  var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(out));

  var downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href",     dataStr);
  downloadAnchorNode.setAttribute("download", "scene.json");
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();

}

function upload(r, scene, CAMERAS) {

  // remove all objects in the scene
  for (var obj in r.Ha) {

    // r.remove(r.Ha[obj]);
    r.Ha[obj].visible = false;

  }

  var req = new XMLHttpRequest();
  req.responseType = 'json';
  req.open('GET', scene, true);
  req.onload  = function() {
    var loaded = req.response;

    // parse cubes
    for (var obj in loaded['objects']) {

      obj = loaded['objects'][obj];

      // [type, color, matrix, radius, lengthX, lengthY, lengthZ]

     var type = obj[0];
     var color = obj[1];
     var matrix = obj[2];
     var radius = obj[3];
     var lengthX = obj[4];
     var lengthY = obj[5];
     var lengthZ = obj[6];

      if (type == 'cube') {

        var loaded_cube = new X.cube();
        loaded_cube.color = color;
        loaded_cube.transform.matrix = new Float32Array(Object.values(matrix));
        loaded_cube.lengthX = lengthX;
        loaded_cube.lengthY = lengthY;
        loaded_cube.lengthZ = lengthZ;

        r.add(loaded_cube);

      } else if (type == 'sphere') {

        var loaded_sphere = new X.sphere();
        loaded_sphere.color = color;
        loaded_sphere.transform.matrix = new Float32Array(Object.values(matrix));
        loaded_sphere.radius = radius;

        r.add(loaded_sphere);
      }




    }

    // restore camera
    r.camera.view = new Float32Array(Object.values(loaded['camera'][0]));

    //var CAMERAS = [];
    if (CAMERAS) {
        for (const i in loaded['camera']) {
          const cam = loaded['camera'][i];
          CAMERAS.push(cam);
        }
    }



  };
  req.send(null);

}
export {download, upload};

