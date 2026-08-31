(function () {
  var tiles = [
    "img/slalom-wake.jpg",
    "img/dock-skis.jpg",
    "img/kneeboard.jpg",
    "img/kiteboard.jpg",
    "img/course.jpg",
    "img/slalom-cut.jpg",
    "img/buoys.jpg",
    "img/wingfoil.jpg",
    "img/boat.jpg",
    "img/twin-ski.jpg",
    "img/spray.jpg",
    "img/dock-dusk.jpg",
    "img/ski-boat-pull.jpg",
    "img/jump-ramp.jpg",
    "img/kneeboard-turn.jpg",
    "img/course-overhead.jpg",
    "img/handle-close.jpg",
    "img/ski-edge.jpg"
  ];
  var circles = {
    "img/buoys.jpg": true,
    "img/handle-close.jpg": true
  };
  var wall = document.querySelector(".poster-wall");
  if (!wall) return;
  wall.innerHTML = "";
  var ROW_COUNT = 10;
  var COPIES = 4;
  var r, i, row, src, img;
  for (r = 0; r < ROW_COUNT; r++) {
    row = document.createElement("div");
    row.className = "poster-row";
    for (i = 0; i < tiles.length * COPIES; i++) {
      src = tiles[(i + r * 2) % tiles.length];
      img = document.createElement("img");
      img.src = src;
      img.alt = "";
      if (circles[src]) img.className = "tile-circle";
      row.appendChild(img);
    }
    wall.appendChild(row);
  }
})();
