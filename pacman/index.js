var pacman = {};
var color1 = '#FF0000'

document.getElementById('colorPicker').addEventListener('input', changeColor)

function changeColor() {
    color1 = document.getElementById('colorPicker').value;
}

pacman.ds = {
    Heap: function (eq) {
        this.size = 0;
        this.array = [];
        this.eq = eq;
    }
}

pacman.ds.Heap.prototype.siftUp = function (i) {
    if (i <= 0) {
        return;
    }

    var p = (i - 1) >>> 1;
    var element = this.array[i];

    while (i > 0 && this.array[p].priority > element.priority) {
        this.array[i] = this.array[p];
        i = p;
        p = (i - 1) >>> 1;
    }

    this.array[i] = element;
}

pacman.ds.Heap.prototype.siftDown = function (i) {
    var minIndex = i;
    var node = this.array[i];

    for (;;) {
        var l = (i << 1) + 1;
        var r = l + 1;

        if (l < this.size && this.array[l].priority < node.priority) {
            minIndex = l;
        }

        if (r < this.size && this.array[r].priority < Math.min(this.array[l].priority, node.priority)) {
            minIndex = r;
        }

        if (minIndex === i) {
            this.array[i] = node;
            return;
        } else {
            this.array[i] = this.array[minIndex];
            i = minIndex;
        }
    }
}

pacman.ds.Heap.prototype.add = function (element, priority) {
    this.array.push({
        element: element,
        priority: priority
    });
    this.siftUp(this.size++);
}

pacman.ds.Heap.prototype.extractMinimum = function () {
    if (this.size <= 0) {
        return undefined;
    }

    var node = this.array[0];
    this.array[0] = this.array[--this.size];
    this.array.pop();

    if (this.size > 0) {
        this.siftDown(0);
    }

    return node.element;
}

pacman.ds.Heap.prototype.changePriority = function (element, priority) {
    var index = -1;

    for (var i = 0, e = this.size; i < e; i++) {
        if (this.eq(this.array[i].element, element)) {
            index = i;
            break;
        }
    }

    if (index === -1) {
        return false;
    }

    var node = this.array[index];

    if (priority < node.priority) {
        node.priority = priority;
        this.siftUp(index);
    } else if (priority > node.priority) {
        node.priority = priority;
        this.siftDown(index);
    }

    return true;
}

pacman.ds.Heap.prototype.contains = function (element) {
    for (var i = 0, e = this.size; i < e; i++) {
        if (this.eq(this.array[i].element, element)) {
            return true;
        }
    }

    return false;
}

pacman.heuristicFunction = function (tile, goal) {
    var dx = Math.abs(tile.x - goal.x);
    // take teleport into account.
    return Math.abs(tile.y - goal.y) + Math.min(dx, pacman.settings.w - dx);
}

pacman.uncloseAll = function (grid) {
    for (var i = 0, e = pacman.settings.w; i < e; i++) {
        for (var j = 0, ee = pacman.settings.h; j < ee; j++) {
            grid.getTile(i, j).closed = false;
        }
    }
}

pacman.tileEq = function (tile1, tile2) {
    return tile1.x === tile2.x && tile1.y === tile2.y;
}

pacman.prune = function (tileList, ghostList, ghostSelf) {
    var index = -1;

    for (var k = 0; k < ghostList.length; k++) {
        if (ghostList[k] === ghostSelf) {
            index = k;
            break;
        }
    }

    if (index === -1) {
        return;
    }

    outer:
        for (var i = 0; i < index; i++) {
            var ghostPos = ghostList[i].getTilePosition();

            for (var j = 0, e = tileList.length; j < e; j++) {
                var tile = tileList[j];

                if (tile.x === ghostPos[0] && tile.y === ghostPos[1]) {
                    tileList.splice(j, 1);
                    continue outer;
                }
            }
        }
}

pacman.AStar = function (start, goal, ghost) {
    pacman.uncloseAll(start.grid);
    var OPEN = new pacman.ds.Heap(pacman.tileEq);

    start.g = 0;
    start.h = pacman.heuristicFunction(start, goal);
    start.parent = undefined;

    var l = [start];
    pacman.prune(l, pacman.model.ghosts, ghost);

    if (l.length === 0) {
        return l;
    }

    OPEN.add(start, start.h);

    while (OPEN.size > 0) {
        var u = OPEN.extractMinimum();
        u.closed = true;

        if (pacman.tileEq(u, goal)) {
            var path = [];

            while (u) {
                path.unshift(u);
                u = u.parent;
            }

            return path;
        }

        var children = u.getNonObstacleNeighbors();
        // honour other ghosts.
        pacman.prune(children, pacman.model.ghosts, ghost);

        for (var i = 0, e = children.length; i < e; i++) {
            var child = children[i];

            if (child.closed) {
                continue;
            }

            var tg = u.g + 1;

            if (OPEN.contains(child) === false) {
                child.g = tg;
                child.h = pacman.heuristicFunction(child, goal);
                child.parent = u;
                OPEN.add(child, child.g + child.h);
            } else if (tg < child.g) {
                child.g = tg;
                child.parent = u;
                OPEN.changePriority(child, child.g + child.h);
            }
        }
    }

    return [];
}

pacman.BFS = function (start) {
    pacman.uncloseAll(start.grid);
    var Q = [];
    var visited = [];
    start.closed = true;
    start.parent = undefined;
    Q.push(start);
    visited.push(start);

    while (Q.length > 0) {
        var current = Q.shift();
        var children = current.getNonObstacleNeighbors();

        for (var i = 0, e = children.length; i < e; i++) {
            var child = children[i];

            if (child.closed === false) {
                child.closed = true;
                child.parent = current;
                Q.push(child);
                visited.push(child);
            }
        }
    }

    return visited;
}

