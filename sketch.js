// Ionic Bond Simulation Na-Cl 3D
// Author: Gemini (modified from GPT-5)
// Updated by hoahochoahoc915 & Copilot:
// - Spheres (shell overlays) are opaque (non-transparent).
// - "+" and "-" charge labels moved up by 10px and font size reduced.
// - "Na" and "Cl" labels moved down by 10px.
// - Reset button fully restores initial system state (positions, UI toggles, translate/camera drag state, animation progress).
// - All buttons now have consistent hover, pressed, and released effects.
// - Buttons rearranged to place "Reset" above "Instructions" at the bottom of the list.
// - The speed of electron rotation has been reduced for a slower, more graceful animation.
// - The rearrangement effect of the electrons has been slowed down and uses a smoother easing function.
// - The rearrangement effect now smoothly moves the existing electrons to their new positions instead of "flickering" to a new state.

let fontRegular;
let playButton, resetButton, instructionsButton, toggleSphereButton, toggleLabelButton;
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
    toggleSphereButton.position(20, 60);
    toggleLabelButton.position(20, 100);
    resetButton.position(20, 140);
    instructionsButton.position(20, 180);
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

    if (toggleSphereButton) {
        toggleSphereButton.html("Bật lớp cầu");
        toggleSphereButton.style("background", "linear-gradient(145deg, #6a82fb, #fc5c7d)");
    }
    if (toggleLabelButton) {
        toggleLabelButton.html("Tắt nhãn");
        toggleLabelButton.style("background", "linear-gradient(145deg, #6a82fb, #fc5c7d)");
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

    ambientLight(80);
    pointLight(255, 255, 255, 0, 0, 800);

    if (showSphere) {
        drawSpheres();
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
                
                // Thay thế hiệu ứng "tắt và bật" bằng cách tạo một mảng mới
                // và gán các thuộc tính cần thiết để các electron hiện có
                // và electron mới di chuyển mượt mà đến vị trí cuối cùng.
                let newShell = [];
                // Thêm các electron cũ của Cl
                for(let i = 0; i < atoms[1].shells[2].length; i++) {
                     newShell.push({
                        angle: atoms[1].shells[2][i].angle,
                        col: color(0, 255, 0),
                        initialAngle: atoms[1].shells[2][i].angle,
                        targetAngle: 0, // Sẽ được tính lại trong prepareRearrangement
                    });
                }
                // Thêm electron mới từ Na
                newShell.push({
                    angle: transferredAngle,
                    col: transferringElectron.col,
                    initialAngle: transferredAngle,
                    targetAngle: 0, // Sẽ được tính lại trong prepareRearrangement
                });

                atoms[1].shells[2] = newShell;

                prepareRearrangement();
                state = "rearranging";
                rearrangeProgress = 0;
            }
        } else if (state === "rearranging") {
            // Tốc độ sắp xếp lại đã được giảm để chuyển động mượt mà hơn
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

    if (showParticles) {
        for (let atom of atoms) {
            push();
            translate(atom.pos.x, atom.pos.y - 30, 0);
            fill(255);
            textSize(18);
            if (atom.label === "Na") text("+11", 0, 0);
            else if (atom.label === "Cl") text("+17", 0, 0);
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

function drawSpheres() {
    for (let atom of atoms) {
        if (atom.shellRadii.length > 0) {
            push();
            translate(atom.pos.x, atom.pos.y, 0);
            noStroke();
            fill(atom.electronColor);
            let outermostRadius = atom.shellRadii[atom.shellRadii.length - 1];
            sphere(outermostRadius);
            pop();
        }
    }
}

function prepareRearrangement() {
    let shell = atoms[1].shells[2];
    let total = shell.length;
    let spacing = TWO_PI / total;
    // Gán góc mục tiêu cho từng electron
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
        sphere(20);
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
                        if (this.label === "Na" && i === 2) {
                            if (state !== "transferring" && state !== "rearranging" && state !== "done") {
                                // Tốc độ đã được giảm
                                let dynamicSpeed = lerp(0.02, 0.005, moveProgress);
                                e.angle += dynamicSpeed;
                                angle = e.angle;
                            } else {
                                angle = e.angle;
                            }
                        } else if (this.label === "Cl" && i === 2) {
                            if (state === "rearranging") {
                                // Electron được chuyển từ Na
                                let t = easeOutElastic(rearrangeProgress);
                                e.angle = lerp(e.initialAngle, e.targetAngle, t);
                                angle = e.angle;
                            } else {
                                // Tốc độ đã được giảm
                                e.angle += 0.015;
                                angle = e.angle;
                            }
                        } else {
                            // Tốc độ đã được giảm
                            e.angle += this.label === "Na" ? 0.015 : 0.010;
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
