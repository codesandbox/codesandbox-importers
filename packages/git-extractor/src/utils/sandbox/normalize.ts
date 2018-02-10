import { join } from 'path';

import { ISandboxFile, ISandboxDirectory } from 'types';

export interface IModule {
  content: string;
  isBinary: boolean;
}

export interface INormalizedModules {
  [path: string]: IModule;
}

function findSandboxFiles(
  modules: ISandboxFile[],
  directories: ISandboxDirectory[],
  currentDir: string | null,
  path: string = ''
): INormalizedModules {
  let result: INormalizedModules = {};

  const modulesInDirectory = modules.filter(
    m => m.directoryShortid === currentDir
  );

  modulesInDirectory.forEach(m => {
    const newPath = join(path, m.title);

    result[newPath] = { content: m.code || '', isBinary: m.isBinary };
  });

  const childrenFiles = directories
    .filter(d => d.directoryShortid === currentDir)
    .forEach(dir => {
      const newPath = join(path, dir.title);
      const dirResult = findSandboxFiles(
        modules,
        directories,
        dir.shortid,
        newPath
      );

      result = { ...result, ...dirResult };
    });

  return result;
}

export default function normalizeSandboxFiles(
  modules: ISandboxFile[],
  directories: ISandboxDirectory[]
): INormalizedModules {
  return findSandboxFiles(modules, directories, null);
}