pacman.settings = {
    vpw: 2, // Virtual pixel width: how many actual pixels per virtual pixel in horz. direction.
    vph: 2, // Virtaul pixel height. These two may be modified with plausible results.
    w: 28, // Maze...
    h: 31, // ...dimensions. It makes no sense to modify these two as they are defined and used
    // for making the code more clear.

    buildMaze: function () {
        var mazeString =
            "############################" +
            "#............##............#" +
            "#.####.#####.##.#####.####.#" +
            "#o####.#####.##.#####.####o#" +
            "#.####.#####.##.#####.####.#" +
            "#..........................#" +
            "#.####.##.########.##.####.#" +
            "#.####.##.########.##.####.#" +
            "#......##....##....##......#" +
            "######.##### ## #####.######" +
            "######.##### ## #####.######" +
            "######.##          ##.######" +
            "######.## ###  ### ##.######" +
            "######.## #      # ##.######" +
            "      .   #      #   .      " +
            "######.## #      # ##.######" +
            "######.## ######## ##.######" +
            "######.##          ##.######" +
            "######.## ######## ##.######" +
            "######.## ######## ##.######" +
            "#............##............#" +
            "#.####.#####.##.#####.####.#" +
            "#.####.#####.##.#####.####.#" +
            "#o..##.......  .......##..o#" +
            "###.##.##.########.##.##.###" +
            "###.##.##.########.##.##.###" +
            "#......##....##....##......#" +
            "#.##########.##.##########.#" +
            "#.##########.##.##########.#" +
            "#..........................#" +
            "############################";

        pacman.model.grid = new pacman.model.Grid();
        pacman.model.berriesLeft = 0; // berry amount.
        var i = 0;

        for (var y = 0, e = pacman.settings.h; y < e; y++) {
            for (var x = 0, ee = pacman.settings.w; x < ee; x++, i++) {
                var tile = pacman.model.grid.getTile(x, y);

                switch (mazeString.charAt(i)) {
                    case '#':
                        tile.isObstacle = true;
                        tile.hasBerry = false;
                        tile.hasEnergizer = false;
                        break;

                    case '.':
                        tile.isObstacle = false;
                        tile.hasBerry = true;
                        tile.hasEnergizer = false;
                        pacman.model.berriesLeft++;
                        break;

                    case ' ':
                        tile.isObstacle = false;
                        tile.hasBerry = false;
                        tile.hasEnergizer = false;
                        break;

                    case 'o':
                        tile.isObstacle = false;
                        tile.hasBerry = false;
                        tile.hasEnergizer = true;
                        break;
                }
            }
        }
    }
}

pacman.input = {
    up: false,
    right: false,
    down: false,
    left: false
}

pacman.g = (function () {
    var c;

    function setContext(context) {
        c = context;
    }

    function setFillStyle(style) {
        c.fillStyle = style;
    }

    // Draws horizontal line.
    function drawHorzLine(x, y, len) {
        c.fillRect(x * pacman.settings.vpw,
            y * pacman.settings.vph,
            len * pacman.settings.vpw,
            pacman.settings.vph);
    }

    // Draws vertical line.
    function drawVertLine(x, y, len) {
        c.fillRect(x * pacman.settings.vpw,
            y * pacman.settings.vph,
            pacman.settings.vpw,
            len * pacman.settings.vph);
    }

    function drawVPixel(x, y) {
        c.fillRect(x * pacman.settings.vpw,
            y * pacman.settings.vph,
            pacman.settings.vpw,
            pacman.settings.vph);
    }

    // draw rectangle by virtual coordinates.
    function fillRect(x, y, w, h) {
        c.fillRect(x * pacman.settings.vpw,
            y * pacman.settings.vph,
            w * pacman.settings.vpw,
            h * pacman.settings.vph);
    }

    function clear() {
        c.clearRect(0, 0, 8 * pacman.settings.vpw * pacman.settings.w,
            8 * pacman.settings.vph * pacman.settings.h);
    }

    function drawPauseMessage() {
        c.fillStyle = "white";
        c.font = "" + (3 * 8 * pacman.settings.vph) + "px Times New Roman";
        c.fillText("Pausa", 8 * pacman.settings.vpw, 4 * 8 * pacman.settings.vph);
    }

    function pacmanAnimation(pacmanActor) {
        var cx = pacman.settings.vpw * pacmanActor.x + pacman.settings.vpw / 2;
        var cy = pacman.settings.vph * pacmanActor.y + pacman.settings.vph / 2;
        var r = 6 * Math.min(pacman.settings.vpw, pacman.settings.vph);
        var i = pacman.model.tickCount % 16;

        if (i >= 8) {
            i = 15 - i;
        }

        var alpha = 0.65 * Math.PI * (i / 11);
        c.fillStyle = "yellow";

        switch (pacmanActor.dir) {
            case DIR_UP:
                c.beginPath();
                c.moveTo(cx, cy);
                c.arc(cx, cy, r, 3 * Math.PI / 2 + alpha, 3 * Math.PI / 2 - alpha, false);
                c.lineTo(cx, cy);
                c.fill();
                c.closePath();
                break;

            case DIR_RIGHT:
                c.beginPath();
                c.moveTo(cx, cy);
                c.arc(cx, cy, r, alpha, 2 * Math.PI - alpha, false);
                c.lineTo(cx, cy);
                c.fill();
                c.closePath();
                break;

            case DIR_DOWN:
                c.beginPath();
                c.moveTo(cx, cy);
                c.arc(cx, cy, r, Math.PI / 2 + alpha, Math.PI / 2 - alpha, false);
                c.lineTo(cx, cy);
                c.fill();
                c.closePath();
                break;

            case DIR_LEFT:
                c.beginPath();
                c.moveTo(cx, cy);
                c.arc(cx, cy, r, Math.PI + alpha, Math.PI - alpha, false);
                c.lineTo(cx, cy);
                c.fill();
                c.closePath();
                break;
            default:
                c.beginPath();
                c.arc(cx, cy, r, 0, 2 * Math.PI, false);
                c.fill();
                break;
        }
    }

    function drawReadyMessage() {
        c.font = "" + (8 * pacman.settings.vph) + "px Times New Roman bold";
        c.fillStyle = "yellow";
        c.fillText("3, 2, 1, VIA!", 7 * 12 * pacman.settings.vpw, (8 * 18 - 2) * pacman.settings.vph);
    }

    function drawGhost(ghostActor, color) {
        var g = ghostActor;
        var blink = false;

        if (g.vetime > pacman.model.tickCount) {
            if (g.vetime - pacman.model.tickCount < 240 &&
                parseInt((g.vetime - pacman.model.tickCount) / 15) % 2 === 1) {
                blink = true;
                c.fillStyle = "white";
            } else {
                c.fillStyle = "blue";
            }
        } else {
            c.fillStyle = color;
        }

        fillRect(g.x - 6, g.y, 14, 6);
        fillRect(g.x - 5, g.y - 3, 12, 3);
        drawHorzLine(g.x - 4, g.y - 4, 10);
        drawHorzLine(g.x - 3, g.y - 5, 8);
        drawHorzLine(g.x - 1, g.y - 6, 4);

        drawHorzLine(g.x - 6, g.y + 6, 2);
        drawHorzLine(g.x - 3, g.y + 6, 3);
        drawHorzLine(g.x + 2, g.y + 6, 3);
        drawHorzLine(g.x + 6, g.y + 6, 2);

        drawVPixel(g.x - 6, g.y + 7);
        drawVPixel(g.x + 7, g.y + 7);

        drawHorzLine(g.x - 2, g.y + 7, 2);
        drawHorzLine(g.x + 2, g.y + 7, 2);

        if (blink) {
            return;
        }

        c.fillStyle = "white";

        // the eyes.
        fillRect(g.x - 3, g.y - 2, 2, 5);
        fillRect(g.x + 3, g.y - 2, 2, 5);
        drawVertLine(g.x - 4, g.y - 1, 3);
        drawVertLine(g.x - 1, g.y - 1, 3);
        drawVertLine(g.x + 2, g.y - 1, 3);
        drawVertLine(g.x + 5, g.y - 1, 3);

        if (g.vetime > pacman.model.tickCount) {
            return;
        }

        // the pupils.
        var x = 0;
        var y = 0;

        switch (g.dir) {
            case DIR_LEFT:
                x = g.x - 4;
                y = g.y;
                break;

            case DIR_RIGHT:
                x = g.x - 2;
                y = g.y;
                break;

            case DIR_UP:
                x = g.x - 3;
                y = g.y - 2;
                break;
            case DIR_DOWN:
                x = g.x - 3;
                y = g.y + 1;
                break;

            case DIR_NONE:
                x = g.x - 3;
                y = g.y;
                break;
        }

        c.fillStyle = "blue";
        fillRect(x, y, 2, 2);
        fillRect(x + 6, y, 2, 2);
    }

    return {
        setContext: setContext,
        setFillStyle: setFillStyle,
        drawHorzLine: drawHorzLine,
        drawVertLine: drawVertLine,
        drawVPixel: drawVPixel,
        fillRect: fillRect,
        clear: clear,
        drawPauseMessage: drawPauseMessage,
        pacmanAnimation: pacmanAnimation,
        drawReadyMessage: drawReadyMessage,
        drawGhost: drawGhost
    }
})();

