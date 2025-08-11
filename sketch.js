// Ionic Bond Simulation Na-Cl 3D
// Author: GPT-5

let fontRegular; // Khai báo biến toàn cục để chứa phông chữ đã tải
let playButton, resetButton;
let titleDiv, footerDiv;
let atoms = [];
let state = "idle"; // idle, animating, transferring, rearranging, done
let progress = 0; // The single progress variable for the atom movement (0 to 1)
let transferProgress = 0; // New progress variable for the electron transfer phase
let rearrangeProgress = 0; // for rearrangement of Cl shell electrons
let transferringElectron; // the blue electron that is transferred
let electronReadyForTransfer = false; // New state variable to control when the electron starts moving

// Variables for panning the canvas
let panX = 0;
let panY = 0;

// Parameters for movement distances (in pixels)
let initialDistance = 400;
// Cập nhật khoảng cách cuối cùng để nó là khoảng cách giữa các lớp vỏ electron ngoài cùng
// Bán kính lớp vỏ ngoài cùng của Na và Cl đều là 130px.
// Khoảng cách từ tâm đến tâm = 130 + 20 + 130 = 280
let finalDistance = 280; 
let thirdShellRadiusNa = 50 + 2 * 40;
let thirdShellRadiusCl = 50 + 2 * 40;

// Bezier curve control points for electron transfer
let startPos, endPos, controlPoint1, controlPoint2;

function preload() {
  // Tải một phông chữ đáng tin cậy từ Google Fonts CDN
  fontRegular = loadFont('https://fonts.gstatic.com/s/opensans/v27/mem8YaGs126MiZpBA-UFVZ0e.ttf');
}

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  // Cập nhật giá trị 'far' của perspective để giảm hiệu ứng "dẹt" khi phóng to
  perspective(PI / 3, width / height, 0.1, 4000); 
  
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

function easeOutCubic(t) {
  let t1 = t - 1;
  return t1 * t1 * t1 + 1;
}

