let fontRegular;
let playButton, resetButton, instructionsButton, toggleSphereButton, toggleLabelButton, toggleRotationButton;
let titleDiv, footerDiv, instructionsDiv, instructionsCloseButton;
let atoms = [];
let state = "idle"; // idle, moving, transferring, rearranging, done
let transferProgress = 0;
let moveProgress = 0;
let rearrangeProgress = 0; // for rearrangement of Cl shell electrons
let transferringElectron; // the blue electron that is transferred
let showSphere = false; // toggle for sphere overlay
let showParticles = true; // toggle to show electron particles / shells
let showLabels = true; // toggle to show Na/Cl labels
let isElectronRotationOn = true; // Toggle for electron rotation

// nucleus radius used in Atom.show() (sphere size)
const NUCLEUS_RADIUS = 24;

// label offset and rotation parameters (adjustable)
const LABEL_OFFSET_EXTRA = 1.0; // distance from nucleus surface toward viewer (NUCLEUS_RADIUS + this)
const LABEL_ROTATION_MAG = 0.09; // reduced tilt so labels are less inclined toward each other
const ORBIT_RADIUS = 5; // fixed lateral offset for labels

// Parameters for movement distances (in pixels)
let initialDistance = 400;
// finalDistance computed so that the third shells of Na and Cl are nearly touching.
// third shell radius = 50 + 2*40 = 130. So finalDistance = 2*130 + 20 = 280.
let finalDistance = 2 * 130 + 20; // (2 * thirdShellRadius + margin)

// Global variables for drag and drop functionality
let translateX = 0;
let translateY = 0;
let isDragging = false;
let initialMouseX = 0;
let initialMouseY = 0;

function preload() {
    // Tải phông chữ trước khi setup() được gọi
    // Giả sử tệp "Arial.ttf" nằm trong thư mục gốc của dự án
    fontRegular = loadFont('Arial.ttf');
}

function setup() {
    createCanvas(windowWidth, windowHeight, WEBGL);

    // Khắc phục lỗi: Gọi perspective() sau khi canvas được tạo ở chế độ WEBGL
    if (getGraphicsMode() === WEBGL) {
        perspective(PI / 3, width / height, 0.1, 2000);
    }

    smooth();
    // Thiết lập phông chữ đã tải cho toàn bộ văn bản
    textFont(fontRegular);
    textAlign(CENTER, CENTER);
    noStroke();

    // Create fixed HTML UI for title and footer.
    titleDiv = createDiv("MÔ PHỎNG LIÊN KẾT ION GIỮA Na và Cl");
    titleDiv.style("position", "absolute");
    titleDiv.style("top", "10px");
    titleDiv.style("width", "100%");
    titleDiv.style("text-align", "center");
    titleDiv.style("font-size", "18px");
    titleDiv.style("color", "#fff");
    titleDiv.style("text-shadow", "2px 2px 5px rgba(0,0,0,0.7)");

    footerDiv = createDiv("© HÓA HỌC ABC");
    footerDiv.style("position", "absolute");
    footerDiv.style("bottom", "10px");
    footerDiv.style("width", "100%");
    footerDiv.style("text-align", "center");
    footerDiv.style("font-size", "16px");
    footerDiv.style("color", "#fff");
    footerDiv.style("text-shadow", "2px 2px 5px rgba(0,0,0,0.7)");

    // Create atoms (initial positions)
    atoms.push(new Atom(-200, 0, "Na", 11, [2, 8, 1], color(0, 150, 255)));
    atoms.push(new Atom(200, 0, "Cl", 17, [2, 8, 7], color(0, 255, 0)));

    createUI();
}

function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function easeOutElastic(t) {
    const c4 = (2 * PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : pow(2, -10 * t) * sin((t * 10 - 0.75) * c4) + 1;
}

function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
}

