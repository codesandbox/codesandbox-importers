import { IModule, INormalizedModules } from "codesandbox-import-util-types";
import fetch from "node-fetch";

import { createBlob } from "../../api";
import { IGitInfo, ITree } from "../index";

async function downloadContent(module: IModule): Promise<string> {
  if (!module.isBinary) {
    return module.content;
  }

  return fetch(module.content)
    .then((x) => x.buffer())
    .then((buffer) => buffer.toString("base64"));
}

export async function createBlobs(
  files: Array<{ path: string; content: string; encoding: "base64" | "utf-8" }>,
  gitInfo: IGitInfo,
  token: string
): Promise<ITree> {
  return Promise.all(
    files.map(async ({ path, content, encoding }) => {
      const result = await createBlob(
        gitInfo.username,
        gitInfo.repo,
        content,
        encoding,
        token
      );

      return {
        path,
        sha: result.sha,
        size: content.length,
        mode: "100644", // blob
        type: "blob",
        url: result.url,
      };
    })
  );
}
