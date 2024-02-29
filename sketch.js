//-----------------------------------------------------------------------------------------------------------
/////////////////
//variables for face
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

/////////////////
//variables for hand
let handpose;
let predictionsHand = [];
let pinchTimeout;
let pinchStarted = false;
let randColor;
const timeToWait = 100;//400 millis, keep it small but not too small
let oscillatorPinch; // New oscillator for pinch gesture
let isOscillatorPinchPlaying = false; // Track if the pinch oscillator is playing
let freqsOctaveLower = freqs.map(f => f / 2);

let soundEnabled = false;
console.log("Initial soundEnabled state:", soundEnabled);

const originalWidth = 640;
const originalHeight = 480;


//-----------------------------------------------------------------------------------------------------------
function setup() {
  createCanvas(windowWidth, windowHeight);

  video = createCapture(VIDEO);
  video.size(windowWidth, windowHeight); // Adjust video size to match the window

  delay = new p5.Delay();

  // Initialize the facemesh model with the video and a callback function for when the model is ready
  facemesh = ml5.facemesh(video, modelReady);

  // Event listener for new predictions from facemesh
  facemesh.on("predict", results => {
    predictions = results; // Update the global predictions array
  });

  // Initialize the handpose model with the video and a callback function for when the model is ready
  handpose = ml5.handpose(video, modelReady);

  // This sets up an event that fills the global variable "predictionsHand"
  // with an array every time new hand poses are detected
  handpose.on("predict", results => {
    predictionsHand = results;
  });

  // Hide the video element, and just show the canvas
  video.hide();

  randColor = pickRandomColor();

}

//-----------------------------------------------------------------------------------------------------------
// Function called when the facemesh model is ready
function modelReady() {
  console.log("Model ready!");
  noStroke();

}

//-----------------------------------------------------------------------------------------------------------
function draw() {

  push(); // Save the current drawing context
  scale(-1, 1); // Flip the x-axis
  translate(-width, 0); // Move the origin to the right edge of the canvas

  //  image(video, 0, 0, width, height);
  background(141, 185, 194);
  drawKeypoints();

  // everything bellow is for the hand pose
  // We can call both functions to draw all keypoints and the skeletons
  drawKeypointsHand();
  doPinch();

  //our circle which changes color on pinch
  fill(randColor);
  noStroke();
  circle(60, 60, 110);

  pop();

  // Get the current frame rate
  let fps = frameRate();

  // Set the text size and fill for better visibility
  textSize(16);
  fill(0);

  // Display the frame rate at position (10, 25) on the canvas
  text("FPS: " + fps.toFixed(2), 10, 25); // toFixed(2) to show only two decimals

}

//-----------------------------------------------------------------------------------------------------------
// Function to draw keypoints detected by facemesh
function drawKeypoints() {
  let lx, ly, tx, ty, pointsDistance, heightDistance;

  // Scale factors
  const scaleX = windowWidth / originalWidth;
  const scaleY = windowHeight / originalHeight;

  for (let i = 0; i < predictions.length; i += 1) {
    const outerUpperLips = predictions[i].annotations.lipsUpperOuter;
    const outerLowerLips = predictions[i].annotations.lipsLowerOuter;


    for (let i = 0; i < predictions.length; i += 1) {
      const keypoints = predictions[i].scaledMesh;

      // Draw facial keypoints for visualization
      for (let j = 0; j < keypoints.length; j += 1) {
        const [x, y] = keypoints[j];
        fill(255, 108, 76);
        ellipse(x * scaleX, y * scaleY, 5, 5);
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

    // Draw the rectangle if all values are defined
    if (lx !== undefined && ty !== undefined && pointsDistance !== undefined && heightDistance !== undefined) {
      fill(255, 108, 76);
      rect(lx * scaleX, ty * scaleY, pointsDistance * scaleX, heightDistance * scaleY);
    }

    if (heightDistance > 30) {
      // a rectangle changes colour when heightDistance > 50
      fill(228, 255, 85);
      rect(lx * scaleX, ty * scaleY, pointsDistance * scaleX, heightDistance * scaleY);
    }

    // map height to oscillator
    if (soundEnabled && heightDistance > 50 && !isOscillatorPlaying) {
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
        }, 1000); // Wait for the oscillator to finish

        currentFreqIndex = (currentFreqIndex + 1) % freqs.length;
      }
    }
  }


}


