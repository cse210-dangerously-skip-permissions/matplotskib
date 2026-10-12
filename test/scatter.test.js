import { test } from "node:test";
import assert from "node:assert/strict";
import { objScatter, buildScatter } from "../src/charts/scatter.js";

/** @type {import("../src/contracts.js").ParseResult} */
const objParse = {
  arrColumns: [
    { strField: "height", strType: "number" },
    { strField: "weight", strType: "number" },
  ],
  arrRows: [
    { height: 1, weight: 10 },
    { height: 2, weight: 20 },
    { height: 3, weight: 30 },
  ],
  arrErrors: [],
};

const objFakeScales = {
  fnX: (/** @type {number} */ numValue) => numValue * 10,
  fnY: (/** @type {number} */ numValue) => 100 - numValue,
};

/** @type {import("../src/contracts.js").ChartSpec} */
const objSpec = {
  strChart: "scatter",
  objFields: { x: "height", y: "weight" },
  objOptions: { objScales: objFakeScales },
};

test("registers with a number x slot and a number y slot", () => {
  assert.equal(objScatter.strName, "scatter");
  assert.deepEqual(objScatter.arrSlots, [
    { strSlot: "x", arrTypes: ["number"] },
    { strSlot: "y", arrTypes: ["number"] },
  ]);
});

test("returns one circle per row", () => {
  const arrItems = buildScatter(objParse, objSpec);
  assert.equal(arrItems.length, 3);
  assert.ok(arrItems.every((objItem) => objItem.strKind === "circle"));
});

test("positions come from the scales", () => {
  const arrItems = buildScatter(objParse, objSpec);
  assert.deepEqual(
    arrItems.map((objItem) => [objItem.numX, objItem.numY]),
    [
      [10, 90],
      [20, 80],
      [30, 70],
    ],
  );
});

test("every circle has numR 4 and class point", () => {
  const arrItems = buildScatter(objParse, objSpec);
  for (const objItem of arrItems) {
    assert.equal(objItem.numR, 4);
    assert.equal(objItem.strClass, "point");
  }
});

test("reads the columns named in objFields, not fixed names", () => {
  const arrCallsX = [];
  const arrCallsY = [];
  const objSpyScales = {
    fnX: (/** @type {number} */ numValue) => {
      arrCallsX.push(numValue);
      return numValue;
    },
    fnY: (/** @type {number} */ numValue) => {
      arrCallsY.push(numValue);
      return numValue;
    },
  };
  /** @type {import("../src/contracts.js").ChartSpec} */
  const objSwapped = {
    strChart: "scatter",
    objFields: { x: "weight", y: "height" },
    objOptions: { objScales: objSpyScales },
  };

  buildScatter(objParse, objSwapped);

  assert.deepEqual(arrCallsX, [10, 20, 30]);
  assert.deepEqual(arrCallsY, [1, 2, 3]);
});

test("no rows gives no items", () => {
  const arrItems = buildScatter({ ...objParse, arrRows: [] }, objSpec);
  assert.deepEqual(arrItems, []);
});

test("throws when layout did not supply scales", () => {
  assert.throws(
    () => buildScatter(objParse, { ...objSpec, objOptions: undefined }),
    /objScales is required/,
  );
  assert.throws(
    () => buildScatter(objParse, { ...objSpec, objOptions: {} }),
    /objScales is required/,
  );
});
