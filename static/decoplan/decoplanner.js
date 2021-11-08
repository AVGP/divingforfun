const COMPARTMENTS_ZHL16B = [
    {halftime:   4.0, a: 1.2600, b: 0.5050},
    {halftime:   8.0, a: 1.0001, b: 0.6514},
    {halftime:  12.5, a: 0.8618, b: 0.7222},
    {halftime:  18.5, a: 0.7563, b: 0.7725},
    {halftime:  27.0, a: 0.6667, b: 0.8125},
    {halftime:  38.3, a: 0.5600, b: 0.8434},
    {halftime:  54.3, a: 0.4947, b: 0.8693},
    {halftime:  77.0, a: 0.4500, b: 0.8910},
    {halftime: 109.0, a: 0.4188, b: 0.9092},
    {halftime: 146.0, a: 0.3799, b: 0.9222},
    {halftime: 187.0 ,a: 0.3498, b: 0.9319},
    {halftime: 239.0, a: 0.3223, b: 0.9403},
    {halftime: 305.0, a: 0.2850, b: 0.9477},
    {halftime: 390.0, a: 0.2738, b: 0.9544},
    {halftime: 498.0, a: 0.2524, b: 0.9602},
    {halftime: 635.0, a: 0.2327, b: 0.9653}
];
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
const PN2_SURF = 0.79; // in bar. Surface saturation of N2 in compartments
const LN2 = 0.6931; // ln(2) used in calculating the halftime constant for each compartment
const pH2O = 0.062; // in bar. See https://www.dekostop.ch/tauchen-know-how/tauchen-dekompression/248-buehlman-zh-l16-inspiratorischer-und-alveolarer-inertgasdruck
const SAC_CONTINGENCY = 40; // in l/min. Two divers, 20 l/min each in case a gas emergency happens
const MIN_RESERVE_PRESSURE = 50; // in bar. Minimal acceptable pressure in the tank.
// Constants that help us save some copy & paste later
const BY_DECO_TIME = 1;
const BY_RUN_TIME = 2;
const BY_TTS = 3;

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

function loadCompartmentsAtConstantDepth(compartments, depth, n2Fraction, time, buehlmannTable = COMPARTMENTS_ZHL16C) {
    // Using the "instantaneous" Bühlmann equation
    for(let c=0; c<NUM_COMPARTMENTS; c++) {
        const p_0 = compartments[c];
        const p_io = getInspiredPressureAtDepth(depth, n2Fraction);
        compartments[c] = p_0 + (p_io - p_0) * (1 - Math.pow(2, (-time/buehlmannTable[c].halftime)));
    }
    return compartments;   
}

function loadCompartmentsDuringDepthChange(compartments, n2Fraction, startDepth, endDepth, changeRate, buehlmannTable = COMPARTMENTS_ZHL16C) {
    const delta_t = (endDepth - startDepth) / changeRate;
    // Using the Schreiner equation
    for(let i=0; i<NUM_COMPARTMENTS; i++) {
        const p_0 = compartments[i];
        const p_io = getInspiredPressureAtDepth(startDepth, n2Fraction);
        const k = LN2 / buehlmannTable[i].halftime;
        const c = changeRate * n2Fraction;
        compartments[i] = p_io + c * (delta_t - 1/k) - (p_io - p_0 - (c/k)) * (Math.exp(-k * delta_t)); // Schreiner Equation
    }
    return compartments;
}

// returns ascent ceiling depth in next bigger 3m step
function getAscentCeilingDepth(compartments, gf, buehlmannTable = COMPARTMENTS_ZHL16C) {
    let deepestCeilingDepth = 0;
    for(let c=0;c<NUM_COMPARTMENTS; c++) {
        const ceilingPressure = (compartments[c] - buehlmannTable[c].a * gf) / ((gf / buehlmannTable[c].b) - gf + 1);
        const ceilingDepth = pressureToDepth(ceilingPressure);
        if(ceilingDepth > deepestCeilingDepth) {
            deepestCeilingDepth = ceilingDepth;
        }
    }
    return Math.ceil(deepestCeilingDepth/3) * 3;
}

