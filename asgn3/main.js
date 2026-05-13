/* global Camera, Matrix4, Vector3 */

(function () {
  'use strict';

  var MAP_SIZE = 32;
  var WORLD_CENTER = MAP_SIZE / 2;
  var MOVE_SPEED = 4.2;
  var PAN_KEY_RATE = 72;
  var MOUSE_SENS = 0.18;

  var canvas;
  var gl;
  var camera;

  var program;
  var loc = {};

  var bufPos, bufUv, bufSlot;
  var bufGroundPos, bufGroundUv, bufGroundSlot;
  var bufSkyPos, bufSkyUv, bufSkySlot;
  var bufGemPos, bufGemUv, bufGemSlot;
  var bufAnimalPos, bufAnimalUv, bufAnimalSlot;

  var countWalls = 0;
  var countGround = 0;
  var countSky = 0;
  var countGems = 0;
  var countAnimal = 0;

  var textures = [];
  var identity = new Matrix4();

  var wallHeight;
  var wallTex;
  var terrainHeight;
  var gems = [];
  var crystalsTaken = {};
  var crystalTotal = 8;

  var keys = {};
  var mouseLocked = false;
  var lastFrame = performance.now();
  var fpsAccum = 0;
  var fpsFrames = 0;
  var hudFps = document.getElementById('hud-fps');
  var hudCrystals = document.getElementById('hud-crystals');
  var hudWin = document.getElementById('hud-win');
  var timeSec = 0;

  function $(id) {
    return document.getElementById(id);
  }

  function initMap() {
    wallHeight = [];
    wallTex = [];
    var x, z;
    for (x = 0; x < MAP_SIZE; x++) {
      wallHeight[x] = [];
      wallTex[x] = [];
      for (z = 0; z < MAP_SIZE; z++) {
        var edge = x === 0 || z === 0 || x === MAP_SIZE - 1 || z === MAP_SIZE - 1;
        var plaza =
          x >= 12 &&
          x <= 19 &&
          z >= 12 &&
          z <= 19;
        var ring = Math.abs(x - WORLD_CENTER) === 8 || Math.abs(z - WORLD_CENTER) === 8;
        var h = 0;
        if (edge) h = 4;
        else if (ring && !plaza) h = 3;
        else if ((x + z * 3) % 11 === 0 && !plaza) h = 2;
        else if ((x * z + 7) % 17 === 0 && !plaza && x % 3 !== 0) h = 1;
        wallHeight[x][z] = h;
        wallTex[x][z] = (x + z * 2) % 4;
      }
    }
    wallHeight[15][15] = 0;
    wallHeight[16][15] = 0;
    wallTex[15][15] = 0;
    wallTex[16][15] = 0;

    gems = [
      [4, 4],
      [27, 5],
      [6, 28],
      [28, 27],
      [15, 8],
      [20, 20],
      [10, 18],
      [22, 12],
    ];
    crystalsTaken = {};
    if (hudWin) hudWin.style.display = 'none';
    initTerrainHeights();
  }

  function initTerrainHeights() {
    var n = MAP_SIZE + 1;
    var i, j;
    terrainHeight = [];
    for (i = 0; i < n; i++) {
      terrainHeight[i] = [];
      for (j = 0; j < n; j++) {
        var a = 0.22 * Math.sin(i * 0.42) * Math.cos(j * 0.36);
        var b = 0.14 * Math.sin((i + j * 0.7) * 0.19);
        var c = 0.09 * Math.sin(i * 0.11) * Math.sin(j * 0.13);
        var y = 0.18 + a + b + c;
        var dx = i - WORLD_CENTER;
        var dz = j - WORLD_CENTER;
        var plaza = dx * dx + dz * dz < 38;
        if (plaza) y *= 0.35;
        if (y < 0.02) y = 0.02;
        if (y > 0.42) y = 0.42;
        terrainHeight[i][j] = y;
      }
    }
  }

  function cellKey(gx, gz) {
    return gx + ',' + gz;
  }

  function appendCubeFace(arrP, arrUV, arrS, ox, oy, oz, face, texSlot) {
    var du = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ];
    var pts;
    if (face === 0) {
      pts = [
        [-0.5, -0.5, 0.5],
        [0.5, -0.5, 0.5],
        [0.5, 0.5, 0.5],
        [-0.5, 0.5, 0.5],
      ];
    } else if (face === 1) {
      pts = [
        [0.5, -0.5, -0.5],
        [-0.5, -0.5, -0.5],
        [-0.5, 0.5, -0.5],
        [0.5, 0.5, -0.5],
      ];
    } else if (face === 2) {
      pts = [
        [0.5, -0.5, 0.5],
        [0.5, -0.5, -0.5],
        [0.5, 0.5, -0.5],
        [0.5, 0.5, 0.5],
      ];
    } else if (face === 3) {
      pts = [
        [-0.5, -0.5, -0.5],
        [-0.5, -0.5, 0.5],
        [-0.5, 0.5, 0.5],
        [-0.5, 0.5, -0.5],
      ];
    } else if (face === 4) {
      pts = [
        [-0.5, 0.5, 0.5],
        [0.5, 0.5, 0.5],
        [0.5, 0.5, -0.5],
        [-0.5, 0.5, -0.5],
      ];
    } else {
      pts = [
        [-0.5, -0.5, -0.5],
        [0.5, -0.5, -0.5],
        [0.5, -0.5, 0.5],
        [-0.5, -0.5, 0.5],
      ];
    }
    var i;
    var tri = [
      [0, 1, 2],
      [0, 2, 3],
    ];
    for (i = 0; i < 2; i++) {
      var a = tri[i][0],
        b = tri[i][1],
        c = tri[i][2];
      [a, b, c].forEach(function (k) {
        var p = pts[k];
        arrP.push(p[0] + ox, p[1] + oy, p[2] + oz);
        arrUV.push(du[k][0], du[k][1]);
        arrS.push(texSlot);
      });
    }
  }

  function appendUnitCube(arrP, arrUV, arrS, ox, oy, oz, texSlot) {
    var f;
    for (f = 0; f < 6; f++) appendCubeFace(arrP, arrUV, arrS, ox, oy, oz, f, texSlot);
  }

  function appendScaledCube(arrP, arrUV, arrS, cx, cy, cz, sx, sy, sz, texSlot) {
    var base = [];
    var bu = [];
    var bs = [];
    appendUnitCube(base, bu, bs, 0, 0, 0, texSlot);
    var i;
    for (i = 0; i < base.length; i += 3) {
      arrP.push(base[i] * sx + cx, base[i + 1] * sy + cy, base[i + 2] * sz + cz);
    }
    for (i = 0; i < bu.length; i++) arrUV.push(bu[i]);
    for (i = 0; i < bs.length; i++) arrS.push(bs[i]);
  }

  function rebuildWallBuffers() {
    var arrP = [];
    var arrUV = [];
    var arrS = [];
    var ix, iz, k;
    for (ix = 0; ix < MAP_SIZE; ix++) {
      for (iz = 0; iz < MAP_SIZE; iz++) {
        var h = wallHeight[ix][iz];
        var t = wallTex[ix][iz];
        for (k = 0; k < h; k++) {
          var ox = ix + 0.5;
          var oy = k + 0.5;
          var oz = iz + 0.5;
          appendUnitCube(arrP, arrUV, arrS, ox, oy, oz, t);
        }
      }
    }
    countWalls = arrP.length / 3;
    gl.bindBuffer(gl.ARRAY_BUFFER, bufPos);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arrP), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufUv);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arrUV), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufSlot);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arrS), gl.STATIC_DRAW);
  }

  function rebuildGroundBuffer() {
    var arrP = [];
    var arrUV = [];
    var arrS = [];
    var texSlot = 2;
    var i, j;
    for (i = 0; i < MAP_SIZE; i++) {
      for (j = 0; j < MAP_SIZE; j++) {
        var y00 = terrainHeight[i][j];
        var y10 = terrainHeight[i + 1][j];
        var y11 = terrainHeight[i + 1][j + 1];
        var y01 = terrainHeight[i][j + 1];
        var u0 = i / MAP_SIZE;
        var u1 = (i + 1) / MAP_SIZE;
        var v0 = j / MAP_SIZE;
        var v1 = (j + 1) / MAP_SIZE;
        arrP.push(i, y00, j, i, y01, j + 1, i + 1, y11, j + 1);
        arrUV.push(u0, v0, u0, v1, u1, v1);
        arrS.push(texSlot, texSlot, texSlot);
        arrP.push(i, y00, j, i + 1, y11, j + 1, i + 1, y10, j);
        arrUV.push(u0, v0, u1, v1, u1, v0);
        arrS.push(texSlot, texSlot, texSlot);
      }
    }
    countGround = arrP.length / 3;
    gl.bindBuffer(gl.ARRAY_BUFFER, bufGroundPos);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arrP), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufGroundUv);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arrUV), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufGroundSlot);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arrS), gl.STATIC_DRAW);
  }

  function rebuildSkyBuffer() {
    var arrP = [];
    var arrUV = [];
    var arrS = [];
    var sc = 950;
    appendScaledCube(arrP, arrUV, arrS, WORLD_CENTER, WORLD_CENTER * 0.4, WORLD_CENTER, sc, sc, sc, 0);
    countSky = arrP.length / 3;
    gl.bindBuffer(gl.ARRAY_BUFFER, bufSkyPos);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arrP), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufSkyUv);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arrUV), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufSkySlot);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arrS), gl.STATIC_DRAW);
  }

  function rebuildGemBuffers() {
    var arrP = [];
    var arrUV = [];
    var arrS = [];
    var gi;
    for (gi = 0; gi < gems.length; gi++) {
      var g = gems[gi];
      var key = cellKey(g[0], g[1]);
      if (crystalsTaken[key]) continue;
      var gx = g[0] + 0.5;
      var gz = g[1] + 0.5;
      appendScaledCube(arrP, arrUV, arrS, gx, 0.55, gz, 0.35, 0.55, 0.35, 0);
    }
    countGems = arrP.length / 3;
    gl.bindBuffer(gl.ARRAY_BUFFER, bufGemPos);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arrP), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufGemUv);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arrUV), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufGemSlot);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arrS), gl.STATIC_DRAW);
  }

  function rebuildAnimalBuffer(t) {
    var arrP = [];
    var arrUV = [];
    var arrS = [];
    var bob = Math.sin(t * 2.2) * 0.04;
    var ax = 11;
    var az = 22;
    var ay = 0.35 + bob;
    appendScaledCube(arrP, arrUV, arrS, ax, ay + 0.35, az, 0.55, 0.45, 0.75, 1);
    appendScaledCube(arrP, arrUV, arrS, ax + 0.45, ay + 0.65, az, 0.28, 0.28, 0.32, 3);
    appendScaledCube(arrP, arrUV, arrS, ax - 0.25, ay - 0.15, az + 0.22, 0.12, 0.25, 0.12, 1);
    appendScaledCube(arrP, arrUV, arrS, ax + 0.25, ay - 0.15, az + 0.22, 0.12, 0.25, 0.12, 1);
    appendScaledCube(arrP, arrUV, arrS, ax - 0.25, ay - 0.15, az - 0.22, 0.12, 0.25, 0.12, 1);
    appendScaledCube(arrP, arrUV, arrS, ax + 0.25, ay - 0.15, az - 0.22, 0.12, 0.25, 0.12, 1);
    countAnimal = arrP.length / 3;
    gl.bindBuffer(gl.ARRAY_BUFFER, bufAnimalPos);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arrP), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufAnimalUv);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arrUV), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufAnimalSlot);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arrS), gl.STATIC_DRAW);
  }

  function makeTex(drawFn) {
    var c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    var ctx = c.getContext('2d');
    drawFn(ctx, 128);
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    gl.generateMipmap(gl.TEXTURE_2D);
    return tex;
  }

  function makeWallBrickTex() {
    return makeTex(function (ctx, s) {
      var x, y;
      ctx.fillStyle = '#6d4c33';
      ctx.fillRect(0, 0, s, s);
      for (y = 0; y < 8; y++) {
        for (x = 0; x < 8; x++) {
          ctx.fillStyle = (x + y) % 2 === 0 ? '#7a5540' : '#5a3f2e';
          ctx.fillRect((x * s) / 8, (y * s) / 8, s / 8 + 1, s / 8 + 1);
        }
      }
      ctx.strokeStyle = '#3d2918';
      ctx.lineWidth = 3;
      for (y = 0; y < 8; y++) {
        ctx.beginPath();
        ctx.moveTo(0, (y * s) / 8);
        ctx.lineTo(s, (y * s) / 8);
        ctx.stroke();
      }
      for (x = 0; x < 8; x++) {
        ctx.beginPath();
        ctx.moveTo((x * s) / 8, 0);
        ctx.lineTo((x * s) / 8, s);
        ctx.stroke();
      }
    });
  }

  function loadTexture(gl, src, unit, onLoad, onError) {
    var texture = gl.createTexture();
    var image = new Image();
    image.onload = function () {
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
      var w = image.width;
      var isPot = w > 0 && (w & (w - 1)) === 0 && w === image.height;
      if (isPot) {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.generateMipmap(gl.TEXTURE_2D);
      } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      }
      onLoad(texture);
    };
    image.onerror = function () {
      if (onError) onError();
    };
    image.src = src;
  }

  function initTextures(done) {
    textures[0] = null;
    loadTexture(
      gl,
      'textures/block.jpg',
      0,
      function (tex) {
        textures[0] = tex;
        done();
      },
      function () {
        textures[0] = makeWallBrickTex();
        done();
      },
    );
    textures[1] = makeTex(function (ctx, s) {
      ctx.fillStyle = '#8a8f98';
      ctx.fillRect(0, 0, s, s);
      var i;
      for (i = 0; i < 400; i++) {
        ctx.fillStyle = 'rgba(255,255,255,' + (Math.random() * 0.08) + ')';
        ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2);
      }
      for (i = 0; i < 30; i++) {
        ctx.strokeStyle = 'rgba(40,45,55,0.35)';
        ctx.beginPath();
        ctx.moveTo(Math.random() * s, Math.random() * s);
        ctx.lineTo(Math.random() * s, Math.random() * s);
        ctx.stroke();
      }
    });
    textures[2] = makeTex(function (ctx, s) {
      var x, y;
      ctx.fillStyle = '#2d6b3a';
      ctx.fillRect(0, 0, s, s);
      for (y = 0; y < s; y++) {
        for (x = 0; x < s; x++) {
          if ((x ^ y) % 9 === 0) ctx.fillStyle = 'rgba(40,120,55,0.15)';
          ctx.fillRect(x, y, 1, 1);
        }
      }
      ctx.fillStyle = 'rgba(180,220,130,0.25)';
      ctx.fillRect(0, 0, s, s / 6);
    });
    textures[3] = makeTex(function (ctx, s) {
      ctx.fillStyle = '#a07045';
      ctx.fillRect(0, 0, s, s);
      var i;
      for (i = 0; i < 50; i++) {
        ctx.fillStyle = 'rgba(60,35,15,0.15)';
        ctx.fillRect(Math.random() * s, Math.random() * s, s / 8, 3);
      }
    });
  }

  var VS_SOURCE =
    'attribute vec4 a_position;\n' +
    'attribute vec2 a_texCoord;\n' +
    'attribute float a_texSlot;\n' +
    'uniform mat4 u_ModelMatrix;\n' +
    'uniform mat4 u_ViewMatrix;\n' +
    'uniform mat4 u_ProjectionMatrix;\n' +
    'uniform vec3 u_eyeWorld;\n' +
    'varying vec2 v_uv;\n' +
    'varying float v_slot;\n' +
    'varying float v_fogDist;\n' +
    'void main() {\n' +
    '  vec4 world = u_ModelMatrix * a_position;\n' +
    '  v_fogDist = distance(world.xyz, u_eyeWorld);\n' +
    '  gl_Position = u_ProjectionMatrix * u_ViewMatrix * world;\n' +
    '  v_uv = a_texCoord;\n' +
    '  v_slot = a_texSlot;\n' +
    '}\n';

  var FS_SOURCE =
    'precision mediump float;\n' +
    'varying vec2 v_uv;\n' +
    'varying float v_slot;\n' +
    'varying float v_fogDist;\n' +
    'uniform vec3 u_baseColor;\n' +
    'uniform float u_texColorWeight;\n' +
    'uniform sampler2D u_tex0;\n' +
    'uniform sampler2D u_tex1;\n' +
    'uniform sampler2D u_tex2;\n' +
    'uniform sampler2D u_tex3;\n' +
    'uniform vec3 u_fogColor;\n' +
    'uniform float u_fogStrength;\n' +
    'void main() {\n' +
    '  vec4 texColor;\n' +
    '  if (v_slot < 0.5) texColor = texture2D(u_tex0, v_uv);\n' +
    '  else if (v_slot < 1.5) texColor = texture2D(u_tex1, v_uv);\n' +
    '  else if (v_slot < 2.5) texColor = texture2D(u_tex2, v_uv);\n' +
    '  else texColor = texture2D(u_tex3, v_uv);\n' +
    '  vec3 mixed = mix(u_baseColor, texColor.rgb, u_texColorWeight);\n' +
    '  float fog = clamp(v_fogDist / 220.0, 0.0, 1.0) * u_fogStrength;\n' +
    '  vec3 outc = mix(mixed, u_fogColor, fog);\n' +
    '  gl_FragColor = vec4(outc, 1.0);\n' +
    '}\n';

  function compile(type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      throw gl.getShaderInfoLog(sh);
    }
    return sh;
  }

  function initShaders() {
    var vs = compile(gl.VERTEX_SHADER, VS_SOURCE);
    var fs = compile(gl.FRAGMENT_SHADER, FS_SOURCE);
    program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw gl.getProgramInfoLog(program);
    }
    gl.useProgram(program);
    loc.a_position = gl.getAttribLocation(program, 'a_position');
    loc.a_texCoord = gl.getAttribLocation(program, 'a_texCoord');
    loc.a_texSlot = gl.getAttribLocation(program, 'a_texSlot');
    loc.u_ModelMatrix = gl.getUniformLocation(program, 'u_ModelMatrix');
    loc.u_ViewMatrix = gl.getUniformLocation(program, 'u_ViewMatrix');
    loc.u_ProjectionMatrix = gl.getUniformLocation(program, 'u_ProjectionMatrix');
    loc.u_baseColor = gl.getUniformLocation(program, 'u_baseColor');
    loc.u_texColorWeight = gl.getUniformLocation(program, 'u_texColorWeight');
    loc.u_tex0 = gl.getUniformLocation(program, 'u_tex0');
    loc.u_tex1 = gl.getUniformLocation(program, 'u_tex1');
    loc.u_tex2 = gl.getUniformLocation(program, 'u_tex2');
    loc.u_tex3 = gl.getUniformLocation(program, 'u_tex3');
    loc.u_eyeWorld = gl.getUniformLocation(program, 'u_eyeWorld');
    loc.u_fogColor = gl.getUniformLocation(program, 'u_fogColor');
    loc.u_fogStrength = gl.getUniformLocation(program, 'u_fogStrength');
  }

  function bindTexUnits() {
    var i;
    for (i = 0; i < 4; i++) {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, textures[i]);
    }
    gl.uniform1i(loc.u_tex0, 0);
    gl.uniform1i(loc.u_tex1, 1);
    gl.uniform1i(loc.u_tex2, 2);
    gl.uniform1i(loc.u_tex3, 3);
  }

  function setAttribs(posBuf, uvBuf, slotBuf) {
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.vertexAttribPointer(loc.a_position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(loc.a_position);
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
    gl.vertexAttribPointer(loc.a_texCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(loc.a_texCoord);
    gl.bindBuffer(gl.ARRAY_BUFFER, slotBuf);
    gl.vertexAttribPointer(loc.a_texSlot, 1, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(loc.a_texSlot);
  }

  function drawBatch(posBuf, uvBuf, slotBuf, n, baseR, baseG, baseB, texW) {
    if (n <= 0) return;
    setAttribs(posBuf, uvBuf, slotBuf);
    gl.uniform3f(loc.u_baseColor, baseR, baseG, baseB);
    gl.uniform1f(loc.u_texColorWeight, texW);
    gl.drawArrays(gl.TRIANGLES, 0, n);
  }

  function renderEyeUniforms() {
    gl.uniform3f(
      loc.u_eyeWorld,
      camera.eye.elements[0],
      camera.eye.elements[1],
      camera.eye.elements[2],
    );
    gl.uniformMatrix4fv(loc.u_ViewMatrix, false, camera.viewMatrix.elements);
    gl.uniformMatrix4fv(loc.u_ProjectionMatrix, false, camera.projectionMatrix.elements);
    gl.uniformMatrix4fv(loc.u_ModelMatrix, false, identity.elements);
    gl.uniform3f(loc.u_fogColor, 0.52, 0.68, 0.92);
    gl.uniform1f(loc.u_fogStrength, 0.85);
  }

  function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    renderEyeUniforms();

    drawBatch(bufSkyPos, bufSkyUv, bufSkySlot, countSky, 0.25, 0.55, 0.95, 0.0);
    drawBatch(bufGroundPos, bufGroundUv, bufGroundSlot, countGround, 1.0, 1.0, 1.0, 1.0);
    drawBatch(bufPos, bufUv, bufSlot, countWalls, 1.0, 1.0, 1.0, 1.0);
    drawBatch(bufAnimalPos, bufAnimalUv, bufAnimalSlot, countAnimal, 1.0, 1.0, 1.0, 1.0);
    drawBatch(bufGemPos, bufGemUv, bufGemSlot, countGems, 0.15, 0.95, 0.35, 0.35);
  }

  function facingCell() {
    var ex = camera.eye.elements[0];
    var ez = camera.eye.elements[2];
    var fx = camera.at.elements[0] - ex;
    var fz = camera.at.elements[2] - ez;
    var len = Math.sqrt(fx * fx + fz * fz);
    if (len < 1e-6) return null;
    fx /= len;
    fz /= len;
    var reach = 5;
    var cx = ex + fx * reach;
    var cz = ez + fz * reach;
    var gx = Math.floor(cx);
    var gz = Math.floor(cz);
    if (gx < 0 || gx >= MAP_SIZE || gz < 0 || gz >= MAP_SIZE) return null;
    return { gx: gx, gz: gz };
  }

  function tryCollectCrystal() {
    var ex = camera.eye.elements[0];
    var ez = camera.eye.elements[2];
    var gi;
    for (gi = 0; gi < gems.length; gi++) {
      var g = gems[gi];
      var key = cellKey(g[0], g[1]);
      if (crystalsTaken[key]) continue;
      var dx = ex - (g[0] + 0.5);
      var dz = ez - (g[1] + 0.5);
      if (dx * dx + dz * dz < 2.8) {
        crystalsTaken[key] = true;
        rebuildGemBuffers();
        var got = Object.keys(crystalsTaken).length;
        if (hudCrystals) hudCrystals.textContent = got + ' / ' + crystalTotal + ' crystals';
        if (got >= crystalTotal && hudWin) hudWin.style.display = 'block';
        return;
      }
    }
  }

  function placeBlock() {
    var c = facingCell();
    if (!c) return;
    if (wallHeight[c.gx][c.gz] < 4) {
      wallHeight[c.gx][c.gz]++;
      rebuildWallBuffers();
    }
  }

  function breakBlock() {
    var c = facingCell();
    if (!c) return;
    if (wallHeight[c.gx][c.gz] > 0) {
      wallHeight[c.gx][c.gz]--;
      rebuildWallBuffers();
    }
  }

  function update(dt) {
    timeSec += dt;
    var sp = MOVE_SPEED * dt;
    if (keys['w']) camera.moveForward(sp);
    if (keys['s']) camera.moveBackwards(sp);
    if (keys['a']) camera.moveLeft(sp);
    if (keys['d']) camera.moveRight(sp);
    if (keys['q']) camera.panLeft(PAN_KEY_RATE * dt);
    if (keys['e']) camera.panRight(PAN_KEY_RATE * dt);

    tryCollectCrystal();
    rebuildAnimalBuffer(timeSec);

    fpsAccum += dt;
    fpsFrames++;
    if (fpsAccum >= 0.5) {
      var fps = Math.round(fpsFrames / fpsAccum);
      fpsFrames = 0;
      fpsAccum = 0;
      if (hudFps) hudFps.textContent = fps + ' fps';
    }
  }

  function frame(now) {
    var dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  function onResize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    camera.refreshProjectionMatrix();
  }

  function initInput() {
    window.addEventListener('keydown', function (e) {
      var k = e.key.toLowerCase();
      keys[k] = true;
      if (k === 'f' && !e.repeat) placeBlock();
      if (k === 'g' && !e.repeat) breakBlock();
    });
    window.addEventListener('keyup', function (e) {
      keys[e.key.toLowerCase()] = false;
    });
    canvas.addEventListener('click', function () {
      canvas.requestPointerLock();
    });
    document.addEventListener('pointerlockchange', function () {
      mouseLocked = document.pointerLockElement === canvas;
    });
    canvas.addEventListener('mousemove', function (e) {
      if (!mouseLocked) return;
      camera.yawMouse(e.movementX * MOUSE_SENS);
    });
    canvas.addEventListener('contextmenu', function (e) {
      e.preventDefault();
    });
    canvas.addEventListener('mousedown', function (e) {
      if (!mouseLocked) return;
      if (e.button === 0) placeBlock();
      else if (e.button === 2) breakBlock();
    });
  }

  function main() {
    canvas = $('canvas');
    if (!canvas) return;
    gl = canvas.getContext('webgl', { antialias: true });
    if (!gl) {
      alert('WebGL not available');
      return;
    }
    camera = new Camera(canvas);

    camera.eye.elements[0] = WORLD_CENTER;
    camera.eye.elements[1] = 1.65;
    camera.eye.elements[2] = 7;
    camera.at.elements[0] = WORLD_CENTER;
    camera.at.elements[1] = 1.65;
    camera.at.elements[2] = 22;
    camera.refreshViewMatrix();

    initMap();
    initShaders();
    initTextures(function () {
      bindTexUnits();

      bufPos = gl.createBuffer();
      bufUv = gl.createBuffer();
      bufSlot = gl.createBuffer();
      bufGroundPos = gl.createBuffer();
      bufGroundUv = gl.createBuffer();
      bufGroundSlot = gl.createBuffer();
      bufSkyPos = gl.createBuffer();
      bufSkyUv = gl.createBuffer();
      bufSkySlot = gl.createBuffer();
      bufGemPos = gl.createBuffer();
      bufGemUv = gl.createBuffer();
      bufGemSlot = gl.createBuffer();
      bufAnimalPos = gl.createBuffer();
      bufAnimalUv = gl.createBuffer();
      bufAnimalSlot = gl.createBuffer();

      rebuildWallBuffers();
      rebuildGroundBuffer();
      rebuildSkyBuffer();
      rebuildGemBuffers();
      rebuildAnimalBuffer(0);

      gl.enable(gl.DEPTH_TEST);
      gl.clearColor(0.52, 0.68, 0.92, 1);

      onResize();
      window.addEventListener('resize', onResize);
      initInput();

      if (hudCrystals) hudCrystals.textContent = '0 / ' + crystalTotal + ' crystals';

      requestAnimationFrame(frame);
    });
  }

  main();
})();