var DIR_NONE = 0;
var DIR_UP = 1;
var DIR_RIGHT = 2;
var DIR_DOWN = 3;
var DIR_LEFT = 4;

pacman.model = {
    Tile: function (grid, x, y, isObstacle) {
        this.grid = grid;
        this.x = x;
        this.y = y;
        this.isObstacle = isObstacle;
        this.hasBerry = false;
        this.hasEnergizer = false;
        this.g = 0;
        this.h = 0;
        this.parent = undefined;
        this.closed = false;
    },

    Grid: function () {
        this.w = pacman.settings.w;
        this.h = pacman.settings.h;
        this.g = [];

        for (var x = 0; x < this.w; x++) {
            this.g[x] = new Array(this.h);

            for (var y = 0; y < this.h; y++) {
                this.g[x][y] = new pacman.model.Tile(this, x, y, true);
            }
        }
    },

    // x and y are the coordinates of the upper left pixel of a 2x2-pixel center.
    Actor: function (x, y, dir, pdtime, vetime, animate, color) {
        this.x = x;
        this.y = y;
        this.dir = dir;
        // pen departure tick time
        this.pdtime = pdtime;

        // tick time of invulnerability
        this.vetime = vetime;

        this.animate = animate;
        this.color = color;
        this.previousPos = undefined;
        this.path = undefined;
    },

    createNewGame: function () {
        pacman.settings.buildMaze();
        pacman.model.points = 0;
        pacman.model.tickCount = 0;
        pacman.model.pacman = new pacman.model.Actor(8 * 14,
            8 * 23 + 3,
            DIR_NONE,
            0,
            0,
            pacman.g.pacmanAnimation,
            "");
        pacman.model.ghosts = [
            new pacman.model.Actor(8 * 15 + 7, 8 * 14 + 7, DIR_NONE, 360, -1, pacman.g.drawGhost, "orange"),
            new pacman.model.Actor(8 * 13 + 7, 8 * 14 + 7, DIR_NONE, 240, -1, pacman.g.drawGhost, "pink"),
            new pacman.model.Actor(8 * 11 + 7, 8 * 14 + 7, DIR_NONE, 120, -1, pacman.g.drawGhost, "cyan"),
            new pacman.model.Actor(8 * 13 + 7, 8 * 11 + 3, DIR_NONE, 0, -1, pacman.g.drawGhost, "red")
        ];
        pacman.model.renderPoints("N/A");
    },

    renderPoints: function (p) {
        document.getElementById("point-counter").innerHTML = "SCORE: " + p;
    },

    addEntry: function () {
        pacman.model.top10list.push({
            username: pacman.model.username,
            score: pacman.model.points,
            ticks: pacman.model.tickCount
        });

        pacman.model.top10list.sort(function (a, b) {
            if (!a.username) {
                if (!b.username) {
                    return 0;
                } else {
                    return 1;
                }
            } else if (!b.username) {
                return -1;
            } else if (a.score > b.score) {
                return -1;
            } else if (a.score < b.score) {
                return 1;
            } else if (a.ticks < b.ticks) {
                return -1;
            } else if (a.ticks > b.ticks) {
                return 1;
            } else {
                return 0;
            }
        });

        pacman.model.top10list.pop();
    },

    username: "Unnamed player",
    grid: undefined,
    berriesLeft: -1,
    points: 0,
    tickCount: 0,
    showEnergizers: true,
    pacman: undefined,
    ghosts: undefined,
    ghostsEaten: 0,

    top10list: [{
            username: undefined,
            score: "N/A",
            ticks: "N/A"
        },
        {
            username: undefined,
            score: "N/A",
            ticks: "N/A"
        },
        {
            username: undefined,
            score: "N/A",
            ticks: "N/A"
        },
        {
            username: undefined,
            score: "N/A",
            ticks: "N/A"
        },
        {
            username: undefined,
            score: "N/A",
            ticks: "N/A"
        },
        {
            username: undefined,
            score: "N/A",
            ticks: "N/A"
        },
        {
            username: undefined,
            score: "N/A",
            ticks: "N/A"
        },
        {
            username: undefined,
            score: "N/A",
            ticks: "N/A"
        },
        {
            username: undefined,
            score: "N/A",
            ticks: "N/A"
        },
        {
            username: undefined,
            score: "N/A",
            ticks: "N/A"
        },
    ]
};

pacman.model.Actor.prototype.getTilePosition = function () {
    if (this.x === 8 * (pacman.settings.w - 1) + 7) {
        // special case.
        return [pacman.settings.w - 1, parseInt(this.y / 8)];
    } else if (this.x % 8 === 7) {
        return [parseInt((this.dir === DIR_LEFT ? (this.x + 1) : this.x) / 8), parseInt(this.y / 8)];
    } else if (this.y % 8 === 7) {
        return [parseInt(this.x / 8), parseInt((this.dir === DIR_UP ? (this.y + 1) : this.y) / 8)];
    } else {
        return [parseInt(this.x / 8), parseInt(this.y / 8)];
    }
}

pacman.model.Grid.prototype.getTile = function (x, y) {
    return this.g[x][y];
}

