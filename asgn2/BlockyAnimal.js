"use strict";

let canvas;
let gl;
let a_Position;
let u_ModelMatrix;
let u_GlobalRotationMatrix;
let u_FragColor;

let g_globalX = 8;
let g_globalY = 0;
let g_animationOn = true;

let g_headYaw = 0;
let g_headPitch = 0;
let g_tailBase = 10;
let g_tailMid = 0;
let g_tailTip = 0;

let g_flUpper = 0;
let g_flLower = 0;
let g_flFoot = 0;
let g_frUpper = 0;
let g_frLower = 0;
let g_frFoot = 0;
let g_blUpper = 0;
let g_blLower = 0;
let g_blFoot = 0;
let g_brUpper = 0;
let g_brLower = 0;
let g_brFoot = 0;

let g_startTime = performance.now() * 0.001;
let g_seconds = 0;
let g_pokeStart = -1000;

let g_mouseDown = false;
let g_lastMouseX = 0;
let g_lastMouseY = 0;

let g_cubeBuffer = null;
let g_coneBuffer = null;
let g_coneVertexCount = 0;

const VSHADER_SOURCE = `
attribute vec4 a_Position;
uniform mat4 u_ModelMatrix;
uniform mat4 u_GlobalRotationMatrix;
void main() {
  gl_Position = u_GlobalRotationMatrix * u_ModelMatrix * a_Position;
}
`;

const FSHADER_SOURCE = `
precision mediump float;
uniform vec4 u_FragColor;
void main() {
  gl_FragColor = u_FragColor;
}
`;

function main() {
  setupWebGL();
  if (!connectVariablesToGLSL()) {
    return;
  }
  initGeometry();
  addActionsForHtmlUI();
  attachMouseControls();
  resetPose();
  tick();
}

function setupWebGL() {
  canvas = document.getElementById("webgl");
  gl = getWebGLContext(canvas, { preserveDrawingBuffer: true });
  if (!gl) {
    console.log("Failed to get WebGL context.");
    return;
  }
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.72, 0.84, 1.0, 1.0);
}

function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log("Failed to initialize shaders.");
    return false;
  }
  a_Position = gl.getAttribLocation(gl.program, "a_Position");
  u_ModelMatrix = gl.getUniformLocation(gl.program, "u_ModelMatrix");
  u_GlobalRotationMatrix = gl.getUniformLocation(gl.program, "u_GlobalRotationMatrix");
  u_FragColor = gl.getUniformLocation(gl.program, "u_FragColor");
  return a_Position >= 0 && u_ModelMatrix && u_GlobalRotationMatrix && u_FragColor;
}

function initGeometry() {
  const cubeVerts = new Float32Array([
    0,0,0, 1,1,0, 1,0,0,   0,0,0, 0,1,0, 1,1,0,
    0,0,1, 1,0,1, 1,1,1,   0,0,1, 1,1,1, 0,1,1,
    0,0,0, 0,0,1, 0,1,1,   0,0,0, 0,1,1, 0,1,0,
    1,0,0, 1,1,1, 1,0,1,   1,0,0, 1,1,0, 1,1,1,
    0,1,0, 0,1,1, 1,1,1,   0,1,0, 1,1,1, 1,1,0,
    0,0,0, 1,0,1, 0,0,1,   0,0,0, 1,0,0, 1,0,1,
  ]);
  g_cubeBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, cubeVerts, gl.STATIC_DRAW);

  const cone = [];
  const segments = 24;
  for (let i = 0; i < segments; i += 1) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;
    const x0 = Math.cos(a0) * 0.5;
    const z0 = Math.sin(a0) * 0.5;
    const x1 = Math.cos(a1) * 0.5;
    const z1 = Math.sin(a1) * 0.5;
    cone.push(0, 1, 0, x0, 0, z0, x1, 0, z1);
    cone.push(0, 0, 0, x1, 0, z1, x0, 0, z0);
  }
  g_coneVertexCount = cone.length / 3;
  g_coneBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_coneBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cone), gl.STATIC_DRAW);
}

function drawCube(modelMatrix, color) {
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeBuffer);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.drawArrays(gl.TRIANGLES, 0, 36);
}

