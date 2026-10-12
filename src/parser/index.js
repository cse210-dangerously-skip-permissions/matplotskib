/**
 * @module parser
 *
 * Implements the parser side of the shared contract (see the shared contracts
 * module): CSV text in, a {@link ParseResult} out.
 *
 * - Never throws. Bad input fills `arrErrors` and leaves `arrRows` empty.
 * - Row numbers in errors are record numbers in the file, so the header row
 *   (when present) is row 1 and the first data row is row 2.
 * - A column is typed "number" only if every value in it is numeric. A blank
 *   cell is not numeric, so a column with a blank becomes a "category" column
 *   and the blank is kept as an empty string.
 */

import { COLUMN_TYPES } from "../contracts.js";

/** @typedef {import("../contracts.js").ParseResult} ParseResult */
/** @typedef {import("../contracts.js").Column} Column */

/**
 * @typedef {object} ParseOptions
 * @property {string} [strDelimiter=","] Single-character field delimiter.
 * @property {boolean} [boolHasHeader=true] Treat the first record as headers.
 *   When false, headers are generated as "column1", "column2", ...
 * @property {boolean} [boolInferTypes=true] Detect numeric columns. When
 *   false, every column is a "category" column.
 */

/** @type {Required<ParseOptions>} */
const objDefaultOptions = Object.freeze({
  strDelimiter: ",",
  boolHasHeader: true,
  boolInferTypes: true,
});

const regexNumber = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;

/**
 * Builds the failure shape of a ParseResult.
 *
 * @param {string[]} arrErrors Human-readable error messages.
 * @returns {ParseResult} A result with no columns and no rows.
 */
function buildFailure(arrErrors) {
  return { arrColumns: [], arrRows: [], arrErrors };
}

/**
 * Splits CSV text into records of raw string fields.
 *
 * @param {string} strText CSV text with any BOM already removed.
 * @param {string} strDelimiter Single-character delimiter.
 * @returns {{arrRecords: string[][], boolUnterminated: boolean}} Records, and
 *   whether a quoted field was never closed.
 */
function splitRecords(strText, strDelimiter) {
  /** @type {string[][]} */
  const arrRecords = [];
  /** @type {string[]} */
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

  if (strField !== "" || arrFields.length > 0) {
    arrFields.push(strField);
    arrRecords.push(arrFields);
  }

  return { arrRecords, boolUnterminated: boolInQuotes };
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
 * @returns {{arrHeaders: string[], arrErrors: string[]}} Header names and any
 *   blank or duplicate header errors.
 */
function buildHeaders(arrFirstRecord, boolHasHeader) {
  if (!boolHasHeader) {
    const arrGenerated = arrFirstRecord.map(
      (_strCell, numIndex) => `column${numIndex + 1}`,
    );
    return { arrHeaders: arrGenerated, arrErrors: [] };
  }

  const arrHeaders = arrFirstRecord.map((strCell) => strCell.trim());
  /** @type {string[]} */
  const arrErrors = [];
  /** @type {Set<string>} */
  const setSeen = new Set();

  arrHeaders.forEach((strHeader, numIndex) => {
    if (strHeader === "") {
      arrErrors.push(`row 1: column ${numIndex + 1} has a blank name`);
    } else if (setSeen.has(strHeader)) {
      arrErrors.push(`row 1: duplicate column name "${strHeader}"`);
    }
    setSeen.add(strHeader);
  });

  return { arrHeaders, arrErrors };
}

/**
 * Parses CSV text into columns, keyed rows, and a list of errors, ready for
 * the layout module.
 *
 * @param {string} strCsv Raw CSV text.
 * @param {ParseOptions} [objOptions] Parsing options.
 * @returns {ParseResult} The parse result. Check `arrErrors` before use.
 * @example
 * const objParse = parseCsv("name,score\nAda,10\nLin,12");
 * // objParse.arrColumns -> [
 * //   { strField: "name", strType: "category" },
 * //   { strField: "score", strType: "number" },
 * // ]
 * // objParse.arrRows -> [{ name: "Ada", score: 10 }, { name: "Lin", score: 12 }]
 * // objParse.arrErrors -> []
 */
export function parseCsv(strCsv, objOptions = {}) {
  if (typeof strCsv !== "string") {
    return buildFailure(["input must be a string"]);
  }

  const { strDelimiter, boolHasHeader, boolInferTypes } = {
    ...objDefaultOptions,
    ...objOptions,
  };
  if (strDelimiter.length !== 1 || /["\r\n]/.test(strDelimiter)) {
    return buildFailure([
      "strDelimiter must be a single character other than a quote or newline",
    ]);
  }

  const strText = strCsv.replace(/^\uFEFF/, "");
  const objSplit = splitRecords(strText, strDelimiter);
  if (objSplit.boolUnterminated) {
    return buildFailure(["unterminated quoted field"]);
  }

  const arrRecords = objSplit.arrRecords.filter(
    (arrRecord) => !isBlankRecord(arrRecord),
  );
  if (arrRecords.length === 0) {
    return { arrColumns: [], arrRows: [], arrErrors: [] };
  }

  const objHeaders = buildHeaders(arrRecords[0], boolHasHeader);
  const { arrHeaders } = objHeaders;
  const arrErrors = [...objHeaders.arrErrors];
  const arrDataRecords = boolHasHeader ? arrRecords.slice(1) : arrRecords;
  const numFirstRow = boolHasHeader ? 2 : 1;

  arrDataRecords.forEach((arrRecord, numIndex) => {
    if (arrRecord.length !== arrHeaders.length) {
      arrErrors.push(
        `row ${numIndex + numFirstRow}: expected ${arrHeaders.length} fields, found ${arrRecord.length}`,
      );
    }
  });
  if (arrErrors.length > 0) {
    return buildFailure(arrErrors);
  }

  /** @type {Column[]} */
  const arrColumns = arrHeaders.map((strField, numColumn) => {
    const boolIsNumber =
      boolInferTypes &&
      arrDataRecords.length > 0 &&
      arrDataRecords.every((arrRecord) =>
        regexNumber.test(arrRecord[numColumn].trim()),
      );
    return {
      strField,
      strType: boolIsNumber ? COLUMN_TYPES.NUMBER : COLUMN_TYPES.CATEGORY,
    };
  });

  const arrRows = arrDataRecords.map((arrRecord) => {
    /** @type {Object<string, string | number>} */
    const objRow = {};
    arrColumns.forEach((objColumn, numColumn) => {
      const strValue = arrRecord[numColumn].trim();
      objRow[objColumn.strField] =
        objColumn.strType === COLUMN_TYPES.NUMBER ? Number(strValue) : strValue;
    });
    return objRow;
  });

  return { arrColumns, arrRows, arrErrors: [] };
}
