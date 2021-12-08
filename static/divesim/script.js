// Generic constants
const CANVAS_WIDTH = 300;
const CANVAS_HEIGHT = 300;

// UI Elements
const planDepth = document.getElementById('plan_depth');
const planTime = document.getElementById('plan_time');
const planO2Percentage = document.getElementById('plan_o2percent');
const planGfHi = document.getElementById('plan_gfhi');
const planGfLo = document.getElementById('plan_gflo');
const planDescRate = document.getElementById('plan_descrate');
const planAscRate = document.getElementById('plan_ascrate');
const simTimeSlider = document.getElementById('sim_time');
const errorMsg = document.getElementById('error_msg');
const results = document.getElementById('results');
const info = document.getElementById('info');
//const simTimeInput = document.getElementById('sim_minute');

// Canvas2D contexts
const compartmentGraph = document.querySelector('canvas#sim_compartments').getContext('2d');
const diveProfileGraph = document.querySelector('canvas#sim_profile').getContext('2d');

function simulateDive(depth, time) {
  const n2Fraction = (1 - (parseFloat(planO2Percentage.value) / 100));
  const descentRate = parseFloat(planDescRate.value);
  const ascentRate = parseFloat(planAscRate.value);
  const descentTime = Math.ceil(depth / descentRate);
  const ascentTime = Math.ceil(depth / ascentRate);
  const gfLo = parseFloat(planGfLo.value) / 100;
  const gfHi = parseFloat(planGfHi.value) / 100;
  const snapshots = Array.from({length: time+1}, () => {
    return {
      depth: 0,
      compartments: []
    };
  }); // initialize to atmospheric saturation (air pN2 = 0.79, alveolar pN2 = 0.75)
    
  let bottomTime = getBottomTimeFor(BY_RUN_TIME, time, depth, n2Fraction, n2Fraction, descentRate, ascentRate, 1.4, gfLo, gfHi);
  let decoStops = 0;
  do {
    bottomTime--;
    decoStops = getDivePlan(depth, bottomTime, n2Fraction, n2Fraction, descentRate, ascentRate, 1.4, gfLo, gfHi).slice(1); // removes bottom time
  } while(decoStops.length > 1 && decoStops.slice(-1)[0].runTime + ascentTime + descentTime >= time && bottomTime > 0);
  bottomTime--;
  if(bottomTime < 1) {
    errorMsg.textContent = 'This dive is not possible with the given dive plan and gradient factors.';
    results.classList.add('hidden');
    return snapshots;
  }
  const compartments = createCompartments(NUM_COMPARTMENTS, 0.75);
  // load compartments for the descent
  let currentDepth = 0, currentTime = 0;
  for(let t=0; t<descentTime; t++) {
    loadCompartmentsAtConstantDepth(compartments, currentDepth, n2Fraction, 1);
    snapshots[currentTime].depth = currentDepth;
    snapshots[currentTime].compartments = [].concat(compartments);
    currentDepth += descentRate;
    currentDepth = Math.min(depth, currentDepth); // prevent us from overshooting our target depth
    currentTime++;
  }

  // load compartments for the bottom time...
  for(let t=0; t<bottomTime; t++) {
    loadCompartmentsAtConstantDepth(compartments, currentDepth, n2Fraction, 1);
    snapshots[currentTime].depth = currentDepth;
    snapshots[currentTime].compartments = [].concat(compartments);
    currentTime++;
  }
  do {
    //ascent to next deco stop
    let nextStop = decoStops.shift() || {depth: 0, stopTime: 0};
    do {
      currentDepth -= ascentRate;
      currentDepth = Math.max(nextStop.depth, currentDepth); // make sure we don't overshoot our stop
      loadCompartmentsAtConstantDepth(compartments, currentDepth, n2Fraction, 1);
      snapshots[currentTime].depth = currentDepth;
      snapshots[currentTime].compartments = [].concat(compartments);
      currentTime++;
    } while(currentDepth > nextStop.depth);
    // if the 3m stop is over before time is used up, extend it...
    if(currentDepth === 3 && currentTime + nextStop.stopTime < time - 2) {
      nextStop.stopTime = time-currentTime-2;
    }
    // hang out at the deco stop
    for(let stopTime = nextStop.stopTime; stopTime > 0; stopTime--) {
      loadCompartmentsAtConstantDepth(compartments, currentDepth, n2Fraction, 1);
      snapshots[currentTime].depth = currentDepth;
      snapshots[currentTime].compartments = [].concat(compartments);
      currentTime++;      
    }
  } while(currentDepth > 0 && currentTime < time - 1);

  // load the remaining minutes, if any
  while(currentTime <= time) {
    loadCompartmentsAtConstantDepth(compartments, currentDepth, n2Fraction, 1);
    snapshots[currentTime].depth = currentDepth;
    snapshots[currentTime].compartments = [].concat(compartments);
    currentTime++;
  }
  
  return snapshots;
}

