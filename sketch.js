// Ionic Bond Simulation Na-Cl 3D
// Author: GPT-5

let fontRegular; // Khai báo biến toàn cục để chứa phông chữ đã tải
let playButton, resetButton;
let titleDiv, footerDiv;
let atoms = [];
let state = "idle"; // idle, moving, transferring, rearranging, done
let transferProgress = 0;
let moveProgress = 0;
let rearrangeProgress = 0; // for rearrangement of Cl shell electrons
let transferringElectron; // the blue electron that is transferred

// Parameters for movement distances (in pixels)
let initialDistance = 400;
// finalDistance is computed so that the third shells of Na and Cl are nearly touching.
// Third shell radius = 50 + 2*40 = 130. So finalDistance becomes 2*130 + 10 = 270.
let finalDistance = 2 * 130 + 10; // (2 * thirdShellRadius + margin)

function preload() {
  // Sửa lỗi: Sử dụng một đường link phông chữ đáng tin cậy hơn từ Google Fonts CDN
  // Phông chữ "Open Sans" được tải từ một URL khác.
  fontRegular = loadFont('https://fonts.gstatic.com/s/opensans/v27/mem8YaGs126MiZpBA-UFVZ0e.ttf');
}

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  perspective(PI / 3, width / height, 0.1, 2000);
  
  smooth();
  textFont(fontRegular); // Set the preloaded font object here
  textAlign(CENTER, CENTER);
  noStroke();
  
  // Create fixed HTML UI for title and footer.
  titleDiv = createDiv("MÔ PHỎNG LIÊN KẾT ION GIỮA Na và Cl"); // "IONIC BOND SIMULATION BETWEEN Na AND Cl"
  titleDiv.style("position", "absolute");
  titleDiv.style("top", "10px");
  titleDiv.style("width", "100%");
  titleDiv.style("text-align", "center");
  titleDiv.style("font-size", "18px");
  titleDiv.style("color", "#fff");
  titleDiv.style("text-shadow", "2px 2px 5px rgba(0,0,0,0.7)");
  titleDiv.style("font-family", "Arial"); // Added: Set font for title
  
  footerDiv = createDiv("© HÓA HỌC ABC"); // "© ABC CHEMISTRY"
  footerDiv.style("position", "absolute");
  footerDiv.style("bottom", "10px");
  footerDiv.style("width", "100%");
  footerDiv.style("text-align", "center");
  footerDiv.style("font-size", "16px");
  footerDiv.style("color", "#fff");
  footerDiv.style("text-shadow", "2px 2px 5px rgba(0,0,0,0.7)");
  footerDiv.style("font-family", "Arial"); // Added: Set font for footer
  
  // Create atoms
  atoms.push(new Atom(-200, 0, "Na", 11, [2, 8, 1], color(0,150,255)));
  atoms.push(new Atom(200, 0, "Cl", 17, [2, 8, 7], color(0,255,0)));
  
  createUI();
}

function easeInOutQuad(t) {
  return t < 0.5 ? 2*t*t : -1 + (4-2*t)*t;
}

function easeOutElastic(t) {
  const c4 = (2*PI)/3;
  return t === 0 ? 0 : t === 1 ? 1 : pow(2, -10*t)*sin((t*10-0.75)*c4) + 1;
}

function createUI() {
  playButton = createButton("▶ Play");
  styleButton(playButton);
  playButton.mousePressed(() => {
    playButton.style("box-shadow", "inset 2px 2px 4px rgba(0,0,0,0.6)");
    playButton.style("transform", "scale(0.95)");
    if (state === "idle") {
      state = "moving";
    }
  });
  playButton.mouseReleased(() => {
    playButton.style("box-shadow", "2px 2px 4px rgba(0,0,0,0.6)");
    playButton.style("transform", "scale(1)");
  });
  playButton.mouseOver(() => {
    playButton.style("background", "linear-gradient(145deg, #667eea, #764ba2)");
  });
  playButton.mouseOut(() => {
    playButton.style("background", "linear-gradient(145deg, #6a82fb, #fc5c7d)");
  });
  
  resetButton = createButton("↺ Reset");
  styleButton(resetButton);
  resetButton.mousePressed(() => {
    resetButton.style("box-shadow", "inset 2px 2px 4px rgba(0,0,0,0.6)");
    resetButton.style("transform", "scale(0.95)");
    resetSimulation();
  });
  resetButton.mouseReleased(() => {
    resetButton.style("box-shadow", "2px 2px 4px rgba(0,0,0,0.6)");
    resetButton.style("transform", "scale(1)");
  });
  resetButton.mouseOver(() => {
    resetButton.style("background", "linear-gradient(145deg, #29c6f1, #1d86f0)");
  });
  resetButton.mouseOut(() => {
    resetButton.style("background", "linear-gradient(145deg, #36d1dc, #5b86e5)");
  });
  
  positionButtons();
}