function createUI() {
    const commonButtonColor = "linear-gradient(145deg, #6a82fb, #fc5c7d)";
    const commonHoverColor = "linear-gradient(145deg, #667eea, #764ba2)";

    playButton = createButton("▶ Play");
    styleCommonButton(playButton, commonButtonColor);
    applyButtonEffects(playButton, commonButtonColor, commonHoverColor);
    playButton.mousePressed(() => {
        if (state === "idle") {
            state = "moving";
        }
    });

    // NEW: Nút Bật/Tắt quay electron
    toggleRotationButton = createButton("Tắt quay electron");
    styleCommonButton(toggleRotationButton, commonButtonColor);
    applyButtonEffects(toggleRotationButton, commonButtonColor, commonHoverColor);
    toggleRotationButton.mousePressed(() => {
        isElectronRotationOn = !isElectronRotationOn;
        if (isElectronRotationOn) {
            toggleRotationButton.html("Tắt quay electron");
            toggleRotationButton.style("background", "linear-gradient(145deg, #6a82fb, #fc5c7d)");
        } else {
            toggleRotationButton.html("Bật quay electron");
            toggleRotationButton.style("background", "linear-gradient(145deg, #4CAF50, #8BC34A)");
        }
    });

    toggleSphereButton = createButton("Bật lớp cầu");
    styleCommonButton(toggleSphereButton, commonButtonColor);
    applyButtonEffects(toggleSphereButton, commonButtonColor, commonHoverColor);
    toggleSphereButton.mousePressed(() => {
        showSphere = !showSphere;
        showParticles = !showSphere;
        if (showSphere) {
            toggleSphereButton.html("Tắt lớp cầu");
            toggleSphereButton.style("background", "linear-gradient(145deg, #4CAF50, #8BC34A)");
        } else {
            toggleSphereButton.html("Bật lớp cầu");
            toggleSphereButton.style("background", "linear-gradient(145deg, #6a82fb, #fc5c7d)");
        }
    });

    toggleLabelButton = createButton("Tắt nhãn");
    styleCommonButton(toggleLabelButton, commonButtonColor);
    applyButtonEffects(toggleLabelButton, commonButtonColor, commonHoverColor);
    toggleLabelButton.mousePressed(() => {
        showLabels = !showLabels;
        if (showLabels) {
            toggleLabelButton.html("Tắt nhãn");
            toggleLabelButton.style("background", "linear-gradient(145deg, #6a82fb, #fc5c7d)");
        } else {
            toggleLabelButton.html("Bật nhãn");
            toggleLabelButton.style("background", "linear-gradient(145deg, #4CAF50, #8BC34A)");
        }
    });

    resetButton = createButton("↺ Reset");
    styleCommonButton(resetButton, commonButtonColor);
    applyButtonEffects(resetButton, commonButtonColor, commonHoverColor);
    resetButton.mousePressed(() => {
        resetSimulation();
    });

    instructionsButton = createButton("Hướng dẫn");
    const instructionsButtonColor = "transparent";
    const instructionsHoverColor = "rgba(255,255,255,0.2)";
    styleInstructionsButton(instructionsButton);
    applyButtonEffects(instructionsButton, instructionsButtonColor, instructionsHoverColor);
    instructionsButton.mousePressed(() => {
        if (instructionsDiv) {
            if (instructionsDiv.style("display") === "none") {
                instructionsDiv.style("display", "block");
            } else {
                instructionsDiv.style("display", "none");
            }
        }
    });

    instructionsDiv = createDiv("<b>Hướng dẫn điều khiển:</b><br/> - Sử dụng chuột phải để xoay.<br/> - Sử dụng chuột giữa (con lăn) để phóng to/thu nhỏ.<br/> - Nhấn giữ <b>Ctrl + Chuột trái</b> để di chuyển toàn bộ hệ thống.");
    instructionsDiv.style("position", "absolute");
    instructionsDiv.style("left", "50%");
    instructionsDiv.style("top", "50%");
    instructionsDiv.style("transform", "translate(-50%, -50%)");
    instructionsDiv.style("background-color", "rgba(0, 0, 0, 0.8)");
    instructionsDiv.style("border", "1px solid #fff");
    instructionsDiv.style("border-radius", "8px");
    instructionsDiv.style("padding", "20px");
    instructionsDiv.style("color", "#fff");
    instructionsDiv.style("font-size", "14px");
    instructionsDiv.style("text-align", "left");
    instructionsDiv.style("z-index", "1000");
    instructionsDiv.style("display", "none");

    instructionsCloseButton = createButton("x");
    instructionsCloseButton.parent(instructionsDiv);
    instructionsCloseButton.style("position", "absolute");
    instructionsCloseButton.style("right", "10px");
    instructionsCloseButton.style("top", "10px");
    instructionsCloseButton.style("width", "25px");
    instructionsCloseButton.style("height", "25px");
    instructionsCloseButton.style("background", "transparent");
    instructionsCloseButton.style("border", "none");
    instructionsCloseButton.style("color", "#fff");
    instructionsCloseButton.style("font-size", "16px");
    instructionsCloseButton.style("font-weight", "bold");
    instructionsCloseButton.style("cursor", "pointer");
    instructionsCloseButton.style("transition", "color 0.2s ease-in-out");
    instructionsCloseButton.mouseOver(() => instructionsCloseButton.style("color", "#ff0000"));
    instructionsCloseButton.mouseOut(() => instructionsCloseButton.style("color", "#fff"));
    instructionsCloseButton.mousePressed(() => instructionsDiv.style("display", "none"));

    positionButtons();
}

