import { dirname, basename } from 'path';
import { INormalizedModules, IModule } from './normalize';

import { generate as generateShortid } from 'shortid';

export interface ISandboxFile {
  title: string;
  code: string;
  shortid: string;
  isBinary: boolean;
  directoryShortid: string | undefined;
}

export interface ISandboxDirectory {
  shortid: string;
  title: string;
  directoryShortid: string | undefined;
}

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
    isBinary: module.isBinary,
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
  if (parentDir === '.') {
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

export default function denormalize(files: INormalizedModules) {
  const directories: Set<string> = new Set();

  Object.keys(files).forEach(path => {
    const dir = dirname(path);
    if (dir !== '.') {
      directories.add(dirname(path));
    }
  });

  const sandboxDirectories: { [path: string]: ISandboxDirectory } = {};
  Array.from(directories).forEach(dirPath => {
    createDirectoryRecursively(dirPath, sandboxDirectories);
  });

  const sandboxModules: ISandboxFile[] = Object.keys(files).map(path => {
    const dir = sandboxDirectories[dirname(path)];
    const parentShortid = dir ? dir.shortid : undefined;

    return generateSandboxFile(files[path], path, parentShortid);
  });

  return {
    modules: sandboxModules,
    directories: Object.keys(sandboxDirectories).map(
      s => sandboxDirectories[s]
    ),
  };
}
