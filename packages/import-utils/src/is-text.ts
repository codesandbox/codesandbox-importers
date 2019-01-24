const _isText = require("istextorbinary").isText;

const jsRegex = /(t|j)sx?$/i;

const FILE_LOADER_REGEX = /\.(ico|jpg|png|gif|eot|otf|webp|ttf|woff|woff2|mp4|webm)(\?.*)?$/i;
export const MAX_FILE_SIZE = 512 * 1024;

export const isText = (filename: string, buffer: Buffer) => {
  if (jsRegex.test(filename)) {
    return true;
  }

  return new Promise((resolve, reject) => {
    _isText(filename, buffer, (err: Error, result: boolean) => {
      if (err) {
        return reject(err);
      }

      resolve(result && !FILE_LOADER_REGEX.test(filename) && !isTooBig(buffer));
    });
  });
};

export const isTooBig = (buffer: Buffer) => {
  return buffer.length > MAX_FILE_SIZE;
};