function applyButtonEffects(btn, normalColor, hoverColor) {
    btn.mouseOver(() => {
        btn.style("background", hoverColor);
        btn.style("transform", "scale(1.05)");
    });
    btn.mouseOut(() => {
        btn.style("background", normalColor);
        btn.style("transform", "scale(1)");
    });
    btn.mousePressed(() => {
        btn.style("box-shadow", "inset 2px 2px 4px rgba(0,0,0,0.6)");
        btn.style("transform", "scale(0.95)");
    });
    btn.mouseReleased(() => {
        btn.style("box-shadow", "2px 2px 4px rgba(0,0,0,0.6)");
        btn.style("transform", "scale(1)");
    });
}

function styleCommonButton(btn, color) {
    btn.style("width", "120px");
    btn.style("height", "30px");
    btn.style("padding", "0px");
    btn.style("font-size", "12px");
    btn.style("border", "none");
    btn.style("border-radius", "6px");
    btn.style("background", color);
    btn.style("color", "#fff");
    btn.style("cursor", "pointer");
    btn.style("box-shadow", "2px 2px 4px rgba(0,0,0,0.6)");
    btn.style("transition", "all 0.2s ease-in-out");
}

function styleInstructionsButton(btn) {
    btn.style("width", "120px");
    btn.style("height", "30px");
    btn.style("padding", "0px");
    btn.style("font-size", "12px");
    btn.style("background", "transparent");
    btn.style("border", "1px solid #fff");
    btn.style("border-radius", "6px");
    btn.style("color", "#fff");
    btn.style("cursor", "pointer");
    btn.style("box-shadow", "2px 2px 4px rgba(0,0,0,0.6)");
    btn.style("transition", "all 0.2s ease-in-out");
}

function positionButtons() {
    playButton.position(20, 20);
    toggleRotationButton.position(20, 60);
    toggleSphereButton.position(20, 100);
    toggleLabelButton.position(20, 140);
    resetButton.position(20, 180);
    instructionsButton.position(20, 220);
}

function resetSimulation() {
    atoms = [];
    atoms.push(new Atom(-200, 0, "Na", 11, [2, 8, 1], color(0, 150, 255)));
    atoms.push(new Atom(200, 0, "Cl", 17, [2, 8, 7], color(0, 255, 0)));

    state = "idle";
    transferProgress = 0;
    moveProgress = 0;
    rearrangeProgress = 0;
    transferringElectron = undefined;

    translateX = 0;
    translateY = 0;
    isDragging = false;
    initialMouseX = 0;
    initialMouseY = 0;

    showSphere = false;
    showParticles = true;
    showLabels = true;
    isElectronRotationOn = true;

    if (toggleSphereButton) {
        toggleSphereButton.html("Bật lớp cầu");
        toggleSphereButton.style("background", "linear-gradient(145deg, #6a82fb, #fc5c7d)");
    }
    if (toggleLabelButton) {
        toggleLabelButton.html("Tắt nhãn");
        toggleLabelButton.style("background", "linear-gradient(145deg, #6a82fb, #fc5c7d)");
    }
    if (toggleRotationButton) {
        toggleRotationButton.html("Tắt quay electron");
        toggleRotationButton.style("background", "linear-gradient(145deg, #6a82fb, #fc5c7d)");
    }
    
    try {
        if (getGraphicsMode() === WEBGL) {
            camera();
        }
    } catch (e) {
    }

    if (instructionsDiv) {
        instructionsDiv.style("display", "none");
    }
}

