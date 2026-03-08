// @ts-nocheck

const container = document.getElementById("graph-container");
const canvas = document.getElementById("graph");
const ctx = canvas.getContext("2d");

const deleteBtn = document.getElementById("delete");
const applyBtn = document.getElementById("apply");
const vscode = acquireVsCodeApi();

const MAX_KEYS = 20;

let selected = null;
let keys = [
    { time: 0, value: 0, envelope: 0 },
    { time: 1, value: 1, envelope: 0 }
];

if (window.initialKeys && Array.isArray(window.initialKeys) && window.initialKeys.length) {
    keys = window.initialKeys;
}
if (!keys.find(k => k.time === 0)) {
    keys.push({ time:0, value:0, envelope:0 });
}

if (!keys.find(k => k.time === 1)) {
    keys.push({ time:1, value:1, envelope:0 });
}

function sortKeys(){
    keys.sort((a,b)=>a.time-b.time);
}
function resize() {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}

function drawGrid() {

    const steps = 5;

    ctx.strokeStyle = "#333";
    ctx.fillStyle = "#888";
    ctx.font = "10px Segoe UI";

    for (let i = 0; i <= steps; i++) {

        const y = canvas.height - (i / steps) * canvas.height;

        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();

        ctx.fillText((i / steps).toFixed(1), 4, y - 2);

    }

}

function drawGraph() {

    resize();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawGrid();

    const sorted = [...keys].sort((a, b) => a.time - b.time);

    ctx.strokeStyle = "#00b7ff";
    ctx.lineWidth = 2;

    ctx.beginPath();

    sorted.forEach((k, i) => {

        const x = k.time * canvas.width;
        const y = (1 - k.value) * canvas.height;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);

    });

    ctx.stroke();

    drawEnvelope(sorted);

}

function drawEnvelope(sorted) {

    ctx.fillStyle = "rgba(0,183,255,0.2)";

    ctx.beginPath();

    sorted.forEach((k, i) => {

        const x = k.time * canvas.width;
        const upper = Math.min(1, k.value + k.envelope);
        const y = (1 - upper) * canvas.height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);

    });

    for (let i = sorted.length - 1; i >= 0; i--) {

        const k = sorted[i];

        const x = k.time * canvas.width;
        const lower = Math.max(0, k.value - k.envelope);
        const y = (1 - lower) * canvas.height;
        ctx.lineTo(x, y);

    }

    ctx.closePath();
    ctx.fill();

}

function drawKeys() {

    document.querySelectorAll(".key,.envelope-bar").forEach(e => e.remove());
    const sorted = [...keys].sort((a, b) => a.time - b.time);

    sorted.forEach(key => {

        const x = key.time * canvas.width;
        const y = (1 - key.value) * canvas.height;
        const el = document.createElement("div");
        el.style.zIndex = 2;
        el.style.pointerEvents = "auto";
        el.className = "key";

        if (key === selected) el.classList.add("selected");

        el.style.left = x + "px";
        el.style.top = y + "px";

        container.appendChild(el);

        el.onclick = e => {
            e.stopPropagation();
            selected = key;
            redraw();
        };

        el.onmousedown = e => startDrag(e, key);

        el.oncontextmenu = e => {
            e.preventDefault();
            deleteKey(key);
        };

        drawEnvelopeHandles(key, x, y);

    });

}
function drawEnvelopeHandles(key, x, y) {

    const MIN_VISUAL_ENVELOPE = 0.03;
    const GAP = 6;
    const HANDLE_HEIGHT = 8;

    const visualEnvelope = Math.max(key.envelope, MIN_VISUAL_ENVELOPE);

    const upper = Math.min(1, key.value + visualEnvelope);
    const lower = Math.max(0, key.value - visualEnvelope);

    const topY = (1 - upper) * canvas.height;
    const bottomY = (1 - lower) * canvas.height;

    // top bar
    const barTop = document.createElement("div");
    barTop.className = "envelope-bar";

    barTop.style.left = x + "px";
    barTop.style.top = (topY - HANDLE_HEIGHT - GAP) + "px";
    barTop.style.height = HANDLE_HEIGHT + "px";

    // bottom bar
    const barBottom = document.createElement("div");
    barBottom.className = "envelope-bar";

    barBottom.style.left = x + "px";
    barBottom.style.top = (bottomY + GAP) + "px";
    barBottom.style.height = HANDLE_HEIGHT + "px";

    container.appendChild(barTop);
    container.appendChild(barBottom);
    barTop.onmousedown = e => dragEnvelope(e, key, "top");
    barBottom.onmousedown = e => dragEnvelope(e, key, "bottom");
}
function dragEnvelope(e, key, side) {

    e.stopPropagation();
    e.preventDefault();

    const rect = container.getBoundingClientRect();

    const startEnvelope = key.envelope;
    const startMouseY = e.clientY;

    function move(ev) {

        const deltaPixels = ev.clientY - startMouseY;
        const delta = deltaPixels / rect.height;

        let newEnvelope;

        if (side === "top") {
            newEnvelope = startEnvelope - delta;
        } else {
            newEnvelope = startEnvelope + delta;
        }

        const maxEnvelope = Math.min(key.value, 1 - key.value);
        key.envelope = Math.max(0, Math.min(newEnvelope, maxEnvelope));
        redraw();
    }

    function up() {
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
    }

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
}
function startDrag(e, key) {

    e.stopPropagation();
    selected = key;   
    redraw();
    function move(ev) {

        const rect = container.getBoundingClientRect();

        let x = (ev.clientX - rect.left) / rect.width;
        let y = (ev.clientY - rect.top) / rect.height;
        x = Math.max(0, Math.min(1, x));
        y = Math.max(0, Math.min(1, y));

        const sorted = [...keys].sort((a, b) => a.time - b.time);

        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        if (key !== first && key !== last) {

            const index = sorted.indexOf(key);

            const prev = sorted[index - 1];
            const next = sorted[index + 1];

            const min = prev.time + 0.0001;
            const max = next.time - 0.0001;

            key.time = Math.max(min, Math.min(max, x));
        }

        key.value = 1 - y;

        redraw();
    }

    function up() {
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
    }

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);

}

