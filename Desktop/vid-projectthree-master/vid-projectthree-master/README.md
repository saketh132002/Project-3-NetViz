# The Office Dashboard — Dialogue Data Visualization

An interactive, Netflix-styled multi-page dashboard that visualizes **54,000+ lines of dialogue from all 9 seasons of NBC's *The Office* (2005–2013)**, built with **D3.js**. Explore who talks the most, how characters interact, which phrases define the show, and how the cast connects through the Dunder Mifflin org chart.

## Pages & Features

### 🏠 Overview (`index.html`)
- **Animated bar chart race** — Top 6 characters by lines spoken, playing episode-by-episode through the entire series with Play / Pause / Reset controls
- **Season & episode donut chart** — click to filter, with a reset button
- **Character importance bubble chart** — bubble size encodes each character's share of dialogue

### 🌳 Org Chart (`character.html`)
- **Collapsible D3 tree** of the Dunder Mifflin corporate hierarchy — click nodes to expand or collapse branches, with zoom and pan support

### 🔗 Explore — Character Interaction Network (`interactions.html`)
- **Force-directed graph** of character interactions based on shared scenes
- Drag nodes, hover links, and use dropdowns/search to focus on specific characters

### 🔍 Phrase Search (`phrase.html`)
- **Search any phrase** (e.g., "that's what she said") across all 54K+ lines
- **Line chart** showing how often the phrase appears per season
- **Top speaker** for the phrase and browsable matching quotes, filterable by season

### ☁️ Word Cloud (`cloud.html`)
- **Per-character, per-season word clouds** built from post-processed word frequency data — see each character's most distinctive vocabulary

### 😂 Meet the People (`charactertiles.html`)
- **Character tile gallery** with portraits of the full cast, from Michael and Dwight to Mose and Todd Packer

## Project Structure

```
vid-projectthree-master/
├── index.html                    # Overview dashboard (bar race, donut, bubble chart)
├── script.js                     # Overview page logic
├── character.html / character.js # Dunder Mifflin org chart (collapsible tree)
├── interactions.html / app.js    # Character interaction network (force graph)
├── phrase.html / phrase.js       # Phrase search + per-season trend chart
├── cloud.html / cloud.js         # Word clouds by character & season
├── charactertiles.html           # Character gallery
├── style.css, character.css, charactertiles.css,
│   cloud.css, phrase.css, interaction_style.css
├── The-Office-Lines-Cleaned.csv  # 54K+ dialogue lines (season, episode, scene, speaker, line)
├── speaker_season_word_counts_post_processed.json  # Word frequencies for the word cloud
├── character_tree.json           # Org chart hierarchy data
├── icons/                        # UI icons
├── images/                       # Character portraits
└── pictures/                     # Character headshots
```

## Data

- **`The-Office-Lines-Cleaned.csv`** — ~54,600 rows, one per spoken line:
  | Column | Description |
  |---|---|
  | `season`, `episode`, `title` | Where the line occurs |
  | `scene` | Scene number within the episode |
  | `speaker` | Character who says the line |
  | `line` | The dialogue text |
- **`speaker_season_word_counts_post_processed.json`** — cleaned word frequency counts per character per season, powering the word clouds
- **`character_tree.json`** — hierarchical data for the Dunder Mifflin org chart
- **Source:** *The Office* transcript dataset (fan-transcribed dialogue, cleaned for this project)

## Technologies

- [D3.js v7](https://d3js.org/) — bar charts, donut charts, bubble charts, force simulation, tree layout, line charts, and transitions
- [d3-cloud](https://github.com/jasondavies/d3-cloud) — word cloud layout
- [Lucide](https://lucide.dev/) — sidebar navigation icons
- Vanilla HTML/CSS/JavaScript — multi-page app with a shared Netflix-inspired dark theme, no build step required

## Getting Started

The app loads CSV and JSON files with `d3.csv`/`d3.json`, so it needs to be served over HTTP (opening files directly via `file://` will be blocked by browser CORS rules).

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
   cd YOUR-REPO-NAME
   ```
2. Start a local server:
   ```bash
   # Python 3
   python -m http.server 8000
   ```
3. Open [http://localhost:8000](http://localhost:8000) in your browser and use the sidebar to navigate between pages.

## Insights You Can Explore

- Michael Scott's dominance of the dialogue — and who fills the void after he leaves in Season 7
- Which character pairs share the most scenes (Jim & Pam vs. Jim & Dwight)
- How catchphrases like "that's what she said" trend across seasons
- Each character's signature vocabulary through their word clouds

## License

This project was created for academic purposes. *The Office* is the property of NBCUniversal; dialogue data is used here for educational, non-commercial analysis.
