/**
 * The knowledge-graph constellation: scattered concepts, the links between
 * them, and the frontier. The product thesis as a drawing.
 *
 * Coordinates only — this *is* the illustration; the two clients differ merely
 * in which element names they feed it to.
 */

export interface ConstellationNode {
  x: number;
  y: number;
  r: number;
  /** Bright nodes are "mastered"; the rest are the frontier. */
  hot?: boolean;
  /**
   * Stagger for the web's pulse animation, in seconds. Meaningless on mobile,
   * which draws the constellation static, but it belongs with the coordinates
   * rather than in a parallel table.
   */
  delay?: number;
}

export const NODES: ConstellationNode[] = [
  { x: 40, y: 132, r: 4 },
  { x: 74, y: 74, r: 6, hot: true, delay: -0.6 },
  { x: 128, y: 126, r: 5, delay: -2.1 },
  { x: 118, y: 44, r: 4, delay: -1.2 },
  { x: 176, y: 88, r: 9, hot: true },
  { x: 168, y: 168, r: 5, hot: true, delay: -2.8 },
  { x: 232, y: 42, r: 5, delay: -1.7 },
  { x: 240, y: 130, r: 6, delay: -0.9 },
  { x: 224, y: 196, r: 4, delay: -3.4 },
  { x: 292, y: 82, r: 5, hot: true, delay: -2.4 },
  { x: 300, y: 166, r: 4, delay: -1.4 },
  { x: 96, y: 194, r: 4, delay: -3.1 },
  { x: 274, y: 24, r: 3, delay: -0.3 },
];

export const EDGES: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [1, 3],
  [2, 4],
  [3, 4],
  [4, 5],
  [4, 6],
  [4, 7],
  [5, 8],
  [6, 9],
  [7, 9],
  [7, 10],
  [8, 10],
  [2, 11],
];