function createUI() {
  playButton = createButton("▶ Play");
  styleButton(playButton);
  playButton.mousePressed(() => {
    playButton.style("box-shadow", "inset 2px 2px 4px rgba(0,0,0,0.6)");
    playButton.style("transform", "scale(0.95)");
    if (state === "idle") {
      state = "animating";
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
  progress = 0;
  transferProgress = 0;
  rearrangeProgress = 0;
  transferringElectron = undefined;
  electronReadyForTransfer = false; // Reset the new state variable
  panX = 0; // Reset pan
  panY = 0; // Reset pan
}

function draw() {
  background(0);
  
  // New pan functionality: Ctrl + left click to move the canvas
  if (keyIsDown(17) && mouseIsPressed) { // 17 is the keycode for Ctrl
    panX += (mouseX - pmouseX);
    panY += (mouseY - pmouseY);
  } else {
    // Normal orbit control
    orbitControl(); 
  }

  // Apply the pan offset to the entire scene
  translate(panX, panY);
  
  ambientLight(80);
  pointLight(255,255,255,0,0,300);
  
  if (state === "animating") {
    progress += 0.005;
    if (progress > 1) {
      progress = 1;
      // Atom movement is complete. Start electron transfer.
      state = "transferring";
      transferProgress = 0;
      // Now, the electron won't start transferring immediately. It will wait until its angle is right.
      transferringElectron = atoms[0].shells[2][0];
    }
    
    // Atom movement
    let t_move = easeInOutQuad(progress);
    let currentDist = lerp(initialDistance, finalDistance, t_move);
    atoms[0].pos.x = -currentDist / 2;
    atoms[1].pos.x = currentDist / 2;
  }
  else if (state === "transferring") {
    // Stage 1: Wait for the electron to be in the right position
    if (!electronReadyForTransfer) {
      // Keep the electron orbiting at a fixed speed
      transferringElectron.angle += 0.02;
      
      // Check if the electron is at the "3 o'clock" position (angle ~0 or TWO_PI)
      // This is the closest point to the Chlorine atom
      let currentAngle = transferringElectron.angle % TWO_PI;
      if (currentAngle < 0) currentAngle += TWO_PI; // Ensure positive angle
      let angleTolerance = 0.05; // 3 degrees tolerance
      if (currentAngle < angleTolerance || currentAngle > TWO_PI - angleTolerance) {
        electronReadyForTransfer = true;
        // The electron is ready, now set up the transfer path
        let angle = transferringElectron.angle;
        startPos = createVector(cos(angle) * atoms[0].shellRadii[2], sin(angle) * atoms[0].shellRadii[2]);
        startPos.add(atoms[0].pos);
  
        // Vị trí cuối cùng là trên đường thẳng nối tâm hai nguyên tử
        endPos = createVector(atoms[1].pos.x - thirdShellRadiusCl, atoms[1].pos.y, atoms[1].pos.z);
  
        // Tạo các điểm điều khiển để đường đi thẳng theo phương ngang
        // Hai điểm điều khiển có cùng tọa độ y với startPos và endPos
        controlPoint1 = createVector(p5.Vector.lerp(startPos, endPos, 0.3).x, startPos.y, 0);
        controlPoint2 = createVector(p5.Vector.lerp(startPos, endPos, 0.7).x, endPos.y, 0);
        
        // Remove the electron from Na's shell so it's only drawn in its new path
        atoms[0].shells[2] = [];
      }
    }
    // Stage 2: Animate the electron transfer
    else {
      transferProgress += 0.01;
      if (transferProgress > 1) {
        transferProgress = 1;
        // Electron transfer is complete. Now rearrange.
        let v = p5.Vector.sub(transferringElectron.pos, atoms[1].pos);
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
      
      // Electron transfer
      let t_transfer = easeOutCubic(transferProgress);
      
      let mid = createVector(
          bezierPoint(startPos.x, controlPoint1.x, controlPoint2.x, endPos.x, t_transfer),
          bezierPoint(startPos.y, controlPoint1.y, controlPoint2.y, endPos.y, t_transfer),
          bezierPoint(startPos.z, controlPoint1.z, controlPoint2.z, endPos.z, t_transfer)
      );
  
      transferringElectron.pos = mid;
    
      // Hiệu ứng vệt sáng
      drawingContext.shadowBlur = lerp(0, 10, t_transfer);
      drawingContext.shadowColor = color(0, 150, 255);
      
      push();
      translate(mid.x, mid.y, 0);
      fill(transferringElectron.col);
      sphere(6);
      pop();
      
      drawingContext.shadowBlur = 0; // Reset shadow
    }
  }
  else if (state === "rearranging") {
    rearrangeProgress += 0.01;
    if (rearrangeProgress > 1) rearrangeProgress = 1;
    let shell = atoms[1].shells[2];
    for (let i = 0; i < shell.length; i++) {
        let e = shell[i];
        let t = easeOutCubic(rearrangeProgress);
        // Chuyển động "va chạm" ban đầu
        if (rearrangeProgress < 0.5) {
          let pushFactor = sin(rearrangeProgress * PI * 2);
          let pushedAngle = lerp(e.initialAngle, e.initialAngle + pushFactor * 0.1, easeOutCubic(rearrangeProgress*2));
          e.angle = lerp(pushedAngle, e.targetAngle, t);
        } else {
           e.angle = lerp(e.initialAngle, e.targetAngle, t);
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
  
  // Also draw the transferring electron if it's in the waiting phase
  if (state === "transferring" && !electronReadyForTransfer) {
    push();
    translate(atoms[0].pos.x, atoms[0].pos.y, 0);
    let ex = cos(transferringElectron.angle) * atoms[0].shellRadii[2];
    let ey = sin(transferringElectron.angle) * atoms[0].shellRadii[2];
    push();
    translate(ex, ey, 0);
    fill(transferringElectron.col);
    sphere(6);
    pop();
    
    push();
    fill(255);
    textSize(14); // Tăng cỡ chữ của nhãn electron
    translate(ex, ey-10, 0);
    text("-", 0, 0);
    pop();
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
  let blueAngle = transferringElectron.angle;
  shell[0].initialAngle = blueAngle;
  shell[0].targetAngle = TWO_PI - PI/8; // Đặt vị trí cuối cùng
  let spacing = TWO_PI / total;
  for (let i = 1; i < total; i++) {
    shell[i].initialAngle = shell[i].angle;
    shell[i].targetAngle = (i * spacing) - PI/8;
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
            // Tốc độ quay giảm dần khi Na tiến lại gần Cl
            let dynamicSpeed = lerp(0.02, 0.005, progress);
            e.angle += dynamicSpeed;
            angle = e.angle;
          }
          else if (this.label === "Cl" && i === 2) {
            if (state === "rearranging") {
              angle = e.angle;
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
          textSize(14); // Tăng cỡ chữ của nhãn electron
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
  // Cập nhật perspective khi thay đổi kích thước cửa sổ
  perspective(PI / 3, windowWidth/windowHeight, 0.1, 4000);
  positionButtons();
}
