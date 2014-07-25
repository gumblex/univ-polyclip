# Efficient Clipping of Arbitrary Polygons using <canvas>

Based on the paper "Efficient Clipping of Arbitrary Polygons" by Günther Greiner (greiner[at]informatik.uni-erlangen.de) and Kai Hormann (hormann[at]informatik.tu-clausthal.de), ACM Transactions on Graphics 1998;17(2):71-83.

Available at: <http://www.inf.usi.ch/hormann/papers/Greiner.1998.ECO.pdf>


## Motivation

We needed a JavaScript version of a clipping arbitrary polygons, so we
translated it from the Python version.

## Usage

Supported operations are: union, intersection, difference and reversed-diff.

```javascript
var subjectPolygon = [[150, 130], [750, 250], [400, 300], [450, 650]],
    clipPolygon = [[500, 450], [300, 550], [100, 400], [150, 350], [0, 200], [300, 230], [250, 100], [550, 0]];
var clippedPolygon = clip_polygon(subjectPolygon, clipPolygon, 'difference');
// clippedPolygon is a list of polygons.
```

See the demo.html for more info.