function draw() {
    background(0);

    if (isDragging) {
        let dx = mouseX - initialMouseX;
        let dy = mouseY - initialMouseY;
        translateX += dx;
        translateY += dy;
        initialMouseX = mouseX;
        initialMouseY = mouseY;
    } else if (!keyIsDown(CONTROL)) {
        orbitControl();
    }

    translate(translateX, translateY, 0);

    // If sphere overlay is on, drawSpheres() will set moving directional lights + ambient.
    // If sphere overlay is off, use ambient + the same two moving directional lights (no fixed lights).
    if (showSphere) {
        drawSpheres();
    } else {
        // Increase ambient so objects remain visible without fixed lights (slightly brighter than before)
        ambientLight(200);

        // Two moving directional lights (dynamic highlights) — increased brightness a bit
        let a1 = frameCount * 0.010;
        let l1x = cos(a1) * 400;
        let l1y = sin(a1) * 240;
        directionalLight(190, 190, 190, l1x, l1y, -0.3);

        // Light 2 (faster, tighter orbit, different phase) — increased a bit
        let a2 = frameCount * 0.018 + PI / 3;
        let l2x = cos(a2) * 220;
        let l2y = sin(a2) * 160;
        directionalLight(150, 150, 150, -l2x, -l2y, 0.2);

        // NOTE: Removed fixed directional lights; only two moving directional lights + ambient
    }

    // Draw the flickering cylinder only when the state is "done" or "rearranging"
    if ((state === "done" || state === "rearranging") && showSphere) {
        drawConnectingCylinder();
    }

    if (showParticles) {
        if (state === "moving") {
            moveProgress += 0.010;
            if (moveProgress > 1) moveProgress = 1;
            let t = easeInOutQuad(moveProgress);
            let currentDist = lerp(initialDistance, finalDistance, t);
            atoms[0].pos.x = -currentDist / 2;
            atoms[1].pos.x = currentDist / 2;

            if (moveProgress >= 1 && atoms[0].shells[2].length > 0) {
                if (cos(atoms[0].shells[2][0].angle) > 0.99) {
                    transferringElectron = atoms[0].shells[2][0];
                    atoms[0].shells[2] = [];
                    atoms[0].shellRadii.pop();
                    state = "transferring";
                }
            }
        } else if (state === "transferring") {
            transferProgress += 0.040;
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
                
                // Replace "flicker on and off" effect by creating a new array
                // and assigning the necessary properties so that the existing and new electrons
                // move smoothly to their new positions.
                let newShell = [];
                // Add the old Cl electrons
                for(let i = 0; i < atoms[1].shells[2].length; i++) {
                    newShell.push({
                        angle: atoms[1].shells[2][i].angle,
                        col: color(0, 255, 0),
                        initialAngle: atoms[1].shells[2][i].angle,
                        targetAngle: 0, // Will be recalculated in prepareRearrangement
                    });
                }
                // Add the new electron from Na
                newShell.push({
                    angle: transferredAngle,
                    col: transferringElectron.col,
                    initialAngle: transferredAngle,
                    targetAngle: 0, // Will be recalculated in prepareRearrangement
                });

                atoms[1].shells[2] = newShell;

                prepareRearrangement();
                state = "rearranging";
                rearrangeProgress = 0;
            }
        } else if (state === "rearranging") {
            // Rearrangement speed has been reduced for smoother movement
            rearrangeProgress += 0.015;
            if (rearrangeProgress > 1) rearrangeProgress = 1;
            let shell = atoms[1].shells[2];
            for (let e of shell) {
                let t = easeInOutCubic(rearrangeProgress);
                e.angle = lerp(e.initialAngle, e.targetAngle, t);
            }
            if (rearrangeProgress >= 1) {
                for (let e of shell) {
                    e.angle = e.targetAngle;
                    e.initialAngle = e.targetAngle;
                }
                state = "done";
            }
        }
    }

    for (let atom of atoms) {
        push();
        translate(atom.pos.x, atom.pos.y, 0);
        atom.show(showParticles);
        pop();
    }

    // Draw nucleus labels inside the canvas (3D text), placed at nucleus center
    // and offset toward the viewer by NUCLEUS_RADIUS + LABEL_OFFSET_EXTRA.
    if (showParticles && showLabels) {
        // fixed lateral offset (no oscillation) to bring labels closer together
        let offset = ORBIT_RADIUS;

        // +11 for Na (atoms[0]) rotated to the right (positive rotateY) and translated right by offset
        if (atoms[0]) {
            push();
            translate(atoms[0].pos.x + offset, atoms[0].pos.y, NUCLEUS_RADIUS + LABEL_OFFSET_EXTRA);
            rotateY(LABEL_ROTATION_MAG);
            fill(255);
            textSize(18);
            text("+11", 0, 0);
            pop();
        }

        // +17 for Cl (atoms[1]) rotated to the left (negative rotateY) and translated left by offset
        if (atoms[1]) {
            push();
            translate(atoms[1].pos.x - offset, atoms[1].pos.y, NUCLEUS_RADIUS + LABEL_OFFSET_EXTRA);
            rotateY(-LABEL_ROTATION_MAG);
            fill(255);
            textSize(18);
            text("+17", 0, 0);
            pop();
        }
    }

    const chargeVerticalExtraUp = 10;
    if (state === "done" || state === "rearranging") {
        let lastRadiusNa = atoms[0].shellRadii[atoms[0].shellRadii.length - 1] || 60;
        push();
        translate(atoms[0].pos.x, atoms[0].pos.y - (lastRadiusNa + 25 + chargeVerticalExtraUp), 0);
        fill(255);
        textSize(40);
        text("+", 0, 0);
        pop();

        let lastRadiusCl = atoms[1].shellRadii[atoms[1].shellRadii.length - 1] || 60;
        push();
        translate(atoms[1].pos.x, atoms[1].pos.y - (lastRadiusCl + 25 + chargeVerticalExtraUp), 0);
        fill(255);
        textSize(40);
        text("-", 0, 0);
        pop();
    }

    const labelVerticalExtraDown = 10;
    if (showLabels) {
        for (let atom of atoms) {
            push();
            fill(255);
            textSize(25);
            let outermostRadius = atom.shellRadii[atom.shellRadii.length - 1] || 0;
            translate(atom.pos.x, atom.pos.y + outermostRadius + 20 + labelVerticalExtraDown, 0);
            text(atom.label, 0, 0);
            pop();
        }
    }
}

