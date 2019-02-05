import fetch from "node-fetch";
import {
  INormalizedModules,
  IModule
} from "codesandbox-import-utils/lib/utils/files/normalize";

import { IGitInfo, ITree } from "../index";
import { createBlob } from "../../api";

async function downloadContent(module: IModule): Promise<string> {
  if (!module.isBinary) {
    return module.content;
  }

  return fetch(module.content)
    .then(x => x.buffer())
    .then(buffer => buffer.toString("base64"));
}

export async function createBlobs(
  files: string[],
  sandboxFiles: INormalizedModules,
  gitInfo: IGitInfo,
  token: string
): Promise<ITree> {
  return Promise.all(
    files.map(async path => {
      const file = sandboxFiles[path];
      const content = await downloadContent(file);

      const result = await createBlob(
        gitInfo.username,
        gitInfo.repo,
        content,
        file.isBinary ? "base64" : "utf-8",
        token
      );

      return {
        path,
        sha: result.sha,
        size: file.content.length,
        mode: "100644", // blob
        type: "blob",
        url: result.url
      };
    })
  );
}
