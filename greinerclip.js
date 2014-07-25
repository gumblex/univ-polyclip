/* Efficient Clipping of Arbitrary Polygons

Based on the paper "Efficient Clipping of Arbitrary Polygons" by Günther
Greiner (greiner[at]informatik.uni-erlangen.de) and Kai Hormann
(hormann[at]informatik.tu-clausthal.de), ACM Transactions on Graphics
1998;17(2):71-83.

Available at: http://www.inf.usi.ch/hormann/papers/Greiner.1998.ECO.pdf

You should have received the README file along with this program.
If not, see <https://github.com/helderco/polyclip>
*/

// Translated from the Python version of <https://github.com/helderco/polyclip>

function Vertex(vertex) {
    /* Node in a circular doubly linked list.

    This class is almost exactly as described in the paper by Günther/Greiner.
    */
    
    var self = this;
    self.x = vertex.x;      // point coordinates of the vertex
    self.y = vertex.y;
    self.next = null;       // reference to the next vertex of the polygon
    self.prev = null;       // reference to the previous vertex of the polygon
    self.neighbour = null;  // reference to the corresponding intersection vertex in the other polygon
    self.entry = true;      // true if intersection is an entry point, false if exit
    self.alpha = 0.0;       // intersection point's relative distance from previous vertex
    self.intersect = false; // true if vertex is an intersection
    self.checked = false;   // true if the vertex has been checked (last phase)
}

Vertex.prototype.isInside = function (poly) {
    /* Test if a vertex lies inside a polygon (odd-even rule).

    This function calculates the "winding" number for a point, which
    represents the number of times a ray emitted from the point to
    infinity intersects any edge of the polygon.

    An even winding number means the point lies OUTSIDE the polygon;
    an odd number means it lies INSIDE it.
    */
    
    var self = this;
    var winding_number = 0;
    var infinity = new Vertex({x: 1000000, y: self.y});
    var polyiter = poly.iter(), q, kq = 0;
    for (kq=0;kq<polyiter.length;kq++) {
        q = polyiter[kq];
        if (!q.intersect && !!intersect(self, infinity, q, poly.next(q.next))) {
            winding_number++;
        }
    }

    return ((winding_number % 2) !== 0);
};

Vertex.prototype.setChecked = function () {
    var self = this;
    self.checked = true;
    if (self.neighbour) {
        if (!self.neighbour.checked) {
            self.neighbour.setChecked();
        }
    }
};

function Polygon() {
    // Manages a circular doubly linked list of Vertex objects that represents a polygon.

    var self = this;
    self.first = null;
}

Polygon.prototype.add = function (vertex) {
    // Add a vertex object to the polygon (vertex is added at the 'end' of the list").
    var self = this;
    if (!self.first) {
        self.first = vertex;
        self.first.next = vertex;
        self.first.prev = vertex;
    } else {
        var next = self.first;
        var prev = next.prev;
        next.prev = vertex;
        vertex.next = next;
        vertex.prev = prev;
        prev.next = vertex;
    }
};

Polygon.prototype.insert = function (vertex, start, end) {
    /* Insert and sort a vertex between a specified pair of vertices.

    This function inserts a vertex (most likely an intersection point)
    between two other vertices (start and end). These other vertices
    cannot be intersections (that is, they must be actual vertices of
    the original polygon). If there are multiple intersection points
    between the two vertices, then the new vertex is inserted based on
    its alpha value.
    */
    
    var curr = start;
    while (curr !== end && curr.alpha < vertex.alpha) {
        curr = curr.next;
    }

    vertex.next = curr;
    var prev = curr.prev;
    vertex.prev = prev;
    prev.next = vertex;
    curr.prev = vertex;
};

Polygon.prototype.next = function (v) {
    // Return the next non intersecting vertex after the one specified.
    var c = v;
    while (c.intersect) {
        c = c.next;
    }
    return c;
};

Polygon.prototype.nextPoly = function () {
    // Return the next polygon (pointed by the first vertex).
    return this.first.nextPoly;
};