// drawSpheres now renders the sphere overlays and materials.
// Two moving directional lights create dynamic highlights; no fixed lights remain.
// Intensities slightly raised for a bit more brightness as requested.
function drawSpheres() {
    // slightly stronger ambient (a bit brighter than previous)
    ambientLight(120);

    // TWO MOVING LIGHTS:
    // Light A: slower, wider orbit (soft fill) — raised intensity
    let aA = frameCount * 0.010;
    let LAx = cos(aA) * 380;
    let LAy = sin(aA) * 240;
    directionalLight(180, 180, 180, LAx, LAy, -0.25);

    // Light B: faster, tighter orbit and different phase (secondary fill) — raised a bit
    let aB = frameCount * 0.018 + PI / 4;
    let LBx = cos(aB) * 210;
    let LBy = sin(aB) * 170;
    directionalLight(130, 130, 130, -LBx, -LBy, 0.2);

    for (let atom of atoms) {
        if (atom.shellRadii.length > 0) {
            push();
            translate(atom.pos.x, atom.pos.y, 0);
            noStroke();
            // Slightly higher shininess so highlights from moving lights are visible
            shininess(85);

            // preserve the existing color of the sphere (atom.electronColor)
            const r = red(atom.electronColor);
            const g = green(atom.electronColor);
            const b = blue(atom.electronColor);

            ambientMaterial(r, g, b);
            // Make specular slightly brighter than base color for clearer highlights
            specularMaterial(min(255, r + 45), min(255, g + 45), min(255, b + 45));

            let outermostRadius = atom.shellRadii[atom.shellRadii.length - 1];
            // higher detail for smoother shading
            sphere(outermostRadius, 64, 64);
            pop();
        }
    }
}

