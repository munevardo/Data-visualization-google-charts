console.log("🔥 NUEVA VERSION GENEROS");
let netflixData = [];

function animateValue(id, start, end, duration) {
    let obj = document.getElementById(id);
    if (!obj) return;

    let range = end - start;
    if (range === 0) {
        obj.innerText = end.toLocaleString();
        return;
    }

    let current = start;
    let increment = end > start ? 1 : -1;
    let stepTime = Math.max(Math.floor(duration / Math.abs(range)), 20);

    let timer = setInterval(() => {
        current += increment;
        obj.innerText = current.toLocaleString();

        if (current === end) {
            clearInterval(timer);
        }
    }, stepTime);
}

function loadCSV() {
    console.log("📊 Intentando cargar CSV...");

    Papa.parse("./netflix_titles.csv", {
        download: true,
        header: true,
        complete: function(results) {
            console.log("✅ CSV cargado");
            console.log("📦 Total registros:", results.data.length);

            netflixData = results.data.filter(item => item.type); // limpiar filas vacías
            init();
        }
    });
}

// Cargar Google Charts
google.charts.load('current', { packages: ['corechart'] });
google.charts.setOnLoadCallback(loadCSV);

function init() {
    drawKPIs();
    drawPieChart();
    drawLineChart();
    drawCountryChart();
    drawGenreChart();
}

// GRÁFICO 1: PIE
function drawPieChart() {
    let movies = 0;
    let series = 0;

    netflixData.forEach(item => {
        if (item.type === "Movie") movies++;
        else if (item.type === "TV Show") series++;
    });

    let data = google.visualization.arrayToDataTable([
        ['Tipo', 'Cantidad'],
        ['Películas', movies],
        ['Series', series]
    ]);

    let options = {
        pieHole: 0.5,
        colors: ['#E50914', '#666666'],
        backgroundColor: 'transparent',
        legendTextStyle: { color: 'white' },
        pieSliceText: 'percentage',
        chartArea: { width: '85%', height: '80%' },
        animation: {
            startup: true,
            duration: 1200,
            easing: 'out'
        },
        tooltip: { textStyle: { fontSize: 12 } }
    };

    let chart = new google.visualization.PieChart(document.getElementById('piechart'));
    chart.draw(data, options);
}

// GRÁFICO 2: LINE
function drawLineChart() {
    let years = {};

    netflixData.forEach(item => {
        if (!item.date_added || !item.type) return;

        let parsedDate = new Date(item.date_added);
        let year = parsedDate.getFullYear();

        if (isNaN(year)) return;

        if (!years[year]) {
            years[year] = { Movie: 0, "TV Show": 0 };
        }

        if (item.type === "Movie") years[year].Movie++;
        if (item.type === "TV Show") years[year]["TV Show"]++;
    });

    let dataArray = [['Año', 'Películas', 'Series']];

    Object.keys(years)
        .sort((a, b) => a - b)
        .forEach(year => {
            dataArray.push([
                Number(year),
                years[year].Movie,
                years[year]["TV Show"]
            ]);
        });

    let data = google.visualization.arrayToDataTable(dataArray);

    let options = {
        backgroundColor: 'transparent',
        legendTextStyle: { color: 'white' },
        hAxis: {
            textStyle: { color: 'white' },
            title: 'Año de incorporación',
            titleTextStyle: { color: 'white' },
            format: '####'
        },
        vAxis: {
            textStyle: { color: 'white' },
            title: 'Cantidad de títulos añadidos',
            titleTextStyle: { color: 'white' },
            format: '#,###',
            minValue: 0
        },
        colors: ['#E50914', '#8c8c8c'],
        chartArea: { left: 70, right: 30, top: 30, bottom: 50 },
        pointSize: 5,
        lineWidth: 3,
        animation: {
            startup: true,
            duration: 1500,
            easing: 'out'
        },
        tooltip: { trigger: 'focus' }
    };

    let chart = new google.visualization.LineChart(document.getElementById('linechart'));
    chart.draw(data, options);
}

