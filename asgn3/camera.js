function Camera(canvas) {
  this.fov = 60;
  this.eye = new Vector3([0, 0, 0]);
  this.at = new Vector3([0, 0, -1]);
  this.up = new Vector3([0, 1, 0]);
  this.viewMatrix = new Matrix4();
  this.projectionMatrix = new Matrix4();
  this.canvas = canvas;
  this.refreshViewMatrix();
  this.refreshProjectionMatrix();
}

Camera.prototype.refreshViewMatrix = function () {
  var e = this.eye.elements;
  var a = this.at.elements;
  var u = this.up.elements;
  this.viewMatrix.setLookAt(e[0], e[1], e[2], a[0], a[1], a[2], u[0], u[1], u[2]);
};

Camera.prototype.refreshProjectionMatrix = function () {
  var w = this.canvas.width || 1;
  var h = this.canvas.height || 1;
  this.projectionMatrix.setPerspective(this.fov, w / h, 0.1, 1000);
};

Camera.prototype.moveForward = function (speed) {
  var f = new Vector3();
  f.elements[0] = this.at.elements[0] - this.eye.elements[0];
  f.elements[1] = this.at.elements[1] - this.eye.elements[1];
  f.elements[2] = this.at.elements[2] - this.eye.elements[2];
  f.normalize();
  f.elements[0] *= speed;
  f.elements[1] *= speed;
  f.elements[2] *= speed;
  this.eye.elements[0] += f.elements[0];
  this.eye.elements[1] += f.elements[1];
  this.eye.elements[2] += f.elements[2];
  this.at.elements[0] += f.elements[0];
  this.at.elements[1] += f.elements[1];
  this.at.elements[2] += f.elements[2];
  this.refreshViewMatrix();
};

Camera.prototype.moveBackwards = function (speed) {
  var b = new Vector3();
  b.elements[0] = this.eye.elements[0] - this.at.elements[0];
  b.elements[1] = this.eye.elements[1] - this.at.elements[1];
  b.elements[2] = this.eye.elements[2] - this.at.elements[2];
  b.normalize();
  b.elements[0] *= speed;
  b.elements[1] *= speed;
  b.elements[2] *= speed;
  this.eye.elements[0] += b.elements[0];
  this.eye.elements[1] += b.elements[1];
  this.eye.elements[2] += b.elements[2];
  this.at.elements[0] += b.elements[0];
  this.at.elements[1] += b.elements[1];
  this.at.elements[2] += b.elements[2];
  this.refreshViewMatrix();
};

Camera.prototype.moveLeft = function (speed) {
  var fx = this.at.elements[0] - this.eye.elements[0];
  var fy = this.at.elements[1] - this.eye.elements[1];
  var fz = this.at.elements[2] - this.eye.elements[2];
  var ux = this.up.elements[0];
  var uy = this.up.elements[1];
  var uz = this.up.elements[2];
  var sx = uy * fz - uz * fy;
  var sy = uz * fx - ux * fz;
  var sz = ux * fy - uy * fx;
  var s = new Vector3([sx, sy, sz]);
  s.normalize();
  s.elements[0] *= speed;
  s.elements[1] *= speed;
  s.elements[2] *= speed;
  this.eye.elements[0] += s.elements[0];
  this.eye.elements[1] += s.elements[1];
  this.eye.elements[2] += s.elements[2];
  this.at.elements[0] += s.elements[0];
  this.at.elements[1] += s.elements[1];
  this.at.elements[2] += s.elements[2];
  this.refreshViewMatrix();
};

Camera.prototype.moveRight = function (speed) {
  var fx = this.at.elements[0] - this.eye.elements[0];
  var fy = this.at.elements[1] - this.eye.elements[1];
  var fz = this.at.elements[2] - this.eye.elements[2];
  var ux = this.up.elements[0];
  var uy = this.up.elements[1];
  var uz = this.up.elements[2];
  var sx = fy * uz - fz * uy;
  var sy = fz * ux - fx * uz;
  var sz = fx * uy - fy * ux;
  var s = new Vector3([sx, sy, sz]);
  s.normalize();
  s.elements[0] *= speed;
  s.elements[1] *= speed;
  s.elements[2] *= speed;
  this.eye.elements[0] += s.elements[0];
  this.eye.elements[1] += s.elements[1];
  this.eye.elements[2] += s.elements[2];
  this.at.elements[0] += s.elements[0];
  this.at.elements[1] += s.elements[1];
  this.at.elements[2] += s.elements[2];
  this.refreshViewMatrix();
};

Camera.prototype.panLeft = function (alphaDeg) {
  var f = new Vector3();
  f.elements[0] = this.at.elements[0] - this.eye.elements[0];
  f.elements[1] = this.at.elements[1] - this.eye.elements[1];
  f.elements[2] = this.at.elements[2] - this.eye.elements[2];
  var rotationMatrix = new Matrix4();
  rotationMatrix.setRotate(alphaDeg, this.up.elements[0], this.up.elements[1], this.up.elements[2]);
  var fp = rotationMatrix.multiplyVector3(f);
  this.at.elements[0] = this.eye.elements[0] + fp.elements[0];
  this.at.elements[1] = this.eye.elements[1] + fp.elements[1];
  this.at.elements[2] = this.eye.elements[2] + fp.elements[2];
  this.refreshViewMatrix();
};

Camera.prototype.panRight = function (alphaDeg) {
  var f = new Vector3();
  f.elements[0] = this.at.elements[0] - this.eye.elements[0];
  f.elements[1] = this.at.elements[1] - this.eye.elements[1];
  f.elements[2] = this.at.elements[2] - this.eye.elements[2];
  var rotationMatrix = new Matrix4();
  rotationMatrix.setRotate(-alphaDeg, this.up.elements[0], this.up.elements[1], this.up.elements[2]);
  var fp = rotationMatrix.multiplyVector3(f);
  this.at.elements[0] = this.eye.elements[0] + fp.elements[0];
  this.at.elements[1] = this.eye.elements[1] + fp.elements[1];
  this.at.elements[2] = this.eye.elements[2] + fp.elements[2];
  this.refreshViewMatrix();
};

Camera.prototype.yawMouse = function (deltaDeg) {
  this.panRight(deltaDeg);
};
