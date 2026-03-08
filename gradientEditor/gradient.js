// @ts-nocheck

const bar = document.getElementById("gradient-bar");
const container = document.getElementById("gradient-container");
const colorPicker = document.getElementById("colorPicker");
const deleteBtn = document.getElementById("delete");
const vscode = acquireVsCodeApi();
let selected = null;

let stops = [
    {pos:0,color:"#ff0000"},
    {pos:1,color:"#0000ff"}
];
console.log("initialStops:", window.initialStops);
if (window.initialStops && Array.isArray(window.initialStops) && window.initialStops.length) {
    stops = window.initialStops;
}

const presets = [
];

const saved=localStorage.getItem("gradientPresets");

if(saved){
    presets.push(...JSON.parse(saved));
}

function drawGradient(){

    const sorted=[...stops].sort((a,b)=>a.pos-b.pos);

    const css=sorted
        .map(s=>`${s.color} ${s.pos*100}%`)
        .join(",");

    bar.style.background=`linear-gradient(to right,${css})`;

    document.querySelectorAll(".stop,.label").forEach(e=>e.remove());

    sorted.forEach(stop=>{
        createStop(stop);
    });
}

function createStop(stop){

    const handle=document.createElement("div");
    handle.className="stop";


    handle.style.left=`${stop.pos*100}%`;
    handle.style.background=stop.color;

    const label=document.createElement("div");
    label.className="label";
    label.style.left=`${stop.pos*100}%`;
    label.innerText=Math.round(stop.pos*100)+"%";

    if(stop === selected){
        label.classList.add("selected");
        handle.classList.add("selected");

    }

    container.appendChild(handle);
    container.appendChild(label);

    handle.onmousedown=(e)=>startDrag(e,stop,handle,label);

    handle.onclick=(e)=>{
        e.stopPropagation();
        selected = stop;
        colorPicker.value = stop.color;
        drawGradient();
    };

    handle.oncontextmenu=(e)=>{
        e.preventDefault();

        if(stop.pos===0||stop.pos===1) return;

        stops=stops.filter(s=>s!==stop);
        drawGradient();
    };
}
function hexToRgb(hex){

    hex = hex.replace("#","");

    const bigint = parseInt(hex,16);

    return {
        r:(bigint>>16)&255,
        g:(bigint>>8)&255,
        b:bigint&255
    };
}

function rgbToHex(r,g,b){

    return "#"+[r,g,b]
        .map(x=>x.toString(16).padStart(2,"0"))
        .join("");
}

function hexToRgb(hex){

    hex = hex.replace("#","");

    const bigint = parseInt(hex,16);

    return {
        r:(bigint>>16)&255,
        g:(bigint>>8)&255,
        b:bigint&255
    };
}
function sampleGradient(p){

    const sorted = [...stops].sort((a,b)=>a.pos-b.pos);

    let left = sorted[0];
    let right = sorted[sorted.length-1];

    for(let i=0;i<sorted.length-1;i++){
        if(p >= sorted[i].pos && p <= sorted[i+1].pos){
            left = sorted[i];
            right = sorted[i+1];
            break;
        }
    }

    const range = right.pos - left.pos || 1;
    const t = (p - left.pos) / range;

    const c1 = hexToRgb(left.color);
    const c2 = hexToRgb(right.color);

    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);

    return rgbToHex(r,g,b);
}
function generateColorSequence(){

    const sorted = [...stops].sort((a,b)=>a.pos-b.pos);

    const keypoints = sorted.map(stop => {

        const rgb = hexToRgb(stop.color);

        return `ColorSequenceKeypoint.new(${stop.pos.toFixed(3)}, Color3.fromRGB(${rgb.r}, ${rgb.g}, ${rgb.b}))`;

    });

    return `ColorSequence.new({\n    ${keypoints.join(",\n    ")}\n})`;
}

function startDrag(e,stop,handle,label){

    if(stop.pos===0||stop.pos===1) return;

    function move(ev){

        const rect=bar.getBoundingClientRect();
        let x=(ev.clientX-rect.left)/rect.width;

        x = Math.max(0.001, Math.min(0.999, x));


        stop.pos=x;

        handle.style.left=`${x*100}%`;
        label.style.left=`${x*100}%`;
        label.innerText=Math.round(x*100)+"%";

        drawGradient();
    }

    function up(){
        window.removeEventListener("mousemove",move);
        window.removeEventListener("mouseup",up);
    }

    window.addEventListener("mousemove",move);
    window.addEventListener("mouseup",up);

    selected = stop;
    drawGradient();
}

function drawPresets(){

    const bar = document.getElementById("preset-bar");

    bar.innerHTML="";

    presets.forEach(p=>{

        const el=document.createElement("div");

        el.className="preset";
        el.title = `${p.name}\nRight click to delete`;        
        el.oncontextmenu = (e)=>{
            e.preventDefault();
            presets.splice(presets.indexOf(p),1);
            localStorage.setItem(
                "gradientPresets",
                JSON.stringify(presets)
            );
            drawPresets();
        };

        const css=p.stops
            .map(s=>`${s.color} ${s.pos*100}%`)
            .join(",");

        el.style.background=`linear-gradient(to right,${css})`;

        el.onclick=()=>{
            stops=JSON.parse(JSON.stringify(p.stops));
            drawGradient();
        };
        

        bar.appendChild(el);

    });

}

bar.onclick=(e)=>{

    const rect=bar.getBoundingClientRect();
    const pos=(e.clientX-rect.left)/rect.width;

    const newStop = {
        pos: Math.max(0, Math.min(1, pos)),
        color: sampleGradient(pos)
    };

    stops.push(newStop);
    selected=newStop;
    colorPicker.value=newStop.color;

    drawGradient();
};

colorPicker.oninput=()=>{
    if(!selected) return;

    selected.color=colorPicker.value;
    drawGradient();
};

const applyBtn = document.getElementById("apply");

applyBtn.onclick = () => {
    console.log("applying color sequence")
    const sequence = generateColorSequence();

    vscode.postMessage({
        type: "applyColorSequence",
        value: sequence
    });

};

deleteBtn.onclick=()=>{
    if(!selected) return;
    if(selected.pos===0||selected.pos===1) return;

    stops=stops.filter(s=>s!==selected);
    selected=null;

    drawGradient();
};

const saveBtn = document.getElementById("savePreset");
const presetInput = document.getElementById("presetName");


window.addEventListener("keydown",(e)=>{

    if(e.key !== "Delete") return;

    if(!selected) return;

    if(selected.pos === 0 || selected.pos === 1) return;

    stops = stops.filter(s => s !== selected);

    selected = null;

    drawGradient();

});
saveBtn.onclick = () => {

    const name = presetInput.value.trim();

    if(!name) return;

    presets.push({
        name,
        stops: JSON.parse(JSON.stringify(stops))
    });

    localStorage.setItem("gradientPresets", JSON.stringify(presets));

    presetInput.value = "";

    drawPresets();
};

drawGradient();
drawPresets();