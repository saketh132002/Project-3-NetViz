// script.js: Corrected Version with Progress Bar Animation + All Previous Features

document.addEventListener('DOMContentLoaded', () => {
    const dataPath = 'The-Office-Lines-Cleaned.csv';
    const margin = { top: 20, right: 20, bottom: 30, left: 160 };
    const width = 800 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;
    let selectedSeason = null;
  
    const svg = d3.select('#charBarSvg')
      .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`);
  
    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0)
      .style('visibility', 'hidden');
  
    d3.csv(dataPath, d3.autoType).then(data => {
      const episodes = Array.from(new Set(data.map(d => `${d.season}-${d.episode}`)));
      episodes.sort((a, b) => {
        const [s1, e1] = a.split('-').map(Number),
              [s2, e2] = b.split('-').map(Number);
        return s1 === s2 ? e1 - e2 : s1 - s2;
      });
  
      const cumul = episodes.map(ep => {
        const [s, e] = ep.split('-').map(Number);
        const upTo = data.filter(d => d.season < s || (d.season === s && d.episode <= e));
        return d3.rollup(upTo, v => v.length, d => d.speaker);
      });
  
      let playInterval = null, idx = 0;
  
      function startAnimation() {
        if (playInterval) return;
        if (idx >= episodes.length) idx = 0;
        playInterval = d3.interval(() => {
          if (idx >= episodes.length) {
            playInterval.stop();
            playInterval = null;
            return;
          }
          updateBarChart(cumul[idx]);

          const [season, episode] = episodes[idx].split('-').map(Number);
          d3.select('#currentEpisode')
            .text(`Season ${season} - Episode ${episode}`);
                      
          idx++;
        }, 300);
      }
      function pauseAnimation() {
        if (playInterval) {
          playInterval.stop();
          playInterval = null;
        }
      }
      function resetAnimation() {
        pauseAnimation();
        idx = 0;
        updateBarChart();
        updateBubbleChart();
      }
  
      const seasons = Array.from(new Set(data.map(d => d.season))).sort((a, b) => a - b);
      const epsMap = d3.rollup(
        data,
        v => new Set(v.map(d => `${d.season}-${d.episode}`)).size,
        d => d.season
      );
  
      drawEpisodeDonut(seasons, epsMap);
  
      d3.select('#resetBtn').on('click', () => {
        selectedSeason = null;
        resetAnimation();
      });
      d3.select('#playBtn').on('click', startAnimation);
      d3.select('#pauseBtn').on('click', pauseAnimation);
      d3.select('#resetAnimBtn').on('click', resetAnimation);
  
      updateBarChart();
      updateBubbleChart();
  
      function drawEpisodeDonut(seasons, epsMap) {
        const container = d3.select('#episodeDonut');
        container.selectAll('*').remove();
        const size = 140, r = size / 2, t = r * 0.3;
        const pieData = seasons.map(s => ({ season: s, count: epsMap.get(s) }));
        const pieGen = d3.pie().value(d => d.count);
        const arcs = pieGen(pieData);
        const arcGen = d3.arc().innerRadius(r - t).outerRadius(r);
        const color = d3.scaleOrdinal(d3.schemeCategory10).domain(seasons);
  
        const g = container.append('svg')
          .attr('width', size).attr('height', size)
          .append('g')
          .attr('transform', `translate(${r},${r})`);
  
        g.selectAll('path').data(arcs).join('path')
          .attr('d', arcGen)
          .attr('fill', d => color(d.data.season))
          .on('mouseover', (ev, d) => {
            tooltip
              .html(`Season ${d.data.season}: ${d.data.count} episodes`)
              .style('left', `${ev.pageX + 10}px`)
              .style('top', `${ev.pageY - 28}px`)
              .style('visibility', 'visible')
              .transition().duration(200).style('opacity', 1);
          })
          .on('mouseout', () => {
            tooltip.transition().duration(500).style('opacity', 0)
              .on('end', () => tooltip.style('visibility', 'hidden'));
          })
          .on('click', (ev, d) => {
            selectedSeason = (selectedSeason === d.data.season) ? null : d.data.season;
            resetAnimation();
          });
  
        g.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '0.4em')
          .style('fill', '#fff')
          .style('font-size', '12px')
          .text('Episodes');

            // ── build a color legend under the donut ──
  const legend = d3.select('#episodeLegend');
  legend.selectAll('*').remove();  // clear old entries
  const items = legend.selectAll('.legend-item')
    .data(arcs)
    .enter()
    .append('div')
      .attr('class', 'legend-item');

  // colored square
  items.append('div')
      .attr('class', 'legend-color')
      .style('background-color', d => color(d.data.season));

  // label text
  items.append('span')
      .text(d => `Season ${d.data.season}`);

      }
  
      function updateBarChart(countsMap = null) {
        const bySp = countsMap
          ? countsMap
          : d3.rollup(
              (selectedSeason
                ? data.filter(d => d.season === selectedSeason)
                : data),
              v => v.length,
              d => d.speaker
            );
      
        let agg = Array.from(bySp, ([speaker, lines]) => ({ speaker, lines }));
        agg.sort((a, b) => b.lines - a.lines);
        const top6 = agg.slice(0, 6);
      
        const x = d3.scaleLinear()
          .domain([0, d3.max(top6, d => d.lines)]).nice()
          .range([0, width]);
        const y = d3.scaleBand()
          .domain(top6.map(d => d.speaker))
          .range([0, height])
          .padding(0.2);
      
        let g = svg.select('g');
        if (g.empty()) {
          g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
          g.append('g').call(d3.axisTop(x).ticks(5).tickSizeOuter(0));
          g.append('g').call(d3.axisLeft(y).tickSize(0)).selectAll('text').remove();
        }
      
        // BARS: Smooth transition (grow/shrink, re-rank)
        const bars = g.selectAll('rect.bar').data(top6, d => d.speaker);
        bars.join(
            enter => enter.append('rect')
              .attr('class', 'bar')
              .attr('x', 0)
              .attr('y', d => y(d.speaker))
              .attr('height', y.bandwidth())
              .attr('width', 0)
              .attr('fill', d => d.speaker === 'Michael' ? '#e50914' : '#444')
              .call(enter => enter.transition().duration(300)
                .attr('width', d => x(d.lines))),
            update => update
              .transition().duration(300)
              .attr('y', d => y(d.speaker))
              .attr('width', d => x(d.lines))
          );
      
        // ICONS (speaker faces)
        const iconSize = 24;
        g.selectAll('image.icon').data(top6, d => d.speaker)
          .join('image')
          .attr('class', 'icon')
          .attr('xlink:href', d => `images/${d.speaker}.png`)
          .attr('x', -margin.left + 8)
          .attr('y', d => y(d.speaker) + (y.bandwidth() - iconSize) / 2)
          .attr('width', iconSize)
          .attr('height', iconSize);
      
        // SPEAKER LABELS (names beside icons)
        g.selectAll('text.label').data(top6, d => d.speaker)
          .join('text')
          .attr('class', 'label')
          .attr('x', -margin.left + 8 + iconSize + 8)
          .attr('y', d => y(d.speaker) + y.bandwidth() / 2 + 4)
          .attr('fill', '#fff')
          .style('font-size', '12px')
          .text(d => d.speaker);
      
        // NEW: LINE COUNT TEXT inside bars
        const lineLabels = g.selectAll('text.line-count').data(top6, d => d.speaker);
        lineLabels.join(
          enter => enter.append('text')
            .attr('class', 'line-count')
            .attr('fill', 'white')
            .attr('font-size', '12px')
            .attr('text-anchor', 'start')
            .attr('alignment-baseline', 'middle')
            .attr('x', 5) // 5px padding inside bar
            .attr('y', d => y(d.speaker) + y.bandwidth() / 2)
            .text(d => `${d.lines} lines`),
          update => update.transition().duration(300)
            .attr('y', d => y(d.speaker) + y.bandwidth() / 2)
            .text(d => `${d.lines} lines`)
            .attr('x', 5)
        );
      
        // Also update Bubble Chart
        updateBubbleChart();
      }
      
  
      function updateBubbleChart() {
        const stopWords = new Set([
          'yeah', 'okay', 'ok', 'no', 'yes', 'umm', 'uh', 'huh', 'uhh', 'oops',
          'alright', 'nah', 'yep', 'sure', 'uh oh', 'uh huh', 'woo', 'hmm'
        ]);
      
        const filtered = selectedSeason
          ? data.filter(d => d.season === selectedSeason)
          : data;
      
        const bySp = d3.rollup(
          filtered,
          v => {
            const episodes = new Set(v.map(d => `${d.season}-${d.episode}`)).size;
            const lines = v.length;
            const words = d3.sum(v, d => {
              const txt = d.line == null ? '' : d.line.toString();
              return txt.split(/\s+/).filter(w => w).length;
            });
      
            // ✨ NEW: Filter meaningful lines
            const goodLines = v
              .map(d => d.line ? d.line.toString().trim() : '')
              .filter(line => {
                const lower = line.toLowerCase();
                const wordCount = lower.split(/\s+/).length;
                return !(stopWords.has(lower)) && wordCount >= 3;
              });
      
            const lineCounts = d3.rollup(goodLines, vv => vv.length, d => d);
            const topEntry = Array.from(lineCounts).sort((a, b) => b[1] - a[1])[0];
      
            return {
              episodes,
              lines,
              words,
              topLine: topEntry ? topEntry[0] : ''  // fallback: if nothing good, fallback to empty
            };
          },
          d => d.speaker
        );
      
        let agg = Array.from(bySp, ([speaker, st]) => ({
          speaker,
          episodes: st.episodes,
          lines: st.lines,
          avgWords: st.words / st.episodes,
          topLine: st.topLine
        }));
        agg.sort((a, b) => b.lines - a.lines);
        const topN = agg.slice(0, 10);
      
        const svgB = d3.select('#bubbleSvg');
        svgB.selectAll('*').remove();
      
        const marginB = { top: 20, right: 20, bottom: 40, left: 40 };
        const w = parseInt(svgB.style('width')) - marginB.left - marginB.right;
        const h = parseInt(svgB.style('height')) - marginB.top - marginB.bottom;
        const g = svgB.append('g').attr('transform', `translate(${marginB.left},${marginB.top})`);
      
        const x = d3.scaleLinear().domain([0, d3.max(topN, d => d.episodes)]).nice().range([0, w]);
        const y = d3.scaleLinear().domain([0, d3.max(topN, d => d.lines)]).nice().range([h, 0]);
        const r = d3.scaleSqrt().domain([0, d3.max(topN, d => d.avgWords)]).nice().range([5, 30]);
        const color = d3.scaleOrdinal(d3.schemeCategory10).domain(topN.map(d => d.speaker));
      
        g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x));
        g.append('g').call(d3.axisLeft(y));
      
        const circles = g.selectAll('circle').data(topN, d => d.speaker).join('circle')
          .attr('fill', d => color(d.speaker))
          .attr('opacity', 0.8)
          .attr('cx', d => x(d.episodes))
          .attr('cy', d => y(d.lines))
          .attr('r', d => r(d.avgWords))
          .on('mouseover', (ev, d) => {
            tooltip
              .html(`${d.speaker}<br/>Episodes: ${d.episodes}<br/>Lines: ${d.lines}<br/>Avg words/ep: ${d.avgWords.toFixed(1)}`)
              .style('left', `${ev.pageX + 10}px`)
              .style('top', `${ev.pageY - 28}px`)
              .style('visibility', 'visible')
              .transition().duration(200).style('opacity', 1);
          })
          .on('mouseout', () => {
            tooltip.transition().duration(500).style('opacity', 0)
              .on('end', () => tooltip.style('visibility', 'hidden'));
          })
          .on('click', (ev, d) => {
            const wasActive = d3.select(ev.currentTarget).classed('active');
            d3.selectAll('circle').classed('active', false).transition().attr('opacity', 0.3);
            if (!wasActive) {
              d3.select(ev.currentTarget).classed('active', true).transition().attr('opacity', 1);
            } else {
              d3.selectAll('circle').transition().attr('opacity', 0.8);
            }
          })
          .on('dblclick', (ev, d) => {
            svgB.selectAll('.speech').remove();
            const cx = x(d.episodes) + marginB.left;
            const cy = y(d.lines) + marginB.top;
            d3.select(ev.currentTarget)
              .transition().duration(300).attr('opacity', 0)
              .on('end', () => {
                const speech = svgB.append('g').attr('class', 'speech');
                speech.append('rect')
                  .attr('x', cx).attr('y', cy)
                  .attr('width', 0).attr('height', 0)
                  .attr('rx', 10).attr('ry', 10)
                  .style('fill', '#fff')
                  .style('stroke', '#000')
                  .style('stroke-width', '1px')
                  .transition().duration(500)
                  .attr('x', cx + 10).attr('y', cy - 60)
                  .attr('width', 220).attr('height', 60);
                speech.append('text')
                  .attr('x', cx + 20).attr('y', cy - 30)
                  .style('opacity', 0)
                  .text(d.topLine)
                  .transition().delay(500).duration(200).style('opacity', 1);
              });
          });
      
        const lg = d3.select('#bubbleLegend');
        lg.selectAll('*').remove();
        lg.selectAll('.legend-item').data(topN, d => d.speaker).join('div')
          .attr('class', 'legend-item')
          .on('click', (ev, d) => {
            const hidden = d3.select(ev.currentTarget).classed('hidden');
            d3.selectAll('circle').filter(c => c.speaker === d.speaker)
              .transition().attr('opacity', hidden ? 0.8 : 0.2);
            d3.select(ev.currentTarget).classed('hidden', !hidden).style('opacity', hidden ? 1 : 0.5);
          })
          .call(sel => {
            sel.append('div').attr('class', 'legend-color').style('background', d => color(d.speaker));
            sel.append('div').text(d => d.speaker);
          });
      }
      
      
  
    }).catch(err => console.error('CSV load error:', err));
  });

  function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
      page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
  
    // ADD THIS:
    if (pageId === 'characterPage') {
      if (!window.characterTreeDrawn) {
        drawCharacterTree();
        window.characterTreeDrawn = true;
      }
    }
  }
  
  
  