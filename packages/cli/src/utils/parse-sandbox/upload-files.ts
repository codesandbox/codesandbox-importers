import { IUploads } from ".";
import { createUpload } from "../api";
import { INormalizedModules } from "codesandbox-import-util-types";

export default async function uploadFiles(uploads: IUploads) {
  const files: INormalizedModules = {};

  const uploadPaths = Object.keys(uploads);
  for (const uploadPath of uploadPaths) {
    const buffer = uploads[uploadPath];

    const res: { url: string } = await createUpload(uploadPath, buffer);

    files[uploadPath] = {
      content: res.url,
      isBinary: true,
    };
  }

  return files;
}
