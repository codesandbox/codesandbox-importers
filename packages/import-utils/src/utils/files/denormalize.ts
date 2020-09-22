import { dirname, basename } from "path";
import {
  INormalizedModules,
  IModule,
  ISandboxFile,
  ISandboxDirectory,
  IBinaryModule,
} from "codesandbox-import-util-types";

import { generate as generateShortid } from "shortid";
import { getDirectoryPaths } from "../../create-sandbox/utils/resolve";

function generateSandboxFile(
  module: IModule | IBinaryModule,
  path: string,
  parentDirectoryShortid?: string
): ISandboxFile {
  const sandboxFile: ISandboxFile = {
    shortid: generateShortid(),
    code: module.content,
    directoryShortid: parentDirectoryShortid,
    title: basename(path),
    uploadId: module.uploadId,
    isBinary: module.isBinary,
    sha: module.sha,
  };

  if ("binaryContent" in module) {
    sandboxFile.binaryContent = module.binaryContent;
  }

  return sandboxFile;
}

function createDirectoryRecursively(
  path: string,
  directories: { [path: string]: ISandboxDirectory }
) {
  if (directories[path]) {
    return directories[path];
  }

  const parentDir = dirname(path);

  // This means root, so create it
  if (parentDir === ".") {
    directories[path] = generateSandboxDirectory(path, undefined);
    return;
  }

  if (!directories[parentDir]) {
    createDirectoryRecursively(parentDir, directories);
  }

  directories[path] = generateSandboxDirectory(
    basename(path),
    directories[parentDir].shortid
  );
}

function generateSandboxDirectory(
  title: string,
  parentDirectoryShortid?: string
): ISandboxDirectory {
  return {
    shortid: generateShortid(),
    directoryShortid: parentDirectoryShortid,
    title,
  };
}

export default function denormalize(
  paramFiles: INormalizedModules,
  existingDirs: ISandboxDirectory[] = []
) {
  const existingDirPathsParams = getDirectoryPaths(existingDirs);

  // Remove all leading slashes
  let existingDirPaths: {
    [p: string]: ISandboxDirectory;
  } = {};
  Object.keys(existingDirPathsParams).forEach((path) => {
    existingDirPaths[path.replace(/^\//, "")] = existingDirPathsParams[path];
  });

  let files: INormalizedModules = {};
  Object.keys(paramFiles).forEach((path) => {
    files[path.replace(/^\//, "")] = paramFiles[path];
  });

  const directories: Set<string> = new Set();
  Object.keys(files).forEach((path) => {
    const dir = dirname(path);
    if (dir !== "." && !existingDirPaths["/" + dir]) {
      directories.add(dirname(path));
    }

    const file = files[path];
    if (file.type === "directory") {
      directories.add(path);
    }
  });

  const sandboxDirectories: {
    [path: string]: ISandboxDirectory;
  } = { ...existingDirPaths };
  Array.from(directories).forEach((dirPath) => {
    createDirectoryRecursively(dirPath, sandboxDirectories);
  });

  const sandboxModules: ISandboxFile[] = Object.keys(files)
    .map((path) => {
      const dir = sandboxDirectories[dirname(path)];
      const parentShortid = dir ? dir.shortid : undefined;

      const fileOrDirectory = files[path];

      if (fileOrDirectory.type === "directory") {
        return;
      } else {
        return generateSandboxFile(fileOrDirectory, path, parentShortid);
      }
    })
    .filter((x): x is ISandboxFile => x !== undefined);

  const dirs: unknown = Object.keys(sandboxDirectories)
    .map((s) => !existingDirPaths[s] && sandboxDirectories[s])
    .filter(Boolean);

  return {
    modules: sandboxModules,
    directories: dirs as ISandboxDirectory[],
  };
}