function styleButton(btn) {
  btn.style("width", "80px");
  btn.style("height", "30px");
  btn.style("padding", "0px");
  btn.style("font-size", "12px");
  btn.style("border", "none");
  btn.style("border-radius", "6px");
  btn.style("background", "linear-gradient(145deg, #6a82fb, #fc5c7d)");
  btn.style("color", "#fff");
  btn.style("cursor", "pointer");
  btn.style("box-shadow", "2px 2px 4px rgba(0,0,0,0.6)");
  btn.style("transition", "all 0.2s ease-in-out");
  btn.style("font-family", "Arial"); // Added: Set font for buttons
}

function positionButtons() {
  playButton.position(20, 20);
  resetButton.position(20, 60);
}

function resetSimulation() {
  atoms = [];
  atoms.push(new Atom(-200, 0, "Na", 11, [2,8,1], color(0,150,255)));
  atoms.push(new Atom(200, 0, "Cl", 17, [2,8,7], color(0,255,0)));
  state = "idle";
  transferProgress = 0;
  moveProgress = 0;
  rearrangeProgress = 0;
  transferringElectron = undefined;
}

function draw() {
  background(0);
  orbitControl();
  
  ambientLight(80);
  pointLight(255,255,255,0,0,300);
  
  if (state === "moving") {
    moveProgress += 0.005;
    if (moveProgress > 1) moveProgress = 1;
    let t = easeInOutQuad(moveProgress);
    let currentDist = lerp(initialDistance, finalDistance, t);
    atoms[0].pos.x = -currentDist / 2;
    atoms[1].pos.x = currentDist / 2;
    if (moveProgress >= 1) {
      transferringElectron = atoms[0].shells[2][0];
      atoms[0].shells[2] = [];
      atoms[0].shellRadii.pop();
      state = "transferring";
    }
  }
  else if (state === "transferring") {
    transferProgress += 0.01;
    if (transferProgress > 1) transferProgress = 1;
    let dir = p5.Vector.sub(atoms[1].pos, atoms[0].pos).normalize();
    let startPos = p5.Vector.add(atoms[0].pos, p5.Vector.mult(dir, 130));
    let endPos = p5.Vector.sub(atoms[1].pos, p5.Vector.mult(dir, atoms[1].shellRadii[2]));
    let mid = p5.Vector.lerp(startPos, endPos, transferProgress);
    transferringElectron.pos = mid;
    push();
    translate(mid.x, mid.y, 0);
    fill(transferringElectron.col);
    sphere(6);
    pop();
    if (transferProgress >= 1) {
      let v = p5.Vector.sub(mid, atoms[1].pos);
      let transferredAngle = atan2(v.y, v.x);
      transferringElectron.angle = transferredAngle;
      transferringElectron.initialAngle = transferredAngle;
      transferringElectron.targetAngle = transferredAngle;
      atoms[1].shells[2] = [];
      atoms[1].shells[2].push(transferringElectron);
      for (let i = 1; i < 8; i++) {
        atoms[1].shells[2].push({
          angle: transferredAngle,
          col: color(0,255,0),
          initialAngle: transferredAngle,
          targetAngle: transferredAngle
        });
      }
      prepareRearrangement();
      state = "rearranging";
      rearrangeProgress = 0;
    }
  }
  else if (state === "rearranging") {
    rearrangeProgress += 0.01;
    if (rearrangeProgress > 1) rearrangeProgress = 1;
    let shell = atoms[1].shells[2];
    for (let e of shell) {
      if (red(e.col) === 0 && green(e.col) === 255 && blue(e.col) === 0) {
        e.angle = lerp(e.initialAngle, e.targetAngle, rearrangeProgress);
      } else {
        e.angle = lerp(e.initialAngle, e.targetAngle, easeOutElastic(rearrangeProgress));
      }
    }
    if (rearrangeProgress >= 1) {
      for (let e of shell) {
        e.angle = e.targetAngle;
        e.initialAngle = e.targetAngle;
      }
      state = "done";
    }
  }
  
  for (let atom of atoms) {
    push();
    translate(atom.pos.x, atom.pos.y, 0);
    atom.show();
    pop();
  }
  
  for (let atom of atoms) {
    push();
    translate(atom.pos.x, atom.pos.y - 30, 0);
    fill(255);
    textSize(18);
    if (atom.label === "Na") text("+11", 0, 0);
    else if (atom.label === "Cl") text("+17", 0, 0);
    pop();
  }
  
  if (state === "done" || state === "rearranging") {
    let lastRadiusNa = atoms[0].shellRadii[atoms[0].shellRadii.length - 1] || 60;
    push();
    translate(atoms[0].pos.x, atoms[0].pos.y - (lastRadiusNa + 25), 0);
    fill(255);
    textSize(25);
    text("+", 0, 0);
    pop();
    
    let lastRadiusCl = atoms[1].shellRadii[atoms[1].shellRadii.length - 1] || 60;
    push();
    translate(atoms[1].pos.x, atoms[1].pos.y - (lastRadiusCl + 25), 0);
    fill(255);
    textSize(25);
    text("-", 0, 0);
    pop();
  }
}