Polygon.prototype.first_intersect = function () {
    // Return the first unchecked intersection point in the polygon.
    var selfiter = this.iter(), v, kv = 0;
    for (kv=0;kv<selfiter.length;kv++) {
        v = selfiter[kv];
        if (v.intersect && !v.checked) {
            break;
        }
    }
    return v;
};

Polygon.prototype.points = function () {
    // Return the polygon's points as a list of tuples (ordered coordinates pair).
    var p = [];
    var selfiter = this.iter(), v, kv = 0;
    for (kv=0;kv<selfiter.length;kv++) {
        v = selfiter[kv];
        p.push([v.x, v.y]);
    }
    return p;
};

Polygon.prototype.unprocessed = function () {
    // Check if any unchecked intersections remain in the polygon.
    var selfiter = this.iter(), v, kv = 0;
    for (kv=0;kv<selfiter.length;kv++) {
        v = selfiter[kv];
        if (v.intersect && !v.checked) {
            return true;
        }
    }
    return false;
};

Polygon.prototype.union = function (clip) {
    return this.clip(clip, false, false);
};

Polygon.prototype.intersection = function (clip) {
    return this.clip(clip, true, true);
};

Polygon.prototype.difference = function (clip) {
    return this.clip(clip, false, true);
};

Polygon.prototype.clip = function (clip, s_entry, c_entry) {
    /* Clip self polygon using another one as a clipper.

    This is where the algorithm is executed. It allows you to make
    a UNION, INTERSECT or DIFFERENCE operation between two polygons.

    Given two polygons A, B the following operations may be performed:

    A|B ... A OR B  (Union of A and B)
    A&B ... A AND B (Intersection of A and B)
    A\B ... A - B
    B\A ... B - A

    The entry records store the direction the algorithm should take when
    it arrives at that entry point in an intersection. Depending on the
    operation requested, the direction is set as follows for entry points
    (f=forward, b=backward; exit points are always set to the opposite):

          Entry
          A   B
          -----
    A|B   b   b
    A&B   f   f
    A\B   b   f
    B\A   f   b

    f = True, b = False when stored in the entry record
    */
    var self = this;
    // phase one - find intersections
    var selfiter = self.iter(), s, ks = 0;
    var clipiter = clip.iter(), c, kc = 0;
    var islist, iS, iC;
    for (ks=0;ks<selfiter.length;ks++) {
        s = selfiter[ks]; // for each vertex Si of subject polygon do
        if (!s.intersect) {
            clipiter = clip.iter();
            for (kc=0;kc<clipiter.length;kc++) {
                c = clipiter[kc]; // for each vertex Cj of clip polygon do
                if (!c.intersect) {
                    islist = intersect(s, self.next(s.next), c, clip.next(c.next));
                    if (islist !== undefined) {
                        // i = islist[0]; alphaS = islist[1]; alphaC = islist[2];
                        iS = new Vertex(islist[0]);
                        iS.alpha = islist[1];
                        iS.intersect = true;
                        iS.entry = false;
                        iC = new Vertex(islist[0]);
                        iC.alpha = islist[2];
                        iC.intersect = true;
                        iC.entry = false;
                        iS.neighbour = iC;
                        iC.neighbour = iS;

                        self.insert(iS, s, self.next(s.next));
                        clip.insert(iC, c, clip.next(c.next));
                    } // this simply means intersect() returned undefined
                }
            }
        }
    }

    // phase two - identify entry/exit points
    s_entry = (!s_entry !== !self.first.isInside(clip));
    selfiter = self.iter();
    for (ks=0;ks<selfiter.length;ks++) {
        s = selfiter[ks];
        if (s.intersect) {
            s.entry = s_entry;
            s_entry = !s_entry;
        }
    }

    c_entry = (!c_entry !== !clip.first.isInside(self));
    clipiter = clip.iter();
    for (kc=0;kc<clipiter.length;kc++) {
        c = clipiter[kc];
        if (c.intersect) {
            c.entry = c_entry;
            c_entry = !c_entry;
        }
    }

    // phase three - construct a list of clipped polygons
    var list = [], current, clipped;
    while (self.unprocessed()) {
        current = self.first_intersect();
        clipped = new Polygon();
        clipped.add(new Vertex(current));
        while (true) {
            current.setChecked();
            if (current.entry) {
                while (true) {
                    current = current.next;
                    clipped.add(new Vertex(current));
                    if (current.intersect) {
                        break;
                    }
                }
            } else {
                while (true) {
                    current = current.prev;
                    clipped.add(new Vertex(current));
                    if (current.intersect) {
                        break;
                    }
                }
            }

            current = current.neighbour;
            if (current.checked) {
                break;
            }
        }
        list.push(clipped);
    }

    if (list.length === 0) {
        list.push(self);
    }

    return list;
};