function drawCone(modelMatrix, color) {
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);
  gl.bindBuffer(gl.ARRAY_BUFFER, g_coneBuffer);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.drawArrays(gl.TRIANGLES, 0, g_coneVertexCount);
}

function renderScene() {
  const globalRotation = new Matrix4();
  globalRotation.rotate(g_globalX, 1, 0, 0);
  globalRotation.rotate(g_globalY, 0, 1, 0);
  gl.uniformMatrix4fv(u_GlobalRotationMatrix, false, globalRotation.elements);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const bodyColor = [0.83, 0.82, 0.77, 1.0];
  const bodyDark = [0.56, 0.54, 0.5, 1.0];
  const cream = [0.93, 0.9, 0.82, 1.0];
  const black = [0.12, 0.1, 0.1, 1.0];

  const body = new Matrix4();
  body.translate(-0.38, -0.16, -0.2);
  body.scale(0.76, 0.37, 0.4);
  drawCube(body, bodyColor);

  const chest = new Matrix4();
  chest.translate(-0.02, -0.12, -0.12);
  chest.scale(0.22, 0.28, 0.24);
  drawCube(chest, cream);

  const neckBase = new Matrix4();
  neckBase.translate(0.24, 0.1, 0.0);
  neckBase.rotate(g_headYaw, 0, 1, 0);
  neckBase.rotate(g_headPitch, 0, 0, 1);

  const neck = new Matrix4(neckBase);
  neck.scale(0.18, 0.16, 0.18);
  drawCube(neck, bodyColor);

  const headBase = new Matrix4(neckBase);
  headBase.translate(0.15, 0.02, -0.09);

  const head = new Matrix4(headBase);
  head.scale(0.34, 0.24, 0.28);
  drawCube(head, bodyColor);

  const snout = new Matrix4(headBase);
  snout.translate(0.31, 0.1, 0.14);
  snout.rotate(90, 0, 0, 1);
  snout.scale(0.16, 0.16, 0.16);
  drawCone(snout, cream);

  const nose = new Matrix4(headBase);
  nose.translate(0.46, 0.08, 0.03);
  nose.scale(0.05, 0.05, 0.06);
  drawCube(nose, black);

  const earL = new Matrix4(headBase);
  earL.translate(0.04, 0.19, 0.02);
  earL.rotate(-22, 0, 0, 1);
  earL.scale(0.09, 0.12, 0.07);
  drawCube(earL, bodyDark);

  const earR = new Matrix4(headBase);
  earR.translate(0.04, 0.19, 0.19);
  earR.rotate(-22, 0, 0, 1);
  earR.scale(0.09, 0.12, 0.07);
  drawCube(earR, bodyDark);

  const hornL = new Matrix4(headBase);
  hornL.translate(0.06, 0.24, 0.03);
  hornL.rotate(-95, 0, 0, 1);
  hornL.scale(0.06, 0.06, 0.06);
  drawCone(hornL, [0.7, 0.62, 0.45, 1.0]);

  const hornR = new Matrix4(headBase);
  hornR.translate(0.06, 0.24, 0.19);
  hornR.rotate(-95, 0, 0, 1);
  hornR.scale(0.06, 0.06, 0.06);
  drawCone(hornR, [0.7, 0.62, 0.45, 1.0]);

  const beard = new Matrix4(headBase);
  beard.translate(0.2, -0.02, 0.105);
  beard.scale(0.05, 0.13, 0.07);
  drawCube(beard, cream);

  const tailRoot = new Matrix4();
  tailRoot.translate(-0.42, 0.1, 0.14);
  tailRoot.rotate(g_tailBase, 0, 0, 1);

  const tailBase = new Matrix4(tailRoot);
  tailBase.scale(0.12, 0.07, 0.08);
  drawCube(tailBase, cream);

  const tailMidPivot = new Matrix4(tailRoot);
  tailMidPivot.translate(-0.12, 0.03, 0.0);
  tailMidPivot.rotate(g_tailMid, 0, 0, 1);

  const tailMid = new Matrix4(tailMidPivot);
  tailMid.scale(0.11, 0.06, 0.07);
  drawCube(tailMid, cream);

  const tailTipPivot = new Matrix4(tailMidPivot);
  tailTipPivot.translate(-0.1, 0.02, 0.0);
  tailTipPivot.rotate(g_tailTip, 0, 0, 1);

  const tailTip = new Matrix4(tailTipPivot);
  tailTip.scale(0.09, 0.05, 0.06);
  drawCube(tailTip, black);

  drawLeg(-0.14, -0.14, 0.02, g_flUpper, g_flLower, g_flFoot, bodyDark, black);
  drawLeg(-0.14, -0.14, 0.28, g_frUpper, g_frLower, g_frFoot, bodyDark, black);
  drawLeg(-0.58, -0.14, 0.02, g_blUpper, g_blLower, g_blFoot, bodyDark, black);
  drawLeg(-0.58, -0.14, 0.28, g_brUpper, g_brLower, g_brFoot, bodyDark, black);
}