// GRÁFICO 3: COUNTRY
function drawCountryChart() {
    let topN = parseInt(document.getElementById("topN").value);
    let countryCount = {};

    netflixData.forEach(item => {
        if (!item.country) return;

        item.country.split(",").forEach(country => {
            let c = country.trim();
            if (!c) return;
            countryCount[c] = (countryCount[c] || 0) + 1;
        });
    });

    let sortedCountries = Object.entries(countryCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, topN);

    let gradientColors = [
        '#ffb3b3', '#ff8080', '#ff4d4d', '#ff1a1a', '#E50914',
        '#c40712', '#a3050f', '#82030c', '#610209', '#400106'
    ];

    let dataArray = [['País', 'Cantidad', { role: 'style' }, { role: 'annotation' }]];

    sortedCountries
        .slice()
        .reverse()
        .forEach(([country, count], index) => {
            let colorIndex = Math.min(index, gradientColors.length - 1);
            dataArray.push([country, count, `color: ${gradientColors[colorIndex]}`, String(count.toLocaleString())]);
        });

    let data = google.visualization.arrayToDataTable(dataArray);

    let options = {
        backgroundColor: 'transparent',
        legend: {
    textStyle: { color: '#ffffff', fontSize: 12 },
    position: 'top'
},
        hAxis: {
            textStyle: { color: 'white' },
            format: '#,###',
            minValue: 0
        },
        vAxis: { textStyle: { color: 'white' },
             },
        chartArea: { left: 150, width: '70%', height: '70%' },
        bars: 'horizontal',
        annotations: {
            textStyle: {
                color: 'white',
                bold: true
            }
        },
        animation: {
            startup: true,
            duration: 1400,
            easing: 'out'
        },
        tooltip: { trigger: 'focus' }
    };

    let chart = new google.visualization.BarChart(document.getElementById('countrychart'));
    chart.draw(data, options);

    let insight = document.querySelector("#countrychart + .insight");

    if (sortedCountries.length > 0) {
        let topCountry = sortedCountries[0][0];
        let topValue = sortedCountries[0][1];
        let totalTop = sortedCountries.reduce((sum, item) => sum + item[1], 0);

        insight.innerText = `${topCountry} lidera el ranking con ${topValue.toLocaleString()} títulos. En el Top ${topN}, se observa una concentración de ${totalTop.toLocaleString()} registros, lo que evidencia el peso de pocos países dentro del catálogo.`;
    }
}

// GRÁFICO 4: GÉNEROS
function drawGenreChart() {
    let filter = document.getElementById("typeFilter").value;
    let genreCount = {};

    netflixData.forEach(item => {
        if (!item.listed_in || !item.type) return;

        if (filter === "Movie" && item.type !== "Movie") return;
        if (filter === "TV Show" && item.type !== "TV Show") return;

        item.listed_in.split(",").forEach(g => {
            let genre = g.trim();
            if (!genre) return;
            genreCount[genre] = (genreCount[genre] || 0) + 1;
        });
    });

    let sorted = Object.entries(genreCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 7);

    let genreColors = [
        '#E50914', '#ff6b6b', '#ffa502',
        '#2ed573', '#1e90ff', '#a55eea', '#f368e0'
    ];

    let dataArray = [['Género', 'Cantidad', { role: 'style' }, { role: 'annotation' }]];

    sorted.forEach(([genre, count], index) => {
        dataArray.push([
            genre,
            count,
            `color: ${genreColors[index % genreColors.length]}`,
            String(count.toLocaleString())
        ]);
    });

    if (dataArray.length <= 1) {
        document.getElementById('genrechart').innerHTML =
            "<p style='color:white'>No hay datos para mostrar</p>";
        return;
    }

    let data = google.visualization.arrayToDataTable(dataArray);

    let options = {
        backgroundColor: 'transparent',
        legend: 'none',
        hAxis: {
            textStyle: { color: 'white', fontSize: 11 },
            slantedText: true,
            slantedTextAngle: 25
        },
        vAxis: {
            textStyle: { color: 'white' },
            format: '#,###',
            minValue: 0
        },
        chartArea: { left: 60, width: '78%', height: '65%' },
        annotations: {
            textStyle: {
                color: 'white',
                fontSize: 11,
                bold: true
            }
        },
        animation: {
            startup: true,
            duration: 1400,
            easing: 'out'
        }
    };

    let chart = new google.visualization.ColumnChart(document.getElementById('genrechart'));
    chart.draw(data, options);

    let insight = document.getElementById("genreInsight");

    if (sorted.length > 0) {
        let topGenre = sorted[0][0];

        if (filter === "Movie") {
            insight.innerHTML = `Dentro de las películas, el género con mayor presencia es <span class="highlight">${topGenre}</span>.`;
        } else if (filter === "TV Show") {
            insight.innerHTML = `Dentro de las series, el género más representativo es <span class="highlight">${topGenre}</span>.`;
        } else {
            insight.innerHTML = `En el catálogo general, el género dominante es <span class="highlight">${topGenre}</span>.`;
        }
    }
}

// KPIs
function drawKPIs() {
    let total = netflixData.filter(item => item.type === "Movie" || item.type === "TV Show").length;

    let countries = new Set();
    let addedYears = [];

    netflixData.forEach(item => {
        if (item.country) {
            item.country.split(",").forEach(c => {
                let country = c.trim();
                if (country) countries.add(country);
            });
        }

        if (item.date_added) {
            let parsedDate = new Date(item.date_added);
            let year = parsedDate.getFullYear();
            if (!isNaN(year)) addedYears.push(year);
        }
    });

    let maxYear = addedYears.length ? Math.max(...addedYears) : 0;

    animateValue("totalTitles", 0, total, 1000);
    animateValue("totalCountries", 0, countries.size, 1000);
    animateValue("latestYear", 0, maxYear, 1000);
}

// EVENTOS
document.getElementById("typeFilter").addEventListener("change", function () {
    drawGenreChart();
});

document.getElementById("topN").addEventListener("change", function () {
    drawCountryChart();
});