let graphData = simulateDive(parseFloat(planDepth.value), parseFloat(planTime.value));
updateGraphs();

function updateGraphs() {
  updateCompartmentGraph();
  updateDiveProfileGraph();
}

function updateCompartmentGraph() {
  const currentTime = parseFloat(simTimeSlider.value);
  const currentAmbientPressure = depthToPressure(graphData[currentTime].depth);
  const maxAmbientPressure = depthToPressure(parseFloat(planDepth.value)) + 1;
  const ppN2 = (1 - (parseFloat(planO2Percentage.value) / 100)) * currentAmbientPressure;
  const compartments = graphData[currentTime].compartments;
  const PIXEL_PER_BAR = CANVAS_HEIGHT / (maxAmbientPressure * 100);

  // clear graph
  compartmentGraph.fillStyle = 'white';
  compartmentGraph.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const barWidth = (CANVAS_WIDTH / (NUM_COMPARTMENTS*2));
  for(let c=0; c<NUM_COMPARTMENTS; c++) {
    const toleratedPressure = getToleratedPressureForCompartmentAtDepth(graphData[currentTime].depth, COMPARTMENTS_ZHL16C[c]);
    //draw critical supersaturation zone
    compartmentGraph.fillStyle = '#ff8888';
    compartmentGraph.fillRect(c * 2 * barWidth, 0, (c+1) * 2 * barWidth + 1, CANVAS_HEIGHT - toleratedPressure * 100 * PIXEL_PER_BAR);
    
    // draw supersaturation zone
    compartmentGraph.fillStyle = '#ffff88';
    compartmentGraph.fillRect(0, CANVAS_HEIGHT - toleratedPressure * 100 * PIXEL_PER_BAR, CANVAS_WIDTH, CANVAS_HEIGHT - (currentAmbientPressure * 100 * PIXEL_PER_BAR));
  }

  // draw ambient pressure zone
  compartmentGraph.fillStyle = '#88ff88';
  compartmentGraph.fillRect(0, CANVAS_HEIGHT - (currentAmbientPressure * 100 * PIXEL_PER_BAR), CANVAS_WIDTH, currentAmbientPressure * 100 * PIXEL_PER_BAR);
  
  // draw bar lines
  compartmentGraph.strokeStyle = '#ccc';
  for(let p=0; p<=maxAmbientPressure;p++) {
    compartmentGraph.beginPath();
    compartmentGraph.moveTo(0, (PIXEL_PER_BAR / 2) + PIXEL_PER_BAR * 100 * p);
    compartmentGraph.lineTo(CANVAS_WIDTH, (PIXEL_PER_BAR / 2) + PIXEL_PER_BAR * 100 * p);
    compartmentGraph.stroke();
  }
  
  // draw compartments
  compartmentGraph.fillStyle = 'blue';
  for(let i=0;i<NUM_COMPARTMENTS;i++) {
    compartmentGraph.fillRect(barWidth * 1.5 + ((i * barWidth) + (i-1)*barWidth), CANVAS_HEIGHT - PIXEL_PER_BAR * (compartments[i] * 100), barWidth, PIXEL_PER_BAR * (compartments[i] * 100));
  }
  compartmentGraph.strokeStyle = 'black';
  compartmentGraph.beginPath();
  compartmentGraph.moveTo(  0, CANVAS_HEIGHT - (ppN2 * 100) * PIXEL_PER_BAR);
  compartmentGraph.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT - (ppN2 * 100) * PIXEL_PER_BAR);
  compartmentGraph.stroke();
}

