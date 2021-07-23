import { IModule, IDirectory } from "codesandbox-import-util-types";
import { ITree } from "../index";

import { createHash } from "crypto";

function getGitSha(content: string) {
  const hash = createHash("sha1");

  hash.update("blob " + new Buffer(content).length + "\0" + content);

  return hash.digest("hex");
}

interface INormalizedAndDeletedModules {
  [path: string]: IModule | IDirectory | null;
}

export default function getDelta(
  tree: ITree,
  modules: INormalizedAndDeletedModules
) {
  const added: string[] = [];
  const modified: string[] = [];
  const deleted: string[] = [];

  tree.forEach((file) => {
    const equivalentModule = modules[file.path];

    if (!equivalentModule) {
      deleted.push(file.path);
    } else {
      if (equivalentModule.type === "directory" || equivalentModule.isBinary) {
        return;
      }

      if (getGitSha(equivalentModule.content) !== file.sha) {
        modified.push(file.path);
      }
    }
  });

  Object.keys(modules).forEach((path) => {
    if (!tree.find((t) => t.path === path)) {
      added.push(path);
    }
  });

  return { added, modified, deleted };
}
