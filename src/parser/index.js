// TODO: owner implements. See CONTRIBUTING.md.
/**
 * @module parser
 *
 * In:  strCsv     - raw CSV text (RFC 4180 style: quoted fields, "" escapes,
 *                   CRLF/LF/CR line endings, newlines inside quotes).
 *      objOptions - optional, see {@link ParseOptions}.
 *
 * Out: {@link ParsedTable}
 *      - arrHeaders:     column names, in file order
 *      - objColumnTypes: header -> "number" | "string"
 *      - arrRows:        one object per data row, keyed by header.
 *                        Empty cells become null. Cells in "number" columns
 *                        are numbers; everything else is a trimmed string.
 *
 * The parser knows nothing about scales, axes, or SVG. It never returns NaN.
 * Malformed input (unterminated quote, ragged rows, blank/duplicate headers)
 * throws an Error rather than guessing.
 */

/** @typedef {string | number | null} CellValue */

/**
 * @typedef {object} ParseOptions
 * @property {string} [strDelimiter=","] Single-character field delimiter.
 * @property {boolean} [boolHasHeader=true] Treat the first record as headers.
 *   When false, headers are generated as "column1", "column2", ...
 * @property {boolean} [boolInferTypes=true] Convert fully numeric columns to
 *   numbers. When false, every non-empty cell stays a string.
 */

/**
 * @typedef {object} ParsedTable
 * @property {string[]} arrHeaders
 * @property {Record<string, "number" | "string">} objColumnTypes
 * @property {Array<Record<string, CellValue>>} arrRows
 */

/** @type {Required<ParseOptions>} */
const objDefaultOptions = Object.freeze({
  strDelimiter: ",",
  boolHasHeader: true,
  boolInferTypes: true,
});

const regexNumber = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;

/**
 * Splits CSV text into records of raw string fields.
 *
 * @param {string} strText CSV text with any BOM already removed.
 * @param {string} strDelimiter Single-character delimiter.
 * @returns {string[][]} Records of unprocessed fields.
 * @throws {Error} If a quoted field is never closed.
 */
function splitRecords(strText, strDelimiter) {
  /** @type {string[][]} */
  const arrRecords = [];
  let arrFields = [];
  let strField = "";
  let boolInQuotes = false;

  for (let numIndex = 0; numIndex < strText.length; numIndex += 1) {
    const strChar = strText[numIndex];

    if (boolInQuotes) {
      if (strChar !== '"') {
        strField += strChar;
      } else if (strText[numIndex + 1] === '"') {
        strField += '"';
        numIndex += 1;
      } else {
        boolInQuotes = false;
      }
    } else if (strChar === '"' && strField === "") {
      boolInQuotes = true;
    } else if (strChar === strDelimiter) {
      arrFields.push(strField);
      strField = "";
    } else if (strChar === "\n" || strChar === "\r") {
      if (strChar === "\r" && strText[numIndex + 1] === "\n") {
        numIndex += 1;
      }
      arrFields.push(strField);
      arrRecords.push(arrFields);
      arrFields = [];
      strField = "";
    } else {
      strField += strChar;
    }
  }

  if (boolInQuotes) {
    throw new Error("Malformed CSV: unterminated quoted field.");
  }
  if (strField !== "" || arrFields.length > 0) {
    arrFields.push(strField);
    arrRecords.push(arrFields);
  }

  return arrRecords;
}

/**
 * Checks whether a record is just a blank line.
 *
 * @param {string[]} arrRecord A record of raw fields.
 * @returns {boolean} True if the record has one empty field.
 */
function isBlankRecord(arrRecord) {
  return arrRecord.length === 1 && arrRecord[0].trim() === "";
}

/**
 * Builds and validates the header list.
 *
 * @param {string[]} arrFirstRecord The first record in the file.
 * @param {boolean} boolHasHeader Whether that record contains headers.
 * @returns {string[]} Header names.
 * @throws {Error} On a blank or duplicate header.
 */