function drawLeg(px, py, pz, upperA, lowerA, footA, upperColor, footColor) {
  const upperPivot = new Matrix4();
  upperPivot.translate(px, py, pz);
  upperPivot.rotate(upperA, 0, 0, 1);

  const upper = new Matrix4(upperPivot);
  upper.scale(0.09, -0.18, 0.09);
  drawCube(upper, upperColor);

  const lowerPivot = new Matrix4(upperPivot);
  lowerPivot.translate(0.0, -0.18, 0.0);
  lowerPivot.rotate(lowerA, 0, 0, 1);

  const lower = new Matrix4(lowerPivot);
  lower.scale(0.08, -0.16, 0.08);
  drawCube(lower, upperColor);

  const footPivot = new Matrix4(lowerPivot);
  footPivot.translate(0.0, -0.16, 0.0);
  footPivot.rotate(footA, 0, 0, 1);

  const foot = new Matrix4(footPivot);
  foot.scale(0.13, -0.05, 0.1);
  drawCube(foot, footColor);
}

function updateAnimationAngles() {
  if (!g_animationOn) {
    return;
  }
  const t = g_seconds;
  const walk = Math.sin(t * 5.0) * 28.0;
  const walk2 = Math.sin(t * 5.0 + Math.PI) * 28.0;
  const knee = Math.max(0, Math.sin(t * 5.0)) * 38.0;
  const knee2 = Math.max(0, Math.sin(t * 5.0 + Math.PI)) * 38.0;

  g_flUpper = walk;
  g_frUpper = walk2;
  g_blUpper = walk2;
  g_brUpper = walk;
  g_flLower = -knee;
  g_frLower = -knee2;
  g_blLower = -knee2;
  g_brLower = -knee;
  g_flFoot = Math.sin(t * 5.0) * 12.0;
  g_frFoot = Math.sin(t * 5.0 + Math.PI) * 12.0;
  g_blFoot = Math.sin(t * 5.0 + Math.PI) * 10.0;
  g_brFoot = Math.sin(t * 5.0) * 10.0;

  g_headPitch = Math.sin(t * 2.1) * 7.0;
  g_tailBase = 28 + Math.sin(t * 8.0) * 14.0;
  g_tailMid = Math.sin(t * 8.0 + 0.6) * 16.0;
  g_tailTip = Math.sin(t * 8.0 + 1.0) * 19.0;
}

function updatePokeAnimation() {
  const elapsed = g_seconds - g_pokeStart;
  if (elapsed < 0 || elapsed > 1.1) {
    return;
  }
  const wave = Math.sin(elapsed * Math.PI * 5.0);
  g_headYaw = wave * 28.0;
  g_headPitch = Math.abs(wave) * 20.0;
  g_tailBase = 18 + wave * 35.0;
  g_tailMid = -wave * 30.0;
  g_tailTip = wave * 28.0;
}

function tick() {
  const now = performance.now() * 0.001;
  g_seconds = now - g_startTime;
  updateAnimationAngles();
  updatePokeAnimation();
  syncSliderText();
  renderScene();
  updatePerformance(now);
  requestAnimationFrame(tick);
}

let g_prevTime = performance.now() * 0.001;
function updatePerformance(now) {
  const dt = Math.max(0.0001, now - g_prevTime);
  g_prevTime = now;
  const fps = 1.0 / dt;
  document.getElementById("fps").textContent = fps.toFixed(1);
}

