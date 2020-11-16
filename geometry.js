
let ball = {pos: [2, 3.2], vect: [0, 1]}
let poly = [ [ 1, 1 ], [ 1, 3 ], [ 3, 3 ], [ 3, 1 ] ];

console.log( isInside(ball.pos, poly) ? "ball is in" : "ball is out")

if (!isInside(ball.pos, poly)){
	console.log("looser is", getLooser(ball, poly) )
}


function isInside(point, shape) {
    // ray-casting algorithm based on
    // https://wrf.ecse.rpi.edu/Research/Short_Notes/pnpoly.html/pnpoly.html
    
    let x = point[0], y = point[1];
    
    let inside = false;

    for (let i = 0, j = shape.length - 1; i < shape.length; j = i++) {

        let x1 = shape[i][0], y1 = shape[i][1];
        let x2 = shape[j][0], y2 = shape[j][1];
        

        let intersect = ((y1 > y) != (y2 > y)) && (x < (x2 - x1) * (y - y1) / (y2 - y1) + x1);

        if (intersect) inside = !inside;
    }
    
    return inside;
};


function getLooser(ball, shape) {

	// compute all distances between the ball and each lines
	// return the closest

	let distances = {}

	for (let i = 0, j = shape.length - 1; i < shape.length; j = i++) {
        let x1 = shape[i][0], y1 = shape[i][1];
        let x2 = shape[j][0], y2 = shape[j][1];
        
        // https://www.wikiwand.com/en/Distance_from_a_point_to_a_line#/Line_defined_by_two_points
        distances[i] = Math.abs( (y2 - y1)*ball.pos[0] - (x2 - x1)*ball.pos[1] + x2*y1 - y2*x1 ) / Math.sqrt((y2-y1)*(y2-y1) + (x2-x1)*(x2-x1))
    }

    console.log(distances)

    let res = {
    	index: 0,
    	value: distances[0]
    }

    for (let i in distances) {
    	if (res.value > distances[i]){
    		res.index = i;
    		res.value = distances[i]
    	}
    }

    return res.index
}