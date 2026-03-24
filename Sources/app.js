// Variable global para los datos procesados
let globalData = [];

// Cargar Google Charts y ejecutar la app
google.charts.load('current', { 'packages': ['corechart', 'bar'] });
google.charts.setOnLoadCallback(initApp);

function initApp() {
    // Tomamos la variable rawCSVData que cargamos en el index.html mediante el src="data.js"
    globalData = parseCSV(rawCSVData);

    // Dibujar gráficos inmediatamente
    drawAllCharts();

    // Configurar los filtros interactivos
    document.getElementById('countryFilter').addEventListener('change', drawChart3);
    document.getElementById('genreFilter').addEventListener('change', drawChart4);
    window.addEventListener('resize', drawAllCharts);
}

// Parser manual de CSV (Mantenemos la lógica intacta para procesar comillas y saltos)
function parseCSV(text) {
    let result = [];
    let inQuotes = false;
    let row = [];
    let word = '';

    for (let i = 0; i < text.length; i++) {
        let char = text[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            row.push(word.trim());
            word = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (word || row.length > 0) {
                row.push(word.trim());
                if (row.length > 1) result.push(row);
                row = [];
                word = '';
            }
        } else {
            word += char;
        }
    }
    if (word || row.length > 0) {
        row.push(word.trim());
        if (row.length > 1) result.push(row);
    }

    const headers = result[0];
    return result.slice(1).map(row => {
        let obj = {};
        headers.forEach((h, i) => { obj[h] = row[i] ? row[i] : null; });
        return obj;
    }).filter(row => Object.keys(row).length > 1);
}

function drawAllCharts() {
    drawChart1(); drawChart2(); drawChart3(); drawChart4();
}

// ==========================================
// Desafío 1: Proporción
// ==========================================
function drawChart1() {
    let movies = 0, tvShows = 0;
    globalData.forEach(d => {
        if (d.type === 'Movie') movies++;
        if (d.type === 'TV Show') tvShows++;
    });

    var data = google.visualization.arrayToDataTable([
        ['Tipo', 'Cantidad'], ['Películas', movies], ['Series de TV', tvShows]
    ]);

    var options = {
        pieSliceText: 'percentage', colors: ['#E50914', '#221F1F'],
        legend: { position: 'bottom' }, chartArea: { width: '90%', height: '80%' }
    };
    new google.visualization.PieChart(document.getElementById('chart1')).draw(data, options);
}

// ==========================================
// Desafío 2: Evolución Anual
// ==========================================
function drawChart2() {
    let yearlyData = {};
    globalData.forEach(d => {
        if (!d.date_added) return;
        let yearMatch = d.date_added.match(/\d{2,4}$/);
        if (yearMatch) {
            let year = parseInt(yearMatch[0]);
            year = year < 100 ? 2000 + year : year;
            if (!yearlyData[year]) yearlyData[year] = { Movie: 0, TVShow: 0 };
            if (d.type === 'Movie') yearlyData[year].Movie++;
            if (d.type === 'TV Show') yearlyData[year].TVShow++;
        }
    });

    let dataArray = [['Año', 'Películas', 'Series de TV']];
    Object.keys(yearlyData).sort().forEach(year => {
        dataArray.push([year, yearlyData[year].Movie, yearlyData[year].TVShow]);
    });

    var data = google.visualization.arrayToDataTable(dataArray);
    var options = {
        hAxis: { title: 'Año de incorporación', format: '0000' },
        vAxis: { title: 'Títulos añadidos' },
        colors: ['#E50914', '#564d4d'], legend: { position: 'top' },
        focusTarget: 'category', chartArea: { width: '80%', height: '70%' }
    };
    new google.visualization.AreaChart(document.getElementById('chart2')).draw(data, options);
}

// ==========================================
// Desafío 3: Top Países
// ==========================================
function drawChart3() {
    let limit = parseInt(document.getElementById('countryFilter').value);
    let countryCounts = {};

    globalData.forEach(d => {
        if (!d.country) return;
        let countries = d.country.split(',').map(c => c.trim());
        countries.forEach(c => { if (c) countryCounts[c] = (countryCounts[c] || 0) + 1; });
    });

    let sortedCountries = Object.entries(countryCounts)
        .sort((a, b) => b[1] - a[1]).slice(0, limit);

    var data = new google.visualization.DataTable();
    data.addColumn('string', 'País'); data.addColumn('number', 'Títulos');
    data.addColumn({ type: 'string', role: 'style' });
    data.addColumn({ type: 'string', role: 'tooltip' });

    let maxVal = sortedCountries[0][1];
    sortedCountries.forEach(item => {
        let intensity = 0.4 + (0.6 * (item[1] / maxVal));
        let colorStyle = `color: rgba(229, 9, 20, ${intensity})`;
        let tooltipText = `${item[0]}: ${item[1].toLocaleString()} títulos`;
        data.addRow([item[0], item[1], colorStyle, tooltipText]);
    });

    var options = {
        hAxis: { title: 'Cantidad' }, legend: { position: 'none' },
        chartArea: { width: '70%', height: '80%' }
    };
    new google.visualization.BarChart(document.getElementById('chart3')).draw(data, options);
}

// ==========================================
// Desafío 4: Géneros
// ==========================================
function drawChart4() {
    let contentType = document.getElementById('genreFilter').value;
    let genreCounts = {};

    globalData.forEach(d => {
        if (d.type === contentType && d.listed_in) {
            let genres = d.listed_in.split(',').map(g => g.trim());
            genres.forEach(g => { if (g) genreCounts[g] = (genreCounts[g] || 0) + 1; });
        }
    });

    let sortedGenres = Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1]).slice(0, 7);

    var data = new google.visualization.DataTable();
    data.addColumn('string', 'Género'); data.addColumn('number', 'Títulos');
    data.addColumn({ type: 'string', role: 'style' });
    data.addColumn({ type: 'string', role: 'tooltip' });

    const palette = ['#E50914', '#B81D24', '#8C2B30', '#5E383B', '#F5A623', '#4A90E2', '#50E3C2'];
    sortedGenres.forEach((item, index) => {
        let colorStyle = `color: ${palette[index % palette.length]}`;
        let tooltipText = `Categoría: ${item[0]}\nTotal: ${item[1].toLocaleString()} títulos`;
        data.addRow([item[0], item[1], colorStyle, tooltipText]);
    });

    var options = {
        vAxis: { title: 'Cantidad' }, legend: { position: 'none' },
        chartArea: { width: '80%', height: '70%' },
        animation: { startup: true, duration: 1000, easing: 'out' }
    };
    new google.visualization.ColumnChart(document.getElementById('chart4')).draw(data, options);
}