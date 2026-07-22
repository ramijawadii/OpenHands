// fast-formula-parser (MIT) ships no type declarations. Minimal surface for the
// parts SpreadSheet uses — enough for the compiler, not a full binding.
declare module "fast-formula-parser" {
  interface CellRef {
    sheet?: string;
    row: number;
    col: number;
  }
  interface RangeRef {
    sheet?: string;
    from: { row: number; col: number };
    to: { row: number; col: number };
  }
  interface ParserConfig {
    onCell?: (ref: CellRef) => unknown;
    onRange?: (ref: RangeRef) => unknown[][];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }
  // The module's default export IS the constructor (module.exports =
  // FormulaParser), so it is imported as a default, not a named export.
  class FormulaParser {
    constructor(config?: ParserConfig);
    parse(
      formula: string,
      position: { row: number; col: number; sheet?: string },
    ): unknown;
  }
  export default FormulaParser;
}