function buildHeaders(arrFirstRecord, boolHasHeader) {
  if (!boolHasHeader) {
    return arrFirstRecord.map((_strCell, numIndex) => `column${numIndex + 1}`);
  }

  const arrHeaders = arrFirstRecord.map((strCell) => strCell.trim());
  const setSeen = new Set();

  for (const strHeader of arrHeaders) {
    if (strHeader === "") {
      throw new Error("Malformed CSV: header row contains a blank name.");
    }
    if (setSeen.has(strHeader)) {
      throw new Error(`Malformed CSV: duplicate header "${strHeader}".`);
    }
    setSeen.add(strHeader);
  }

  return arrHeaders;
}

/**
 * Parses CSV text into a header list, column types, and keyed rows, ready
 * for the layout module.
 *
 * @param {string} strCsv Raw CSV text.
 * @param {ParseOptions} [objOptions] Parsing options.
 * @returns {ParsedTable} The parsed table (see module contract above).
 * @throws {TypeError} If strCsv is not a string.
 * @throws {Error} On malformed CSV or an invalid delimiter.
 * @example
 * const { arrHeaders, arrRows } = parseCsv("month,sales\nJan,10\nFeb,12");
 * // arrHeaders -> ["month", "sales"]
 * // arrRows    -> [{ month: "Jan", sales: 10 }, { month: "Feb", sales: 12 }]
 */
export function parseCsv(strCsv, objOptions = {}) {
  if (typeof strCsv !== "string") {
    throw new TypeError("parseCsv expects a string.");
  }

  const { strDelimiter, boolHasHeader, boolInferTypes } = {
    ...objDefaultOptions,
    ...objOptions,
  };
  if (strDelimiter.length !== 1 || /["\r\n]/.test(strDelimiter)) {
    throw new Error(
      "strDelimiter must be a single non-quote, non-newline character.",
    );
  }

  const strText = strCsv.replace(/^\uFEFF/, "");
  const arrRecords = splitRecords(strText, strDelimiter).filter(
    (arrRecord) => !isBlankRecord(arrRecord),
  );

  if (arrRecords.length === 0) {
    return { arrHeaders: [], objColumnTypes: {}, arrRows: [] };
  }

  const arrHeaders = buildHeaders(arrRecords[0], boolHasHeader);
  const arrDataRecords = boolHasHeader ? arrRecords.slice(1) : arrRecords;

  arrDataRecords.forEach((arrRecord, numIndex) => {
    if (arrRecord.length !== arrHeaders.length) {
      const numRecord = numIndex + (boolHasHeader ? 2 : 1);
      throw new Error(
        `Malformed CSV: record ${numRecord} has ${arrRecord.length} fields, expected ${arrHeaders.length}.`,
      );
    }
  });

  /** @type {Record<string, "number" | "string">} */
  const objColumnTypes = {};
  arrHeaders.forEach((strHeader, numColumn) => {
    const arrValues = arrDataRecords
      .map((arrRecord) => arrRecord[numColumn].trim())
      .filter((strValue) => strValue !== "");
    const boolIsNumeric =
      boolInferTypes &&
      arrValues.length > 0 &&
      arrValues.every((strValue) => regexNumber.test(strValue));
    objColumnTypes[strHeader] = boolIsNumeric ? "number" : "string";
  });

  const arrRows = arrDataRecords.map((arrRecord) => {
    /** @type {Record<string, CellValue>} */
    const objRow = {};
    arrHeaders.forEach((strHeader, numColumn) => {
      const strValue = arrRecord[numColumn].trim();
      if (strValue === "") {
        objRow[strHeader] = null;
      } else if (objColumnTypes[strHeader] === "number") {
        objRow[strHeader] = Number(strValue);
      } else {
        objRow[strHeader] = strValue;
      }
    });
    return objRow;
  });

  return { arrHeaders, objColumnTypes, arrRows };
}