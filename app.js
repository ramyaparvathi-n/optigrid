// Tab Navigation Controller with Chart Resize Trigger & MathJax Typesetting
document.querySelectorAll('.nav-btn').forEach(button => {
    button.addEventListener('click', () => {
        // 1. Remove active state from all buttons
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

        // 2. Hide all page sections
        document.querySelectorAll('.page-view').forEach(page => page.classList.remove('active'));

        // 3. Set clicked button active
        button.classList.add('active');

        // 4. Show targeted page section
        const targetPageId = button.getAttribute('data-target');
        const targetPage = document.getElementById(targetPageId);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        // 5. Force Chart.js to recalculate canvas dimensions after tab becomes visible
        if (window.lastOptimizationData) {
            const { solarPV, gridImport, batteryDischarge, irradiance, temp, annualSave } = window.lastOptimizationData;
            renderAllCharts(solarPV, gridImport, batteryDischarge, irradiance, temp, annualSave);
        }

        // 6. Trigger MathJax typesetting for LaTeX equations
        if (window.MathJax) {
            window.MathJax.typesetPromise();
        }
    });
});