pacman.model.Tile.prototype.getNonObstacleNeighborsExt = function () {
    var n = [];
    var x = this.x;
    var y = this.y;
    var grid = this.grid;

    if (x > 0 && !grid.getTile(x - 1, y).isObstacle) {
        n.push(grid.getTile(x - 1, y));
    }

    if (x < pacman.settings.w - 1 && !grid.getTile(x + 1, y).isObstacle) {
        n.push(grid.getTile(x + 1, y));
    }

    if (y > 0 && !grid.getTile(x, y - 1).isObstacle) {
        n.push(grid.getTile(x, y - 1));
    }

    if (y < pacman.settings.h - 1 && !grid.getTile(x, y + 1).isObstacle) {
        n.push(grid.getTile(x, y + 1));
    }

    if (x > 0 && y > 0 && !grid.getTile(x - 1, y - 1).isObstacle) {
        n.push(grid.getTile(x - 1, y - 1));
    }

    if (x < pacman.settings.w - 1 && y > 0 && !grid.getTile(x + 1, y - 1).isObstacle) {
        n.push(grid.getTile(x + 1, y - 1));
    }

    if (x > 0 && y < pacman.settings.h - 1 && !grid.getTile(x - 1, y + 1).isObstacle) {
        n.push(grid.getTile(x - 1, y + 1));
    }

    if (x < pacman.settings.w - 1 && y < pacman.settings.h - 1 && !grid.getTile(x + 1, y + 1).isObstacle) {
        n.push(grid.getTile(x + 1, y + 1));
    }

    if (y == 14 && x == 0) {
        n.push(grid.getTile(pacman.settings.w - 1, y));
    }

    if (y == 14 && x == pacman.settings.w - 1) {
        n.push(grid.getTile(0, y));
    }

    return n;
}

pacman.model.Tile.prototype.getNonObstacleNeighbors = function () {
    var neighbors = [];
    var x = this.x;
    var y = this.y;
    var grid = this.grid;

    if (x > 0 && !grid.getTile(x - 1, y).isObstacle) {
        neighbors.push(grid.getTile(x - 1, y));
    }

    if (x < pacman.settings.w - 1 && !grid.getTile(x + 1, y).isObstacle) {
        neighbors.push(grid.getTile(x + 1, y));
    }

    if (y > 0 && !grid.getTile(x, y - 1).isObstacle) {
        neighbors.push(grid.getTile(x, y - 1));
    }

    if (y < pacman.settings.h - 1 && !grid.getTile(x, y + 1).isObstacle) {
        neighbors.push(grid.getTile(x, y + 1));
    }

    if (y === 14 && x === 0) {
        neighbors.push(grid.getTile(pacman.settings.w - 1, y));
    }

    if (y === 14 && x === pacman.settings.w - 1) {
        neighbors.push(grid.getTile(0, y));
    }

    return neighbors;
}

function sort(s, c) {
    for (var i = 1; i < s.length; i++) {
        for (var j = i - 1; j >= 0 && c.compare(s[j], s[j + 1]) > 0; j--) {
            var temp = s[j + 1];
            s[j + 1] = s[j];
            s[j] = temp;
        }
    }
}

var tileXComparator = {
    compare: function (a, b) {
        return a.x - b.x;
    }
};

var tileYComparator = {
    compare: function (a, b) {
        return a.y - b.y;
    }
};

