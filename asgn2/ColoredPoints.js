"use strict";

var gl;
var canvas;
var program;
var attribs = {};
var uniforms = {};

/** All interactive brush shapes (cleared by Clear). */
var shapesList = [];

/** Triangle art scene (added once; not cleared by Clear). */
var g_pictureShapes = [];

var g_brush = "point";
var g_size = 10;
var g_segments = 24;
var g_red = 255;
var g_green = 255;
var g_blue = 255;
var g_alpha = 1.0;

// GLSL source as one readable string (template literal — Prof. James / book style).
var VSHADER_SOURCE = `
attribute vec2 a_Position;
attribute vec4 a_Color;
uniform float u_PointSize;
varying vec4 v_Color;
void main() {
  gl_Position = vec4(a_Position, 0.0, 1.0);
  gl_PointSize = u_PointSize;
  v_Color = a_Color;
}
`;

var FSHADER_SOURCE = `
precision mediump float;
varying vec4 v_Color;
void main() {
  gl_FragColor = v_Color;
}
`;

function main() {
  setupWebGL();
  if (!gl) {
    return;
  }
  connectVariablesToGLSL();
  if (!program) {
    return;
  }
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  hookUI();
  canvas.onmousedown = handleClicks;
  canvas.onmousemove = handleClicks;
  canvas.onmouseleave = function () {};

  renderAllShapes();
}

function setupWebGL() {
  canvas = document.getElementById("webgl");
  gl = getWebGLContext(canvas, { preserveDrawingBuffer: true });
  if (!gl) {
    console.log("Failed to get the rendering context for WebGL");
    return;
  }
}

function connectVariablesToGLSL() {
  program = initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE);
  if (!program) {
    console.log("Failed to initialize shaders.");
    return;
  }

  attribs.a_Position = gl.getAttribLocation(program, "a_Position");
  attribs.a_Color = gl.getAttribLocation(program, "a_Color");
  uniforms.u_PointSize = gl.getUniformLocation(program, "u_PointSize");
}

// Event → clip space [-1, 1]: uses clientX/clientY minus canvas rect (not screen coordinates).
function canvasToClip(ev) {
  var rect = canvas.getBoundingClientRect();
  var x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  var y = 1 - ((ev.clientY - rect.top) / rect.height) * 2;
  return { x: x, y: y };
}

function handleClicks(ev) {
  if (ev.type === "mousemove" && ev.buttons !== 1) {
    return;
  }
  var p = canvasToClip(ev);
  var x = p.x;
  var y = p.y;
  click(x, y);
}

function click(x, y) {
  var r = g_red / 255;
  var gch = g_green / 255;
  var b = g_blue / 255;
  var a = g_alpha;

  if (g_brush === "point") {
    shapesList.push(new Point(x, y, r, gch, b, a, g_size));
  } else if (g_brush === "triangle") {
    var sx = (g_size / canvas.width) * 2;
    var sy = (g_size / canvas.height) * 2;
    shapesList.push(
      new Triangle(
        x,
        y + sy * 0.45,
        x - sx * 0.5,
        y - sy * 0.35,
        x + sx * 0.5,
        y - sy * 0.35,
        r,
        gch,
        b,
        a
      )
    );
  } else if (g_brush === "circle") {
    var radX = (g_size / canvas.width) * 2;
    var radY = (g_size / canvas.height) * 2;
    var rad = Math.min(radX, radY) * 0.5;
    shapesList.push(new Circle(x, y, r, gch, b, a, rad, g_segments));
  }

  renderAllShapes();
}

function renderAllShapes() {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(program);

  var i;
  for (i = 0; i < shapesList.length; i++) {
    shapesList[i].render(gl, program, attribs, uniforms);
  }
  for (i = 0; i < g_pictureShapes.length; i++) {
    g_pictureShapes[i].render(gl, program, attribs, uniforms);
  }
}

function clearCanvas() {
  shapesList = [];
  renderAllShapes();
}

function setBrush(mode) {
  g_brush = mode;
}

function readSliders() {
  g_red = parseInt(document.getElementById("red").value, 10);
  g_green = parseInt(document.getElementById("green").value, 10);
  g_blue = parseInt(document.getElementById("blue").value, 10);
  g_size = parseInt(document.getElementById("size").value, 10);
  g_segments = parseInt(document.getElementById("segments").value, 10);
  g_alpha = parseFloat(document.getElementById("alpha").value);

  document.getElementById("redVal").textContent = g_red;
  document.getElementById("greenVal").textContent = g_green;
  document.getElementById("blueVal").textContent = g_blue;
  document.getElementById("sizeVal").textContent = g_size;
  document.getElementById("segmentsVal").textContent = g_segments;
  document.getElementById("alphaVal").textContent = g_alpha.toFixed(2);
}

function hookUI() {
  var ids = ["red", "green", "blue", "size", "segments", "alpha"];
  var onSlide = function () {
    readSliders();
  };
  for (var i = 0; i < ids.length; i++) {
    document.getElementById(ids[i]).oninput = onSlide;
  }
  readSliders();

  document.getElementById("btnPoint").onclick = function () {
    setBrush("point");
  };
  document.getElementById("btnTriangle").onclick = function () {
    setBrush("triangle");
  };
  document.getElementById("btnCircle").onclick = function () {
    setBrush("circle");
  };
  document.getElementById("btnClear").onclick = clearCanvas;
  document.getElementById("btnPicture").onclick = showTrianglePicture;
}

