const profileUploadElem = document.querySelector('input#profile');
const ctx = document.querySelector('canvas').getContext('2d');

function processDivesFromCSV(textContent) {
    const lines = textContent.split('\n').slice(1); // removes the header line
    const dives = [];
    const samples = lines.map((line) => {
        if(!line) return;
        const parts = line.replace(/"/g, '').split(',');
        const parsedTime = parts[3].split(':').map(parseFloat);
        const runtimeSecs = parsedTime[0] * 60 + parsedTime[1];
        return {
            diveNumber: parseFloat(parts[0]),
            time: runtimeSecs,
            depth: parseFloat(parts[4])
        }
    }).filter((sample) => sample);
    console.log(`Parsed ${samples.length} samples`);
    let currentDiveNumber = samples[0].diveNumber;
    let currentSample = 0;
    do {
        const currentDive = []; // create a new dive
        do {
            currentDive.push(samples[currentSample]);
            currentSample++;
        } while(currentSample < samples.length && samples[currentSample].diveNumber === currentDiveNumber);
        dives.push(currentDive);
        if(currentSample < samples.length) {
            currentDiveNumber = samples[currentSample].diveNumber;
        }
    } while(currentSample < samples.length);
    return dives;
}

function parseColor(htmlColorString) {
    return {
        r: parseInt(htmlColorString.slice(1, 3), 16),
        g: parseInt(htmlColorString.slice(3, 5), 16),
        b: parseInt(htmlColorString.slice(5),    16)
    };
}

function plotDives(dives) {
    let canvasWidth = parseFloat(document.getElementById('width').value);
    let canvasHeight = parseFloat(document.getElementById('height').value);
    let gradientStartColor = parseColor(document.getElementById('gradientstart').value);
    let gradientStopColor = parseColor(document.getElementById('gradientstop').value);
    let deltaColor = {
        r: gradientStopColor.r - gradientStartColor.r,
        g: gradientStopColor.g - gradientStartColor.g,
        b: gradientStopColor.b - gradientStartColor.b,
    }
    const canvas = document.querySelector('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;    
    // find max length
    const maxNumSamples = Math.max(...dives.map((dive) => dive.length)) + 1;
    // find max depth
    const maxDepth = Math.max(...dives.map(dive => Math.max(...dive.map(sample => sample.depth)))) + 1;
    // plot each dive
    const PIXELS_PER_SAMPLE = canvasWidth / maxNumSamples;
    const PIXELS_PER_METER = canvasHeight / maxDepth;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    // grid lines
    ctx.strokeStyle = 'rgba(200, 200, 200, 1)';
    for(let y = 0; y < canvasHeight; y += PIXELS_PER_METER) {
/*        if(Math.round(y) % 10 <= 1) {
            ctx.strokeStyle = 'rgba(64, 64, 64, 1)';
        } else {
            ctx.strokeStyle = 'rgba(200, 200, 200, 1)';
        }*/
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasWidth, y);
        ctx.stroke();
    }
    for(let x = 0; x < canvasWidth; x += (PIXELS_PER_SAMPLE * 6)) {
        /*
        if(Math.round(x) % 60 === 0) {
            ctx.strokeStyle = 'rgba(64, 64, 64, 1)';
        } else {
            ctx.strokeStyle = 'rgba(200, 200, 200, 1)';
        }*/
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasHeight);
        ctx.stroke();
        console.log(x)
    }    
    dives.forEach((dive, d) => {
        ctx.strokeStyle = `rgba(${Math.round(gradientStartColor.r + deltaColor.r * (d/dives.length))}, ${Math.round(gradientStartColor.g + deltaColor.g * (d/dives.length))}, ${Math.round(gradientStartColor.b + deltaColor.b * (d/dives.length))}, 1)`;
        ctx.beginPath();
        ctx.moveTo(0,0);
        dive.forEach((sample, s) => ctx.lineTo(s * PIXELS_PER_SAMPLE, sample.depth * PIXELS_PER_METER));
        ctx.stroke();
    });
}

function processFileSelection() {
    const blob = new Blob(this.files, {type: 'text/csv'});
    const reader = new FileReader();
    reader.onload = function() {
        dives = processDivesFromCSV(this.result);
        plotDives(dives);
    };
    reader.readAsText(blob, 'utf8');
}

let dives = [];
profileUploadElem.addEventListener('input', processFileSelection);
document.querySelector('button').addEventListener('click', () => {
    plotDives(dives);
})