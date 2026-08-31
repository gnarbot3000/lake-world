(function () {
  var tiles = [
    "img/slalom-wake.jpg",
    "img/kneeboard.jpg",
    "img/course.jpg",
    "img/buoys.jpg",
    "img/boat.jpg",
    "img/spray.jpg"
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
