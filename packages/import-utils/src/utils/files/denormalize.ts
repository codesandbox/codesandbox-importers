import { dirname, basename } from "path";
import {
  INormalizedModules,
  IModule,
  ISandboxFile,
  ISandboxDirectory
} from "codesandbox-import-util-types";

import { generate as generateShortid } from "shortid";
import { getDirectoryPaths } from "../../create-sandbox/utils/resolve";

function generateSandboxFile(
  module: IModule,
  path: string,
  parentDirectoryShortid?: string
): ISandboxFile {
  return {
    shortid: generateShortid(),
    code: module.content,
    directoryShortid: parentDirectoryShortid,
    title: basename(path),
    isBinary: module.isBinary
  };
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
    title
  };
}

export type NormalizedModulesAndDirectories =
  | INormalizedModules
  | {
      [path: string]: { isDirectory: boolean };
    };

export default function denormalize(
  paramFiles: NormalizedModulesAndDirectories,
  existingDirs: ISandboxDirectory[] = []
) {
  const existingDirPathsParams = getDirectoryPaths(existingDirs);

  // Remove all leading slashes
  let existingDirPaths: {
    [p: string]: ISandboxDirectory;
  } = {};
  Object.keys(existingDirPathsParams).forEach(path => {
    existingDirPaths[path.replace(/^\//, "")] = existingDirPathsParams[path];
  });

  let files: NormalizedModulesAndDirectories = {};
  Object.keys(paramFiles).forEach(path => {
    files[path.replace(/^\//, "")] = paramFiles[path];
  });

  const directories: Set<string> = new Set();
  Object.keys(files).forEach(path => {
    const dir = dirname(path);
    if (dir !== "." && !existingDirPaths["/" + dir]) {
      directories.add(dirname(path));
    }

    const file = files[path];
    if ("isDirectory" in file && file.isDirectory) {
      directories.add(path);
    }
  });

  const sandboxDirectories: {
    [path: string]: ISandboxDirectory;
  } = { ...existingDirPaths };
  Array.from(directories).forEach(dirPath => {
    createDirectoryRecursively(dirPath, sandboxDirectories);
  });

  const sandboxModules: ISandboxFile[] = Object.keys(files)
    .map(path => {
      const dir = sandboxDirectories[dirname(path)];
      const parentShortid = dir ? dir.shortid : undefined;

      const fileOrDirectory = files[path];

      if ("isDirectory" in fileOrDirectory) {
        return;
      } else {
        return generateSandboxFile(fileOrDirectory, path, parentShortid);
      }
    })
    .filter((x): x is ISandboxFile => x !== undefined);

  const dirs: unknown = Object.keys(sandboxDirectories)
    .map(s => !existingDirPaths[s] && sandboxDirectories[s])
    .filter(Boolean);

  return {
    modules: sandboxModules,
    directories: dirs as ISandboxDirectory[]
  };
}