function addActionsForHtmlUI() {
  document.getElementById("btnAnimOn").onclick = function () {
    g_animationOn = true;
  };
  document.getElementById("btnAnimOff").onclick = function () {
    g_animationOn = false;
  };
  document.getElementById("btnReset").onclick = resetPose;

  connectSlider("globalY", function (v) { g_globalY = v; });
  connectSlider("globalX", function (v) { g_globalX = v; });
  connectSlider("headYaw", function (v) { g_headYaw = v; });
  connectSlider("headPitch", function (v) { g_headPitch = v; });
  connectSlider("tailBase", function (v) { g_tailBase = v; });
  connectSlider("tailMid", function (v) { g_tailMid = v; });
  connectSlider("tailTip", function (v) { g_tailTip = v; });
  connectSlider("flUpper", function (v) { g_flUpper = v; });
  connectSlider("flLower", function (v) { g_flLower = v; });
  connectSlider("flFoot", function (v) { g_flFoot = v; });
  connectSlider("frUpper", function (v) { g_frUpper = v; });
  connectSlider("frLower", function (v) { g_frLower = v; });
  connectSlider("frFoot", function (v) { g_frFoot = v; });
  connectSlider("blUpper", function (v) { g_blUpper = v; });
  connectSlider("blLower", function (v) { g_blLower = v; });
  connectSlider("blFoot", function (v) { g_blFoot = v; });
  connectSlider("brUpper", function (v) { g_brUpper = v; });
  connectSlider("brLower", function (v) { g_brLower = v; });
  connectSlider("brFoot", function (v) { g_brFoot = v; });
}

function connectSlider(id, onChange) {
  const slider = document.getElementById(id);
  slider.oninput = function () {
    g_animationOn = false;
    onChange(parseFloat(slider.value));
    syncSliderText();
    renderScene();
  };
}

function syncSliderText() {
  setVal("globalY", g_globalY);
  setVal("globalX", g_globalX);
  setVal("headYaw", g_headYaw);
  setVal("headPitch", g_headPitch);
  setVal("tailBase", g_tailBase);
  setVal("tailMid", g_tailMid);
  setVal("tailTip", g_tailTip);
  setVal("flUpper", g_flUpper);
  setVal("flLower", g_flLower);
  setVal("flFoot", g_flFoot);
  setVal("frUpper", g_frUpper);
  setVal("frLower", g_frLower);
  setVal("frFoot", g_frFoot);
  setVal("blUpper", g_blUpper);
  setVal("blLower", g_blLower);
  setVal("blFoot", g_blFoot);
  setVal("brUpper", g_brUpper);
  setVal("brLower", g_brLower);
  setVal("brFoot", g_brFoot);
}

function setVal(id, value) {
  const rounded = Math.round(value);
  const slider = document.getElementById(id);
  if (slider) {
    slider.value = String(rounded);
  }
  const label = document.getElementById(id + "Val");
  if (label) {
    label.textContent = String(rounded);
  }
}

function resetPose() {
  g_globalX = 8;
  g_globalY = 0;
  g_headYaw = 0;
  g_headPitch = 0;
  g_tailBase = 10;
  g_tailMid = 0;
  g_tailTip = 0;
  g_flUpper = 0;
  g_flLower = 0;
  g_flFoot = 0;
  g_frUpper = 0;
  g_frLower = 0;
  g_frFoot = 0;
  g_blUpper = 0;
  g_blLower = 0;
  g_blFoot = 0;
  g_brUpper = 0;
  g_brLower = 0;
  g_brFoot = 0;
  syncSliderText();
  renderScene();
}

function attachMouseControls() {
  canvas.onmousedown = function (ev) {
    g_mouseDown = true;
    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;
    if (ev.shiftKey) {
      g_pokeStart = g_seconds;
    }
  };
  canvas.onmouseup = function () {
    g_mouseDown = false;
  };
  canvas.onmouseleave = function () {
    g_mouseDown = false;
  };
  canvas.onmousemove = function (ev) {
    if (!g_mouseDown) {
      return;
    }
    const dx = ev.clientX - g_lastMouseX;
    const dy = ev.clientY - g_lastMouseY;
    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;
    g_globalY += dx * 0.6;
    g_globalX += dy * 0.4;
    g_globalX = Math.max(-80, Math.min(80, g_globalX));
    syncSliderText();
    renderScene();
  };
}
