
/*
let ball = {pos: [2, 3.2], prevpos: [2, 2.9], acceleration: [0, 1]}
let arena = [ [ 1, 1 ], [ 1, 3 ], [ 3, 3 ], [ 3, 1 ] ];

console.log( isInside(ball.pos, arena) ? "ball is in" : "ball is out")

if (!isInside(ball.pos, arena)){
	console.log("looser is", getLooser(ball, arena) )
}

const decelerationRatio = 0.99; // ball decelerate of 1% if no hit
const delta = 1/24;             // fps

*/
module.exports = {
    foo: function loop(ball, arena, delta, decelerationRatio) {

        if (!isInside(ball, arena)) {
            return getLooser(ball, arena);
        }

        ball.acceleration[0] = ball.acceleration[0] * decelerationRatio;
        ball.acceleration[1] = ball.acceleration[1] * decelerationRatio;

        // Check for hit
        for (let i = 0, j = shape.length - 1; i < shape.length; j = i++) {

            let x1 = shape[i][0], y1 = shape[i][1];
            let x2 = shape[j][0], y2 = shape[j][1];
            

            if ( checkHit(ball, position[i], [[x1, y1], [x2, y2]]) ) {
                
                // J'ai un peu tricks avec un peu de chance ça marche
                ball.acceleration[0] = 2 * (x1 - x2) - ball.acceleration[0]
                ball.acceleration[1] = 2 * (y1 - y2) - ball.acceleration[1]

            }
        }

        ball.prevpos = ball.pos;
        ball.pos[0] += ball.acceleration.x * (delta/1000);
        ball.pos[1] += ball.acceleration.y * (delta/1000);
        
    },
    checkHit: function checkHit(ball, playerPosition, playerAxis) {

        /*
        *   Apply both the points on given line equation and check if 
        *   the obtained values belong to same parity or not
        */

        let a = playerAxis[0][0] - playerAxis[1][0]
        let b = playerAxis[0][1] - playerAxis[1][1]

        let fx1 = a * ball.prevpos[0] + b * ball.prevpos[1]; 
        let fx2 = a * ball.pos[0] + b * ball.pos[1]; 
      
        // If fx1 and fx2 have same sign 
        if ((fx1 * fx2) > 0) 
            return false; 
      
        console.log("[checkHit] -> "+true);

        return true; 
    },
    isInside: function isInside(point, shape) {
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
        console.log("[isInside] -> "+inside);

        
        return inside;
    },
    getLooser: function getLooser(ball, shape) {

        // compute all distances between the ball and each lines
        // return the closest

        let distances = {}

        for (let i = 0, j = shape.length - 1; i < shape.length; j = i++) {
            let x1 = shape[i][0], y1 = shape[i][1];
            let x2 = shape[j][0], y2 = shape[j][1];
            
            // https://www.wikiwand.com/en/Distance_from_a_point_to_a_line#/Line_defined_by_two_points
            distances[i] = Math.abs( (y2 - y1)*ball.pos[0] - (x2 - x1)*ball.pos[1] + x2*y1 - y2*x1 ) / Math.sqrt((y2-y1)*(y2-y1) + (x2-x1)*(x2-x1))
        }

        console.log("[getLooser] -> "+distances);

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
};
