// URL directa al archivo crudo en GitHub
const csvUrl = 'https://raw.githubusercontent.com/munevardo/Data-visualization-google-charts/main/Data/netflix-data.csv';

let globalData = [];

google.charts.load('current', { 'packages': ['corechart'] });
google.charts.setOnLoadCallback(initApp);

async function initApp() {
    try {
        const response = await fetch(csvUrl);
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

        const textData = await response.text();
        globalData = parseCSVStateMachine(textData);

        drawAllCharts();

        document.getElementById('countryFilter').addEventListener('change', drawChart3);
        document.getElementById('genreFilter').addEventListener('change', drawChart4);
        window.addEventListener('resize', drawAllCharts);

    } catch (error) {
        console.error("Error cargando los datos:", error);
    }
}

// LECTOR STATE MACHINE: Infalible contra comillas dobles y comas internas
function parseCSVStateMachine(str) {
    const arr = [];
    let quote = false;
    let row = 0, col = 0;

    for (let c = 0; c < str.length; c++) {
        let cc = str[c], nc = str[c + 1];
        arr[row] = arr[row] || [];
        arr[row][col] = arr[row][col] || '';

        if (cc === '"' && quote && nc === '"') { arr[row][col] += cc; ++c; continue; }
        if (cc === '"') { quote = !quote; continue; }
        if (cc === ',' && !quote) { ++col; continue; }
        if (cc === '\r' && nc === '\n' && !quote) { ++row; col = 0; ++c; continue; }
        if (cc === '\n' && !quote) { ++row; col = 0; continue; }
        if (cc === '\r' && !quote) { ++row; col = 0; continue; }
        arr[row][col] += cc;
    }

    const headers = arr[0].map(h => h.trim());
    return arr.slice(1).map(r => {
        let obj = {};
        headers.forEach((h, i) => {
            obj[h] = r[i] ? r[i].trim() : null;
        });
        return obj;
    }).filter(r => r.show_id); // Filtra cualquier basura residual
}

function drawAllCharts() {
    drawChart1();
    drawChart2();
    drawChart3();
    drawChart4();
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
        ['Tipo', 'Cantidad'],
        ['Películas', movies],
        ['Series de TV', tvShows]
    ]);

    var options = {
        pieSliceText: 'percentage',
        colors: ['#E50914', '#221F1F'],
        legend: { position: 'bottom' },
        chartArea: { width: '90%', height: '80%' }
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
        let parts = d.date_added.split(',');
        if (parts.length > 1) {
            let year = parseInt(parts[1].trim());
            if (!isNaN(year)) {
                if (!yearlyData[year]) yearlyData[year] = { Movie: 0, TVShow: 0 };
                if (d.type === 'Movie') yearlyData[year].Movie++;
                else if (d.type === 'TV Show') yearlyData[year].TVShow++;
            }
        }
    });

    let dataArray = [['Año', 'Películas', 'Series de TV']];
    Object.keys(yearlyData).sort().forEach(year => {
        dataArray.push([year, yearlyData[year].Movie, yearlyData[year].TVShow]);
    });

    var data = google.visualization.arrayToDataTable(dataArray);

    var options = {
        hAxis: { title: 'Año de incorporación' },
        vAxis: { title: 'Títulos añadidos' },
        colors: ['#E50914', '#564d4d'],
        legend: { position: 'top' },
        focusTarget: 'category',
        chartArea: { width: '80%', height: '70%' }
    };
    new google.visualization.AreaChart(document.getElementById('chart2')).draw(data, options);
}

// ==========================================
// Desafío 3: Top Países Productores (SOLUCIÓN DE AGRUPACIÓN)
// ==========================================
function drawChart3() {
    let limit = parseInt(document.getElementById('countryFilter').value);
    let countryCounts = {};

    globalData.forEach(d => {
        if (d.country) {
            // AQUÍ ESTÁ TU LÓGICA: Tomamos solo el índice [0] del split (el primer país)
            let primaryCountry = d.country.split(',')[0].replace(/"/g, '').trim();

            if (primaryCountry.length > 1) {
                countryCounts[primaryCountry] = (countryCounts[primaryCountry] || 0) + 1;
            }
        }
    });

    let sortedCountries = Object.entries(countryCounts)
        .sort((a, b) => b[1] - a[1]).slice(0, limit);

    let dataArray = [
        ['País', 'Títulos', { role: 'style', type: 'string' }, { role: 'tooltip', type: 'string' }]
    ];

    if (sortedCountries.length > 0) {
        let maxVal = sortedCountries[0][1];
        sortedCountries.forEach(item => {
            let intensity = 0.4 + (0.6 * (item[1] / maxVal));
            let colorStyle = `color: rgba(229, 9, 20, ${intensity})`;
            let tooltipText = `${item[0]}: ${item[1].toLocaleString()} títulos principales`;

            dataArray.push([item[0], item[1], colorStyle, tooltipText]);
        });
    } else {
        dataArray.push(['Sin datos', 0, 'color: #ccc', 'N/A']);
    }

    var data = google.visualization.arrayToDataTable(dataArray);

    var options = {
        hAxis: { title: 'Cantidad' },
        legend: { position: 'none' },
        chartArea: { width: '70%', height: '80%' }
    };
    new google.visualization.BarChart(document.getElementById('chart3')).draw(data, options);
}

// ==========================================
// Desafío 4: Géneros más Representativos
// ==========================================
function drawChart4() {
    let contentType = document.getElementById('genreFilter').value;
    let genreCounts = {};

    globalData.forEach(d => {
        if (d.type && d.type.trim() === contentType && d.listed_in) {
            // Para géneros sí mantenemos el conteo de todos, ya que una película suele pertenecer a varios géneros válidos a la vez.
            let genres = d.listed_in.split(',');
            genres.forEach(g => {
                let cleanGenre = g.replace(/"/g, '').trim();
                if (cleanGenre.length > 1) {
                    genreCounts[cleanGenre] = (genreCounts[cleanGenre] || 0) + 1;
                }
            });
        }
    });

    let sortedGenres = Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1]).slice(0, 7);

    let dataArray = [
        ['Género', 'Títulos', { role: 'style', type: 'string' }, { role: 'tooltip', type: 'string' }]
    ];

    const palette = ['#E50914', '#B81D24', '#8C2B30', '#5E383B', '#F5A623', '#4A90E2', '#50E3C2'];

    if (sortedGenres.length > 0) {
        sortedGenres.forEach((item, index) => {
            let colorStyle = `color: ${palette[index % palette.length]}`;
            let tooltipText = `Categoría: ${item[0]}\nTotal: ${item[1].toLocaleString()} títulos`;

            dataArray.push([item[0], item[1], colorStyle, tooltipText]);
        });
    } else {
        dataArray.push(['Sin datos', 0, 'color: #ccc', 'N/A']);
    }

    var data = google.visualization.arrayToDataTable(dataArray);

    var options = {
        vAxis: { title: 'Cantidad' },
        hAxis: { slantedText: true, slantedTextAngle: 45 },
        legend: { position: 'none' },
        chartArea: { width: '85%', height: '60%' },
        animation: { startup: true, duration: 1000, easing: 'out' }
    };
    new google.visualization.ColumnChart(document.getElementById('chart4')).draw(data, options);
}