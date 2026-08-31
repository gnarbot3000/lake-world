(function () {
  var tiles = [
    "img/slalom-wake.jpg",
    "img/kirk-slalom.jpg",
    "img/kneeboard.jpg",
    "img/unsplash-boat-pull.jpg",
    "img/course.jpg",
    "img/franklin-slalom.jpg",
    "img/buoys.jpg",
    "img/unsplash-wakeboard.jpg",
    "img/boat.jpg",
    "img/mead-slalom.jpg",
    "img/spray.jpg",
    "img/putrajaya-ski.jpg",
    "img/unsplash-ski.jpg",
    "img/wakeboard-boat.jpg",
    "img/unsplash-slalom.jpg",
    "img/ski-jump.jpg",
    "img/wakesurf-mead.jpg",
    "img/barefoot-ski.jpg",
    "img/mead-slalom-2.jpg",
    "img/unsplash-wakeboard-2.jpg"
  ];
  var circles = { "img/buoys.jpg": true };
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