function drawKeypointsPanel(){

    const panel = document.getElementById("keypoints-panel");
    panel.innerHTML = "";

    const sorted = [...keys].sort((a,b)=>a.time-b.time);

    sorted.forEach(key => {

        const card = document.createElement("div");
        card.className = "keypoint-card";

        const timeLabel = document.createElement("label");
        timeLabel.textContent = "Time";

        const time = document.createElement("input");
        time.value = key.time.toFixed(3);

        timeLabel.appendChild(time);

        const valueLabel = document.createElement("label");
        valueLabel.textContent = "Position";

        const value = document.createElement("input");
        value.value = key.value.toFixed(3);

        valueLabel.appendChild(value);

        const envLabel = document.createElement("label");
        envLabel.textContent = "Envelope";

        const envelope = document.createElement("input");
        envelope.value = key.envelope.toFixed(3);

        envLabel.appendChild(envelope);

        const remove = document.createElement("button");
        remove.textContent = "Delete";

        const isEndpoint = key.time === 0 || key.time === 1;

        if(isEndpoint){
            remove.classList.add("disabled");
            remove.disabled = true;
            time.disabled = true;
            time.style.opacity = "0.5";
        }
        time.onchange = () => {

            if (key.time === 0 || key.time === 1) return;

            let v = parseFloat(time.value);

            if (isNaN(v)) return;

            v = Math.max(0.001, Math.min(0.999, v));

            key.time = v;

            redraw();
        };

        value.onchange = () => {
            key.value = Math.max(0, Math.min(1, parseFloat(value.value)));
            redraw();
        };

        envelope.onchange = () => {
            const maxEnvelope = Math.min(key.value, 1 - key.value);
            key.envelope = Math.max(0, Math.min(parseFloat(envelope.value), maxEnvelope));
            redraw();
        };

        remove.onclick = () => deleteKey(key);

        card.append(timeLabel, valueLabel, envLabel, remove);

        panel.appendChild(card);
    });
}

container.onclick = e => {

    if (keys.length >= MAX_KEYS) return;

    const rect = container.getBoundingClientRect();

    const t = (e.clientX - rect.left) / rect.width;
    const mouseY = e.clientY - rect.top;

    const sorted = [...keys].sort((a,b)=>a.time-b.time);

    // find the segment the click is in
    let left = sorted[0];
    let right = sorted[sorted.length-1];

    for(let i=0;i<sorted.length-1;i++){
        if(t >= sorted[i].time && t <= sorted[i+1].time){
            left = sorted[i];
            right = sorted[i+1];
            break;
        }
    }

    const segmentT = (t - left.time) / (right.time - left.time || 1);

    const value =
        left.value + (right.value - left.value) * segmentT;

    const curveY = (1 - value) * rect.height;

    const HITBOX = 14; // bigger = easier clicking

    if(Math.abs(mouseY - curveY) > HITBOX) return;

    keys.push({
        time: Math.max(0, Math.min(1, t)),
        value: value,
        envelope: 0
    });
    selected = keys[keys.length - 1];
    redraw();
};

function deleteKey(key) {

    if (!key) return;
    if (key.time === 0 || key.time === 1) return;

    keys = keys.filter(k => k !== key);

    if (selected === key) selected = null;

    redraw();

}

deleteBtn.onclick = () => deleteKey(selected);

window.addEventListener("keydown", e => {
    if (e.key === "Delete") deleteKey(selected);
});

function generateSequence() {

    const sorted = [...keys].sort((a, b) => a.time - b.time);

    const parts = sorted.map(k => {
        return `NumberSequenceKeypoint.new(${k.time.toFixed(3)}, ${k.value.toFixed(3)}, ${k.envelope.toFixed(3)})`;
    });

    return `NumberSequence.new({\n    ${parts.join(",\n    ")}\n})`;

}

applyBtn.onclick = () => {

    const seq = generateSequence();

    vscode.postMessage({
        type: "applyNumberSequence",
        value: seq
    });

};
function redraw(){
    sortKeys();
    drawGraph();
    drawKeys();
    drawKeypointsPanel();
}

redraw();
new ResizeObserver(() => {
    redraw();
}).observe(container);