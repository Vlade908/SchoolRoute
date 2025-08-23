/**
 * @fileOverview Type definition for spreadsheet import configurations.
 */

export type ImportConfig = {
  fileName: string;
  primarySheet: string;
  headerRow: number;
  mapping: Record<string, string>;
};
