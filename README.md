# Efficient Clipping of Arbitrary Polygons using <canvas>

Based on the paper "Efficient Clipping of Arbitrary Polygons" by Günther Greiner (greiner[at]informatik.uni-erlangen.de) and Kai Hormann (hormann[at]informatik.tu-clausthal.de), ACM Transactions on Graphics 1998;17(2):71-83.

Available at: <http://www.inf.usi.ch/hormann/papers/Greiner.1998.ECO.pdf>


## Motivation

We needed a JavaScript version of a clipping arbitrary polygons, so we
translated it from the Python version.

## Usage

Supported operations are: union, intersection, difference and reversed-diff.

```javascript
var subjectPolygon = [{x:150, y:130}, {x:750, y:250}, {x:400, y:300}, {x:450, y:650}]
var clipPolygon = [{x:500, y:450}, {x:300, y:550}, {x:100, y:400}, {x:150, y:350}, {x:0, y:200}, {x:300, y:230}, {x:250, y:100}, {x:550, y:0}];
var clippedPolygon = clip_polygon(subjectPolygon, clipPolygon, 'difference');
// clippedPolygon is a list of polygons.
```

If you don't like the point objects, use the helper function in the demo.html to convert arrays of xy to objects.
Or you can also tweak the library code.

See the demo.html for more info.
