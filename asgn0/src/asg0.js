var canvas, ctx;

function main() {
  canvas = document.getElementById("example");
  ctx = canvas.getContext("2d");
  handleDrawEvent();
}

function drawVector(v, color) {
  ctx.strokeStyle = color;
  ctx.beginPath();
  var cx = canvas.width / 2;
  var cy = canvas.height / 2;
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + v.elements[0] * 20, cy - v.elements[1] * 20);
  ctx.stroke();
}

function dupV3(v) {
  var e = v.elements;
  return new Vector3([e[0], e[1], e[2]]);
}

function handleDrawEvent() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  var x = parseFloat(document.getElementById("v1x").value);
  var y = parseFloat(document.getElementById("v1y").value);
  if (isNaN(x)) x = 0;
  if (isNaN(y)) y = 0;
  var v1 = new Vector3([x, y, 0]);

  x = parseFloat(document.getElementById("v2x").value);
  y = parseFloat(document.getElementById("v2y").value);
  if (isNaN(x)) x = 0;
  if (isNaN(y)) y = 0;
  var v2 = new Vector3([x, y, 0]);

  drawVector(v1, "red");
  drawVector(v2, "blue");
}

function handleDrawOperationEvent() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  var x = parseFloat(document.getElementById("v1x").value);
  var y = parseFloat(document.getElementById("v1y").value);
  if (isNaN(x)) x = 0;
  if (isNaN(y)) y = 0;
  var v1 = new Vector3([x, y, 0]);

  x = parseFloat(document.getElementById("v2x").value);
  y = parseFloat(document.getElementById("v2y").value);
  if (isNaN(x)) x = 0;
  if (isNaN(y)) y = 0;
  var v2 = new Vector3([x, y, 0]);

  drawVector(v1, "red");
  drawVector(v2, "blue");

  var op = document.getElementById("operation").value;
  var s = parseFloat(document.getElementById("scalar").value);
  if (isNaN(s)) s = 0;

  var tmp;

  if (op === "add") {
    tmp = dupV3(v1);
    tmp.add(v2);
    drawVector(tmp, "green");
  } else if (op === "sub") {
    tmp = dupV3(v1);
    tmp.sub(v2);
    drawVector(tmp, "green");
  } else if (op === "mul") {
    tmp = dupV3(v1);
    tmp.mul(s);
    drawVector(tmp, "green");
    tmp = dupV3(v2);
    tmp.mul(s);
    drawVector(tmp, "green");
  } else if (op === "div") {
    tmp = dupV3(v1);
    tmp.div(s);
    drawVector(tmp, "green");
    tmp = dupV3(v2);
    tmp.div(s);
    drawVector(tmp, "green");
  } else if (op === "mag") {
    console.log("v1 magnitude:", v1.magnitude());
    console.log("v2 magnitude:", v2.magnitude());
  } else if (op === "norm") {
    tmp = dupV3(v1);
    tmp.normalize();
    drawVector(tmp, "green");
    tmp = dupV3(v2);
    tmp.normalize();
    drawVector(tmp, "green");
  } else if (op === "angle") {
    console.log("Angle:", angleBetween(v1, v2));
  } else if (op === "area") {
    console.log("Triangle area:", areaTriangle(v1, v2));
  }
}

function angleBetween(v1, v2) {
  var m1 = v1.magnitude();
  var m2 = v2.magnitude();
  if (m1 === 0 || m2 === 0) return 0;
  var cos = Vector3.dot(v1, v2) / (m1 * m2);
  if (cos > 1) cos = 1;
  if (cos < -1) cos = -1;
  return (Math.acos(cos) * 180) / Math.PI;
}

function areaTriangle(v1, v2) {
  var c = Vector3.cross(v1, v2);
  return 0.5 * c.magnitude();
}
