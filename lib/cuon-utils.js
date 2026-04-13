// cuon-utils.js — shader helpers (Matsuda & Lea style, WebGL Programming Guide).

/**
 * Create and link a shader program from source strings.
 * @param {WebGLRenderingContext} gl
 * @param {string} VSHADER_SOURCE
 * @param {string} FSHADER_SOURCE
 * @returns {WebGLProgram|null}
 */
function initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE) {
  var vertexShader = loadShader(gl, gl.VERTEX_SHADER, VSHADER_SOURCE);
  var fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, FSHADER_SOURCE);
  if (!vertexShader || !fragmentShader) {
    return null;
  }

  var program = gl.createProgram();
  if (!program) {
    return null;
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  var linked = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!linked) {
    var error = gl.getProgramInfoLog(program);
    console.log("Failed to link program: " + error);
    gl.deleteProgram(program);
    gl.deleteShader(fragmentShader);
    gl.deleteShader(vertexShader);
    return null;
  }

  gl.program = program;
  gl.useProgram(program);
  return program;
}

/**
 * @param {WebGLRenderingContext} gl
 * @param {number} type gl.VERTEX_SHADER or gl.FRAGMENT_SHADER
 * @param {string} source
 * @returns {WebGLShader|null}
 */
function loadShader(gl, type, source) {
  var shader = gl.createShader(type);
  if (shader == null) {
    console.log("unable to create shader");
    return null;
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  var compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (!compiled) {
    var error = gl.getShaderInfoLog(shader);
    console.log("Failed to compile shader: " + error);
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}
