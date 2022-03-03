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
        this.vecs_data = {}; // meta data like distance and stuff, calculated when arrow is finished
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

        // Add decompose arrows
        this.decompose = {x: null, y: null};
        let decompose_vars = {
            visible: false,
            opacity: 0.5,
            fill: 'black',
            stroke: 'black',
            strokeWidth: 4,
            pointerLength: 10,
            pointerWidth: 10,
        };
        this.decompose.x = new Konva.Arrow(decompose_vars);
        this.decompose.y = new Konva.Arrow(decompose_vars);
        this.arrowLayer.add(this.decompose.x);
        this.arrowLayer.add(this.decompose.y);

        this.stage.add(this.diagramLayer);
        this.stage.add(this.arrowLayer);

        this.setup_event_handlers();
    }

    render_ui() {
        // Rebuild list of arrowz
        let vlist = document.querySelector("ul#vectorlist");
        vlist.innerHTML = "";
        // Also construct the sum
        for (let vec of this.vecs) {
            let li = document.createElement("li");
            let pts = vec.points();
            let id = vec.id();
            let info = this.vecs_data[id];
            li.appendChild(document.createTextNode(`[${id}] from(${pts[0]}, ${pts[1]}) -> to(${pts[2]}, ${pts[3]}).\nDistance: ${info.distance.toFixed(2)}`));
            vlist.appendChild(li);
        }
        // console.log("vlist", vlist);

        // sum up vectors. just assume for fun they start at 0,0
        let sums = {
            force_up: 0,
            force_down: 0,
            force_left: 0,
            force_right: 0
        };
        // TODO Probably use reduce
        for (let info of Object.values(this.vecs_data)) {
            let comp = this.components(info.distance, info.theta);
            if (comp.x > 0) {
                sums.force_left += Math.abs(comp.x);
            } else {
                sums.force_right += Math.abs(comp.x)
            }
            if (comp.y > 0) {
                sums.force_up += Math.abs(comp.y);
            } else {
                sums.force_down += Math.abs(comp.y);
            }
        }
        let total_x = sums.force_left - sums.force_right;
        let total_y = sums.force_up - sums.force_down;
        document.querySelector("#sums").innerHTML = `X: ${total_x.toFixed(2)}, Y: ${total_y.toFixed(2)}`;

        // Also show this in a simple four-arrow display, with the sums
    }

    components(r, theta) {
        return {
            x: r * Math.cos(theta),
            y: r * Math.sin(theta)
        }
    }

    nearest_grid_point(x, y, dict) {
        //
        dict = dict || false;
        const to = this.gridsize; // should match background-size, and be double background-position from css#container

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

        const r = Math.sqrt(x_dist**2 + y_dist**2);
        const theta = Math.atan2(cto.y, cto.x);

        return {
            "from": from,
            "to": to,
            "cfrom": cfrom,
            "cto": cto,
            distance: r,
            "theta": theta,
            x_component: r * Math.cos(theta),
            y_component: r * Math.sin(theta)
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
                let newId = _.uniqueId("vec_");
                let arrow = new Konva.Arrow({
                    visible: true,
                    fill: 'green', // changeable
                    stroke: 'green', // changeable
                    strokeWidth: 4,
                    pointerLength: 10,
                    pointerWidth: 10,
                    points: [this.vec.from_x, this.vec.from_y, this.vec.to_x, this.vec.to_y],
                    id: newId,

                    // allows larger hit detection region    
                    hitStrokeWidth: 20,
                });
                arrow.on("mouseover", e => {
                    let target = e.target; // this is the konva arrow object
                    e.target.setAttrs({
                        fill: 'red', stroke: 'red'
                    });
                    let vec = this.vector_info({
                        x: e.target.points()[0],
                        y: e.target.points()[1],
                    }, {
                        x: e.target.points()[2],
                        y: e.target.points()[3]
                    });
                    // perhaps show decomposed arrows, with half opacity\
                    this.decompose.x.points([e.target.points()[0], e.target.points()[1], e.target.points()[0] + vec.x_component, e.target.points()[1]]);
                    this.decompose.y.points([e.target.points()[0], e.target.points()[1], e.target.points()[0], e.target.points()[1] - vec.y_component]);
                    this.decompose.x.show();
                    this.decompose.y.show();
                });
                arrow.on("mouseout", e => {
                    e.target.setAttrs({
                        fill: 'green', stroke: 'green',
                    });
                    this.decompose.x.hide();
                    this.decompose.y.hide();
                })
                this.vec = {
                    from_x: null, from_y: null, to_x: null, to_y: null
                };
                this.arrowLayer.add(arrow);
                this.vecs.push(arrow);
                this.vecs_data[newId] = vec;

                this.render_ui();
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