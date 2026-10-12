// Data the page can load. Fixtures are the team's shared test inputs; samples are page-only
// files that show other column shapes and the parser error state.

/**
 * @typedef {object} Dataset
 * @property {string} strId
 * @property {string} strPath path relative to web/index.html
 * @property {"fixture" | "sample"} strSource
 * @property {string} strAbout one line shown in the picker
 * @property {{strChart: string, objFields: Object<string, string>, strTitle: string}} objStartSpec
 */

/** @type {Dataset[]} */
export const ARR_DATASETS = [
  {
    strId: "agents-vs-bugs",
    strPath: "../fixtures/agents-vs-bugs.csv",
    strSource: "fixture",
    strAbout: "Bugs found per day by three agents",
    objStartSpec: {
      strChart: "line",
      objFields: { x: "day", y: "bugs", series: "agent" },
      strTitle: "Bugs found per day",
    },
  },
  {
    strId: "review-times",
    strPath: "samples/review-times.csv",
    strSource: "sample",
    strAbout: "Lines changed against minutes to review, per PR",
    objStartSpec: {
      strChart: "scatter",
      objFields: { x: "linesChanged", y: "minutesToReview" },
      strTitle: "Bigger PRs take longer to review",
    },
  },
  {
    strId: "ci-minutes",
    strPath: "samples/ci-minutes.csv",
    strSource: "sample",
    strAbout: "CI minutes per weekday, a category x axis",
    objStartSpec: {
      strChart: "line",
      objFields: { x: "weekday", y: "minutes" },
      strTitle: "CI minutes this week",
    },
  },
  {
    strId: "broken",
    strPath: "samples/broken.csv",
    strSource: "sample",
    strAbout: "Two rows with the wrong number of fields, to show parser errors",
    objStartSpec: {
      strChart: "line",
      objFields: { x: "day", y: "bugs", series: "agent" },
      strTitle: "",
    },
  },
];

/**
 * Load a dataset's raw text. A bundled build can preload files on globalThis.OBJ_INLINE_FILES.
 * @param {Dataset} objDataset
 * @returns {Promise<string>}
 */
export async function loadRaw(objDataset) {
  const objInline = /** @type {any} */ (globalThis).OBJ_INLINE_FILES;
  if (objInline && objDataset.strPath in objInline)
    return objInline[objDataset.strPath];
  const objResponse = await fetch(objDataset.strPath);
  if (!objResponse.ok) {
    throw new Error(
      `could not load ${objDataset.strPath} (HTTP ${objResponse.status})`,
    );
  }
  return objResponse.text();
}
