// URL directa al archivo crudo en GitHub
const csvUrl = 'https://raw.githubusercontent.com/munevardo/Data-visualization-google-charts/main/Data/netflix-data.csv';

let globalData = [];

// Cargar Google Charts y ejecutar la app
google.charts.load('current', { 'packages': ['corechart', 'bar'] });
google.charts.setOnLoadCallback(initApp);

async function initApp() {
    try {
        const response = await fetch(csvUrl);
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

        const textData = await response.text();
        // Usamos el nuevo motor de parseo a prueba de fallos
        globalData = parseCSVAdvanced(textData);

        drawAllCharts();

        // Listeners interactivos
        document.getElementById('countryFilter').addEventListener('change', drawChart3);
        document.getElementById('genreFilter').addEventListener('change', drawChart4);
        window.addEventListener('resize', drawAllCharts);

    } catch (error) {
        console.error("Error cargando los datos:", error);
        document.getElementById('dashboard').innerHTML = `
            <div class="col-12 text-center mt-5">
                <div class="alert alert-danger">
                    <strong>Error:</strong> No se pudo cargar el dataset desde GitHub.
                </div>
            </div>`;
    }
}

// NUEVO PARSER AVANZADO: Soporta saltos de línea internos, comillas dobles y detecta el delimitador.
function parseCSVAdvanced(str) {
    // 1. Autodetectar si el archivo usa comas o punto y coma
    const firstLine = str.split('\n')[0];
    const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';

    const arr = [];
    let quote = false;
    let col = 0, row = 0;

    for (let c = 0; c < str.length; c++) {
        let cc = str[c], nc = str[c + 1];
        arr[row] = arr[row] || [];
        arr[row][col] = arr[row][col] || '';

        // Manejar comillas escapadas ("")
        if (cc === '"' && quote && nc === '"') {
            arr[row][col] += cc;
            ++c; // Saltamos la siguiente comilla
            continue;
        }
        // Entrar o salir de comillas
        if (cc === '"') {
            quote = !quote;
            continue;
        }
        // Nueva columna
        if (cc === delimiter && !quote) {
            ++col;
            continue;
        }
        // Nueva fila (Soporta \r\n de Windows y \n de Mac/Linux)
        if (cc === '\r' && nc === '\n' && !quote) {
            ++row; col = 0; ++c; continue;
        }
        if (cc === '\n' && !quote) {
            ++row; col = 0; continue;
        }
        if (cc === '\r' && !quote) {
            ++row; col = 0; continue;
        }

        // Añadir caracter normal
        arr[row][col] += cc;
    }

    // Mapear el arreglo bidimensional a objetos JSON usando los encabezados
    const headers = arr[0].map(h => h.trim());
    return arr.slice(1).map(row => {
        let obj = {};
        headers.forEach((h, i) => {
            obj[h] = row[i] ? row[i].trim() : null;
        });
        return obj;
    }).filter(r => r[headers[0]]); // Filtrar filas vacías o corruptas
}

function drawAllCharts() {
    drawChart1();
    drawChart2();
    drawChart3();
    drawChart4();
}

// ==========================================
// Desafío 1: Proporción Películas vs Series
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
        let yearMatch = d.date_added.match(/\d{2,4}$/);
        if (yearMatch) {
            let year = parseInt(yearMatch[0]);
            year = year < 100 ? 2000 + year : year;
            if (!yearlyData[year]) yearlyData[year] = { Movie: 0, TVShow: 0 };
            if (d.type && d.type.includes('Movie')) yearlyData[year].Movie++;
            if (d.type && d.type.includes('TV Show')) yearlyData[year].TVShow++;
        }
    });

    var data = new google.visualization.DataTable();
    data.addColumn('number', 'Año');
    data.addColumn('number', 'Películas');
    data.addColumn('number', 'Series de TV');

    Object.keys(yearlyData).sort().forEach(year => {
        data.addRow([parseInt(year), yearlyData[year].Movie, yearlyData[year].TVShow]);
    });

    var options = {
        hAxis: { title: 'Año de incorporación', format: '0000' },
        vAxis: { title: 'Títulos añadidos' },
        colors: ['#E50914', '#564d4d'],
        legend: { position: 'top' },
        focusTarget: 'category',
        chartArea: { width: '80%', height: '70%' }
    };
    new google.visualization.AreaChart(document.getElementById('chart2')).draw(data, options);
}

// ==========================================
// Desafío 3: Top Países Productores
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
    data.addColumn('string', 'País');
    data.addColumn('number', 'Títulos');
    data.addColumn({ type: 'string', role: 'style' });
    data.addColumn({ type: 'string', role: 'tooltip' });

    if (sortedCountries.length > 0) {
        let maxVal = sortedCountries[0][1];
        sortedCountries.forEach(item => {
            let intensity = 0.4 + (0.6 * (item[1] / maxVal));
            let colorStyle = `color: rgba(229, 9, 20, ${intensity})`;
            let tooltipText = `${item[0]}: ${item[1].toLocaleString()} títulos`;
            data.addRow([item[0], item[1], colorStyle, tooltipText]);
        });
    }

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
        // Aseguramos que coincide el tipo de contenido exactamente
        if (d.type && d.type.trim() === contentType && d.listed_in) {
            let genres = d.listed_in.split(',').map(g => g.trim());
            genres.forEach(g => { if (g) genreCounts[g] = (genreCounts[g] || 0) + 1; });
        }
    });

    let sortedGenres = Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1]).slice(0, 7);

    var data = new google.visualization.DataTable();
    data.addColumn('string', 'Género');
    data.addColumn('number', 'Títulos');
    data.addColumn({ type: 'string', role: 'style' });
    data.addColumn({ type: 'string', role: 'tooltip' });

    const palette = ['#E50914', '#B81D24', '#8C2B30', '#5E383B', '#F5A623', '#4A90E2', '#50E3C2'];

    sortedGenres.forEach((item, index) => {
        let colorStyle = `color: ${palette[index % palette.length]}`;
        let tooltipText = `Categoría: ${item[0]}\nTotal: ${item[1].toLocaleString()} títulos`;
        data.addRow([item[0], item[1], colorStyle, tooltipText]);
    });

    var options = {
        vAxis: { title: 'Cantidad' },
        hAxis: { slantedText: true, slantedTextAngle: 45 },
        legend: { position: 'none' },
        chartArea: { width: '85%', height: '60%' },
        animation: { startup: true, duration: 1000, easing: 'out' }
    };
    new google.visualization.ColumnChart(document.getElementById('chart4')).draw(data, options);
}