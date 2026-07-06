let data;
let exactMatchesGlobal = [];
let nearMatchesGlobal = [];

// Load CSV
d3.csv("The-Office-Lines-Cleaned.csv").then(d => {
    data = d;
});

// Speaker to location mapping
const locationMap = {
    "Warehouse": ["Darryl", "Roy"],
    "Reception": ["Pam", "Erin"],
    "Accounting": ["Angela", "Kevin", "Oscar"],
    "Manager's Office": ["Michael", "Andy"],
    "Conference Room": ["Michael", "Jim", "Pam", "Ryan", "Toby"]
};

// Clean text for matching
function cleanText(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// Generate gender-swapped variants
function generateVariants(phrase) {
    let variants = [phrase];
    if (phrase.includes("she")) {
        variants.push(phrase.replace("she", "he"));
    } else if (phrase.includes("he")) {
        variants.push(phrase.replace("he", "she"));
    }
    return variants;
}

// Show loading spinner
function showLoading() {
    document.getElementById("loading").style.display = "block";
}

// Hide loading spinner
function hideLoading() {
    document.getElementById("loading").style.display = "none";
}

// Show toast message
function showToast() {
    const toast = document.getElementById("toast");
    toast.style.visibility = "visible";
    setTimeout(() => {
        toast.style.visibility = "hidden";
    }, 2000);
}

// Display the top speaker among exact matches
function displayTopSpeaker(matches) {
    if (!matches.length) return;
    const counts = {};
    matches.forEach(d => { counts[d.speaker] = (counts[d.speaker]||0) + 1; });
    const [topSpeaker, topCount] = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
    d3.select('#location-info')
      .append('h3')
      .text(`🏆 Top Speaker: ${topSpeaker} (${topCount} times)`);
  }

// Search function
function searchPhrase() {
    const rawPhrase = document.getElementById("search").value.trim();
    if (!rawPhrase) return;

    showLoading();

    const phrase = cleanText(rawPhrase);
    const phraseVariants = generateVariants(phrase);

    const seasonCounts = {};
    const speakersFound = new Set();
    const exactMatches = [];
    const nearMatches = [];

    data.forEach(row => {
        const cleanedLine = cleanText(row.line);

        const exactRegex = new RegExp(`\\b${phrase}\\b`, 'i');
        
        if (exactRegex.test(cleanedLine)) {
            let season = +row.season;
            seasonCounts[season] = (seasonCounts[season] || 0) + 1;
            speakersFound.add(row.speaker);
            exactMatches.push({line: row.line, season: season, episode: +row.episode, speaker: row.speaker});
        } else {
            for (let variant of phraseVariants) {
                if (variant !== phrase) {
                    const variantRegex = new RegExp(`\\b${variant}\\b`, 'i');
                    if (variantRegex.test(cleanedLine)) {
                        let season = +row.season;
                        seasonCounts[season] = (seasonCounts[season] || 0) + 1;
                        speakersFound.add(row.speaker);
                        nearMatches.push({line: row.line, season: season, episode: +row.episode, speaker: row.speaker});
                        break;
                    }
                }
            }
        }
    });

    exactMatchesGlobal = exactMatches;
    nearMatchesGlobal = nearMatches;

    drawLineChart(seasonCounts);
    d3.select("#location-info").html(""); // Clear old location/matches
    inferLocation(new Set(exactMatchesGlobal.map(d => d.speaker)), [...exactMatchesGlobal, ...nearMatchesGlobal]);
    displayTopSpeaker(exactMatchesGlobal);
    displayMatches(exactMatchesGlobal, nearMatchesGlobal);
    hideLoading();
    showToast();
}

// Draw line chart with animation
function drawLineChart(seasonCounts) {
    d3.select('#line-chart').html('');
    d3.select("#line-chart").html("");
    d3.select("#reset-area").remove(); // Clear reset if already there

    const width = 600;
    const height = 400;
    const margin = {top: 50, right: 30, bottom: 50, left: 60};

    const svg = d3.select("#line-chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const x = d3.scaleLinear()
        .domain([1, 9])
        .range([margin.left, width - margin.right]);

        const maxY = d3.max(Object.values(seasonCounts)) || 1;
        const y = d3.scaleLinear()
          .domain([0, maxY < 5 ? 5 : maxY])
          .range([height - margin.bottom, margin.top]);

    const seasonData = [];
    for (let s = 1; s <= 9; s++) {
        seasonData.push({
            season: s,
            count: seasonCounts[s] || 0 
        });
    }
    seasonData.sort((a, b) => a.season - b.season);

    const line = d3.line()
    .defined(d => true) // this forces D3 to always connect points, even if count is 0
    .x(d => x(d.season))
    .y(d => y(d.count));

    const path = svg.append("path")
    .datum(seasonData)
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 2)
    .attr("d", line);

    const totalLength = path.node().getTotalLength();

  // Animate from start→end in proper order
  path
    .attr("stroke-dasharray", totalLength + " " + totalLength)
    .attr("stroke-dashoffset", totalLength)
    .transition()
      .duration(1500)
      .ease(d3.easeLinear)
      .attr("stroke-dashoffset", 0);

    // Axes
    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).ticks(9).tickFormat(d3.format("d")));

    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));

    // Tooltip
    const tooltip = d3.select("#line-chart")
      .append("div")
      .attr("id", "tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("background", "lightsteelblue")
      .style("padding", "5px")
      .style("border-radius", "5px")
      .style("font-size", "12px");

    svg.selectAll("dot")
      .data(seasonData)
      .enter()
      .append("circle")
      .attr("cx", d => x(d.season))
      .attr("cy", d => y(d.count))
      .attr("r", 5)
      .attr("fill", "steelblue")
      .on("mouseover", (event, d) => {
          tooltip.style("opacity", 1)
              .html(`Season ${d.season}<br>Count: ${d.count}`)
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", () => tooltip.style("opacity", 0))
      .on("click", (event, d) => {
          filterMatchesBySeason(d.season);
      });

    // reset button (inside chart)
    d3.select('#line-chart')
    .append('div').attr('id','reset-area').style('text-align','center').style('margin-top','10px')
    .append('button')
      .text('🔄 Reset View')
      .style('padding','8px 15px').style('background-color','#28a745')
      .style('color','white').style('border','none').style('border-radius','4px')
      .style('cursor','pointer')
      .on('click',()=>{
        d3.select('#location-info').html('');
        d3.select('#reset-area').remove();
        // clear the chart on reset
        d3.select('#line-chart').html('');
        document.getElementById('toast').style.visibility='hidden';
        drawLineChart(countGlobal);
        inferLocation(new Set(exactMatchesGlobal.map(d=>d.speaker)), [...exactMatchesGlobal,...nearMatchesGlobal]);
        displayMatches(exactMatchesGlobal, nearMatchesGlobal);
      });
}

// Location inference
function inferLocation(speakersFound, matchingLines) {
    const speakerArray = Array.from(speakersFound);
    let locationMatches = {};
    let foundKeyword = false;

    for (const line of matchingLines) {
        let linetxt = line.line.toLowerCase();
        if (linetxt.includes("conference room")) { foundKeyword = "Conference Room"; break; }
        if (linetxt.includes("warehouse")) { foundKeyword = "Warehouse"; break; }
        if (linetxt.includes("reception")) { foundKeyword = "Reception"; break; }
        if (linetxt.includes("break room")) { foundKeyword = "Break Room"; break; }
    }

    if (foundKeyword) {
        d3.select("#location-info")
          .append("h3")
          .text(`🏢 Likely Location (keyword): ${foundKeyword}`);
        return;
    }

    for (const [location, people] of Object.entries(locationMap)) {
        let matchCount = people.filter(person => speakerArray.includes(person)).length;
        if (matchCount > 0) {
            locationMatches[location] = matchCount;
        }
    }

    const likelyLocation = Object.entries(locationMatches).sort((a, b) => b[1] - a[1])[0];
    if (likelyLocation) {
        d3.select("#location-info")
          .append("h3")
          .text(`🏢 Likely Location (speaker): ${likelyLocation[0]}`);
    } else {
        d3.select("#location-info")
          .append("h3")
          .text("🏢 Likely Location: Unknown");
    }
}

// Highlight matched phrases
function highlightPhrase(text) {
    const rawPhrase = document.getElementById("search").value.trim();
    if (!rawPhrase) return text;
    const regex = new RegExp(`(${rawPhrase})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
}

// Display matches with "Show More" for long dialogues
function displayMatches(exactMatches, nearMatches) {
    exactMatches.sort((a, b) => (a.season - b.season) || (a.episode - b.episode));
    nearMatches.sort((a, b) => (a.season - b.season) || (a.episode - b.episode));

    const matchArea = d3.select("#location-info")
      .append("div")
      .attr("id", "matches")
      .style("margin-top", "30px");

    matchArea.append("h3").text(`🎯 Exact Matches (${exactMatches.length})`);
    exactMatches.forEach(d => {
        matchArea.append("div")
            .attr("class", "match")
            .html(generateMatchHTML(d));
    });

    if (nearMatches.length > 0) {
        matchArea.append("h3")
            .style("color", "orange")
            .text(`⚡ Near Matches (${nearMatches.length})`);
        nearMatches.forEach(d => {
            matchArea.append("div")
                .attr("class", "match")
                .html(generateMatchHTML(d));
        });
    }
}

// Create short/full dialogue HTML
function generateMatchHTML(d) {
    const rawPhrase = document.getElementById("search").value.trim();

    if (d.line.length < 80) {
        return `S${d.season}E${d.episode} - ${d.speaker}: "<span class="highlight">${rawPhrase}</span>"`;
    } else {
        const id = `more-${Math.random().toString(36).substring(2, 7)}`;
        return `
        S${d.season}E${d.episode} - ${d.speaker}: 
        "<span class="highlight">${rawPhrase}</span>" 
        <button onclick="document.getElementById('${id}').style.display='block'; this.style.display='none';" style="margin-left:5px;">Show More</button>
        <p id="${id}" style="display:none; margin-top:5px;">"${highlightPhrase(d.line)}"</p>
        `;
    }
}

// Filter matches by season
function filterMatchesBySeason(selectedSeason) {
    d3.select("#location-info").html("");

    const exactSeason = exactMatchesGlobal.filter(d => d.season === selectedSeason);
    const nearSeason = nearMatchesGlobal.filter(d => d.season === selectedSeason);

    inferLocation(new Set(exactSeason.map(d => d.speaker)), [...exactSeason, ...nearSeason]);
    displayMatches(exactSeason, nearSeason);
}

function toggleIceberg() {
    const iceberg = document.getElementById("iceberg-container");
    if (iceberg.style.display === "none") {
        iceberg.style.display = "block";

        setTimeout(() => { document.getElementById("iceberg-top").style.opacity = 1; }, 300);
        setTimeout(() => { document.getElementById("iceberg-middle").style.opacity = 1; }, 800);
        setTimeout(() => { document.getElementById("iceberg-deep").style.opacity = 1; }, 1300);
    } else {
        iceberg.style.display = "none";
        document.getElementById("iceberg-top").style.opacity = 0;
        document.getElementById("iceberg-middle").style.opacity = 0;
        document.getElementById("iceberg-deep").style.opacity = 0;
    }
}