Polygon.prototype.iter = function () {
    // Iterator generator for self doubly linked list.
    var self = this;
    var s = self.first;
    var templist = [];
    while (true) {
        templist.push(s);
        s = s.next;
        if (s === self.first) {
            return templist;
        }
    }
};

function intersect(s1, s2, c1, c2) {
    /* Test the intersection between two lines (two pairs of coordinates for two points).

    Return the coordinates for the intersection and the subject and clipper alphas if the test passes.

    Algorithm based on: http://paulbourke.net/geometry/lineline2d/
    */
    
    var den = (c2.y - c1.y) * (s2.x - s1.x) - (c2.x - c1.x) * (s2.y - s1.y);

    if (!den) {
        return;
    }

    var us = ((c2.x - c1.x) * (s1.y - c1.y) - (c2.y - c1.y) * (s1.x - c1.x)) / den;
    var uc = ((s2.x - s1.x) * (s1.y - c1.y) - (s2.y - s1.y) * (s1.x - c1.x)) / den;

    if (((us === 0 || us === 1) && (0 <= uc && uc <= 1)) ||
       ((uc === 0 || uc === 1) && (0 <= us && us <= 1))) {
        // console.log("whoops! degenerate case!");
        return;
    } else if ((0 < us && us < 1) && (0 < uc && uc < 1)) {
        var x = s1.x + us * (s2.x - s1.x);
        var y = s1.y + us * (s2.y - s1.y);
        return [{x: x, y: y}, us, uc];
    }

    return;
}

function find_origin(subject, clipper) {
    // Find the center coordinate for the given points.
    var x_min = subject[0][0], x_max = subject[0][0];
    var y_min = subject[0][1], y_max = subject[0][1];
    var k = 0;
    
    for (k=0;k<subject.length;k++) {
        x_min = Math.min(x_min, subject[k][0]);
        y_min = Math.min(y_min, subject[k][1]);
        x_max = Math.max(x_max, subject[k][0]);
        y_max = Math.max(y_max, subject[k][1]);
    }

    for (k=0;k<clipper.length;k++) {
        x_min = Math.min(x_min, clipper[k][0]);
        y_min = Math.min(y_min, clipper[k][1]);
        x_max = Math.max(x_max, clipper[k][0]);
        y_max = Math.max(y_max, clipper[k][1]);
    }

    return [-x_max / 2, -y_max / 2, -(1.5 * (x_max - x_min) + 1.5 * (y_max - y_min)) / 2];
}

function clip_polygon(subject, clipper, operation) {
    // Higher level function for clipping two polygons (from a list of points).
    // operation is an optional parameter
    operation = (typeof operation === "undefined") ? "difference" : operation;
    var Subject = new Polygon(), Clipper = new Polygon();
    var k = 0;
    for (k=0;k<subject.length;k++) {
        Subject.add(new Vertex({x: subject[k][0], y: subject[k][1]}));
    }

    for (k=0;k<clipper.length;k++) {
        Clipper.add(new Vertex({x: clipper[k][0], y: clipper[k][1]}));
    }

    var clipped;
    if (operation === 'difference') {
        clipped = Subject.difference(Clipper);
    } else if (operation === 'reversed-diff') {
        clipped = Clipper.difference(Subject);
    } else if (operation === 'union') {
        clipped = Subject.union(Clipper);
    } else if (operation === 'intersection') {
        clipped = Subject.intersection(Clipper);
    }
    var clippedlist = [];
    for (k=0;k<clipped.length;k++) {
        clippedlist.push(clipped[k].points());
    }
    return clippedlist;
}
