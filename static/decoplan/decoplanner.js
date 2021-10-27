const COMPARTMENTS_ZHL16C = [
    {halftime:   4.0, a: 1.2600, b: 0.5050},
    {halftime:   8.0, a: 1.0001, b: 0.6514},
    {halftime:  12.5, a: 0.8618, b: 0.7222},
    {halftime:  18.5, a: 0.7562, b: 0.7725},
    {halftime:  27.0, a: 0.6200, b: 0.8125},
    {halftime:  38.3, a: 0.5034, b: 0.8434},
    {halftime:  54.3, a: 0.4410, b: 0.8693},
    {halftime:  77.0, a: 0.4000, b: 0.8910},
    {halftime: 109.0, a: 0.3750, b: 0.9092},
    {halftime: 146.0, a: 0.3500, b: 0.9222},
    {halftime: 187.0 ,a: 0.3295, b: 0.9319},
    {halftime: 239.0, a: 0.3065, b: 0.9403},
    {halftime: 305.0, a: 0.2835, b: 0.9477},
    {halftime: 390.0, a: 0.2610, b: 0.9544},
    {halftime: 498.0, a: 0.2480, b: 0.9602},
    {halftime: 635.0, a: 0.2327, b: 0.9653}
];
const NUM_COMPARTMENTS = 16; // ZHL16C uses 16 compartments.
const LN2 = 0.6931; // ln(2) used in calculating the halftime constant for each compartment
const pH2O = 0.062; // in bar. See https://www.dekostop.ch/tauchen-know-how/tauchen-dekompression/248-buehlman-zh-l16-inspiratorischer-und-alveolarer-inertgasdruck
// Schreiner constants we're not using for now.
//const RESPIRATORY_QUOTIENT = 1; // unitless. Comes from the diff in O2 inhalation & CO2 exhalation. Buehlmann: 1, US Navy: 0.8, Schreiner: 0.9
//const DELTA_pCO2 = 0.0534; // in bar. See https://www.dekostop.ch/tauchen-know-how/tauchen-dekompression/248-buehlman-zh-l16-inspiratorischer-und-alveolarer-inertgasdruck

// Helpers

function depthToPressure(depth) {
    return (depth / 10) + 1;
}

function pressureToDepth(pressure) {
    return (pressure - 1) * 10;
}

function getInspiredPressureAtDepth(depth, n2_frac) {
    // Bühlmann: p_i = (p_amb - pH2O) * n2_frac
    // Schreiner: p_i = (p_ambient - pH2O + ((1-R)/R) * delta_pCO2) * n2_frac
    return (depthToPressure(depth) - pH2O) * n2_frac;
}

function getToleratedPressureForCompartmentAtDepth(depth, compartment) {
    // p_tol = p_amb * (1/b) + a
    return depthToPressure(depth) * (1.0 / compartment.b) + compartment.a;
}

// creates and loads compartments to surface inert gas pressure.
function createCompartments(numCompartments, n2Fraction) {
    return new Array(numCompartments).fill(n2Fraction);
}

function loadCompartmentsAtConstantDepth(compartments, depth, n2Fraction, time) {
    // Using the "instantaneous" Bühlmann equation
    for(let c=0; c<NUM_COMPARTMENTS; c++) {
        const p_0 = compartments[c];
        const p_io = getInspiredPressureAtDepth(depth, n2Fraction);
        compartments[c] = p_0 + (p_io - p_0) * (1 - Math.pow(2, (-time/COMPARTMENTS_ZHL16C[c].halftime)));
    }
    return compartments;   
}

function loadCompartmentsDuringDepthChange(compartments, n2Fraction, startDepth, endDepth, changeRate) {
    const delta_t = (endDepth - startDepth) / changeRate;
    // Using the Schreiner equation
    for(let i=0; i<NUM_COMPARTMENTS; i++) {
        const p_0 = compartments[i];
        const p_io = getInspiredPressureAtDepth(startDepth, n2Fraction);
        const k = LN2 / COMPARTMENTS_ZHL16C[i].halftime;
        const c = changeRate * n2Fraction;
        compartments[i] = p_io + c * (delta_t - 1/k) - (p_io - p_0 - (c/k)) * (Math.exp(-k * delta_t)); // Schreiner Equation
    }
    return compartments;
}

