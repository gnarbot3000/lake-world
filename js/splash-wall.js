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
  function rowHtml(offset) {
    var html = "";
    var i;
    for (i = 0; i < tiles.length * 2; i++) {
      var src = tiles[(i + offset) % tiles.length];
      html += "<img src=\"" + src + "\" alt=\"\"" + (circles[src] ? " class=\"tile-circle\"" : "") + ">";
    }
    return html;
  }
  document.getElementById("row-a").innerHTML = rowHtml(0);
  document.getElementById("row-b").innerHTML = rowHtml(2);
  document.getElementById("row-c").innerHTML = rowHtml(4);
  document.getElementById("row-d").innerHTML = rowHtml(1);
})();
