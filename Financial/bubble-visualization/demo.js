function buildChart(data) {
  var cs = {};
  data.each(function(tx) {
    if (tx['Transaction Type'] != 'debit') {
      return;
    }
    var c = tx['Category'];
    if (c == 'Transfer') {
      return;
    }
    if (!(c in cs)) {
      cs[c] = 0.0;
    }
    cs[c] += +(tx['Amount']);
  });
  var w = 960,
      h = 480,
      nodes = [];
  for (var c in cs) {
    nodes.push({
      R: Math.max(2, Math.sqrt(cs[c])),
      category: c,
      weight: cs[c]
    });
  }
  var Rs = nodes.map(function(d) { return d.R; });
  var minR = d3.min(Rs),
      maxR = d3.max(Rs);
  var fill = d3.scale.linear()
    .domain([minR, maxR])
    .range(['#7EFF77', '#067500']);
  var floatPoint = d3.scale.linear()
    .domain([minR, maxR])
    .range([h * 0.65, h * 0.35]);

  var vis = d3.select('#chart').append('svg:svg')
    .attr('width', w)
    .attr('height', h);

  var force = d3.layout.force()
    .nodes(nodes)
    .links([])
    .size([w, h])
    .start();

  var node = vis.selectAll('circle.node')
    .data(nodes)
    .enter().append('svg:circle')
    .attr('class', 'node')
    .attr('cx', function(d) { return d.x; })
    .attr('cy', function(d) { return d.y; })
    .attr('r', function(d) { return d.R; })
    .style('fill', function(d) { return fill(d.R); })
    .style('stroke', function(d) { return d3.rgb(fill(d.R)).darker(1); })
    .style('stroke-width', function(d) { return Math.max(1.0, d.R / 50); })
    .on('mouseover', function(d) {
      console.log(d.category);
    })
    .on('mouseout', function(d) {
    })
    .call(force.drag);
  
  force
    .gravity(0.05)
    .friction(0.9)
    .charge(function(d) { return -d.R * d.R / 8; });

  force.on('tick', function(e) {
    // weight sorting
    nodes.each(function(d) {
      var dy = floatPoint(d.R) - d.y;
      d.y += 0.4 * dy * e.alpha;
    });

    // collision detection
    var q = d3.geom.quadtree(nodes);
    nodes.each(function(d1) {
      q.visit(function(quad, x1, y1, x2, y2) {
        var d2 = quad.point;
        if (d2 && (d2 !== d1)) {
          var x = d1.x - d2.x,
              y = d1.y - d2.y,
              L = Math.sqrt(x * x + y * y),
              R = d1.R + d2.R;
          if (L < R) {
            L = (L - R) / L * 0.5;
            var Lx = L * x,
                Ly = L * y;
            d1.x -= Lx; d1.y -= Ly; 
            d2.x += Lx; d2.y += Ly; 
          }
        }
        return
          x1 > (d1.x + d1.R) ||
          x2 < (d1.x - d1.R) ||
          y1 > (d1.y + d1.R) ||
          y2 < (d1.y - d1.R);
      });
    });
    node
      .attr('cx', function(d) { return d.x; })
      .attr('cy', function(d) { return d.y; });
  });
}

window.addEvent('domready', function() {
  function handleFileSelect(evt) {
    console.log(evt);
    evt.stopPropagation();
    evt.preventDefault();

    var files = evt.dataTransfer.files;
    if (files.length == 0) {
      alert('no files');
      return;
    }
    var f = files[0];
    if (f.type != 'text/csv') {
      alert('invalid file type: ' + f.type);
      return;
    }
    var reader = new FileReader();
    reader.onloadstart = function(e) {
      if (e.lengthComputable) {
        $('progress').removeClass('hidden');
        $('progress_bar').set('value', 0);
        $('progress_bar').set('max', e.total);
      }
    };
    reader.onprogress = function(e) {
      if (e.lengthComputable) {
        $('progress_bar').value = e.loaded;
      }
    };
    reader.onload = function(e) {
      buildChart(d3.csv.parse(e.target.result));
    };
    reader.onloadend = function(e) {
      $('progress').addClass('hidden');
      $('drop_zone').addClass('hidden');
    };
    reader.readAsText(f);
  }

  var dropZone = $('drop_zone');
  dropZone.addEventListener('dragenter', function(evt) {
    evt.stopPropagation();
    evt.preventDefault();
  }, false);
  dropZone.addEventListener('dragexit', function(evt) {
    evt.stopPropagation();
    evt.preventDefault();
  }, false);
  dropZone.addEventListener('dragover', function(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy';
  }, false);
  dropZone.addEventListener('drop', handleFileSelect, false);
});
