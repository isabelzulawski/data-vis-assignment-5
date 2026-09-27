// isabel zulawski data viz assignment 5

// store dataset, dropdown, and background img
let squirrels;
let furDropdown;
let parkMap;

// track zoom level, movement, and dragging state
let zoomLevel = 1;
let panX = 0;
let panY = 0;
let draggingMap = false;

// track whether the tour is  open and which panel is showing
let tourOpen = true;
let tourStep = 0;

// store panel's title
let tourTitles = [
  "Hello! Welcome to the squirrel map.",
  "Which squirrels approached people?",
  "Which squirrels ran from people?"
];

// store panel's description
let tourText = [
  "Hover for details about each squirrel interaction.",
  "Bright dots show squirrels approaching humans.",
  "Bright dots show squirrels running from humans."
];

// store panel's behavior
let tourBehaviors = [
  "",
  "Approaches",
  "Runs from"
];

async function setup() {
  createCanvas(600, 700);

  // create fur color dropdown
  furDropdown = createSelect();
  furDropdown.position(20, 45);
  furDropdown.option("All colors");
  furDropdown.option("Gray");
  furDropdown.option("Cinnamon");
  furDropdown.option("Black");
  furDropdown.option("Not recorded");

  // load the map and squirrel data
  parkMap = await loadImage("central-park-background.png");
  squirrels = await loadTable("squirrels.csv", ",", "header");

  print(squirrels.getRowCount());
}

function draw() {
  background(240);

  // title
  fill(40);
  noStroke();
  textSize(22);
  text("Central Park Squirrels", 20, 30);

  // wait until both files are loaded.
  if (!squirrels || !parkMap) {
    return;
  }

  let selectedFur = furDropdown.value();
  let hoveredSquirrel = findSquirrelAtMouse();

  push();

  // keep the map and dots inside this rectangle
  beginClip();
  rect(85, 70, 430, 590);
  endClip();

  // move and zoom the background and dots together
  translate(300 + panX, 365 + panY);
  scale(zoomLevel);
  translate(-300, -365);

  image(parkMap, 85, 70, 430, 590);

  // draw one dot for each matching observation
  for (let row of squirrels.getRows()) {
    let longitude = row.getNum("X");
    let latitude = row.getNum("Y");

    // match bounds to background map
    let x = map(longitude, -73.982, -73.949, 85, 515);
    let y = map(latitude, 40.764, 40.801, 660, 70);

    let dotOpacity = 180;
    let tourBehavior = tourBehaviors[tourStep];

    if (tourOpen && tourBehavior !== "") {
      let recorded = row.getString(tourBehavior);

      if (recorded.trim().toUpperCase() !== "TRUE") {
        dotOpacity = 25;
      }
    }
    let furColor = row.getString("Primary Fur Color");

    if (furColor === "") {
      furColor = "Not recorded";
    }

    // skip any squirrels that don't match the dropdown
    if (selectedFur !== "All colors" && furColor !== selectedFur) {
      continue;
    }

    if (furColor === "Gray") {
      fill(120, 130, 140, dotOpacity);
    } else if (furColor === "Cinnamon") {
      fill(190, 100, 45, dotOpacity);
    } else if (furColor === "Black") {
      fill(35, 35, 35, dotOpacity);
    } else {
      fill(150, 100, 170, dotOpacity);
    }
    circle(x, y, 4);
  }

  // stop zooming and clipping before drawing the hover box
  pop();

  if (hoveredSquirrel !== null && !draggingMap) {
    let age = hoveredSquirrel.getString("Age");
    let fur = hoveredSquirrel.getString("Primary Fur Color");

    if (age === "") {
      age = "Not recorded";
    }

    if (fur === "") {
      fur = "Not recorded";
    }

    // collect the behaviors marked TRUE in the CSV
    let behaviors = [];

    let behaviorColumns = [
      ["Running", "Running"],
      ["Chasing", "Chasing"],
      ["Climbing", "Climbing"],
      ["Eating", "Eating"],
      ["Foraging", "Foraging"],
      ["Approaches", "Approaching humans"],
      ["Indifferent", "Indifferent to humans"],
      ["Runs from", "Running from humans"]
    ];

    for (let behavior of behaviorColumns) {
      let columnName = behavior[0];
      let label = behavior[1];
      let recorded = hoveredSquirrel.getString(columnName);

      if (recorded.trim().toUpperCase() === "TRUE") {
        behaviors.push(label);
      }
    }

    if (behaviors.length === 0) {
      behaviors.push("None recorded in these fields");
    }

    // adjust the box height to fit the behaviors
    let boxWidth = 250;
    let boxHeight = 90 + behaviors.length * 20;

    let boxX = constrain(mouseX + 12, 0, width - boxWidth);
    let boxY = constrain(mouseY + 12, 0, height - boxHeight);

    fill(255);
    rect(boxX, boxY, boxWidth, boxHeight, 5);

    fill(30);
    textSize(14);
    text("Fur: " + fur, boxX + 10, boxY + 23);
    text("Age: " + age, boxX + 10, boxY + 45);
    text("Behaviors:", boxX + 10, boxY + 70);

    for (let i = 0; i < behaviors.length; i++) {
      text(behaviors[i], boxX + 10, boxY + 92 + i * 20);
    }
  }
  drawTour();
}

