/**
 * CS460 Assignment 2 Compatible Scene Loader & Exporter
 * Supports JSON scene serialization, local file upload, and download.
 */

// Global storage for camera viewpoints (used for multi-camera switching)
var CAMERAS = [];

/**
 * Download the current scene configuration as 'scene.json'.
 * Captures all cube color and transformation matrices + camera views.
 */
function download() {
  var cubesData = [];

  // If app maintains a tracked cube registry, prefer that, else fallback to r.Ha
  var sourceList = (window.APP && window.APP.cubes && window.APP.cubes.length > 0)
    ? window.APP.cubes.map(function(item) { return item.cube || item; })
    : (window.r && window.r.Ha ? window.r.Ha : []);

  for (var i = 0; i < sourceList.length; i++) {
    var c = sourceList[i];
    if (!c || !c.color || !c.transform || !c.transform.matrix) continue;

    var color = [c.color[0], c.color[1], c.color[2]];
    var matrix = Array.from(c.transform.matrix);
    cubesData.push([color, matrix]);
  }

  // Ensure current camera is recorded
  var cameraViews = [];
  if (window.CAMERAS && window.CAMERAS.length > 0) {
    cameraViews = window.CAMERAS.map(function(v) { return Array.from(v); });
  } else if (window.r && window.r.camera && window.r.camera.view) {
    cameraViews.push(Array.from(window.r.camera.view));
  }

  var out = {
    'cubes': cubesData,
    'camera': cameraViews
  };

  var jsonStr = JSON.stringify(out, null, 2);
  var blob = new Blob([jsonStr], { type: 'application/json' });
  var url = URL.createObjectURL(blob);

  var downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', url);
  downloadAnchor.setAttribute('download', 'scene.json');
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  setTimeout(function() { URL.revokeObjectURL(url); }, 1000);

  if (window.APP && window.APP.showToast) {
    window.APP.showToast('Scene saved to scene.json (' + cubesData.length + ' cubes)');
  }
}

/**
 * Upload and load a scene JSON object into the XTK renderer.
 * Handles both file-path/URL string and direct JSON payload.
 *
 * @param {string|Object} scene Path to file, URL, or JSON object.
 */
function upload(scene) {
  // If scene is an object, process directly
  if (scene && typeof scene === 'object' && scene.cubes) {
    loadSceneData(scene);
    return;
  }

  // If scene is a string (e.g., 'scene.json'), fetch via XMLHttpRequest
  if (typeof scene === 'string' && scene.length > 0) {
    var req = new XMLHttpRequest();
    req.responseType = 'json';
    req.open('GET', scene, true);
    req.onload = function() {
      if (req.status === 200 || req.status === 0) {
        var data = req.response;
        if (typeof data === 'string') {
          try { data = JSON.parse(data); } catch(e) {}
        }
        if (data) {
          loadSceneData(data);
          return;
        }
      }
      fallbackUploadDialog();
    };
    req.onerror = function() {
      fallbackUploadDialog();
    };
    try {
      req.send(null);
    } catch(err) {
      fallbackUploadDialog();
    }
  } else {
    fallbackUploadDialog();
  }
}

/**
 * Fallback to file picker input so loading works seamlessly over file:// or offline
 */
function fallbackUploadDialog() {
  var fileInput = document.getElementById('fileInput');
  if (fileInput) {
    fileInput.value = '';
    fileInput.click();
  }
}

/**
 * Parse scene JSON object and reconstruct cubes in the XTK renderer
 */
function loadSceneData(loaded) {
  if (!window.r || !loaded || !loaded.cubes) return;

  // Clear current cubes through APP if available
  if (window.APP && window.APP.clearScene) {
    window.APP.clearScene();
  } else if (window.r.Ha) {
    while (window.r.Ha.length > 0) {
      window.r.remove(window.r.Ha[0]);
    }
  }

  var cubeList = loaded.cubes;
  var count = 0;

  for (var i = 0; i < cubeList.length; i++) {
    var item = cubeList[i];
    var color = item[0];
    var matrixValues = item[1];

    var cube = new X.cube();
    cube.color = [color[0], color[1], color[2]];
    cube.lengthX = cube.lengthY = cube.lengthZ = (window.CUBE_SIDELENGTH || 10);
    cube.transform.matrix = new Float32Array(Object.values(matrixValues));

    window.r.add(cube);
    count++;

    // Register with APP if present
    if (window.APP && window.APP.registerImportedCube) {
      window.APP.registerImportedCube(cube);
    }
  }

  // Restore camera view if present
  if (loaded.camera && loaded.camera.length > 0) {
    window.r.camera.view = new Float32Array(Object.values(loaded.camera[0]));
    window.CAMERAS = [];
    for (var k = 0; k < loaded.camera.length; k++) {
      window.CAMERAS.push(new Float32Array(Object.values(loaded.camera[k])));
    }
  }

  if (window.APP && window.APP.onSceneLoaded) {
    window.APP.onSceneLoaded(count);
  }
}
