# Fixtures

Mock data and expected outputs. Data is static and immutable: no uploads, no editing in the browser.

Each fixture is a pair:

- `name.csv` is the input.
- `name.expected.json` is the `ParseResult` the parser must produce for it (shape in `src/contracts.js`).

## CSV rules

- First row is the header. Column names are plain words, no spaces.
- A column is `number` only if every value in it parses as a number. Anything else is `category`.
- Numbers are bare: no units, no thousands separators, no `$`.
- No empty cells. Drop the row instead.
- One chart per file. Files need not be related to each other.
- Rows meant for a line chart are sorted by the x column within each series. Layout does not sort.
- Column names mean nothing to the library. The chart spec maps slots to columns, for example `{x: "day", y: "bugs", series: "agent"}`. The same CSV can feed a line chart or a scatter plot.

## Current fixtures

| file                 | columns            | what it is                                 |
| -------------------- | ------------------ | ------------------------------------------ |
| `agents-vs-bugs.csv` | `agent, day, bugs` | bugs found per day by each of three agents |