//-----------------------------------------------------------------------------------------------------------
//draw pinch
function doPinch() {
  if (predictionsHand.length > 0) {
    for (let i = 0; i < predictionsHand.length; i += 1) {
      const prediction = predictionsHand[i];
      //get our thumb and index finger
      const indexF = prediction.annotations.indexFinger[3];
      const thumb = prediction.annotations.thumb[3];

      // Scale factors for responsive design
      const scaleX = windowWidth / originalWidth;
      const scaleY = windowHeight / originalHeight;

      // Calculate mirrored positions for thumb and index finger
      let thumbX =(thumb[0] * scaleX);
      let indexX =(indexF[0] * scaleX);

      // Scale y positions
      let thumbY = thumb[1] * scaleY;
      let indexFY = indexF[1] * scaleY;

      // Draw top of thumb and index finger circle
      fill(255, 255, 0);
      noStroke();
      ellipse(indexX, indexFY, 5 * scaleX, 5 * scaleY); // Adjust size for responsiveness
      ellipse(thumbX, thumbY, 5 * scaleX, 5 * scaleY);

      //each digit is represented by an array of 4 sets of xyz coordinates, e.g.
      //x -> thumb[0]
      //y -> thumb[1]
      //z -> thumb[2]
      //get distance between x & y coordinates of thumb & finger
      let pinchDist = dist(thumb[0], thumb[1], indexF[0], indexF[1]);
      //the z position from camera is a bit noisy, but this scales the distance to check against by z pos
      let zOffset = map(thumb[2], 20, -50, 20, 100);
      //console.log(zOffset,thumb[2] );

      if (pinchDist < zOffset) {
        pinchStarted = true;
        if (soundEnabled && !isOscillatorPinchPlaying) {
          playOscillatorPinch(); // Play the pinch oscillator
        }
        if (pinchTimeout) clearTimeout(pinchTimeout);

        // draw pinch debug circle
        fill(0, 0, 255);
        ellipse(thumbX, thumbY, 20 * scaleX, 20 * scaleY);
      } else if (pinchStarted) {
        pinchStarted = false;

        //start pinch timeout on release of fingers
        pinchTimeout = window.setTimeout(pinch, timeToWait);
        // console.log("click");
      }
    }

  } else {
    //clear our click if we lose tracking of hand
    pinchStarted = false;
    if (pinchTimeout) clearTimeout(pinchTimeout);
  }
}


//-----------------------------------------------------------------------------------------------------------
function pinch() {
  //do something more interesting here
  randColor = pickRandomColor();
}


//-----------------------------------------------------------------------------------------------------------
function pickRandomColor() {
  let c = color(random(255), random(255), random(255));
  return c;
}


//-----------------------------------------------------------------------------------------------------------
// A function to draw ellipses over the detected keypoints
function drawKeypointsHand() {
  // Scale factors for drawing keypoints
  const scaleX = windowWidth / originalWidth;
  const scaleY = windowHeight / originalHeight;

  predictionsHand.forEach(prediction => {
    prediction.landmarks.forEach(([x, y]) => {
      fill(0);
      noStroke();
      ellipse(x * scaleX, y * scaleY, 5, 5);
    });
  });
}


//-----------------------------------------------------------------------------------------------------------
// pinch triggers oscillator
function playOscillatorPinch() {
  isOscillatorPinchPlaying = true;
  //let f = freqs[currentFreqIndex % freqs.length]; // Reuse freqs array or define a new one
  let f = freqsOctaveLower[currentFreqIndex]; // Use the octave lower frequency array
  oscillatorPinch = new p5.Oscillator('sine');
  oscillatorPinch.freq(f);
  oscillatorPinch.amp(0.1, 0.1); // Ramp amplitude to 0.1 over 0.1 seconds
  oscillatorPinch.start();

  delay.process(oscillatorPinch, 0.5, 0.5, 2300);
  delay.delayTime(0.3);
  delay.feedback(0.3);
  delay.filter(2300);

  oscillatorPinch.amp(0, 0.5); // Fade out
  setTimeout(() => {
    oscillatorPinch.stop();
    oscillatorPinch = null;
    isOscillatorPinchPlaying = false;
    currentFreqIndex = (currentFreqIndex + 1) % freqsOctaveLower.length; // Ensure the next frequency is used next time
  }, 500); // Stop after 1.5 seconds
}


//-----------------------------------------------------------------------------------------------------------
// event listener to allow sound to work on iphone
function touchStarted() {
  console.log("touchStarted called. soundEnabled before:", soundEnabled);

  // Check if sound is already enabled
  if (!soundEnabled) {
    // Attempt to start audio context
    userStartAudio().then(() => {
      soundEnabled = true;
      console.log("Audio Enabled");
      // Here, you might also start an oscillator or any sound to indicate the audio has started
      // For example, briefly start an oscillator to give feedback that sound is now enabled
      let osc = new p5.Oscillator('sine');
      osc.freq(440);
      osc.start();
      osc.amp(0.5, 0.05); // Fade in
      osc.stop(0.5); // Stop after a short duration
    }).catch(e => console.error(e));
  }

  // This function should return false to prevent any default browser behavior
  return false;
}


function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  video.size(windowWidth, windowHeight);
}