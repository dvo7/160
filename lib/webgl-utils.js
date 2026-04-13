// WebGL context helper (same role as the book’s webgl-utils.js + getWebGLContext).

/**
 * @param {HTMLCanvasElement} canvas
 * @param {WebGLContextAttributes} [opt] e.g. { preserveDrawingBuffer: true }
 * @returns {WebGLRenderingContext|null}
 */
function getWebGLContext(canvas, opt) {
  var names = ["webgl", "experimental-webgl", "webkit-3d", "moz-webgl"];
  var ctx = null;
  for (var i = 0; i < names.length; i++) {
    try {
      ctx = canvas.getContext(names[i], opt);
    } catch (e) {
      ctx = null;
    }
    if (ctx) break;
  }
  return ctx;
}
