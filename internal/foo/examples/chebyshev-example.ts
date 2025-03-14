/**
 * @module @i/foo/examples/chebyshev-example
 * Example usage of chebyshevDistance function
 */

import { chebyshevDistance, Point } from "../mod.ts";

// Define some points
const origin: Point = { x: 0, y: 0 };
const point1: Point = { x: 3, y: 4 };
const point2: Point = { x: -2, y: -3 };
const point3: Point = { x: 5, y: 5 };

// Calculate Chebyshev distances
console.log(
  `Chebyshev distance from origin to point1 (3,4): ${
    chebyshevDistance(origin, point1)
  }`,
);
console.log(
  `Chebyshev distance from point1 (3,4) to point2 (-2,-3): ${
    chebyshevDistance(point1, point2)
  }`,
);
console.log(
  `Chebyshev distance from point2 (-2,-3) to point3 (5,5): ${
    chebyshevDistance(point2, point3)
  }`,
);

// Compare with other distance metrics
import { distance } from "../mod.ts";
import { manhattanDistance } from "../mod.ts";

console.log("\nComparing different distance metrics for the same points:");
console.log(`Point1 (3,4) to Origin (0,0):`);
console.log(`- Euclidean distance: ${distance(origin, point1)}`);
console.log(`- Manhattan distance: ${manhattanDistance(origin, point1)}`);
console.log(`- Chebyshev distance: ${chebyshevDistance(origin, point1)}`);

// Explanation of when to use Chebyshev distance
console.log("\nWhen to use Chebyshev distance:");
console.log(
  "- Chess king movement: The number of moves a king needs to reach a square",
);
console.log(
  "- Warehouse robot movement: When the robot can move diagonally at the same speed",
);
console.log("- Image processing: For certain morphological operations");
console.log("- Minimax algorithms: For evaluating worst-case scenarios");