/**
 * Triangle recreation of the paper sketch: low-poly bird (beak left, dark head patch,
 * jagged top, body, inner chevrons, tail, feet) + light sky + “DV” initials.
 */
function showTrianglePicture() {
  g_pictureShapes = buildMasterpieceTriangles();
  renderAllShapes();
}

function buildMasterpieceTriangles() {
  var T = [];
  var tri = function (x1, y1, x2, y2, x3, y3, r, g, b, a) {
    T.push(new Triangle(x1, y1, x2, y2, x3, y3, r, g, b, a));
  };

  var skyT = [0.52, 0.74, 0.9, 1];
  var skyB = [0.38, 0.58, 0.82, 1];
  tri(-1, 0.12, 0, 0.12, 0, 1, skyT[0], skyT[1], skyT[2], skyT[3]);
  tri(-1, 0.12, 0, 1, -1, 1, skyB[0], skyB[1], skyB[2], skyB[3]);
  tri(0, 0.12, 1, 0.12, 1, 1, skyT[0], skyT[1], skyT[2], skyT[3]);

  var beak = [0.95, 0.52, 0.12, 1];
  var patch = [0.2, 0.18, 0.16, 1];
  var bod = [0.94, 0.87, 0.62, 1];
  var bodM = [0.82, 0.72, 0.48, 1];
  var bodD = [0.68, 0.55, 0.38, 1];
  var foot = [0.9, 0.45, 0.18, 1];
  var ink = [0.35, 0.38, 0.42, 1];

  tri(-0.84, 0.02, -0.62, 0.15, -0.62, -0.1, beak[0], beak[1], beak[2], beak[3]);
  tri(-0.62, 0.18, -0.38, 0.34, -0.38, 0.04, patch[0], patch[1], patch[2], patch[3]);
  tri(-0.62, 0.18, -0.38, 0.04, -0.52, -0.05, bod[0], bod[1], bod[2], bod[3]);

  tri(-0.38, 0.34, -0.22, 0.4, -0.38, 0.2, bod[0], bod[1], bod[2], bod[3]);
  tri(-0.22, 0.4, -0.08, 0.36, -0.38, 0.2, bodM[0], bodM[1], bodM[2], bodM[3]);
  tri(-0.08, 0.36, 0.08, 0.38, 0.02, 0.24, bod[0], bod[1], bod[2], bod[3]);
  tri(0.08, 0.38, 0.24, 0.34, 0.02, 0.24, bodM[0], bodM[1], bodM[2], bodM[3]);
  tri(0.24, 0.34, 0.38, 0.3, 0.18, 0.22, bod[0], bod[1], bod[2], bod[3]);

  tri(-0.52, -0.05, -0.38, 0.2, -0.2, 0.12, bod[0], bod[1], bod[2], bod[3]);
  tri(-0.2, 0.12, 0.18, 0.22, -0.05, -0.02, bodM[0], bodM[1], bodM[2], bodM[3]);
  tri(-0.05, -0.02, 0.18, 0.22, 0.35, -0.08, bod[0], bod[1], bod[2], bod[3]);
  tri(-0.52, -0.05, -0.35, -0.28, 0.35, -0.08, bodM[0], bodM[1], bodM[2], bodM[3]);

  tri(-0.15, 0.08, 0.05, 0.08, -0.02, -0.12, bodD[0], bodD[1], bodD[2], bodD[3]);
  tri(0.12, 0.06, 0.28, 0.04, 0.18, -0.14, bodD[0], bodD[1], bodD[2], bodD[3]);

  tri(0.35, -0.08, 0.52, 0.06, 0.42, 0.18, bodD[0], bodD[1], bodD[2], bodD[3]);
  tri(0.42, 0.18, 0.58, 0.12, 0.52, 0.06, bodM[0], bodM[1], bodM[2], bodM[3]);
  tri(0.35, -0.08, 0.52, 0.06, 0.45, -0.18, bodD[0], bodD[1], bodD[2], bodD[3]);

  tri(-0.12, -0.32, 0.02, -0.32, -0.05, -0.22, foot[0], foot[1], foot[2], foot[3]);
  tri(0.06, -0.32, 0.2, -0.32, 0.12, -0.22, foot[0], foot[1], foot[2], foot[3]);

  tri(0.62, -0.05, 0.72, 0.12, 0.68, -0.18, ink[0], ink[1], ink[2], ink[3]);
  tri(0.72, 0.12, 0.82, -0.02, 0.68, -0.18, ink[0], ink[1], ink[2], ink[3]);
  tri(0.78, 0.02, 0.88, 0.14, 0.84, -0.12, ink[0], ink[1], ink[2], ink[3]);
  tri(0.86, -0.02, 0.94, 0.1, 0.9, -0.16, ink[0], ink[1], ink[2], ink[3]);
  tri(0.88, 0.08, 0.98, -0.08, 0.92, -0.2, ink[0], ink[1], ink[2], ink[3]);

  return T;
}
