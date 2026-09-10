/** Arctic-ocean Goldberg seats. Not playable. */

export const FLOODED_IDS: readonly string[] = [
  "winnipeg",
  "huron",
  "fjords",
  "illinois",
  "amur",
  "kuril",
  "algonquin",
  "laurentide",
  "yakutia",
  "jilin",
  "aleut",
];

export const FLOODED_SET = new Set<string>(FLOODED_IDS);

/** Unit directions of the flooded cells so assignment cannot reclaim them. */
export const FLOOD_DIRS: [number, number, number][] = [
  [0, 1, 0],
  [0.03685, 0.99285, 0.1134],
  [0.11925, 0.99285, 0],
  [0.25115, 0.96795, 0],
  [0.03685, 0.99285, -0.1134],
  [0.1662, 0.97865, -0.12075],
  [0.0776, 0.96795, -0.23885],
  [-0.09645, 0.99285, -0.0701],
  [-0.0635, 0.97865, -0.1954],
  [-0.2032, 0.96795, -0.1476],
  [-0.17415, 0.9432, -0.2829],
];
