function updateBubbleChart() {
    const filtered = selectedSeason
      ? data.filter(d=>d.season === selectedSeason)
      : data;

    const bySp = d3.rollup(
      filtered,
      v => {
        const episodes = new Set(v.map(d=>`${d.season}-${d.episode}`)).size;
        const lines    = v.length;
        const words    = d3.sum(v, d => {
          const txt = d.line == null ? '' : d.line.toString();
          return txt.split(/\s+/).filter(w=>w).length;
        });
        const lc       = d3.rollup(v, vv => vv.length, d=>d.line);
        const topEntry = Array.from(lc).sort((a,b)=>b[1]-a[1])[0];
        return { episodes, lines, words, topLine: topEntry ? topEntry[0] : '' };
      },
      d => d.speaker
    );

    let agg = Array.from(bySp, ([speaker, st]) => ({
      speaker,
      episodes: st.episodes,
      lines:    st.lines,
      avgWords: st.words / st.episodes,
      topLine:  st.topLine
    }));
    agg.sort((a,b) => b.lines - a.lines);
    const topN = agg.slice(0,10);

    const svgB = d3.select('#bubbleSvg');
    svgB.selectAll('*').remove();
    svgB.selectAll('.speech').remove();

    const marginB = { top:20, right:20, bottom:40, left:40 };
    const w = parseInt(svgB.style('width'))  - marginB.left - marginB.right;
    const h = parseInt(svgB.style('height')) - marginB.top  - marginB.bottom;
    const g = svgB.append('g').attr('transform', `translate(${marginB.left},${marginB.top})`);

    const x = d3.scaleLinear().domain([0, d3.max(topN, d=>d.episodes)]).nice().range([0,w]);
    const y = d3.scaleLinear().domain([0, d3.max(topN, d=>d.lines)]).nice().range([h,0]);
    const r = d3.scaleSqrt().domain([0, d3.max(topN, d=>d.avgWords)]).nice().range([5,30]);
    const color = d3.scaleOrdinal(d3.schemeCategory10).domain(topN.map(d=>d.speaker));

    g.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x));
    g.append('g').call(d3.axisLeft(y));

    g.selectAll('circle').data(topN).join('circle')
      .attr('cx', d=>x(d.episodes))
      .attr('cy', d=>y(d.lines))
      .attr('r',  d=>r(d.avgWords))
      .attr('fill',d=>color(d.speaker))
      .attr('opacity',0.8)
      .on('dblclick',(ev,d)=>{
        svgB.selectAll('.speech').remove();
        const cx = x(d.episodes)+marginB.left;
        const cy = y(d.lines)+marginB.top;
        d3.select(ev.currentTarget).transition().duration(300).attr('opacity',0)
          .on('end',()=>{
            const speech = svgB.append('g').attr('class','speech');
            speech.append('rect')
              .attr('x',cx).attr('y',cy)
              .attr('width',0).attr('height',0)
              .attr('rx',10).attr('ry',10)
              .style('fill','#fff').style('stroke','#000').style('stroke-width','1px')
              .transition().duration(500)
                .attr('x',cx+10).attr('y',cy-60)
                .attr('width',220).attr('height',60);
            speech.append('text')
              .attr('x',cx+20).attr('y',cy-30).style('opacity',0)
              .text(d.topLine)
              .transition().delay(500).duration(200).style('opacity',1);
          });
      });

    const lg = d3.select('#bubbleLegend');
    lg.selectAll('*').remove();
    lg.selectAll('.legend-item').data(topN).join('div')
      .attr('class','legend-item')
      .on('click',(ev,d)=>{
        const hidden = d3.select(ev.currentTarget).classed('hidden');
        d3.selectAll('circle').filter(c=>c.speaker===d.speaker)
          .transition().attr('opacity', hidden?0.8:0.2);
        d3.select(ev.currentTarget).classed('hidden',!hidden).style('opacity', hidden?1:0.5);
      })
      .call(sel=>{
        sel.append('div').attr('class','legend-color').style('background',d=>color(d.speaker));
        sel.append('div').text(d=>d.speaker);
      });
  }