let instances = {};

function renderAllCharts(solar, grid, discharge, irradiance, temp, annualSave) {
    const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);

    // Destroy existing charts to prevent duplication bugs
    Object.values(instances).forEach(chart => {
        if (chart) chart.destroy();
    });

    // 1. Dispatch Profile Chart
    const elDispatch = document.getElementById('dispatchChart');
    if (elDispatch) {
        instances.dispatch = new Chart(elDispatch, {
            type: 'line',
            data: {
                labels: hours,
                datasets: [
                    { label: 'Demand (kW)', data: demandProfile, borderColor: '#f43f5e', borderDash: [5, 5] },
                    { label: 'Solar Output (kW)', data: solar, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true },
                    { label: 'Grid Import (kW)', data: grid, borderColor: '#38bdf8' }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // 2. Tariff & Peak-Shaving Battery Discharge Chart
    const elTariff = document.getElementById('tariffChart');
    if (elTariff) {
        instances.tariff = new Chart(elTariff, {
            type: 'bar',
            data: {
                labels: hours,
                datasets: [
                    { label: 'Tariff (₹/kWh)', data: tariffProfile, type: 'line', borderColor: '#f59e0b', yAxisID: 'y1' },
                    { label: 'Battery Discharge (kW)', data: discharge, backgroundColor: '#8b5cf6', yAxisID: 'y' }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y1: { position: 'right' } } }
        });
    }

    // 3. Weather Analytics Chart
    const elWeather = document.getElementById('weatherChart');
    if (elWeather) {
        instances.weather = new Chart(elWeather, {
            type: 'line',
            data: {
                labels: hours,
                datasets: [
                    { label: 'Irradiance (W/m²)', data: irradiance, borderColor: '#facc15' },
                    { label: 'Temperature (°C)', data: temp, borderColor: '#ef4444' }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // 4. ROI Accumulation Chart
    const elRoi = document.getElementById('roiChart');
    if (elRoi) {
        const years = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'];
        const returns = years.map((_, i) => (annualSave * (i + 1)) - 80000);
        instances.roi = new Chart(elRoi, {
            type: 'bar',
            data: {
                labels: years,
                datasets: [{ label: 'Net Return (₹)', data: returns, backgroundColor: returns.map(v => v > 0 ? '#10b981' : '#ef4444') }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
    // 5. PV Electrical Yield Chart (Page 2 Right Panel)
    const elPvYield = document.getElementById('pvYieldChart');
    if (elPvYield) {
        instances.pvYield = new Chart(elPvYield, {
            type: 'line',
            data: {
                labels: hours,
                datasets: [
                    {
                        label: 'Converted Power (kW)',
                        data: solar,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        fill: true,
                        tension: 0.3
                    }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
}