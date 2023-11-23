import { isText as _isText } from "istextorbinary";

const jsRegex = /(t|j)sx?$/i;

const FILE_LOADER_REGEX =
  /\.(ico|jpg|png|gif|eot|otf|webp|ttf|woff|woff2|mp4|webm)(\?.*)?$/i;
export const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3 MB

export const isText = (filename: string, buffer: Buffer) => {
  if (jsRegex.test(filename)) {
    return true;
  }

  // We don't support null bytes in the database with postgres,
  // so we need to mark it as binary if there are null bytes
  const hasNullByte = buffer.toString().includes("\0");
  return (
    _isText(filename, buffer) &&
    !FILE_LOADER_REGEX.test(filename) &&
    !isTooBig(buffer) &&
    !hasNullByte
  );
};

export const isTooBig = (buffer: Buffer) => {
  return buffer.length > MAX_FILE_SIZE;
};