function updateDiveProfileGraph() {
  const currentTime = parseFloat(simTimeSlider.value);
  const currentDepth = graphData[currentTime].depth;
  const diveTime = parseFloat(planTime.value);
  const diveDepth = parseFloat(planDepth.value);
  const PIXEL_PER_MINUTE = CANVAS_WIDTH / (diveTime + 1);
  const PIXEL_PER_METER = CANVAS_HEIGHT / (diveDepth + 1);

  diveProfileGraph.fillStyle = 'white';
  diveProfileGraph.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // create depth lines
  diveProfileGraph.strokeStyle = '#ccc';
  for(let d=0; d<=diveDepth; d++) {
    diveProfileGraph.beginPath();
    diveProfileGraph.moveTo(0, (PIXEL_PER_METER / 2) + PIXEL_PER_METER * d);
    diveProfileGraph.lineTo(CANVAS_WIDTH, (PIXEL_PER_METER / 2) + PIXEL_PER_METER * d);
    diveProfileGraph.stroke();
  }

  // create time lines
  for(let t=0; t<=diveTime; t++) {
    diveProfileGraph.beginPath();
    diveProfileGraph.moveTo((PIXEL_PER_MINUTE / 2) + t * PIXEL_PER_MINUTE, 0);
    diveProfileGraph.lineTo((PIXEL_PER_MINUTE / 2) +t * PIXEL_PER_MINUTE, CANVAS_HEIGHT);
    diveProfileGraph.stroke();
  }
  
  // plot dive profile
  diveProfileGraph.strokeStyle = 'black';
  diveProfileGraph.beginPath();
  diveProfileGraph.moveTo((PIXEL_PER_MINUTE / 2), (PIXEL_PER_METER / 2));
  for(let t=0;t<=diveTime;t++) {
    diveProfileGraph.lineTo((PIXEL_PER_MINUTE / 2) + t * PIXEL_PER_MINUTE, (PIXEL_PER_METER / 2) + graphData[t].depth * PIXEL_PER_METER);
  }
  diveProfileGraph.stroke();
  
  // plot current position
  diveProfileGraph.fillStyle = 'blue';
  diveProfileGraph.beginPath();
  diveProfileGraph.arc((PIXEL_PER_MINUTE / 2) + currentTime * PIXEL_PER_MINUTE, (PIXEL_PER_METER / 2) + currentDepth * PIXEL_PER_METER, Math.min(PIXEL_PER_MINUTE, PIXEL_PER_METER) * 0.5, 0, 360);
  diveProfileGraph.fill();
  
}

planTime.addEventListener('input', () => {
  simTimeSlider.value = 0;
//  simTimeInput.value = 0;
  simTimeSlider.setAttribute('max', planTime.value);
//  simTimeInput.setAttribute('max', planTime.value);
});

/*
// sync slider with input
simTimeSlider.addEventListener('input', () => {
  simTimeInput.value = simTimeSlider.value;
})

simTimeInput.addEventListener('input', () => {
  simTimeSlider.value = simTimeInput.value;
})
*/

document.querySelectorAll('input').forEach((inpEl) => inpEl.addEventListener('input', () => {
  const depth = parseFloat(planDepth.value);
  const time = parseFloat(planTime.value);
  const descentRate = parseFloat(planDescRate.value);
  const ascentRate = parseFloat(planAscRate.value);
  const descentTime = Math.ceil(depth / descentRate);
  const ascentTime = Math.ceil(depth / ascentRate);
  const gfLo = parseFloat(planGfLo.value) / 100;
  const gfHi = parseFloat(planGfHi.value) / 100;
  const currentTime = parseFloat(simTimeSlider.value);

    // check data
  if(depth < 1 || time < 1 || gfLo <= 0 || gfHi <= 0 || gfHi < gfLo || descentRate < 1 || ascentRate < 1) return;
  
  results.classList.remove('hidden');
  errorMsg.textContent = '';
  graphData = simulateDive(parseFloat(planDepth.value), parseFloat(planTime.value));
  const currentAmbientPressure = depthToPressure(graphData[currentTime].depth);
  /*
  const maxSaturationPercent = Array.from(
    {length: NUM_COMPARTMENTS}, 
    (v, i) => getToleratedPressureForCompartmentAtDepth(graphData[currentTime].depth, COMPARTMENTS_ZHL16C[i])
  ).reduce((prevMaxSat, currentToleratedPressure, currentIndex) => {
    return Math.max(prevMaxSat, (graphData[currentTime].compartments[currentIndex] - currentAmbientPressure) / (currentToleratedPressure - currentAmbientPressure));
  }, 0) * 100;*/
  info.textContent = `
    Time: ${currentTime}min
    Depth: ${graphData[currentTime].depth}m
  `;
  updateGraphs();
}));