// returns a list of sorted deco stops, deepest to shallowest, starting with the bottom time
function getDivePlan(depth, bottomTime, n2FractionBottom, n2FractionDeco, descentRate, ascentRate, maxPO2Deco, gfLo, gfHi, buehlmannTable = COMPARTMENTS_ZHL16C) {
    const plan = [];
    let currentRunTime = bottomTime;
    const bottomMixO2 = Math.round((1 - n2FractionBottom) * 100);
    const decoMixO2 = Math.round((1 - n2FractionDeco) * 100);
    // add bottom time as first row in the dive plan
    plan.push({depth: depth, stopTime: bottomTime, runTime: bottomTime, mix: (bottomMixO2 == 21 ? 'Air' : 'EAN' + bottomMixO2)});
    let compartments = createCompartments(NUM_COMPARTMENTS, PN2_SURF); // surface N2 pressure
    // descent
    compartments = loadCompartmentsDuringDepthChange(compartments, n2FractionBottom, 0, depth, descentRate, buehlmannTable);
    const descentTime = Math.ceil(depth / descentRate);
    // bottom time
    const actualBottomTime = bottomTime - descentTime;
    compartments = loadCompartmentsAtConstantDepth(compartments, depth, n2FractionBottom, actualBottomTime, buehlmannTable);

    let currentDepth = depth;
    // get stop depth
    // Note: I'm not sure that using gfLo is the right thing here, but it makes sense as gfLo influences the first stop depth
    let currentCeilingDepth = getAscentCeilingDepth(compartments, gfLo, buehlmannTable);
    // calculate gradient factor slope from first stop
    const deltaGf = (gfHi - gfLo) / -currentCeilingDepth;

    // ascent to stop from current depth
    // we ignore the loading on ascent (line below) as that somehow gives us bullshit results. TODO: Find out why
    //compartments = loadCompartmentsDuringDepthChange(compartments, n2Fraction, currentDepth, currentCeilingDepth, -ASCENT_RATE);
    currentRunTime += Math.ceil((currentDepth - currentCeilingDepth) / ascentRate);
    while(currentCeilingDepth > 0) {
        let stopTime = 0, nextCeilingDepth = currentCeilingDepth;
        // off-gas until we can go to the next stop
        const usesDecoMix = (bottomMixO2 !== decoMixO2) && isDecoMixBreathable(decoMixO2/100, currentCeilingDepth, maxPO2Deco)
        do {
            const n2frac = usesDecoMix ? n2FractionDeco : n2FractionBottom;
            compartments = loadCompartmentsAtConstantDepth(compartments, currentCeilingDepth, n2frac, 1, buehlmannTable);
            const gf = deltaGf * currentCeilingDepth + gfHi;
            nextCeilingDepth = getAscentCeilingDepth(compartments, gf, buehlmannTable);
            stopTime++;
        } while(nextCeilingDepth === currentCeilingDepth && nextCeilingDepth > 0);
        currentRunTime += stopTime;
        const mixO2 = usesDecoMix ? decoMixO2 : bottomMixO2;
        plan.push({depth: currentCeilingDepth, stopTime: stopTime, runTime: currentRunTime, o2Percent: mixO2, isDecoMix: usesDecoMix, mix: (mixO2 == 21 ? 'Air' : 'EAN' + mixO2)});
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

function getOptimalDecoMixFor(depth, time, n2Fraction, descentRate, ascentRate, maxPPO2, gfLo, gfHi, buehlmannTable = COMPARTMENTS_ZHL16C) {
    const plan = getDivePlan(depth, time, n2Fraction, n2Fraction, descentRate, ascentRate, maxPPO2, gfLo, gfHi, buehlmannTable);
    if(plan.length === 1) return 1; // bail out if there are no deco stops. 100% O2 is always great at the surface ;-)
    const deepestStopDepth = plan[1].depth; // plan[0] is the bottom time, plan[1] is the first deco stop
    return Math.min(1, maxPPO2 / depthToPressure(deepestStopDepth)); // better safe than sorry, limiting to EAN100.
}

// This produces slightly too long values
function calculateNoStopTimeOld(depth, n2_frac, buehlmannTable = COMPARTMENTS_ZHL16C) {
    /*
    t = -T * log2(p_i - p_t / p_i - p_0)
    t = remaining time in minutes
    T = compartment half-time in min
    p_i = inspired inert gas pressure in bar
    p_t = tolerated inert gas pressure in bar
    p_0 = inert gas pressure at the beginning of the exposure in bar
    */
//    const p_0 = n2_frac;
//    const surfToleratedPressures = COMPARTMENTS_ZHL16C.map((compartment) => getToleratedPressureForCompartmentAtDepth(0, compartment));
    let compartments = createCompartments(NUM_COMPARTMENTS, PN2_SURF);
    // we increase dive time minute by minute and check if there is a compartment that is too oversaturated to allow surfacing.
    let noStopTime = 0;
    do {
        noStopTime++;
        loadCompartmentsAtConstantDepth(compartments, depth, n2_frac, 1, buehlmannTable = COMPARTMENTS_ZHL16C);
        // as long as all compartments have less supersaturation than is safe to surface with, we can continue the dive      
    } while(getAscentCeilingDepth(compartments, 1.0, buehlmannTable) < 3); //compartments.every((compartment, num) => surfToleratedPressures[num] >= compartment));
    return noStopTime;
}

function calculateNoStopTime(depth, n2Fraction, descentRate, ascentRate, gfLo, gfHi, buehlmannTable = COMPARTMENTS_ZHL16C) {
    let time = 0;
    let stops = 0;
    do {
        time++;
        stops = getDivePlan(depth, time, n2Fraction, n2Fraction, descentRate, ascentRate, 1, gfLo, gfHi, buehlmannTable).length;
    } while(stops < 2 && time < 1000);
    return time - 1; // we know that the current value of time produces a deco stop, so the no stop time is one minute shorter.
}

function getGasPlan(divePlan, sacBottom, sacDeco) {

    const bottomMixVolume = divePlan.filter((stop) => !stop.isDecoMix).reduce((volume, stop) => {
        return volume + (depthToPressure(stop.depth) * sacBottom * stop.stopTime);
    }, 0);
    const decoMixVolume = divePlan.filter((stop) => stop.isDecoMix).reduce((volume, stop) => {
        return volume + (depthToPressure(stop.depth) * sacDeco * stop.stopTime);
    }, 0); // might not have any deco mix, so we initialize to 0.

    return [bottomMixVolume, decoMixVolume];
}

function getMinimumGasVolume(divePlan, ascentRate) {
    // get maximum depth from first stop (=bottom time) in the dive plan
    const maxDepth = divePlan[0].depth;
    const changeoverVolume = depthToPressure(maxDepth) * 2 * SAC_CONTINGENCY; // two minutes to change gas supply in emergency.
    let currentDepth = maxDepth;
    let totalGasVolume = changeoverVolume;
    // get the gas needed for ascent to each stop and the gas needed at that stop
    divePlan.slice(1).forEach((stop) => {
        const avgAscentDepth = currentDepth - ((currentDepth - stop.depth) / 2);
        const avgAscentPressure = depthToPressure(avgAscentDepth);
        const ascTime = (currentDepth - stop.depth) / ascentRate;
        const ascentVolume = Math.ceil(avgAscentPressure * ascTime) * SAC_CONTINGENCY;
        const stopVolume = depthToPressure(stop.depth) * stop.stopTime * SAC_CONTINGENCY;
        totalGasVolume += ascentVolume + stopVolume;
        currentDepth = stop.depth;
    });
    // finally, add the ascent to the surface (either from the bottom if no deco stops happened or from the last stop)
    const avgAscentDepth = currentDepth / 2;
    const avgAscentPressure = depthToPressure(avgAscentDepth);
    const ascTime = Math.ceil(currentDepth / ascentRate) + 1; // 1 minute extra margin
    const ascentVolume = Math.ceil(avgAscentPressure * ascTime) * SAC_CONTINGENCY;
    totalGasVolume += ascentVolume;
    return totalGasVolume;
}

function getBottomTimeFor(criteria, maxTime, depth, n2FractionBottom, n2FractionDeco, descentRate, ascentRate, maxPO2Deco, gfLo, gfHi, buehlmannTable) {
    let time = 1;
    let isWithinTimeLimit = false;
    do {
        time++;
        const stops = getDivePlan(depth, time, n2FractionBottom, n2FractionDeco, descentRate, ascentRate, maxPO2Deco, gfLo, gfHi, buehlmannTable);
        if(criteria == BY_DECO_TIME) {
            // total deco time is the stop time of all stops (except the first stop as it's bottom time)
            const totalDecoTime = stops.slice(1).reduce((stopTime, stop) => {
                return stopTime + stop.stopTime;
            }, 0)
            isWithinTimeLimit = totalDecoTime <= maxTime;
        } else if(criteria == BY_RUN_TIME) {
            isWithinTimeLimit = stops.pop().runTime <= maxTime;
        } else if(criteria == BY_TTS) {
            isWithinTimeLimit = (stops.pop().runTime - time) <= maxTime;
        }
    } while(isWithinTimeLimit && time < 1000);
    return time - 1; // we know that the current time violates the constraint
}

// returns an error message to display or false if there is none.
function getSettingErrors(depth, bottomTime, o2FractionBottom, o2FractionDeco, maxPO2Bottom, gfLo, gfHi) {
    // is bottom mix within limits for the depth?
    const isDepthOk = (!isNaN(depth)) && (depth > 0);
    const isTimeOk = (!isNaN(bottomTime)) && (bottomTime > 0);
    const isBottomMixOk = Math.round(o2FractionBottom * 100) <= Math.round(getOptimalBottomMixForDepth(depth, maxPO2Bottom) * 100);
    const isDecoMixOK = o2FractionBottom <= o2FractionDeco;
    const areGFsOk = gfLo <= gfHi;

    if(!isDepthOk) {
        return 'Dive depth should at least be 1 meter.';
    } else if(!isTimeOk) {
        return 'Dive time should at least be 1 minute.';
    }else if(!isBottomMixOk) {
        return 'Bottom gas exceeds maximum ppO2.';
    } else if(!isDecoMixOK) {
        return 'Deco gas should not have less O2% than bottom gas.';
    } else if(!areGFsOk) {
        return 'GF Low needs to be lower or equal to GF high.';
    } else {
        return false;
    };
}

// UI event handlers

var currentBuehlmannTable = COMPARTMENTS_ZHL16C;

function planDive() {
    const o2FractionBottom = (parseFloat(document.getElementById('bottom_o2').value) / 100);
    const o2FractionDeco = (parseFloat(document.getElementById('deco_o2').value) / 100);
    const n2FractionBottom = 1.0 - o2FractionBottom;
    const n2FractionDeco = 1.0 - o2FractionDeco;
    const depth = parseFloat(document.getElementById('depth').value);
    const criteria = document.forms[0].criteria.value;

    const descentRate = parseFloat(document.getElementById('descent_rate').value);
    const ascentRate = parseFloat(document.getElementById('ascent_rate').value);
    const maxPO2Bottom = parseFloat(document.getElementById('max_ppo2_bottom').value);
    const maxPO2Deco = parseFloat(document.getElementById('max_ppo2_deco').value);
    const sacBottom = parseFloat(document.getElementById('sac_bottom').value);
    const sacDeco = parseFloat(document.getElementById('sac_deco').value);
    const gfLo = parseFloat(document.getElementById('gf_lo').value) / 100;
    const gfHi = parseFloat(document.getElementById('gf_hi').value) / 100;

    const resultsSection = document.getElementById('results');
    const errorContainer = document.getElementById('error');
    resultsSection.classList.add('hidden');
    errorContainer.classList.add('hidden');

    let time = parseFloat(document.getElementById('time').value); // what time this means depends on criteria...

    const errMsg = getSettingErrors(depth, time, o2FractionBottom, o2FractionDeco, maxPO2Bottom, gfLo, gfHi);
    if(errMsg) {
        errorContainer.textContent = errMsg;
        errorContainer.classList.remove('hidden');
        return;
    }

    // get no stop time...
    const noStopTime = calculateNoStopTime(depth, n2FractionBottom, descentRate, ascentRate, gfLo, gfHi);

    // get dive plan...
    switch(criteria) {
        case 'BOTTOM':
            // Nothing, time is already our desired bottom time...
        break;
        case 'DECO':
            time = getBottomTimeFor(BY_DECO_TIME, time, depth, n2FractionBottom, n2FractionDeco, descentRate, ascentRate, maxPO2Deco, gfLo, gfHi, currentBuehlmannTable);
        break;
        case 'RUN':
            time = getBottomTimeFor(BY_RUN_TIME, time, depth, n2FractionBottom, n2FractionDeco, descentRate, ascentRate, maxPO2Deco, gfLo, gfHi, currentBuehlmannTable);
        break;
        case 'TTS':
            time = getBottomTimeFor(BY_TTS, time, depth, n2FractionBottom, n2FractionDeco, descentRate, ascentRate, maxPO2Deco, gfLo, gfHi, currentBuehlmannTable);
        break;
    }
    const plan = getDivePlan(depth, time, n2FractionBottom, n2FractionDeco, descentRate, ascentRate, maxPO2Deco, gfLo, gfHi, currentBuehlmannTable);
    const tableBody = document.getElementById('diveplan');
    tableBody.innerHTML = '';

    let totalStopTime = -time; // the first stop in the dive plan adds the bottom time, so we offset this here.
    plan.forEach((stop) => {
        const tr = document.querySelector('template#decostop_template').content.cloneNode(true);
        const tableCells = tr.querySelectorAll('td');
        tableCells[0].textContent = stop.depth + 'm';
        tableCells[1].textContent = stop.stopTime + ' min';
        tableCells[2].textContent = stop.runTime + ' min';
        tableCells[3].textContent = stop.mix;
        tableBody.appendChild(tr);
        totalStopTime += stop.stopTime;
    });

    // get contingency
    const backupPlan = getDivePlan(depth + 3, time + 3, n2FractionBottom, n2FractionDeco, descentRate, ascentRate, maxPO2Deco, gfLo, gfHi, currentBuehlmannTable);
    const backupTableBody = document.getElementById('contingencyplan');
    backupTableBody.innerHTML = '';    
    backupPlan.forEach((stop) => {
        const tr = document.querySelector('template#decostop_template').content.cloneNode(true);
        const tableCells = tr.querySelectorAll('td');
        tableCells[0].textContent = stop.depth + 'm';
        tableCells[1].textContent = stop.stopTime + ' min';
        tableCells[2].textContent = stop.runTime + ' min';
        tableCells[3].textContent = stop.mix;
        backupTableBody.appendChild(tr);
    });
    // get dive info
    document.getElementById('optimal_bottom_ean').textContent = 'EAN' + Math.round(getOptimalBottomMixForDepth(depth, maxPO2Bottom) * 100);
    document.getElementById('optimal_deco_ean').textContent = 'EAN' + Math.round(getOptimalDecoMixFor(depth, time, n2FractionBottom, descentRate, ascentRate, maxPO2Deco, gfLo, gfHi, currentBuehlmannTable) * 100);
    document.getElementById('no_stop').textContent = noStopTime + ' min';
    document.getElementById('total_stop_time').textContent = totalStopTime + ' min';

    // get gas plan
    const gasVolumesNeeded = getGasPlan(backupPlan, sacBottom, sacDeco);
    const gasPlanContainer = document.getElementById('gasplan');
    const bottomMixRow = document.getElementById('gas_template').content.cloneNode(true);
    gasPlanContainer.innerHTML = '';
    bottomMixRow.querySelectorAll('td')[0].textContent = Math.round(o2FractionBottom * 100) == 21 ? 'Air' : 'EAN' + Math.round(o2FractionBottom * 100);
    bottomMixRow.querySelectorAll('td')[1].textContent = gasVolumesNeeded[0];
    gasPlanContainer.appendChild(bottomMixRow);
    if(o2FractionBottom !== o2FractionDeco) {
        const decoMixRow = document.getElementById('gas_template').content.cloneNode(true);
        decoMixRow.querySelectorAll('td')[0].textContent = Math.round(o2FractionDeco * 100) == 21 ? 'Air' : 'EAN' + Math.round(o2FractionDeco * 100);
        decoMixRow.querySelectorAll('td')[1].textContent = Math.ceil(gasVolumesNeeded[1]);
        gasPlanContainer.appendChild(decoMixRow);
    }

    // get minimum gas
    const minimumGasVolume = getMinimumGasVolume(backupPlan, ascentRate);
    document.getElementById('minimum_gas').textContent = minimumGasVolume;
    document.getElementById('minimum_gas_bar').textContent = Math.max(MIN_RESERVE_PRESSURE, Math.ceil(minimumGasVolume / parseFloat(document.getElementById('tank_size').value)));

    resultsSection.classList.remove('hidden');
    resultsSection.scrollIntoView(true);
}

function getNoStopTime() {
    const o2FractionBottom = (parseFloat(document.getElementById('bottom_o2').value) / 100);
    const n2Fraction = 1.0 - o2FractionBottom;
    const depth = parseFloat(document.getElementById('depth').value);
    const descentRate = parseFloat(document.getElementById('descent_rate').value);
    const ascentRate = parseFloat(document.getElementById('ascent_rate').value);
    const gfLo = parseFloat(document.getElementById('gf_lo').value) / 100;
    const gfHi = parseFloat(document.getElementById('gf_hi').value) / 100;
    const maxPO2Bottom = parseFloat(document.getElementById('max_ppo2_bottom').value);

    const resultsSection = document.getElementById('results');
    const errorContainer = document.getElementById('error');
    errorContainer.classList.add('hidden');
    resultsSection.classList.add('hidden');


    const errMsg = getSettingErrors(depth, 1, o2FractionBottom, o2FractionBottom, maxPO2Bottom, gfLo, gfHi);
    if(errMsg) {
        errorContainer.textContent = errMsg;
        errorContainer.classList.remove('hidden');
        document.getElementById('time').value = 0;
        return;
    }

    const noStopTime = calculateNoStopTime(depth, n2Fraction, descentRate, ascentRate, gfLo, gfHi, currentBuehlmannTable);
    document.getElementById('criteria').value = 'BOTTOM';
    document.getElementById('time').value = noStopTime;
}

function getBestMix() {
    const depth = parseFloat(document.getElementById('depth').value);
    const maxPO2Bottom = parseFloat(document.getElementById('max_ppo2_bottom').value);
    const bottomO2Elem = document.getElementById('bottom_o2');
    bottomO2Elem.value = Math.round(getOptimalBottomMixForDepth(depth, maxPO2Bottom) * 100);
}

function changeAlgorithm() {
    if(this.value === 'B') {
        currentBuehlmannTable = COMPARTMENTS_ZHL16B;
    } else {
        currentBuehlmannTable = COMPARTMENTS_ZHL16C;
    }
}

function useBottomMixForDeco() {
    document.getElementById('deco_o2').value = document.getElementById('bottom_o2').value;
}

function updateMinimumGasPressure() {
    const minGasVolume = parseFloat(document.getElementById('minimum_gas').textContent);
    document.getElementById('minimum_gas_bar').textContent = Math.max(MIN_RESERVE_PRESSURE, Math.ceil(minGasVolume / parseFloat(this.value)));
}

document.getElementById('plan').addEventListener('click', planDive);
document.getElementById('nostop').addEventListener('click', getNoStopTime);
document.getElementById('best_mix').addEventListener('click', getBestMix);
document.getElementById('no_decomix').addEventListener('click', useBottomMixForDeco);
document.getElementById('tank_size').addEventListener('change', updateMinimumGasPressure);
//document.forms[0].table.addEventListener('change', changeAlgorithm);
