import { manhattanDistance, Point } from "../mod.ts";

// 2つの点間のマンハッタン距離を計算する例
const point1: Point = { x: 1, y: 1 };
const point2: Point = { x: 4, y: 5 };

// 2点間のマンハッタン距離を計算
const result = manhattanDistance(point1, point2);

console.log(`Point 1: (${point1.x}, ${point1.y})`);
console.log(`Point 2: (${point2.x}, ${point2.y})`);
console.log(`Manhattan distance between points: ${result}`);
// 出力: Manhattan distance between points: 7

// 負の座標を含む例
const point3: Point = { x: -1, y: -3 };
const point4: Point = { x: 2, y: -7 };

const result2 = manhattanDistance(point3, point4);
console.log(`Point 3: (${point3.x}, ${point3.y})`);
console.log(`Point 4: (${point4.x}, ${point4.y})`);
console.log(`Manhattan distance between points: ${result2}`);
// 出力: Manhattan distance between points: 7