// Function to draw the connecting cylinder with correct orientation
function drawConnectingCylinder() {
    // Make cylinder flicker
    if (frameCount % 5 === 0) {
      return;
    }

    let posA = atoms[0].pos;
    let posB = atoms[1].pos;

    // Calculate the vector from A to B
    let vec = p5.Vector.sub(posB, posA);
    let len = vec.mag();
    let midPoint = p5.Vector.add(posA, p5.Vector.mult(vec, 0.5));

    push();
    translate(midPoint.x, midPoint.y, midPoint.z);

    // Orient the cylinder to point along the vector from A to B
    // The default cylinder is oriented along the Y-axis. We need to find the rotation to align it with the vector.
    // This requires a more complex rotation setup to handle all 3 dimensions.
    // A simpler way is to find the angle of the vector relative to the X-axis and rotate the Z-axis.
    let angle = vec.heading();
    rotateZ(angle - HALF_PI);
    
    noStroke();
    // Set a semi-transparent white color for the cylinder
    // Increased alpha to make the cylinder slightly less transparent (more visible) while still translucent.
    fill(255, 255, 255, 120); // White with 120 alpha (less transparent than before)
    cylinder(40, len); // Cylinder with radius 40 and length 'len'
    pop();
}

function prepareRearrangement() {
    let shell = atoms[1].shells[2];
    let total = shell.length;
    let spacing = TWO_PI / total;
    // Assign a target angle for each electron
    for (let i = 0; i < total; i++) {
        shell[i].targetAngle = (TWO_PI / total) * i;
        if(shell[i].col.toString() === atoms[0].electronColor.toString()) {
            shell[i].initialAngle = shell[i].angle;
        } else {
            shell[i].initialAngle = shell[i].angle;
        }
    }
}

function drawSmoothCircle(radius) {
    let numPoints = 200;
    beginShape();
    for (let i = 0; i < numPoints; i++) {
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
        this.electronColor = electronCol;
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
                    targetAngle: (TWO_PI / shellCounts[i]) * j,
                });
            }
            this.shells.push(shellElectrons);
        }
    }

    show(showParticles) {
        push();
        fill(255, 0, 0);
        sphere(NUCLEUS_RADIUS);
        pop();

        if (showParticles) {
            for (let i = 0; i < this.shells.length; i++) {
                if (this.shells[i].length > 0) {
                    noFill();
                    stroke(255);
                    strokeWeight(1);
                    drawSmoothCircle(this.shellRadii[i]);
                    noStroke();
                    for (let e of this.shells[i]) {
                        let angle;
                        // Update angle only if isElectronRotationOn is true
                        if (isElectronRotationOn) {
                            if (this.label === "Na" && i === 2) {
                                // Use a constant speed for the outer Na electron while moving
                                // so it doesn't slow down as atoms approach each other.
                                if (state !== "transferring" && state !== "rearranging" && state !== "done") {
                                    const dynamicSpeed = 0.03; // constant speed
                                    e.angle += dynamicSpeed;
                                }
                            } else if (this.label === "Cl" && i === 2) {
                                if (state === "rearranging") {
                                    // Transferred electron from Na
                                    let t = easeOutElastic(rearrangeProgress);
                                    e.angle = lerp(e.initialAngle, e.targetAngle, t);
                                } else {
                                    // Speed has been increased
                                    e.angle += 0.02;
                                }
                            } else {
                                // Speed has been increased
                                e.angle += this.label === "Na" ? 0.02 : 0.015;
                            }
                        }
                        angle = e.angle;
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
                        translate(ex, ey - 10, 0);
                        text("-", 0, 0);
                        pop();
                    }
                }
            }
        }
    }
}

function mousePressed() {
    if (keyIsDown(CONTROL) && mouseButton === LEFT) {
        isDragging = true;
        initialMouseX = mouseX;
        initialMouseY = mouseY;
    }
}

function mouseReleased() {
    isDragging = false;
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    if (getGraphicsMode() === WEBGL) {
        perspective(PI / 3, windowWidth / windowHeight, 0.1, 2000);
    }
    positionButtons();
}

function getGraphicsMode() {
    if (this._renderer.isP3D) {
        return WEBGL;
    }
    return P2D;
}