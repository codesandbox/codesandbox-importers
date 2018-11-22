import * as _debug from "debug";

if (process.env.NODE_ENV === "development") {
  _debug.enable("cs:*");
}
const debug = _debug("cs:git-extractor");

export default function log(message: string) {
  debug(message);
}
