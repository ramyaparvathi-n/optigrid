// Render Backend Endpoint (Change to your live Render URL)
const BACKEND_URL = 'https://optigrid-backend-gxv8.onrender.com';

// Load Profiles
const profiles = {
    campus: [1.2, 1.0, 0.9, 0.8, 0.9, 1.5, 2.5, 3.0, 2.8, 2.2, 2.0, 1.8, 2.0, 2.2, 2.5, 3.0, 4.0, 5.5, 6.0, 5.8, 4.5, 3.5, 2.5, 1.8],
    mall: [0.5, 0.5, 0.5, 0.5, 0.5, 0.8, 1.5, 3.0, 5.5, 7.0, 8.5, 9.0, 9.5, 9.5, 9.0, 8.5, 8.0, 7.5, 6.0, 4.0, 2.0, 1.0, 0.8, 0.5],
    residential: [0.8, 0.6, 0.5, 0.5, 0.6, 1.2, 2.8, 4.5, 3.0, 2.0, 1.8, 1.5, 1.5, 1.8, 2.0, 2.5, 3.8, 6.5, 8.0, 7.5, 5.5, 3.8, 2.0, 1.2]
};

let demandProfile = [...profiles.campus];
const tariffProfile = [4, 4, 4, 4, 4, 4, 6, 6, 8, 8, 8, 6, 6, 6, 6, 8, 8, 12, 12, 12, 12, 8, 6, 4];

document.getElementById('runBtn').addEventListener('click', runOptimizationEngine);
document.getElementById('saveDbBtn').addEventListener('click', saveScenarioToBackend);
window.addEventListener('load', () => {
    runOptimizationEngine();
    fetchScenarioHistory();
});

function applyPreset(type, evt) {
    document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
    evt.target.classList.add('active');
    if (profiles[type]) {
        demandProfile = [...profiles[type]];
        runOptimizationEngine();
    }
}

async function runOptimizationEngine() {
    const citySelect = document.getElementById('citySelect');
    const cityName = citySelect.options[citySelect.selectedIndex].text;
    const [lat, lon] = citySelect.value.split(',');
    const area = parseFloat(document.getElementById('panelArea').value);
    const batteryCap = parseFloat(document.getElementById('batteryCap').value);

    document.getElementById('panelAreaVal').textContent = area;
    document.getElementById('batteryCapVal').textContent = batteryCap;

    let irradiance = [], temp = [];
    try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=shortwave_radiation,temperature_2m`);
        const data = await res.json();
        irradiance = data.hourly.shortwave_radiation.slice(0, 24);
        temp = data.hourly.temperature_2m.slice(0, 24);
    } catch (e) {
        irradiance = Array.from({ length: 24 }, (_, i) => Math.max(0, 800 * Math.sin((Math.PI * (i - 6)) / 12)));
        temp = Array(24).fill(25);
    }

    const solarPV = irradiance.map((rad, i) => Math.max(0, (area * 0.18 * (rad / 1000)) * (1 - 0.004 * (temp[i] - 25))));

    let gridImport = [], batteryCharge = [], batteryDischarge = [];
    let soc = batteryCap * 0.2;
    const maxRate = 3.0;

    for (let i = 0; i < 24; i++) {
        let net = demandProfile[i] - solarPV[i];
        let ch = 0, dis = 0, grid = 0;

        if (net < 0) {
            ch = Math.min(Math.abs(net), maxRate, batteryCap - soc);
            soc += ch;
            grid = 0;
        } else {
            if (tariffProfile[i] >= 8 && soc > 0) {
                dis = Math.min(net, maxRate, soc);
                soc -= dis;
                grid = net - dis;
            } else {
                grid = net;
            }
        }
        gridImport.push(grid);
        batteryCharge.push(ch);
        batteryDischarge.push(dis);
    }

    const baseCost = demandProfile.reduce((a, d, i) => a + Math.max(0, d - solarPV[i]) * tariffProfile[i], 0);
    const optCost = gridImport.reduce((a, g, i) => a + (g * tariffProfile[i]) + (batteryDischarge[i] * 0.50), 0);
    const savings = baseCost - optCost;
    const savingsPct = ((savings / baseCost) * 100).toFixed(1);

    document.getElementById('baselineCost').textContent = `₹${baseCost.toFixed(2)}`;
    document.getElementById('optimizedCost').textContent = `₹${optCost.toFixed(2)}`;
    document.getElementById('savingsVal').textContent = `₹${savings.toFixed(2)} (${savingsPct}%)`;

    const annualSave = savings * 365;
    document.getElementById('annualSavings').textContent = `₹${annualSave.toFixed(0)}`;
    document.getElementById('co2Offset').textContent = `${(solarPV.reduce((a, b) => a + b, 0) * 0.85 * 365 / 1000).toFixed(1)} Tons`;
    document.getElementById('paybackPeriod').textContent = `${(80000 / annualSave).toFixed(1)} Years`;

    window.lastOptimizationData = {
        cityName, area, batteryCap, baseCost, optCost, savings, solarPV, gridImport, batteryDischarge, irradiance, temp, annualSave
    };

    const tbody = document.querySelector('#vectorTable tbody');
    if (tbody) {
        tbody.innerHTML = '';
        for (let i = 0; i < 6; i++) {
            tbody.innerHTML += `<tr><td>${i}:00</td><td>₹${tariffProfile[i]}</td><td>${gridImport[i].toFixed(2)}</td><td>${batteryCharge[i].toFixed(2)}</td><td>${batteryDischarge[i].toFixed(2)}</td></tr>`;
        }
    }

    renderAllCharts(solarPV, gridImport, batteryDischarge, irradiance, temp, annualSave);
}

// REST API Database Functions
async function saveScenarioToBackend() {
    const d = window.lastOptimizationData;
    if (!d) return;

    const btn = document.getElementById('saveDbBtn');
    btn.textContent = '⏳ Saving...';

    try {
        const res = await fetch(`${BACKEND_URL}/api/scenarios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                city: d.cityName,
                panelArea: d.area,
                batteryCap: d.batteryCap,
                baselineCost: d.baseCost,
                optimizedCost: d.optCost,
                savings: d.savings
            })
        });
        const result = await res.json();
        if (result.success) {
            alert(' Scenario successfully saved to MongoDB!');
            fetchScenarioHistory();
        }
    } catch (err) {
        alert('Failed to connect to backend server.');
    } finally {
        btn.textContent = '💾 Save to Database';
    }
}

async function fetchScenarioHistory() {
    try {
        const res = await fetch(`${BACKEND_URL}/api/scenarios`);
        const result = await res.json();
        if (result.success) {
            const tbody = document.querySelector('#historyTable tbody');
            if (tbody) {
                tbody.innerHTML = '';
                result.data.forEach(item => {
                    const dateStr = new Date(item.createdAt).toLocaleDateString();
                    tbody.innerHTML += `<tr>
            <td>${dateStr}</td>
            <td>${item.city}</td>
            <td>${item.panelArea}</td>
            <td>${item.batteryCap}</td>
            <td style="color: #10b981; font-weight: bold;">₹${item.savings.toFixed(2)}</td>
          </tr>`;
                });
            }
        }
    } catch (err) {
        console.warn("Backend database logging offline");
    }
}