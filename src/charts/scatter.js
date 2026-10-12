import { COLUMN_TYPES, SCENE_KINDS } from "../contracts.js";
import { registerChart } from "../registry.js";

const NUM_POINT_RADIUS = 4;

/**
 * Data-to-pixel mapping that layout supplies at objSpec.objOptions.objScales.
 * @typedef {object} Scales
 * @property {(numValue: number) => number} fnX
 * @property {(numValue: number) => number} fnY
 */

/**
 * Build one circle per row. All position math comes from objScales.
 * @param {import("../contracts.js").ParseResult} objParse
 * @param {import("../contracts.js").ChartSpec} objSpec objOptions.objScales is required
 * @returns {import("../contracts.js").SceneCircle[]}
 */
export function buildScatter(objParse, objSpec) {
  const objOptions = /** @type {{ objScales?: Scales }} */ (
    objSpec.objOptions ?? {}
  );
  const objScales = objOptions.objScales;
  if (!objScales) {
    throw new Error("scatter: objSpec.objOptions.objScales is required");
  }

  const strXField = objSpec.objFields.x;
  const strYField = objSpec.objFields.y;

  return objParse.arrRows.map((objRow) => ({
    strKind: SCENE_KINDS.CIRCLE,
    numX: objScales.fnX(/** @type {number} */ (objRow[strXField])),
    numY: objScales.fnY(/** @type {number} */ (objRow[strYField])),
    numR: NUM_POINT_RADIUS,
    strClass: "point",
  }));
}

/** @type {import("../contracts.js").ChartType} */
export const objScatter = {
  strName: "scatter",
  arrSlots: [
    { strSlot: "x", arrTypes: [COLUMN_TYPES.NUMBER] },
    { strSlot: "y", arrTypes: [COLUMN_TYPES.NUMBER] },
  ],
  fnBuild: buildScatter,
};

registerChart(objScatter);
