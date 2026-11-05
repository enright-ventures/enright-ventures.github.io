// One set of 36 shapes that rearranges as the page scrolls: the company mark,
// an application screen, a neural network and a chain of blocks.
(function () {
  var canvas = document.querySelector(".figure");
  var ctx = canvas.getContext("2d");
  var reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var LIME = "#d7ff5e";
  var LINE = "rgba(255, 255, 255, 0.34)";

  function cell(x, y, w, h, r) {
    return { x: x, y: y, w: w, h: h, r: r };
  }

  function markFormation() {
    var slots = [];
    for (var row = 0; row < 10; row++) {
      var length = row < 2 || row > 7 ? 5 : row === 4 || row === 5 ? 4 : 2;
      for (var col = 0; col < length; col++) {
        slots.push(cell(0.25 + col * 0.1, row * 0.1, 0.09, 0.09, 0));
      }
    }
    return { slots: slots, edges: [], rects: [], paths: [] };
  }

  function appFormation() {
    var slots = [];
    var i;
    [0.03, 0.065, 0.1].forEach(function (x) {
      slots.push(cell(x, 0.095, 0.022, 0.022, 0.5));
    });
    slots.push(cell(0.16, 0.095, 0.5, 0.022, 0.2));
    for (i = 0; i < 6; i++) {
      slots.push(cell(0.03, 0.17 + i * 0.06, 0.16, 0.028, 0.2));
    }
    slots.push(cell(0.24, 0.17, 0.73, 0.11, 0.08));
    [0.24, 0.49, 0.74].forEach(function (x) {
      slots.push(cell(x, 0.3, 0.23, 0.09, 0.1));
    });
    [0.08, 0.13, 0.1, 0.17, 0.14, 0.2, 0.16, 0.22].forEach(function (h, n) {
      slots.push(cell(0.24 + n * 0.06, 0.64 - h, 0.044, h, 0.08));
    });
    slots.push(cell(0.74, 0.41, 0.23, 0.1, 0.1));
    slots.push(cell(0.74, 0.53, 0.23, 0.11, 0.1));
    for (i = 0; i < 4; i++) {
      var y = 0.68 + i * 0.055;
      slots.push(cell(0.24, y, 0.03, 0.03, 0.5));
      slots.push(cell(0.29, y, 0.44, 0.03, 0.2));
      slots.push(cell(0.79, y, 0.18, 0.03, 0.2));
    }
    return { slots: slots, edges: [], rects: [[0, 0.06, 1, 0.86]], paths: [] };
  }

  function networkFormation() {
    var layers = [4, 6, 8, 8, 6, 4];
    var size = 0.036;
    var slots = [];
    var edges = [];
    var previous = [];
    layers.forEach(function (count, l) {
      var current = [];
      for (var n = 0; n < count; n++) {
        var x = (l / (layers.length - 1)) * (1 - size);
        var y = 0.5 + (n - (count - 1) / 2) * 0.118 - size / 2;
        current.push(slots.length);
        slots.push(cell(x, y, size, size, 0.5));
      }
      previous.forEach(function (a) {
        current.forEach(function (b) {
          edges.push([a, b]);
        });
      });
      previous = current;
    });
    return { slots: slots, edges: edges, rects: [], paths: [] };
  }

  function chainFormation() {
    var slots = [];
    var rects = [];
    var paths = [];
    var size = 0.22;
    var step = 0.26;
    var pad = 0.026;
    var unit = 0.048;
    var gap = 0.012;
    for (var b = 0; b < 4; b++) {
      var x = b * step;
      var y = b * step;
      rects.push([x, y, size, size]);
      for (var row = 0; row < 3; row++) {
        for (var col = 0; col < 3; col++) {
          slots.push(cell(x + pad + col * (unit + gap), y + pad + row * (unit + gap), unit, unit, 0.08));
        }
      }
      if (b < 3) {
        paths.push([[x + size, y + size / 2], [x + step + size / 2, y + size / 2], [x + step + size / 2, y + step]]);
      }
    }
    return { slots: slots, edges: [], rects: rects, paths: paths };
  }

  // Reorders a formation so shapes cross the figure as they move to it,
  // rather than sliding across in tidy rows.
  function shuffled(formation, seed) {
    var order = formation.slots.map(function (_, i) {
      return i;
    });
    for (var i = order.length - 1; i > 0; i--) {
      seed = (seed * 16807) % 2147483647;
      var j = seed % (i + 1);
      var held = order[i];
      order[i] = order[j];
      order[j] = held;
    }
    var slots = [];
    order.forEach(function (to, from) {
      slots[to] = formation.slots[from];
    });
    formation.slots = slots;
    formation.edges = formation.edges.map(function (edge) {
      return [order[edge[0]], order[edge[1]]];
    });
    return formation;
  }

  var formations = [
    markFormation(),
    shuffled(appFormation(), 11),
    shuffled(networkFormation(), 23),
    shuffled(chainFormation(), 37)
  ];
  var active = 0;
  var alphas = [1, 0, 0, 0];
  var nodes = formations[0].slots.map(function (slot, i) {
    var seed = ((i + 1) * 7919) % 101;
    return {
      x: reduceMotion ? slot.x : (seed % 10) / 10,
      y: reduceMotion ? slot.y : (seed % 17) / 17,
      w: reduceMotion ? slot.w : 0.01,
      h: reduceMotion ? slot.h : 0.01,
      r: slot.r,
      speed: 0.05 + 0.08 * (((i * 7) % 36) / 36)
    };
  });
  var frame = null;
  var lastTime = 0;
  var width = 0;
  var height = 0;

  function layout() {
    var narrow = width <= 800;
    var side = narrow ? height * 0.84 : Math.min(width * 0.4, height * 0.74);
    return {
      side: side,
      x: narrow ? (width - side) / 2 : width - side - Math.max(16, width * 0.05),
      y: (height - side) / 2
    };
  }

  function draw() {
    var box = layout();
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 1;
    ctx.strokeStyle = LINE;

    formations.forEach(function (formation, f) {
      if (alphas[f] < 0.01) {
        return;
      }
      ctx.globalAlpha = alphas[f];
      formation.rects.forEach(function (rect) {
        ctx.strokeRect(box.x + rect[0] * box.side, box.y + rect[1] * box.side, rect[2] * box.side, rect[3] * box.side);
      });
      formation.paths.forEach(function (path) {
        ctx.beginPath();
        path.forEach(function (point, i) {
          var px = box.x + point[0] * box.side;
          var py = box.y + point[1] * box.side;
          if (i === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        });
        ctx.stroke();
      });
      if (formation.edges.length) {
        ctx.beginPath();
        formation.edges.forEach(function (edge) {
          var a = nodes[edge[0]];
          var b = nodes[edge[1]];
          ctx.moveTo(box.x + (a.x + a.w / 2) * box.side, box.y + (a.y + a.h / 2) * box.side);
          ctx.lineTo(box.x + (b.x + b.w / 2) * box.side, box.y + (b.y + b.h / 2) * box.side);
        });
        ctx.stroke();
      }
    });

    ctx.globalAlpha = 1;
    ctx.fillStyle = LIME;
    nodes.forEach(function (node) {
      var w = node.w * box.side;
      var h = node.h * box.side;
      ctx.beginPath();
      ctx.roundRect(box.x + node.x * box.side, box.y + node.y * box.side, w, h, node.r * Math.min(w, h));
      ctx.fill();
    });
  }

  function settle() {
    nodes.forEach(function (node, i) {
      Object.assign(node, formations[active].slots[i]);
    });
    alphas = alphas.map(function (_, f) {
      return f === active ? 1 : 0;
    });
  }

  function tick(time) {
    var scale = lastTime ? Math.min((time - lastTime) / 16.67, 3) : 1;
    var moving = false;
    lastTime = time;
    nodes.forEach(function (node, i) {
      var target = formations[active].slots[i];
      var ease = 1 - Math.pow(1 - node.speed, scale);
      ["x", "y", "w", "h", "r"].forEach(function (key) {
        var distance = target[key] - node[key];
        if (Math.abs(distance) > 0.0004) {
          node[key] += distance * ease;
          moving = true;
        } else {
          node[key] = target[key];
        }
      });
    });
    alphas = alphas.map(function (alpha, f) {
      var goal = f === active ? 1 : 0;
      var next = alpha + (goal - alpha) * (1 - Math.pow(0.9, scale));
      if (Math.abs(goal - next) > 0.004) {
        moving = true;
        return next;
      }
      return goal;
    });
    draw();
    if (moving) {
      frame = requestAnimationFrame(tick);
    } else {
      frame = null;
      lastTime = 0;
    }
  }

  function show(index) {
    active = index;
    if (reduceMotion) {
      settle();
      draw();
    } else if (!frame) {
      frame = requestAnimationFrame(tick);
    }
  }

  new ResizeObserver(function () {
    var ratio = window.devicePixelRatio || 1;
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw();
  }).observe(canvas);

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        show(Number(entry.target.dataset.figure));
      }
    });
  }, { rootMargin: "-50% 0px -50% 0px" });

  document.querySelectorAll("[data-figure]").forEach(function (section) {
    observer.observe(section);
  });
})();
