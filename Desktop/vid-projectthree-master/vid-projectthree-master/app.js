let data;
let allSeasons = new Set();
let allEpisodes = {};

const containerNode = document.querySelector('#network-graph');
const width  = containerNode.clientWidth;
const height = containerNode.clientHeight;

// SVG and groups
const svgContainer = d3.select("#network-graph");
const svg = svgContainer
  .append("svg")
  .attr("width", width)
  .attr("height", height);
const g = svg.append("g"); // for zoom/pan

// Tooltip for node hover
const tooltip = d3.select("body").append("div").attr("class", "tooltip");

// Load CSV and initialize
d3.csv("The-Office-Lines-Cleaned.csv").then((d) => {
  data = d;
  data.forEach((d) => {
    d.season = +d.season;
    d.episode = +d.episode;
    allSeasons.add(d.season);
    if (!allEpisodes[d.season]) allEpisodes[d.season] = new Set();
    allEpisodes[d.season].add(d.episode);
  });
  allSeasons = Array.from(allSeasons).sort((a, b) => a - b);

  populateDropdowns();
  setupSearch();
});

// Populate season & episode selectors
function populateDropdowns() {
  const seasonSelect = d3.select("#seasonSelect");
  seasonSelect
    .selectAll("option")
    .data(allSeasons)
    .enter()
    .append("option")
    .attr("value", (d) => d)
    .text((d) => `Season ${d}`);

  seasonSelect.on("change", () => {
    updateEpisodeDropdown(+seasonSelect.property("value"));
  });

  updateEpisodeDropdown(allSeasons[0]);
}

function updateEpisodeDropdown(season) {
  const episodeSelect = d3.select("#episodeSelect").html("");
  const episodes = Array.from(allEpisodes[season]).sort((a, b) => a - b);

  episodeSelect
    .selectAll("option")
    .data(episodes)
    .enter()
    .append("option")
    .attr("value", (d) => d)
    .text((d) => `Episode ${d}`);

  episodeSelect.on("change", () => {
    drawGraph(
      +d3.select("#seasonSelect").property("value"),
      +episodeSelect.property("value"),
      false
    );
  });

  drawGraph(season, episodes[0], false);
}

// Main function: filter data and render network
function drawGraph(selectedSeason, selectedEpisode, withTransition) {
  const filtered = data.filter(
    (d) => d.season === selectedSeason && d.episode === selectedEpisode
  );

  // Count back-to-back speaker pairs
  const counts = {};
  for (let i = 0; i < filtered.length - 1; i++) {
    const a = filtered[i].speaker?.trim();
    const b = filtered[i + 1].speaker?.trim();
    if (!a || !b) continue;
    const pair = [a, b].sort().join("|");
    counts[pair] = (counts[pair] || 0) + 1;
  }

  // Compute totals & degree for sizing
  const totals = {};
  const degree = {};
  Object.entries(counts).forEach(([pair, value]) => {
    const [s, t] = pair.split("|");
    totals[s] = (totals[s] || 0) + value;
    totals[t] = (totals[t] || 0) + value;
    degree[s] = (degree[s] || 0) + value;
    degree[t] = (degree[t] || 0) + value;
  });

  // Top 10 characters
  const topChars = Object.entries(totals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name]) => name);

  // Build nodes & links
  const nodes = topChars.map((id) => ({ id }));
  let links = Object.entries(counts)
    .map(([pair, value]) => {
      const [source, target] = pair.split("|");
      return { source, target, value };
    })
    .filter((d) => topChars.includes(d.source) && topChars.includes(d.target));

  // Scales for size & color
  const sizeScale = d3
    .scaleSqrt()
    .domain(d3.extent(Object.values(degree)))
    .range([8, 24]);
  const colorScale = d3.scaleOrdinal(d3.schemeCategory10).domain(topChars);

  // Data join for links
  const linkSel = g
    .selectAll("line.link")
    .data(links, (d) => d.source + "|" + d.target);
  const linkEnter = linkSel
    .enter()
    .append("line")
    .attr("class", "link")
    .attr("stroke-width", 0)
    .on("mouseover", (event, d) => hoverLink(event, d))
    .on("mouseout", () => g.selectAll(".hover-label").remove());
  const linkUpdate = linkEnter.merge(linkSel);
  if (withTransition) {
    linkUpdate
      .transition()
      .duration(800)
      .attr("stroke-width", (d) => Math.sqrt(d.value) * 1.5);
  } else {
    linkUpdate.attr("stroke-width", (d) => Math.sqrt(d.value) * 1.5);
  }
  linkSel.exit().remove();

  // Data join for nodes
  const nodeSel = g.selectAll("g.node").data(nodes, (d) => d.id);
  const nodeEnter = nodeSel
    .enter()
    .append("g")
    .attr("class", "node")
    .call(
      d3
        .drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
    )
    .on("mouseover", (event, d) => showTooltip(event, d))
    .on("mouseout", () =>
      tooltip.transition().duration(500).style("opacity", 0)
    )
    .on("click", (event, d) => showInfoPanel(d, filtered));

  nodeEnter
    .append("circle")
    .attr("r", 0)
    .attr("fill", (d) => colorScale(d.id));
  nodeEnter
    .append("text")
    .text((d) => d.id)
    .attr("x", 16)
    .attr("y", 4);

  const nodeUpdate = nodeEnter.merge(nodeSel);
  if (withTransition) {
    nodeUpdate
      .select("circle")
      .transition()
      .duration(800)
      .attr("r", (d) => sizeScale(degree[d.id] || 1));
  } else {
    nodeUpdate.select("circle").attr("r", (d) => sizeScale(degree[d.id] || 1));
  }
  nodeSel.exit().remove();

  // Force simulation
  const sim = d3
    .forceSimulation(nodes)
    .force(
      "link",
      d3
        .forceLink(links)
        .id((d) => d.id)
        .distance(120)
        .strength(0.5)
    )
    .force("charge", d3.forceManyBody().strength(-400))
    .force("center", d3.forceCenter(width / 2, height / 2));

  sim.on("tick", () => {
    linkUpdate
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);

    nodeUpdate.attr("transform", (d) => `translate(${d.x},${d.y})`);
  });

  // Helper functions inside drawGraph
  function hoverLink(event, d) {
    const x = (d.source.x + d.target.x) / 2;
    const y = (d.source.y + d.target.y) / 2;
    g.append("text")
      .attr("class", "hover-label")
      .attr("x", x)
      .attr("y", y)
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .text(d.value);
  }

  function showTooltip(event, d) {
    tooltip
      .transition()
      .duration(200)
      .style("opacity", 0.9)
      .html(d.id)
      .style("left", event.pageX + 5 + "px")
      .style("top", event.pageY - 28 + "px");
  }

  function dragstarted(event, d) {
    // Prevent zoom/pan from activating during node drag
    if (event.sourceEvent) event.sourceEvent.stopPropagation();
    if (!event.active) sim.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragended(event, d) {
    if (!event.active) sim.alphaTarget(0);
    // Release nodes after drag so they can bounce back
    d.fx = null;
    d.fy = null;
  }
}

// Node Search
function setupSearch() {
  d3.select("#searchInput").on("input", function () {
    const term = this.value.trim().toLowerCase();
    g.selectAll("g.node circle").attr("opacity", (d) =>
      term === "" || d.id.toLowerCase().includes(term) ? 1 : 0.1
    );
    g.selectAll("line.link").attr("opacity", (d) =>
      term === "" ||
      d.source.id.toLowerCase().includes(term) ||
      d.target.id.toLowerCase().includes(term)
        ? 1
        : 0.05
    );
  });
}