function prepareRearrangement() {
  let shell = atoms[1].shells[2];
  let total = shell.length;
  let blueAngle = shell[0].angle;
  shell[0].initialAngle = blueAngle;
  shell[0].targetAngle = blueAngle;
  let spacing = TWO_PI / total;
  for (let i = 1; i < total; i++) {
    shell[i].initialAngle = blueAngle;
    shell[i].targetAngle = blueAngle + i * spacing;
  }
  atoms[1].shells[2] = shell;
}

function drawSmoothCircle(radius) {
  let numPoints = 200;
  beginShape();
  for (let i = 0; i < numPoints; i++){
    let angle = map(i, 0, numPoints, 0, TWO_PI);
    let x = radius * cos(angle);
    let y = radius * sin(angle);
    vertex(x, y);
  }
  endShape(CLOSE);
}

class Atom {
  constructor(x, y, label, protons, shellCounts, electronCol) {
    this.pos = createVector(x, y, 0);
    this.label = label;
    this.protons = protons;
    this.shells = [];
    this.shellRadii = [];
    let baseR = 50;
    let increment = 40;
    for (let i = 0; i < shellCounts.length; i++) {
      let radius = baseR + i * increment;
      this.shellRadii.push(radius);
      let shellElectrons = [];
      for (let j = 0; j < shellCounts[i]; j++) {
        shellElectrons.push({
          angle: (TWO_PI / shellCounts[i]) * j,
          col: electronCol,
          initialAngle: (TWO_PI / shellCounts[i]) * j,
          targetAngle: (TWO_PI / shellCounts[i]) * j
        });
      }
      this.shells.push(shellElectrons);
    }
  }
  
  show() {
    push();
    fill(255, 0, 0);
    sphere(20);
    pop();
    
    for (let i = 0; i < this.shells.length; i++) {
      if (this.shells[i].length > 0) {
        noFill();
        stroke(255);
        strokeWeight(1);
        drawSmoothCircle(this.shellRadii[i]);
        noStroke();
        for (let e of this.shells[i]) {
          let angle;
          if (this.label === "Na" && i === 2) {
            if (red(e.col) === 0 && green(e.col) === 150 && blue(e.col) === 255) {
              let dynamicSpeed = lerp(0.02, 0.005, moveProgress);
              e.angle += dynamicSpeed;
              angle = e.angle;
            } else {
              e.angle += 0.005;
              angle = e.angle;
            }
          }
          else if (this.label === "Cl" && i === 2) {
            if (state === "rearranging") {
              if (red(e.col) === 0 && green(e.col) === 255 && blue(e.col) === 0) {
                angle = lerp(e.initialAngle, e.targetAngle, rearrangeProgress);
              } else {
                angle = lerp(e.initialAngle, e.targetAngle, easeOutElastic(rearrangeProgress));
              }
            } else {
              e.angle += 0.005;
              angle = e.angle;
            }
          }
          else {
            e.angle += (this.label === "Na" ? 0.01 : 0.005);
            angle = e.angle;
          }
          let ex = cos(angle) * this.shellRadii[i];
          let ey = sin(angle) * this.shellRadii[i];
          push();
          translate(ex, ey, 0);
          if (this.label === "Cl" && i === 2 && (state === "rearranging" || state === "done")) {
            drawingContext.filter = "blur(4px)";
          }
          fill(e.col);
          sphere(6);
          drawingContext.filter = "none";
          pop();
          
          push();
          fill(255);
          textSize(10);
          translate(ex, ey-10, 0);
          text("-", 0, 0);
          pop();
        }
      }
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  perspective(PI / 3, windowWidth/windowHeight, 0.1, 2000);
  positionButtons();
}
