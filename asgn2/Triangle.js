/**
 * drawTriangle — places one triangle in clip space using three (x, y) pairs.
 * Kept as a standalone helper for testing and reuse (see HelloTriangle pattern).
 */
function drawTriangle(gl, program, attribs, uniforms, x1, y1, x2, y2, x3, y3, r, g, b, a) {
  var tri = new Triangle(x1, y1, x2, y2, x3, y3, r, g, b, a);
  tri.render(gl, program, attribs, uniforms);
}

function Triangle(x1, y1, x2, y2, x3, y3, r, g, b, a) {
  this.x1 = x1;
  this.y1 = y1;
  this.x2 = x2;
  this.y2 = y2;
  this.x3 = x3;
  this.y3 = y3;
  this.r = r;
  this.g = g;
  this.b = b;
  this.a = a;
}

Triangle.prototype.render = function (gl, program, attribs, uniforms) {
  var verts = new Float32Array([
    this.x1,
    this.y1,
    this.x2,
    this.y2,
    this.x3,
    this.y3,
  ]);
  var colors = new Float32Array([
    this.r,
    this.g,
    this.b,
    this.a,
    this.r,
    this.g,
    this.b,
    this.a,
    this.r,
    this.g,
    this.b,
    this.a,
  ]);

  var bufPos = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufPos);
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(attribs.a_Position, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(attribs.a_Position);

  var bufCol = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufCol);
  gl.bufferData(gl.ARRAY_BUFFER, colors, gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(attribs.a_Color, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(attribs.a_Color);

  gl.uniform1f(uniforms.u_PointSize, 1.0);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  gl.deleteBuffer(bufPos);
  gl.deleteBuffer(bufCol);
};