pacman.engine = {
    magic: {
        CONTINUE: 0,
        FAIL: 1,
        VICTORY: 2
    },

    runs: false,
    pauseStatusChanged: false,

    newGame: function (username) {
        pacman.model.username = username;
        pacman.model.createNewGame();
        pacman.engine.runs = true;
        pacman.engine.render();
        pacman.engine.runs = false;
        pacman.engine.hideResultView();
        pacman.engine.showIntro0();
    },

    hideResultView: function () {
        document.getElementById("result-view").className = "hidden";
        document.getElementById("point-counter").innerHTML = "";
    },

    showResultView: function (msg) {
        document.getElementById("result-msg").innerHTML = msg;
        /* var tableElement = document.getElementById("score-table");
        var html = "<tr> <td><h3>Name</h3></td> <td><h3>Score</h3></td> <td><h3>Time ticks</h3></td> </tr>";

        for (var i = 0; i < pacman.model.top10list.length; i++) {
            var entry = pacman.model.top10list[i];

            if (!entry.username) {
                html += "<tr> <td>N/A</td> <td>0</td> <td>0</td> </tr>";
            } else {
                html += "<tr> <td>" + entry.username + "</td> <td>" + entry.score + "</td> <td>" + entry.ticks + "</td> </tr>";
            }
        }

        tableElement.innerHTML = html; */
        document.getElementById("result-view").className = "";
    },

    showIntro0: function () {
        setTimeout(pacman.engine.showIntro1, 1000);
    },

    showIntro1: function () {
        pacman.g.drawReadyMessage();
        pacman.engine.runs = true;
        setTimeout(
            function () {
                pacman.model.renderPoints(pacman.model.points);
                pacman.engine.tick();
            }, 1500);
    },

    input: function () {
        var delta = [0, 0];

        if (pacman.input.left) {
            delta[0]--;
        }

        if (pacman.input.right) {
            delta[0]++;
        }

        if (pacman.input.up) {
            delta[1]--;
        }

        if (pacman.input.down) {
            delta[1]++;
        }

        return delta;
    },

    logic: function (delta) {
        if (pacman.model.pacman) {
            var pm = pacman.model.pacman;
            var coords = pm.getTilePosition();

            switch (delta[0]) {
                case -1:

                    if (pm.y % 8 === 3) {
                        if (pm.y === 8 * 14 + 3 && (pm.x > 8 * 18 + 3 || pm.x < 8 * 10)) {
                            pm.dir = DIR_LEFT;
                        } else {
                            var tile = pacman.model.grid.getTile(coords[0] - 1, coords[1]);

                            if (tile && !tile.isObstacle) {
                                pm.dir = DIR_LEFT;
                            }
                        }
                    }

                    break;

                case 1:

                    if (pm.y % 8 === 3) {
                        if (pm.y === 8 * 14 + 3 && (pm.x < 8 * 9 + 3 || pm.x > 8 * 18)) {
                            pm.dir = DIR_RIGHT;
                        } else {
                            tile = pacman.model.grid.getTile(coords[0] + 1, coords[1]);

                            if (tile && !tile.isObstacle) {
                                pm.dir = DIR_RIGHT;
                            }
                        }
                    }

                    break;
            }

            switch (delta[1]) {
                case -1:

                    if (pm.x % 8 === 3) {
                        tile = pacman.model.grid.getTile(coords[0], coords[1] - 1);

                        if (tile && !tile.isObstacle) {
                            pm.dir = DIR_UP;
                        }
                    }

                    break;

                case 1:

                    if (coords[1] === 11 && (coords[0] === 13 || coords[0] === 14)) {
                        // don't enter the ghost pen.
                    } else if (pm.x % 8 === 3) {
                        tile = pacman.model.grid.getTile(coords[0], coords[1] + 1);

                        if (tile && !tile.isObstacle) {
                            pm.dir = DIR_DOWN;
                        }
                    }

                    break;
            }

            // move the punkman.
            switch (pm.dir) {
                case DIR_UP:

                    if (pm.y % 8 > 3) {
                        pm.y--;
                    } else {
                        tile = pacman.model.grid.getTile(coords[0], coords[1] - 1);

                        if (tile && !tile.isObstacle) {
                            pm.y--;
                        } else {
                            pm.dir = DIR_NONE;
                        }
                    }

                    break;

                case DIR_RIGHT:

                    if (pm.x === 8 * pacman.settings.w - 1) {
                        pm.x = 0;
                    } else if (coords[0] === pacman.settings.w - 1 || pm.x % 8 < 3) {
                        pm.x++;
                    } else {
                        tile = pacman.model.grid.getTile(coords[0] + 1, coords[1]);

                        if (tile && !tile.isObstacle) {
                            pm.x++;
                        } else {
                            pm.dir = DIR_NONE;
                        }
                    }

                    break;

                case DIR_DOWN:

                    if (pm.y % 8 < 3) {
                        pm.y++;
                    } else {
                        tile = pacman.model.grid.getTile(coords[0], coords[1] + 1);

                        if (tile && !tile.isObstacle) {
                            pm.y++;
                        } else {
                            pm.dir = DIR_NONE;
                        }
                    }

                    break;

                case DIR_LEFT:

                    if (pm.x === 0) {
                        pm.x = 8 * pacman.settings.w - 1;
                    } else if (coords[0] === 0 || pm.x % 8 > 3) {
                        pm.x--;
                    } else {
                        tile = pacman.model.grid.getTile(coords[0] - 1, coords[1]);

                        if (tile && !tile.isObstacle) {
                            pm.x--;
                        } else {
                            pm.dir = DIR_NONE;
                        }
                    }

                    break;

                case DIR_NONE:

                    break;
            }

            pm.previousPos = coords;

            //// MOVE THE GHOSTS
            for (var i = pacman.model.ghosts.length - 1; i >= 0; i--) {
                pacman.engine.moveGhost(pacman.model.ghosts[i]);
            }

            //// CHECK PUCKMAN LIVENESS
            var pmCoords = pm.getTilePosition();

            for (var i = 0; i < pacman.model.ghosts.length; i++) {
                var ghost = pacman.model.ghosts[i];
                var gCoords = ghost.getTilePosition();

                if (pmCoords[0] === gCoords[0] && pmCoords[1] === gCoords[1]) {
                    // yes we have a touch.
                    if (ghost.vetime > pacman.model.tickCount) {
                        switch (ghost.color) {
                            case "red":
                                ghost.x = 8 * 13 + 7;
                                ghost.y = 8 * 12 + 7;
                                break;

                            case "cyan":
                                ghost.x = 8 * 11 + 7;
                                ghost.y = 8 * 14 + 7;
                                break;

                            case "pink":
                                ghost.x = 8 * 13 + 7;
                                ghost.y = 8 * 14 + 7;
                                break;

                            case "orange":
                                ghost.x = 8 * 15 + 7;
                                ghost.y = 8 * 14 + 7;
                                break;
                        }

                        ghost.dir = DIR_NONE;
                        ghost.vetime = -1;
                        ghost.pdtime = pacman.model.tickCount + 300;
                        ghost.path = undefined;
                        var bonus = 200 * Math.pow(2, pacman.model.ghostsEaten++);
                        pacman.model.points += bonus;
                        /* console.log(bonus); */
                    } else {
                        // Bye bye!
                        return pacman.engine.magic.FAIL;
                    }
                }
            }

            //// CHECK BERRY CIRCUMSTANCES
            if (pm.x % 8 === 3 && pm.y % 8 === 3) {
                var curTile = pacman.model.grid.getTile(coords[0], coords[1]);

                if (curTile.hasBerry) {
                    curTile.hasBerry = false;
                    pacman.model.berriesLeft--;
                    pacman.model.renderPoints(pacman.model.points += 10);

                    if (pacman.model.berriesLeft <= 0) {
                        return pacman.engine.magic.VICTORY;
                    }
                }

                if (curTile.hasEnergizer) {
                    curTile.hasEnergizer = false;
                    pacman.model.ghostsEaten = 0;
                    pacman.model.renderPoints(pacman.model.points += 50);

                    // TODO: add more logic shit
                    for (var i = 0; i < pacman.model.ghosts.length; i++) {
                        // vulnerability ends after 900 ticks at almost 60 Hz -> 15+ seconds.
                        pacman.model.ghosts[i].vetime = pacman.model.tickCount + 900;
                        pacman.model.ghosts[i].path = undefined;
                    }
                }
            }
        }

        return pacman.engine.magic.CONTINUE;
    },

    moveGhost: function (g) {
        if (g.vetime > pacman.model.tickCount) {
            // g is vulnerable.

            if (g.pdtime > pacman.model.tickCount) {
                return;
            }

            if (pacman.model.tickCount % 2 === 0) {
                // move half a speed.
                return;
            }

            if (!g.path || g.path.length < 2) {
                var ghostPos = g.getTilePosition();
                var sourceTile = pacman.model.grid.getTile(ghostPos[0], ghostPos[1]);
                var reachable = undefined;
                var u = undefined;
                var path = undefined;

                reachable = pacman.BFS(sourceTile);

                do {
                    u = reachable[parseInt(Math.random() * reachable.length)];
                } while (u === sourceTile);

                path = [];

                while (u) {
                    path.unshift(u);
                    u = u.parent;
                }

                g.path = path;
            }

            var nextTile = g.path[1];
            var ghostPos = g.getTilePosition();
            var ghostDir = [nextTile.x - ghostPos[0], nextTile.y - ghostPos[1]];

            if (ghostDir[0] === -1) {
                if (g.y % 8 < 3) {
                    g.y++;
                    g.dir = DIR_DOWN;
                } else if (g.y % 8 > 3) {
                    g.y--;
                    g.dir = DIR_UP;
                } else {
                    g.x--;
                    g.dir = DIR_LEFT;
                }
            } else if (ghostDir[0] === 1) {
                if (g.y % 8 < 3) {
                    g.y++;
                    g.dir = DIR_DOWN;
                } else if (g.y % 8 > 3) {
                    g.y--;
                    g.dir = DIR_UP;
                } else {
                    g.x++;
                    g.dir = DIR_RIGHT;
                }
            } else if (ghostDir[1] === -1) {
                if (g.x % 8 < 3) {
                    g.x++;
                    g.dir = DIR_RIGHT;
                } else if (g.x % 8 > 3) {
                    g.x--;
                    g.dir = DIR_LEFT;
                } else {
                    g.y--;
                    g.dir = DIR_UP;
                }
            } else if (ghostDir[1] === 1) {
                if (g.x % 8 < 3) {
                    g.x++;
                    g.dir = DIR_RIGHT;
                } else if (g.x % 8 > 3) {
                    g.x--;
                    g.dir = DIR_LEFT;
                } else {
                    g.y++;
                    g.dir = DIR_DOWN;
                }
            } else if (ghostDir[0] === pacman.settings.w - 1) {
                g.x--;
                g.dir = DIR_LEFT;

                if (g.x < 0) {
                    g.x = 8 * pacman.settings.w - 1;
                }
            } else if (ghostDir[0] === -(pacman.settings.w - 1)) {
                g.x++;
                g.dir = DIR_RIGHT;

                if (g.x >= 8 * pacman.settings.w - 1) {
                    g.x = 0;
                }
            }

            var ghostPos2 = g.getTilePosition();

            if (ghostPos[0] !== ghostPos2[0] || ghostPos[1] !== ghostPos2[1]) {
                // get next tile please.
                g.path.shift();
            }

            return;
        }

        if (g.pdtime > pacman.model.tickCount) {
            // must wait a little bit in the ghost pen.
            return;
        }

        // BEGIN: get out of the ghost pen.
        if (8 * 11 < g.x && g.x < 8 * 17 &&
            8 * 11 + 3 < g.y && g.y < 8 * 16) {
            // in the ghost pen.
            if (g.y === 8 * 13 + 7) {
                if (g.x < 8 * 13 + 7) {
                    g.x++;
                    g.dir = DIR_RIGHT;
                } else if (g.x > 8 * 13 + 7) {
                    g.x--;
                    g.dir = DIR_LEFT;
                } else {
                    g.y--;
                    g.dir = DIR_UP;
                }
            } else {
                g.y--;
                g.dir = DIR_UP;
            }

            return;
        }
        // END: get out of the ghost pen.

        if (g.vetime === pacman.model.tickCount) {
            g.path = undefined;
        }

        var pm = pacman.model.pacman;
        var pacmanPos = pm.getTilePosition();
        var ghostPos = g.getTilePosition();

        if (!g.path || pacmanPos[0] !== pm.previousPos[0] ||
            pacmanPos[1] !== pm.previousPos[1]) {
            var sourceTile = pacman.model.grid.getTile(ghostPos[0], ghostPos[1]);
            var targetTile = pacman.model.grid.getTile(pacmanPos[0], pacmanPos[1]);
            var path = pacman.AStar(sourceTile, targetTile, g);
            g.path = path;
        }

        if (g.path.length === 1) {
            // reached the pacman.
            return;
        } else if (g.path.length === 0) {
            /* console.log("g.path.length == 0"); */
            // pacman unreachable.
            return;
        }

        var nextTile = g.path[1];
        var ghostDir = [nextTile.x - ghostPos[0], nextTile.y - ghostPos[1]];

        if (ghostDir[0] === -1) {
            if (g.y % 8 < 3) {
                g.y++;
                g.dir = DIR_DOWN;
            } else if (g.y % 8 > 3) {
                g.y--;
                g.dir = DIR_UP;
            } else {
                g.x--;
                g.dir = DIR_LEFT;
            }
        } else if (ghostDir[0] === 1) {
            if (g.y % 8 < 3) {
                g.y++;
                g.dir = DIR_DOWN;
            } else if (g.y % 8 > 3) {
                g.y--;
                g.dir = DIR_UP;
            } else {
                g.x++;
                g.dir = DIR_RIGHT;
            }
        } else if (ghostDir[1] === -1) {
            if (g.x % 8 < 3) {
                g.x++;
                g.dir = DIR_RIGHT;
            } else if (g.x % 8 > 3) {
                g.x--;
                g.dir = DIR_LEFT;
            } else {
                g.y--;
                g.dir = DIR_UP;
            }
        } else if (ghostDir[1] === 1) {
            if (g.x % 8 < 3) {
                g.x++;
                g.dir = DIR_RIGHT;
            } else if (g.x % 8 > 3) {
                g.x--;
                g.dir = DIR_LEFT;
            } else {
                g.y++;
                g.dir = DIR_DOWN;
            }
        } else if (ghostDir[0] === pacman.settings.w - 1) {
            g.x--;
            g.dir = DIR_LEFT;

            if (g.x < 0) {
                g.x = 8 * pacman.settings.w - 1;
            }
        } else if (ghostDir[0] === -(pacman.settings.w - 1)) {
            g.x++;
            g.dir = DIR_RIGHT;

            if (g.x >= 8 * pacman.settings.w - 1) {
                g.x = 0;
            }
        }

        var ghostPos2 = g.getTilePosition();

        if (ghostPos[0] !== ghostPos2[0] || ghostPos[1] !== ghostPos2[1]) {
            // once here, ghost g changed the tile.
            g.path.shift();
            // recompute the shortest feasible path next time.
        }
    },

    // draws shit
    render: function () {
        if (!pacman.engine.runs) {
            if (pacman.engine.pauseStatusChanged) {
                pacman.engine.pauseStatusChanged = false;
                pacman.g.drawPauseMessage();
            }

            return;
        }

        pacman.g.clear();

        //// Draw ghost box.
        pacman.g.setFillStyle(color1);
        // left
        pacman.g.drawVertLine(8 * 10 + 4,
            8 * 12 + 4,
            8 * 4)
        pacman.g.drawVertLine(8 * 10 + 7,
            8 * 12 + 7,
            8 * 3 + 2)
        // righ
        pacman.g.drawVertLine(8 * 17 + 3,
            8 * 12 + 4,
            8 * 4)
        pacman.g.drawVertLine(8 * 17,
            8 * 12 + 7,
            8 * 3 + 2);
        // top left
        pacman.g.drawHorzLine(8 * 10 + 5,
            8 * 12 + 4,
            8 * 2 + 3);
        pacman.g.drawHorzLine(8 * 11,
            8 * 12 + 7,
            8 * 2);
        pacman.g.drawVertLine(8 * 12 + 7,
            8 * 12 + 5,
            2);
        // top right
        pacman.g.drawHorzLine(8 * 15,
            8 * 12 + 4,
            8 * 2 + 4);
        pacman.g.drawHorzLine(8 * 15,
            8 * 12 + 7,
            8 * 2 + 1);
        pacman.g.drawVertLine(8 * 15,
            8 * 12 + 5,
            2);

        // bottom
        pacman.g.drawHorzLine(8 * 11,
            8 * 16,
            8 * 6);
        pacman.g.drawHorzLine(8 * 10 + 5,
            8 * 16 + 3,
            8 * 6 + 6);

        // the pen bar
        pacman.g.setFillStyle("#ffaaaa");
        pacman.g.fillRect(8 * 13, 8 * 12 + 5, 8 * 2, 2);

        //// draw border shit
        pacman.g.setFillStyle(color1);

        for (y = 0; y < pacman.settings.h; y++) {
            for (x = 0; x < pacman.settings.w; x++) {

                if (10 < y && y < 18 && 8 < x && x < 19) {
                    continue;
                }

                var tile = pacman.model.grid.getTile(x, y);

                if (tile.isObstacle === false) {
                    if (tile.hasBerry) {
                        pacman.g.setFillStyle("#ffffff");
                        pacman.g.fillRect(8 * tile.x + 3,
                            8 * tile.y + 3,
                            2,
                            2);
                    } else if (tile.hasEnergizer && pacman.model.showEnergizers) {
                        pacman.g.setFillStyle("#ffffff");
                        pacman.g.fillRect(8 * tile.x + 2,
                            8 * tile.y + 3,
                            4,
                            2);
                        pacman.g.fillRect(8 * tile.x + 3,
                            8 * tile.y + 2,
                            2,
                            1);
                        pacman.g.fillRect(8 * tile.x + 3,
                            8 * tile.y + 5,
                            2,
                            1);
                    }

                    continue;
                }

                pacman.g.setFillStyle(color1);
                var n = tile.getNonObstacleNeighborsExt();

                switch (n.length) {
                    case 5:
                        var nw = true;
                        var ne = true;
                        var sw = true;
                        var se = true;

                        for (var i = 0, e = n.length; i < e; i++) {
                            var t = n[i];

                            if (t.x < tile.x) {
                                if (t.y < tile.y) {
                                    nw = false;
                                } else if (t.y > tile.y) {
                                    sw = false;
                                }
                            } else if (t.x > tile.x) {
                                if (t.y < tile.y) {
                                    ne = false;
                                } else if (t.y > tile.y) {
                                    se = false;
                                }
                            }
                        }

                        // gonna draw the opposite corners.
                        if (nw) {
                            pacman.g.drawVertLine(8 * tile.x + 3,
                                8 * tile.y,
                                2);
                            pacman.g.drawHorzLine(8 * tile.x,
                                8 * tile.y + 3,
                                2);
                            pacman.g.drawVPixel(8 * tile.x + 2,
                                8 * tile.y + 2);
                        } else if (ne) {
                            pacman.g.drawVertLine(8 * tile.x + 4,
                                8 * tile.y,
                                2);
                            pacman.g.drawHorzLine(8 * tile.x + 6,
                                8 * tile.y + 3,
                                2);
                            pacman.g.drawVPixel(8 * tile.x + 5,
                                8 * tile.y + 2);
                        } else if (sw) {
                            pacman.g.drawVertLine(8 * tile.x + 3,
                                8 * tile.y + 6,
                                2);
                            pacman.g.drawHorzLine(8 * tile.x,
                                8 * tile.y + 4,
                                2);
                            pacman.g.drawVPixel(8 * tile.x + 2,
                                8 * tile.y + 5);
                        } else {
                            // se === true right here.
                            pacman.g.drawVertLine(8 * tile.x + 4,
                                8 * tile.y + 6,
                                2);
                            pacman.g.drawHorzLine(8 * tile.x + 6,
                                8 * tile.y + 4,
                                2);
                            pacman.g.drawVPixel(8 * tile.x + 5,
                                8 * tile.y + 5);
                        }

                        break;

                    case 3:
                    case 2:
                        if (n[0].x === n[1].x) {
                            // vertical.
                            sort(n, tileYComparator);

                            if (n[0].x === tile.x - 1) {
                                // left.
                                pacman.g.drawVertLine(8 * tile.x + 4,
                                    8 * tile.y,
                                    8);
                            } else {
                                // right.
                                pacman.g.drawVertLine(8 * tile.x + 3,
                                    8 * tile.y,
                                    8);
                            }
                        } else {
                            // horizontal.
                            sort(n, tileXComparator);

                            if (n[0].y === tile.y - 1) {
                                // top.
                                pacman.g.drawHorzLine(8 * tile.x,
                                    8 * tile.y + 4,
                                    8);
                            } else {
                                // bottom.
                                pacman.g.drawHorzLine(8 * tile.x,
                                    8 * tile.y + 3,
                                    8);
                            }
                        }

                        break;

                    case 1:

                        var o = n[0];

                        if (o.x === tile.x + 1) {
                            if (o.y === tile.y + 1) {
                                // opens to south-east.
                                pacman.g.drawVertLine(8 * tile.x + 3,
                                    8 * tile.y + 5,
                                    3);
                                pacman.g.drawHorzLine(8 * tile.x + 5,
                                    8 * tile.y + 3,
                                    3);
                                pacman.g.drawVPixel(8 * tile.x + 4,
                                    8 * tile.y + 4);
                            } else {
                                // opens to north-east.
                                pacman.g.drawVertLine(8 * tile.x + 3,
                                    8 * tile.y,
                                    3);
                                pacman.g.drawHorzLine(8 * tile.x + 5,
                                    8 * tile.y + 4,
                                    3);
                                pacman.g.drawVPixel(8 * tile.x + 4,
                                    8 * tile.y + 3);
                            }
                        } else {
                            if (o.y === tile.y + 1) {
                                // opens to south-west.
                                pacman.g.drawVertLine(8 * tile.x + 4,
                                    8 * tile.y + 5,
                                    3);
                                pacman.g.drawHorzLine(8 * tile.x,
                                    8 * tile.y + 3,
                                    3);
                                pacman.g.drawVPixel(8 * tile.x + 3,
                                    8 * tile.y + 4);
                            } else {
                                // opens to north-west.
                                pacman.g.drawVertLine(8 * tile.x + 4,
                                    8 * tile.y,
                                    3);
                                pacman.g.drawHorzLine(8 * tile.x,
                                    8 * tile.y + 4,
                                    3);
                                pacman.g.drawVPixel(8 * tile.x + 3,
                                    8 * tile.y + 3);
                            }
                        }

                        break;
                }
            }
        }

        //// The outermost border.

        // upper left corner.
        pacman.g.drawHorzLine(2, 1, 2);
        pacman.g.drawVertLine(1, 2, 2);

        // upper border.
        pacman.g.drawHorzLine(4, 0, 8 * (pacman.settings.w - 1));

        // upper right corner.
        pacman.g.drawHorzLine(4 + 8 * (pacman.settings.w - 1), 1, 2);
        pacman.g.drawVertLine(6 + 8 * (pacman.settings.w - 1), 2, 2);

        // right border.
        pacman.g.drawVertLine(8 * pacman.settings.w - 1, 4, 8 * 9);

        pacman.g.drawVertLine(8 * pacman.settings.w - 2, 8 * 9 + 4, 2);
        pacman.g.drawHorzLine(8 * pacman.settings.w - 4, 8 * 9 + 6, 2);

        pacman.g.drawHorzLine(8 * pacman.settings.w - 8 * 5, 8 * 9 + 7, 8 * 4 + 4);
        pacman.g.drawVertLine(8 * pacman.settings.w - 8 * 5 - 1, 8 * 10, 8 * 3);
        pacman.g.drawHorzLine(8 * pacman.settings.w - 8 * 5, 8 * 13, 8 * 5);

        pacman.g.drawHorzLine(8 * pacman.settings.w - 8 * 5, 8 * 15 + 7, 8 * 5);
        pacman.g.drawVertLine(8 * pacman.settings.w - 8 * 5 - 1, 8 * 16, 8 * 3);
        pacman.g.drawHorzLine(8 * pacman.settings.w - 8 * 5, 8 * 19, 8 * 4 + 4);

        pacman.g.drawVertLine(8 * pacman.settings.w - 2, 8 * 19 + 2, 2);
        pacman.g.drawHorzLine(8 * pacman.settings.w - 4, 8 * 19 + 1, 2);

        pacman.g.drawVertLine(8 * pacman.settings.w - 1, 8 * 19 + 4, 8 * 11);

        // lower right corner.
        pacman.g.drawVertLine(8 * pacman.settings.w - 2, 8 * pacman.settings.h - 4, 2);
        pacman.g.drawHorzLine(8 * pacman.settings.w - 4, 8 * pacman.settings.h - 2, 2);

        // lower border.
        pacman.g.drawHorzLine(4, 8 * pacman.settings.h - 1, 8 * (pacman.settings.w - 1));

        // lower left corner.
        pacman.g.drawVertLine(1, 8 * pacman.settings.h - 4, 2);
        pacman.g.drawHorzLine(2, 8 * pacman.settings.h - 2, 2);

        // left border
        pacman.g.drawVertLine(0, 8 * 19 + 4, 8 * 11);

        pacman.g.drawHorzLine(2, 8 * 19 + 1, 2);
        pacman.g.drawVertLine(1, 8 * 19 + 2, 2);

        pacman.g.drawHorzLine(4, 8 * 19, 8 * 4 + 4);
        pacman.g.drawVertLine(8 * 5, 8 * 16, 8 * 3);
        pacman.g.drawHorzLine(0, 8 * 15 + 7, 8 * 5);

        pacman.g.drawHorzLine(0, 8 * 13, 8 * 5);
        pacman.g.drawVertLine(8 * 5, 8 * 10, 8 * 3);
        pacman.g.drawHorzLine(4, 8 * 9 + 7, 8 * 4 + 4);

        pacman.g.drawVertLine(1, 8 * 9 + 4, 2);
        pacman.g.drawHorzLine(2, 8 * 9 + 6, 2);

        pacman.g.drawVertLine(0, 4, 8 * 9);

        //// TODO: draw vulnerable ghosts here.
        for (var i = 0; i < pacman.model.ghosts.length; i++) {
            var g = pacman.model.ghosts[i];

            if (g.vetime > pacman.model.tickCount) {
                g.animate(g, g.color);
            }
        }

        if (pacman.model.pacman) {
            pacman.model.pacman.animate(pacman.model.pacman);
        }

        //// TODO: draw chasing ghosts here.
        for (var i = 0; i < pacman.model.ghosts.length; i++) {
            var g = pacman.model.ghosts[i];

            if (g.vetime <= pacman.model.tickCount) {
                g.animate(g, g.color);
            }
        }


    },

    tick: function () {
        var status = pacman.engine.magic.CONTINUE;

        if (pacman.engine.runs === true) {
            status = pacman.engine.logic(pacman.engine.input());
        }

        pacman.engine.render();

        if (status === pacman.engine.magic.CONTINUE) {
            setTimeout(pacman.engine.tick, 1000 / 60);
        } else if (status === pacman.engine.magic.FAIL) {
            pacman.engine.showResultView("Hai perso! Hai totalizzato *" + pacman.model.points + "* punti.");
        } else if (status === pacman.engine.magic.VICTORY) {
            pacman.engine.showResultView("HAI VINTO! Hai totalizzato *" + pacman.model.points + "* punti.");
        }

        if (pacman.engine.runs === true) {
            if (++pacman.model.tickCount % 60 === 0) {
                pacman.model.showEnergizers = !pacman.model.showEnergizers;
            }
        }
    }
};

