const width = 800;
const height = 600;

// Load the new structured data
d3.json("speaker_season_word_counts_post_processed.json").then(data => {
  const importantCharacters = ["Michael", "Jim", "Dwight", "Pam", "Andy", "Ryan", "Angela", "Kevin", "Stanley", "Toby"];
  const availableCharacters = importantCharacters.filter(name => name in data);

  // Populate character dropdown
  const characterSelect = d3.select("#character-select");
  availableCharacters.forEach(char => {
    characterSelect.append("option").text(char).attr("value", char);
  });

  // Populate season dropdown
  const seasonSelect = d3.select("#season-select");
  seasonSelect.append("option").text("All Seasons").attr("value", "all");
  for (let i = 1; i <= 9; i++) {
    seasonSelect.append("option").text(`Season ${i}`).attr("value", String(i));
  }

  // Set up a color scale
  const color = d3.scaleOrdinal(d3.schemeCategory10);

  // Initial render
  renderWordCloud(availableCharacters[0], "all");

  // Update on any selection change
  characterSelect.on("change", update);
  seasonSelect.on("change", update);

  function update() {
    const selectedCharacter = characterSelect.property("value");
    const selectedSeason = seasonSelect.property("value");
    renderWordCloud(selectedCharacter, selectedSeason);
  }

  function renderWordCloud(character, season) {
    // Clear previous messages or word clouds
    d3.select("#word-cloud").html("");
    d3.select("#phrase-cloud").html("");

    if (!data[character]) {
      console.warn(`No data for ${character}`);
      return;
    }

    const wordDataRaw = data[character][season] || {};
    const phraseDataRaw = extractPhrases(character, season, data); // Extract the phrases

    if (Object.keys(wordDataRaw).length === 0) {
      // Display a message when no data is found for the selected character and season
      d3.select("#word-cloud").html(`<p>No words for ${character} in Season ${season}</p>`);
      return;
    }

    // Scale word sizes based on the maximum word count for the character and season
    const maxWordCount = d3.max(Object.values(wordDataRaw));
    const sizeScale = d3.scaleLinear()
      .domain([0, maxWordCount])
      .range([10, 60]);

    const wordData = Object.entries(wordDataRaw).map(([text, size]) => ({
      text: capitalizeFirstLetter(text),
      size: sizeScale(size)
    }));

    // Render the word cloud for words
    renderCloud(wordData, "#word-cloud", width, height, color);
  }

  function renderCloud(data, selector, width, height, color) {
    const svg = d3.select(selector)
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    const layout = d3.layout.cloud()
      .size([width, height])
      .words(data)
      .padding(5)
      .rotate(() => (Math.random() > 0.5 ? 90 : 0))
      .fontSize(d => d.size)
      .on("end", draw);

    layout.start();

    function draw(words) {
      svg.append("g")
        .attr("transform", `translate(${width / 2},${height / 2})`)
        .selectAll("text")
        .data(words)
        .enter()
        .append("text")
        .style("font-family", "Impact")
        .style("font-size", d => d.size + "px")
        .style("fill", (d, i) => color(i))
        .attr("text-anchor", "middle")
        .attr("transform", d => `translate(${d.x},${d.y}) rotate(${d.rotate})`)
        .style("opacity", 0)
        .text(d => d.text)
        .transition()
        .duration(600)
        .style("opacity", 1);
    }
  }

  function extractPhrases(character, season, data) {
    const wordDataRaw = data[character][season] || {};
    const lines = Object.keys(wordDataRaw);
    let phrases = [];

    lines.forEach(line => {
      const words = line.split(" ").filter(word => word.length > 1); // Ignore single-character words
      for (let i = 0; i < words.length - 1; i++) {
        const bigram = `${words[i]} ${words[i + 1]}`;
        phrases.push(bigram);
      }
    });

    // Count phrase occurrences using a regular object (JavaScript way of doing it)
    const phraseCounts = {};
    phrases.forEach(phrase => {
      phraseCounts[phrase] = (phraseCounts[phrase] || 0) + 1;
    });

    // Return the phrases with size for word cloud
    return Object.entries(phraseCounts).map(([text, count]) => ({
      text,
      size: count * 10 // Scale the phrase size
    }));
  }

  function capitalizeFirstLetter(word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }
}).catch(error => {
  console.error('Error loading the JSON file:', error);
});
