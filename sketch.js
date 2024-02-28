let facemesh;
let video;
let predictions = [];
let ref = 0; // 'ref' variable is declared but not used in this snippet

let audioContextOn = true;
let oscillator;
let currentFreqIndex = 0; // Initialize an index variable
let delay;

let freqs = [220.0, 246.94, 277.18, 329.63, 369.99, 440.0, 493.88, 554.37, 659.26, 739.99,];
let isOscillatorPlaying = false;



//-----------------------------------------------------------------------------------------------------------
function setup() {
  createCanvas(640, 480);
  
  video = createCapture(VIDEO);
  video.size(width, height);

  delay = new p5.Delay();

  // Initialize the facemesh model with the video and a callback function for when the model is ready
  facemesh = ml5.facemesh(video, modelReady);

  // Event listener for new predictions from facemesh
  facemesh.on("predict", results => {
    predictions = results; // Update the global predictions array
  });

  video.hide();
}

//-----------------------------------------------------------------------------------------------------------
// Function called when the facemesh model is ready
function modelReady() {
  console.log("Model ready!");
  noStroke();

}

//-----------------------------------------------------------------------------------------------------------
function draw() {
  //  image(video, 0, 0, width, height);
  background(141,185,194);
  drawKeypoints();
}

//-----------------------------------------------------------------------------------------------------------
// Function to draw keypoints detected by facemesh
function drawKeypoints() {
  let lx, ly, tx, ty, pointsDistance, heightDistance;

  for (let i = 0; i < predictions.length; i += 1) {
    const outerUpperLips = predictions[i].annotations.lipsUpperOuter;
    const outerLowerLips = predictions[i].annotations.lipsLowerOuter;


    for (let i = 0; i < predictions.length; i += 1) {
      const keypoints = predictions[i].scaledMesh;

      // Draw facial keypoints for visualization
      for (let j = 0; j < keypoints.length; j += 1) {
        const [x, y] = keypoints[j];
        fill(255, 108, 76);
        ellipse(x, y, 5, 5);
      }
    }

    // Calculate the width and set the x, y coordinates for the rectangle
    if (outerUpperLips.length > 0) {
      const firstUpperPoint = outerUpperLips[0];
      const lastUpperPoint = outerUpperLips[outerUpperLips.length - 1];
      pointsDistance = dist(firstUpperPoint[0], firstUpperPoint[1], lastUpperPoint[0], lastUpperPoint[1]);

      const lipLeft = outerUpperLips[0];
      [lx, ly] = lipLeft;
      const liptop = outerUpperLips[5];
      [tx, ty] = liptop;
    }

    // Calculate the height
    if (outerUpperLips.length > 5 && outerLowerLips.length > 5) {
      const upperPoint = outerUpperLips[5];
      const lowerPoint = outerLowerLips[5];
      heightDistance = dist(upperPoint[0], upperPoint[1], lowerPoint[0], lowerPoint[1]);
    }

    // map height to oscillator
    if (heightDistance > 50 && !isOscillatorPlaying) {
      if (!oscillator) {
        isOscillatorPlaying = true; // Flag to indicate the oscillator is active
        let f = freqs[currentFreqIndex]; // Use the current index to get the frequency

        oscillator = new p5.Oscillator("sine");
        oscillator.freq(f);
        oscillator.amp(0.1, 0.1); // Ramp amplitude to 1 over 0.5 seconds

        delay.process(oscillator, 0.5, 0.5, 2300);
        delay.delayTime(0.3); // Set delay time to 0.3 seconds
        delay.feedback(0.3); // Set feedback to 50% for echo effect
        delay.filter(2300); // Set a low-pass filter to 2300 Hz

        oscillator.start();
        oscillator.amp(0, 0.5); // Ramp amplitude to 0 over 0.5 seconds
        oscillator.stop(1.5); // Stop the oscillator after 1.5 seconds

        setTimeout(() => {
          oscillator = null;
          isOscillatorPlaying = false; // Reset flag to allow a new sound trigger
        }, 700); // Wait for the oscillator to finish

        currentFreqIndex = (currentFreqIndex + 1) % freqs.length;
      }
    }
  }

  // Draw the rectangle if all values are defined
  if (lx !== undefined && ty !== undefined && pointsDistance !== undefined && heightDistance !== undefined) {
    fill(228, 255, 85);
    rect(lx, ty, pointsDistance, heightDistance);
  }
}



