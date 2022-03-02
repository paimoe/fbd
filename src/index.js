import Konva from 'konva';
import _ from 'lodash';

class Point {
    constructor(x,y) {

    }
}

class FBDClass {
    constructor() {
        this.is = {
            drawing: false,
        };
        this.gridsize = 40;
        this.gridhalf = this.gridsize/2;
        // New vector we're drawing
        this.vec = {
            from_x: null,
            from_y: null,
            to_x: null,
            to_y: null,
        };
        this.vecs = [];
    }

    init() {
        this.stage = new Konva.Stage({
            container: "container",
            width: 1280,
            height: 720
        });

        this.diagramLayer = new Konva.Layer(); // The current FBD
        this.arrowLayer = new Konva.Layer(); // When we draw a new arrow or force thing

        this.centre = new Konva.Circle({
            x: this.stage.width() / 2,
            y: this.stage.height() / 2,
            fill: 'red',
            radius: 5
        });
        this.cursor = new Konva.Circle({
            fill: 'green',
            radius: 5,
        });
        this.diagramLayer.add(this.cursor);
        this.diagramLayer.add(this.centre);

        // Add new arrow (hidden)
        this.arrow = new Konva.Arrow({
            visible: false,
            fill: 'black',
            stroke: 'black',
            strokeWidth: 4,
            pointerLength: 20,
            pointerWidth: 20,
        });
        this.arrowLayer.add(this.arrow);

        this.stage.add(this.diagramLayer);
        this.stage.add(this.arrowLayer);

        this.setup_event_handlers();

    }

    render() {
        // Might not need this obviously
    }

    nearest_grid_point(x, y, dict) {
        //
        dict = dict || false;
        const to = 40; // should match background-size, and be double background-position from css#container

        // 20x20 is the middle of the cell
        
        const x_to = Math.round(x/to) * to ;
        const y_to = Math.round(y/to) * to ;
        if (!dict) {
            return [x_to, y_to];
        }
        
        return {
            x: x_to,
            y: y_to,
        }
    }

    pos() {
        const pos = this.stage.getPointerPosition();
        const nearest = this.nearest_grid_point(pos.x, pos.y, true);
        return {
            x: pos.x, y: pos.y,
            nx: nearest.x, ny: nearest.y
        }        
    }

    as_cartesian(x, y) {
        return {"x": x - this.gridhalf, "y": this.gridhalf - y};
    }

    vector_info(from, to) {
        const x_dist = Math.abs(from.x - to.x);
        const y_dist = Math.abs(from.y - to.y);

        // Map to cartesian, so source is at 0,0
        const cfrom = {x: 0, y: 0};
        const cto = {x: to.x - from.x, y: from.y - to.y};

        return {
            "from": from,
            "to": to,
            "cfrom": cfrom,
            "cto": cto,
            distance: Math.sqrt(x_dist**2 + y_dist**2),
            theta: Math.atan2(cto.y, cto.x),
        };
    }

    setup_event_handlers() {
        // Set up mouseover and mouseuh whatever
        let canvas = document.querySelector("#container");
        this.stage.on("mousemove", (e) => {
            //console.log("get mouse pos", e)
            const pos = this.pos();
            if (this.is.drawing) {
                this.arrow.points([this.arrow.points()[0], this.arrow.points()[1], pos.nx, pos.ny]);
                this.vec.to_x = pos.nx;
                this.vec.to_y = pos.ny;
                // console.log(this.vec);
            } 

            // Show indicator for nearest arrow point
            // TODO is laggy, but since we're snapping to grid, it won't be too bad
            this.cursor.setAttrs({x: pos.nx, y: pos.ny});

            this.arrowLayer.batchDraw();
            

        });
        this.stage.on("mousedown", (e) => {
            // console.log("mousedown", e.evt);
            if (this.is.drawing) {
                this.is.drawing = false;
                this.arrow.hide();
                // emd arrow
                // console.info(`Creating vector from ${this.vec.from_x}, ${this.vec.from_y} to ${this.vec.to_x}, ${this.vec.to_y}`);
                let vec = this.vector_info({
                    x: this.vec.from_x,
                    y: this.vec.from_y,
                }, {
                    x: this.vec.to_x,
                    y: this.vec.to_y
                });

                // Add to arrows layer
                let arrow = new Konva.Arrow({
                    visible: true,
                    fill: 'green', // changeable
                    stroke: 'green', // changeable
                    strokeWidth: 4,
                    pointerLength: 10,
                    pointerWidth: 10,
                    points: [this.vec.from_x, this.vec.from_y, this.vec.to_x, this.vec.to_y],
                    id: _.uniqueId("vec_"),
                });
                this.vec = {
                    from_x: null, from_y: null, to_x: null, to_y: null
                };
                this.arrowLayer.add(arrow);
                this.vecs.push(arrow);
            } else {
                // Check if we are close to an arrow. maybe for now just head/tail and if we are, select that arrow
                this.is.drawing = true;
                const pos = this.pos();
                this.arrow.show();
                this.arrow.points([pos.nx, pos.ny]);
                this.vec.from_x = pos.nx;
                this.vec.from_y = pos.ny;
            }
        })
        this.stage.on("mouseup mouseout", (e) => {
            // this.is.drawing = false;
        });
    }

    on_mousedown() {
        // Possibly start drawing arrow
    }
}

let FBD;

document.addEventListener("DOMContentLoaded", () => {  
    FBD = new FBDClass();
    FBD.init();
})

export default FBD;