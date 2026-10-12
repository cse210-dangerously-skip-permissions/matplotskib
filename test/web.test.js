import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { layout, parse, renderSvg } from "../web/pipeline.js";

/**
 * @param {string} strPath path from the repo root
 * @returns {string}
 */
function readText(strPath) {
  return readFileSync(new URL(`../${strPath}`, import.meta.url), "utf8");
}

test("web pipeline draws the fixture as a line chart with one line per agent", () => {
  const objParse = parse(readText("fixtures/agents-vs-bugs.csv"));
  const objScene = layout(objParse, {
    strChart: "line",
    objFields: { x: "day", y: "bugs", series: "agent" },
    strTitle: "Bugs found per day",
  });
  const strSvg = renderSvg(objScene);
  assert.equal(strSvg.match(/class="line series-\d"/g)?.length, 3);
  assert.match(strSvg, />Bugs found per day</);
});

test("web pipeline draws the fixture as a scatter with one point per row", () => {
  const objParse = parse(readText("fixtures/agents-vs-bugs.csv"));
  const objScene = layout(objParse, {
    strChart: "scatter",
    objFields: { x: "day", y: "bugs" },
  });
  assert.equal(renderSvg(objScene).match(/<circle/g)?.length, 15);
});

test("the broken sample fails in the parser, so the page shows errors", () => {
  const objParse = parse(readText("web/samples/broken.csv"));
  assert.equal(objParse.arrErrors.length, 2);
  assert.equal(objParse.arrRows.length, 0);
});

test("layout rejects a column of the wrong type with a plain message", () => {
  const objParse = parse(readText("fixtures/agents-vs-bugs.csv"));
  assert.throws(
    () =>
      layout(objParse, {
        strChart: "scatter",
        objFields: { x: "agent", y: "bugs" },
      }),
    /"x" takes number, but agent is category/,
  );
});
