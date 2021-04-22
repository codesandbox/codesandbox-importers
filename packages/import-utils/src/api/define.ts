import { ITemplate } from "codesandbox-import-util-types";
import * as LZString from "lz-string";

export interface IFiles {
  [key: string]: {
    content: string;
    isBinary: boolean;
  };
}

function compress(input: string) {
  return LZString.compressToBase64(input)
    .replace(/\+/g, `-`) // Convert '+' to '-'
    .replace(/\//g, `_`) // Convert '/' to '_'
    .replace(/=+$/, ``); // Remove ending '='
}

export function getParameters(parameters: {
  files: IFiles;
  template?: ITemplate;
}) {
  return compress(JSON.stringify(parameters));
}
