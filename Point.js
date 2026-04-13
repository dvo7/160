/**
 * A single point brush stamp in clip space (-1 .. 1).
 */
function Point(x, y, r, g, b, a, size) {
  this.x = x;
  this.y = y;
  this.r = r;
  this.g = g;
  this.b = b;
  this.a = a;
  this.size = size;
}

Point.prototype.render = function (gl, program, attribs, uniforms) {
  var xy = new Float32Array([this.x, this.y]);
  var rgba = new Float32Array([this.r, this.g, this.b, this.a]);

  var bufPos = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufPos);
  gl.bufferData(gl.ARRAY_BUFFER, xy, gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(attribs.a_Position, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(attribs.a_Position);

  var bufCol = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufCol);
  gl.bufferData(gl.ARRAY_BUFFER, rgba, gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(attribs.a_Color, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(attribs.a_Color);

  gl.uniform1f(uniforms.u_PointSize, this.size);
  gl.drawArrays(gl.POINTS, 0, 1);

  gl.deleteBuffer(bufPos);
  gl.deleteBuffer(bufCol);
};