// returns ascent ceiling depth in next bigger 3m step
function getAscentCeilingDepth(compartments, gf) {
    let deepestCeilingDepth = 0;
    for(let c=0;c<NUM_COMPARTMENTS; c++) {
        const ceilingPressure = (compartments[c] - COMPARTMENTS_ZHL16C[c].a * gf) / ((gf / COMPARTMENTS_ZHL16C[c].b) - gf + 1);
        const ceilingDepth = pressureToDepth(ceilingPressure);
        if(ceilingDepth > deepestCeilingDepth) {
            deepestCeilingDepth = ceilingDepth;
        }
    }
    return Math.ceil(deepestCeilingDepth/3) * 3;
}

// returns a list of sorted deco stops, deepest to shallowest, starting with the bottom time
function getDivePlan(depth, bottomTime, n2FractionBottom, n2FractionDeco, descentRate, ascentRate, maxPO2Deco, gfLo, gfHi) {
    const plan = [];
    let currentRunTime = bottomTime;
    const bottomMixO2 = Math.round((1 - n2FractionBottom) * 100);
    const decoMixO2 = Math.round((1 - n2FractionDeco) * 100);
    // add bottom time as first row in the dive plan
    plan.push({depth: depth, stopTime: bottomTime, runTime: bottomTime, mix: (bottomMixO2 == 21 ? 'Air' : 'EAN' + bottomMixO2)});
    let compartments = createCompartments(NUM_COMPARTMENTS, 0.79); // surface N2 pressure
    // descent
    compartments = loadCompartmentsDuringDepthChange(compartments, n2FractionBottom, 0, depth, descentRate);
    const descentTime = Math.ceil(depth / descentRate);
    // bottom time
    const actualBottomTime = bottomTime - descentTime;
    compartments = loadCompartmentsAtConstantDepth(compartments, depth, n2FractionBottom, actualBottomTime);

    let currentDepth = depth;
    // get stop depth
    // Note: I'm not sure that using gfLo is the right thing here, but it makes sense as gfLo influences the first stop depth
    let currentCeilingDepth = getAscentCeilingDepth(compartments, gfLo);
    // calculate gradient factor slope from first stop
    const deltaGf = (gfHi - gfLo) / -currentCeilingDepth;

    // ascent to stop from current depth
    // we ignore the loading on ascent (line below) as that somehow gives us bullshit results. TODO: Find out why
    //compartments = loadCompartmentsDuringDepthChange(compartments, n2Fraction, currentDepth, currentCeilingDepth, -ASCENT_RATE);
    currentRunTime += Math.ceil((currentDepth - currentCeilingDepth) / ascentRate);
    while(currentCeilingDepth > 0) {
        let stopTime = 0, nextCeilingDepth = currentCeilingDepth;
        // off-gas until we can go to the next stop
        do {
            const n2frac = isDecoMixBreathable(decoMixO2/100, currentCeilingDepth, maxPO2Deco) ? n2FractionDeco : n2FractionBottom;
            compartments = loadCompartmentsAtConstantDepth(compartments, currentCeilingDepth, n2frac, 1);
            const gf = deltaGf * currentCeilingDepth + gfHi;
            nextCeilingDepth = getAscentCeilingDepth(compartments, gf);
            stopTime++;
        } while(nextCeilingDepth === currentCeilingDepth && nextCeilingDepth > 0);
        currentRunTime += stopTime;
        const mixO2 = isDecoMixBreathable(decoMixO2/100, currentCeilingDepth, maxPO2Deco) ? decoMixO2 : bottomMixO2;
        plan.push({depth: currentCeilingDepth, stopTime: stopTime, runTime: currentRunTime, mix: (mixO2 == 21 ? 'Air' : 'EAN' + mixO2)});
        currentCeilingDepth = nextCeilingDepth;
    }
    return plan;
}

function isDecoMixBreathable(o2Fraction, depth, maxPPO2) {
    return (o2Fraction * depthToPressure(depth)) <= maxPPO2;
}

function getOptimalBottomMixForDepth(depth, maxPPO2) {
    return maxPPO2 / depthToPressure(depth);
}

