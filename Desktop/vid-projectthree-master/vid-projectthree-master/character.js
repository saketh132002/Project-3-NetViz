// character.js

// Group color mapping
const groupColors = {
    "Corporate": "#1f77b4",
    "Stamford Branch": "#5DADE2",
    "Scranton Branch": "#27AE60",
    "Sales Department": "#2ECC71",
    "Accounting Department": "#E67E22",
    "Warehouse": "#A0522D",
    "HR Department": "#8E44AD",
    "Reception": "#F39C12",
    "Utica Branch": "#3498DB",
    "Nashua Branch": "#9B59B6",
    "Other Office Roles": "#7F8C8D"
  };
  
  // 🌟 NEW: Wrap everything inside a function
  function drawCharacterTree() {
    const margin = { top: 40, right: 40, bottom: 40, left: 120 };
    const width = document.querySelector('.tree-container').clientWidth - margin.left - margin.right;
    const height = document.querySelector('.tree-container').clientHeight - margin.top - margin.bottom;
  
    const svgBase = d3.select('#characterTree')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom);
  
    const svg = svgBase.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
  
    const zoom = d3.zoom()
      .scaleExtent([0.5, 2])
      .on('zoom', (event) => {
        svgBase.select('g').attr('transform', event.transform);
      });
  
    d3.select('#characterTree').call(zoom);
  
    const treemap = d3.tree().size([width, height]);
    let i = 0;
  
    d3.json('character_tree.json').then(function (data) {
      let root = d3.hierarchy(data, d => d.children);
      root.x0 = width / 2;
      root.y0 = 0;
  
      // root.children.forEach(collapse); // optional initial collapse
  
      update(root);
  
      function collapse(d) {
        if (d.children) {
          d._children = d.children;
          d._children.forEach(collapse);
          d.children = null;
        }
      }
  
      function update(source) {
        const treeData = treemap(root);
        const nodes = treeData.descendants();
        const links = treeData.links();
  
        nodes.forEach(d => d.y = d.depth * 120);
  
        const node = svg.selectAll('g.node')
          .data(nodes, d => d.id || (d.id = ++i));
  
        const nodeEnter = node.enter().append('g')
          .attr('class', 'node')
          .attr('transform', d => `translate(${source.x0},${source.y0})`)
          .on('click', click);
  
        nodeEnter.append('rect')
          .attr('class', 'node-rect')
          .attr('width', 100)
          .attr('height', 40)
          .attr('x', -50)
          .attr('y', -20)
          .attr('rx', 8)
          .attr('ry', 8)
          .style('fill', d => {
            const group = d.data.group || "Other Office Roles";
            return groupColors[group] || "#999";
          })
          .style('stroke', '#ccc')
          .style('stroke-width', 1.5);
  
        nodeEnter.append('text')
          .attr('dy', '-0.3em')
          .attr('text-anchor', 'middle')
          .attr('font-size', '12px')
          .attr('fill', 'white')
          .text(d => d.data.name);
  
        nodeEnter.append('text')
          .attr('dy', '1.2em')
          .attr('text-anchor', 'middle')
          .attr('font-size', '10px')
          .attr('fill', '#ccc')
          .text(d => d.data.title);
  
        const nodeUpdate = nodeEnter.merge(node);
  
        nodeUpdate.transition()
          .duration(300)
          .attr('transform', d => `translate(${d.x},${d.y})`);
  
        nodeUpdate.select('rect.node-rect')
          .style('fill', d => {
            const group = d.data.group || "Other Office Roles";
            return groupColors[group] || "#999";
          });
  
        const nodeExit = node.exit().transition()
          .duration(300)
          .attr('transform', d => `translate(${source.x},${source.y})`)
          .remove();
  
        nodeExit.select('rect')
          .attr('width', 0)
          .attr('height', 0);
  
        nodeExit.select('text')
          .style('fill-opacity', 1e-6);
  
        const link = svg.selectAll('path.link')
          .data(links, d => d.target.id);
  
        const linkEnter = link.enter().insert('path', 'g')
          .attr('class', 'link')
          .attr('d', d => {
            const o = { x: source.x0, y: source.y0 };
            return diagonal(o, o);
          })
          .style('fill', 'none')
          .style('stroke', '#ccc')
          .style('stroke-width', 1.5);
  
        const linkUpdate = linkEnter.merge(link);
  
        linkUpdate.transition()
          .duration(300)
          .attr('d', d => diagonal(d.source, d.target));
  
        link.exit().transition()
          .duration(300)
          .attr('d', d => {
            const o = { x: source.x, y: source.y };
            return diagonal(o, o);
          })
          .remove();
  
        nodes.forEach(d => {
          d.x0 = d.x;
          d.y0 = d.y;
        });
      }
  
      function diagonal(s, d) {
        return `M ${s.x} ${s.y}
                C ${s.x} ${(s.y + d.y) / 2},
                  ${d.x} ${(s.y + d.y) / 2},
                  ${d.x} ${d.y}`;
      }
  
      function click(event, d) {
        if (d.children) {
          d._children = d.children;
          d.children = null;
        } else {
          d.children = d._children;
          d._children = null;
        }
        update(d);
      }
    });
  }

  drawCharacterTree();
