
let ball = {pos: [3, 3], vect: [3, -5]}
let poly = [ [ 1, 1 ], [ 1, 2 ], [ 2, 2 ], [ 2, 1 ] ];

console.log( isInside(ball.pos, poly) ? "ball is in" : "ball is out")


function isInside(point, shape) {
    // ray-casting algorithm based on
    // https://wrf.ecse.rpi.edu/Research/Short_Notes/pnpoly.html/pnpoly.html
    
    let x = point[0], y = point[1];
    
    let inside = false;

    for (let i = 0, j = shape.length - 1; i < shape.length; j = i++) {

        let xi = shape[i][0], yi = shape[i][1];
        let xj = shape[j][0], yj = shape[j][1];
        
        let intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    
    return inside;
};

function getLoser(ball, poly) {

	for (let i = 0, j = shape.length - 1; i < shape.length; j = i++) {
        let xi = shape[i][0], yi = shape[i][1];
        let xj = shape[j][0], yj = shape[j][1];
        
       	let intersect = 
    }
}