import type { ID } from "./object-types";

let AUTO = 0;
// return a branded ID instead of string
export const nid = (p = "id"): ID => `${p}_${AUTO++}` as ID;