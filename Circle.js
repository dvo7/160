/**
 * Circle approximated with triangles (center + rim vertices).
 */
function Circle(cx, cy, r, g, b, a, radius, segments) {
  this.cx = cx;
  this.cy = cy;
  this.r = r;
  this.g = g;
  this.b = b;
  this.a = a;
  this.radius = radius;
  this.segments = Math.max(3, Math.floor(segments));
}

Circle.prototype.render = function (gl, program, attribs, uniforms) {
  var n = this.segments;
  var positions = [];
  var colors = [];
  var cx = this.cx;
  var cy = this.cy;
  var rad = this.radius;
  var c = this.r;
  var g = this.g;
  var b = this.b;
  var a = this.a;

  for (var i = 0; i < n; i++) {
    var t0 = (2 * Math.PI * i) / n;
    var t1 = (2 * Math.PI * (i + 1)) / n;
    positions.push(cx, cy, cx + rad * Math.cos(t0), cy + rad * Math.sin(t0), cx + rad * Math.cos(t1), cy + rad * Math.sin(t1));
    for (var k = 0; k < 3; k++) {
      colors.push(c, g, b, a);
    }
  }

  var vertArr = new Float32Array(positions);
  var colArr = new Float32Array(colors);

  var bufPos = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufPos);
  gl.bufferData(gl.ARRAY_BUFFER, vertArr, gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(attribs.a_Position, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(attribs.a_Position);

  var bufCol = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufCol);
  gl.bufferData(gl.ARRAY_BUFFER, colArr, gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(attribs.a_Color, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(attribs.a_Color);

  gl.uniform1f(uniforms.u_PointSize, 1.0);
  gl.drawArrays(gl.TRIANGLES, 0, n * 3);

  gl.deleteBuffer(bufPos);
  gl.deleteBuffer(bufCol);
};