function getOptimalDecoMixFor(depth, time, n2Fraction, descentRate, ascentRate, maxPPO2, gfLo, gfHi) {
    const plan = getDivePlan(depth, time, n2Fraction, n2Fraction, descentRate, ascentRate, maxPPO2, gfLo, gfHi);
    const deepestStopDepth = plan[1].depth; // plan[0] is the bottom time, plan[1] is the first deco stop
    return maxPPO2 / depthToPressure(deepestStopDepth);    
}

function calculateNoStopTime(depth, n2_frac) {
    /*
    t = -T * log2(p_i - p_t / p_i - p_0)
    t = remaining time in minutes
    T = compartment half-time in min
    p_i = inspired inert gas pressure in bar
    p_t = tolerated inert gas pressure in bar
    p_0 = inert gas pressure at the beginning of the exposure in bar
    */
    const p_0 = n2_frac;
    const surfToleratedPressures = COMPARTMENTS_ZHL16C.map((compartment) => getToleratedPressureForCompartmentAtDepth(0, compartment));
    let compartments = createCompartments(NUM_COMPARTMENTS, n2_frac);
    // we increase dive time minute by minute and check if there is a compartment that is too oversaturated to allow surfacing.
    let noStopTime = 0;
    do {
        noStopTime++;
        loadCompartmentsAtConstantDepth(compartments, depth, n2_frac, 1);
        // as long as all compartments have less supersaturation than is safe to surface with, we can continue the dive      
    } while(compartments.every((compartment, num) => surfToleratedPressures[num] >= compartment));
    return noStopTime;
}

// UI event handlers

function planDive() {
    const n2FractionBottom = 1.0 - (parseFloat(document.getElementById('bottom_o2').value) / 100);
    const n2FractionDeco = 1.0 - (parseFloat(document.getElementById('deco_o2').value) / 100);
    const depth = parseFloat(document.getElementById('depth').value);
    const time = parseFloat(document.getElementById('bottom_time').value);
    const noStopTime = calculateNoStopTime(depth, n2FractionBottom);
    const descentRate = parseFloat(document.getElementById('descent_rate').value);
    const ascentRate = parseFloat(document.getElementById('ascent_rate').value);
    const maxPO2Bottom = parseFloat(document.getElementById('max_ppo2_bottom').value);
    const maxPO2Deco = parseFloat(document.getElementById('max_ppo2_deco').value);
    const gfLo = parseFloat(document.getElementById('gf_lo').value) / 100;
    const gfHi = parseFloat(document.getElementById('gf_hi').value) / 100;

    // get dive plan...
    const plan = getDivePlan(depth, time, n2FractionBottom, n2FractionDeco, descentRate, ascentRate, maxPO2Deco, gfLo, gfHi);
    const tableBody = document.getElementById('diveplan');
    tableBody.innerHTML = '';

    let totalStopTime = -time; // the first stop in the dive plan adds the bottom time, so we offset this here.
    plan.forEach((stop) => {
        const tr = document.querySelector('template').content.cloneNode(true);
        const tableCells = tr.querySelectorAll('td');
        tableCells[0].textContent = stop.depth + 'm';
        tableCells[1].textContent = stop.stopTime + ' min';
        tableCells[2].textContent = stop.runTime + ' min';
        tableCells[3].textContent = stop.mix;
        tableBody.appendChild(tr);
        totalStopTime += stop.stopTime;
    });

    document.getElementById('optimal_bottom_ean').textContent = 'EAN' + Math.round(getOptimalBottomMixForDepth(depth, maxPO2Bottom) * 100);
    document.getElementById('optimal_deco_ean').textContent = 'EAN' + Math.round(getOptimalDecoMixFor(depth, time, n2FractionBottom, descentRate, ascentRate, maxPO2Deco, gfLo, gfHi) * 100);
    document.getElementById('no_stop').textContent = noStopTime + ' min';
    document.getElementById('total_stop_time').textContent = totalStopTime + ' min';
}

function getNoStopTime() {
    const n2Fraction = 1.0 - (parseFloat(document.getElementById('bottom_o2').value) / 100);
    const depth = parseFloat(document.getElementById('depth').value);
    const noStopTime = calculateNoStopTime(depth, n2Fraction);

    document.getElementById('bottom_time').value = noStopTime;
}

document.getElementById('plan').addEventListener('click', planDive);
document.getElementById('nostop').addEventListener('click', getNoStopTime);