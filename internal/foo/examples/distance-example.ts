import { distance, Point } from "../mod.ts";

// 2つの点間の距離を計算する例
const point1: Point = { x: 1, y: 1 };
const point2: Point = { x: 4, y: 5 };

// 2点間のユークリッド距離を計算
const result = distance(point1, point2);

console.log(`Point 1: (${point1.x}, ${point1.y})`);
console.log(`Point 2: (${point2.x}, ${point2.y})`);
console.log(`Distance between points: ${result}`);
// 出力: Distance between points: 5
