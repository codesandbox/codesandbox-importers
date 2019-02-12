import fetch from "node-fetch";
import { INormalizedModules, IModule } from "codesandbox-import-util-types";

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
    files
      .map(path => ({ path, file: sandboxFiles[path] }))
      .filter(({ path, file }) => file.type !== "directory") // Filter directories
      .map(async ({ path, file }) => {
        // We handled type in filter
        const module = (file as unknown) as IModule;
        const content = await downloadContent(module);

        const result = await createBlob(
          gitInfo.username,
          gitInfo.repo,
          content,
          module.isBinary ? "base64" : "utf-8",
          token
        );

        return {
          path,
          sha: result.sha,
          size: module.content.length,
          mode: "100644", // blob
          type: "blob",
          url: result.url
        };
      })
  );
}