var KEY_UP = 38;
var KEY_RIGHT = 39;
var KEY_DOWN = 40;
var KEY_LEFT = 37;

var KEY_A = 65;
var KEY_S = 83;
var KEY_D = 68;
var KEY_W = 87;

var KEY_SPACE = 32;

function detachKeyListener() {
    document.onkeydown = undefined;
    document.onkeyup = undefined;
}

function attachKeyListener() {
    document.onkeydown = function (eventInfo) {
        var code = eventInfo.keyCode;

        if (code === KEY_UP) {
            pacman.input.up = true;
            eventInfo.preventDefault();
        } else if (code === KEY_RIGHT) {
            pacman.input.right = true;
            eventInfo.preventDefault();
        } else if (code === KEY_DOWN) {
            pacman.input.down = true;
            eventInfo.preventDefault();
        } else if (code === KEY_LEFT) {
            pacman.input.left = true;
            eventInfo.preventDefault();
        } else if (code === KEY_W) {
            pacman.input.up = true;
            eventInfo.preventDefault();
        } else if (code === KEY_D) {
            pacman.input.right = true;
            eventInfo.preventDefault();
        } else if (code === KEY_S) {
            pacman.input.down = true;
            eventInfo.preventDefault();
        } else if (code === KEY_A) {
            pacman.input.left = true;
            eventInfo.preventDefault();
        } else if (code === KEY_SPACE) {
            pacman.engine.runs = !pacman.engine.runs;
            pacman.engine.pauseStatusChanged = true;
            eventInfo.preventDefault();
        }
    };

    document.onkeyup = function (eventInfo) {
        var code = eventInfo.keyCode;

        if (code === KEY_UP) {
            pacman.input.up = false;
            eventInfo.preventDefault();
        } else if (code === KEY_RIGHT) {
            pacman.input.right = false;
            eventInfo.preventDefault();
        } else if (code === KEY_DOWN) {
            pacman.input.down = false;
            eventInfo.preventDefault();
        } else if (code === KEY_LEFT) {
            pacman.input.left = false;
            eventInfo.preventDefault();
        } else if (code === KEY_W) {
            pacman.input.up = false;
            eventInfo.preventDefault();
        } else if (code === KEY_D) {
            pacman.input.right = false;
            eventInfo.preventDefault();
        } else if (code === KEY_S) {
            pacman.input.down = false;
            eventInfo.preventDefault();
        } else if (code === KEY_A) {
            pacman.input.left = false;
            eventInfo.preventDefault();
        }
    };
}