// find the closest visible squirrel to the mouse
function findSquirrelAtMouse() {
  if (!squirrels || !parkMap || !mouseOverMap()) {
    return null;
  }

  // account for both dragging and zooming
  let mapMouseX = (mouseX - 300 - panX) / zoomLevel + 300;
  let mapMouseY = (mouseY - 365 - panY) / zoomLevel + 365;

  let closestSquirrel = null;
  let closestDistance = 8 / zoomLevel;
  let selectedFur = furDropdown.value();

  for (let row of squirrels.getRows()) {
    let furColor = row.getString("Primary Fur Color");

    if (furColor === "") {
      furColor = "Not recorded";
    }

    // Hidden squirrels shouldn't trigger a hover box.
    if (selectedFur !== "All colors" && furColor !== selectedFur) {
      continue;
    }

    let x = map(row.getNum("X"), -73.982, -73.949, 85, 515);
    let y = map(row.getNum("Y"), 40.764, 40.801, 660, 70);

    let mouseDistance = dist(mapMouseX, mapMouseY, x, y);

    if (mouseDistance < closestDistance) {
      closestSquirrel = row;
      closestDistance = mouseDistance;
    }
  }

  return closestSquirrel;
}

// check whether the mouse is inside the map frame
function mouseOverMap() {
  return (
    mouseX >= 85 && mouseX <= 515 &&
    mouseY >= 70 && mouseY <= 660 &&
    !mouseOverTour()
  );
}

// prevent dragging beyond the background image's edges
function limitMapPan() {
  let maxPanX = (430 * (zoomLevel - 1)) / 2;
  let maxPanY = (590 * (zoomLevel - 1)) / 2;

  panX = constrain(panX, -maxPanX, maxPanX);
  panY = constrain(panY, -maxPanY, maxPanY);
}

function mousePressed() {
  draggingMap = mouseOverMap();
}

function mouseDragged() {
  if (draggingMap) {
    panX += mouseX - pmouseX;
    panY += mouseY - pmouseY;

    limitMapPan();
    return false;
  }
}

function mouseReleased() {
  draggingMap = false;
}

function mouseWheel(event) {
  if (mouseOverMap()) {
    if (event.delta > 0) {
      zoomLevel *= 0.9;
    } else if (event.delta < 0) {
      zoomLevel *= 1.1;
    }

    zoomLevel = constrain(zoomLevel, 1, 5);
    limitMapPan();

    // prevent the page from scrolling while zooming
    return false;
  }
}

function drawTour() {
  push();
  noStroke();
  textSize(14);

  // button to reopen the tour
  fill(255);
  rect(390, 38, 125, 27, 5);
  fill(30);
  text("Guided tour", 405, 57);

  if (tourOpen) {
    // popup background
    fill(255);
    stroke(160);
    rect(235, 90, 280, 195, 8);
    noStroke();

    fill(30);
    textSize(15);
    text(tourTitles[tourStep], 250, 105, 225, 45);

    textSize(14);
    text(tourText[tourStep], 250, 155, 245, 70);

    // close button and page indicator
    text("×", 490, 113);
    text((tourStep + 1) + " / 3", 360, 263);

    // show Back only after the first panel
    if (tourStep > 0) {
      fill(235);
      rect(250, 240, 80, 30, 5);

      fill(30);
      text("← Back", 260, 260);
    }

    // always show Next or Finish
    fill(235);
    rect(420, 240, 80, 30, 5);

    fill(30);
    text(tourStep === 2 ? "Finish" : "Next →", 430, 260);  }

  pop();
}

function mouseOverTour() {
  return (
    tourOpen &&
    mouseX >= 235 && mouseX <= 515 &&
    mouseY >= 90 && mouseY <= 285
  );
}

function mouseClicked() {
  // Reopen the tour
  if (
    mouseX >= 390 && mouseX <= 515 &&
    mouseY >= 38 && mouseY <= 65
  ) {
    tourOpen = true;
    tourStep = 0;
    return;
  }

  if (!tourOpen) return;

  // Close.
  if (
    mouseX >= 480 && mouseX <= 515 &&
    mouseY >= 90 && mouseY <= 125
  ) {
    tourOpen = false;
  }

  // Back
  if (
    tourStep > 0 &&
    mouseX >= 250 && mouseX <= 330 &&
    mouseY >= 240 && mouseY <= 270
  ) {
    tourStep--;
    return;
  }
  // Next, or finish on the last page
  if (
    mouseX >= 420 && mouseX <= 500 &&
    mouseY >= 240 && mouseY <= 270
  ) {
    if (tourStep < 2) { 
      tourStep++;
    } else {
      tourOpen = false;
    }
  }
}