function initGame(username) {
    var canvasElem = document.getElementById("pmcanvas");
    document.getElementById("welcome").className = "hidden";
    canvasElem.className = "";
    var ctx = canvasElem.getContext("2d");
    pacman.g.setContext(ctx);
    pacman.engine.newGame(username);
    canvasElem.onclick = function (e) {
        var vx = Math.round(e.offsetX / pacman.settings.vpw);
        var vy = Math.round(e.offsetY / pacman.settings.vph);
        var dx = vx - pacman.model.pacman.x;
        var dy = vy - pacman.model.pacman.y;

        if (dx === 0 && dy === 0) {
            e.preventDefault();
            return;
        }

        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0) {
                pacman.input.left = false;
                pacman.input.right = true;
            } else {
                pacman.input.left = true;
                pacman.input.right = false;
            }

            pacman.input.up =
                pacman.input.down = false;
        } else if (Math.abs(dx) < Math.abs(dy)) {
            if (dy > 0) {
                pacman.input.down = true;
                pacman.input.up = false;
            } else {
                pacman.input.down = false;
                pacman.input.up = true;
            }

            pacman.input.left =
                pacman.input.right = false;
        }
    };
    attachKeyListener();
}

function startGame() {
    document.getElementsByTagName('header')[0].style = "font-size: larger; font - family: 'Roboto'; margin-top: 0px; text-align: center;"
    document.getElementById('canvass').hidden = false
    initGame("a")
}

function initWelcomeView() {
    document.getElementsByTagName('header')[0].style = "font-size: larger; font - family: 'Roboto'; margin-top: 0px; text-align: center; margin-top: 20%;"
    document.getElementById("welcome").className = "text";
    document.getElementById("pmcanvas").className = "hidden";
}