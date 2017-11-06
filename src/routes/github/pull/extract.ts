import { basename, join } from 'path';

import * as api from '../api';
import log from '../../../utils/log';

import { INormalizedModules } from '../../../utils/sandbox/normalize';

export interface IGitHubFiles {
  [path: string]: Module;
}

/**
 * Converts a directory to a normalized directory, this means that it will download
 * it's children (directories and files), for every child directory it will download
 * the files/directories too
 *
 * @param {string} username
 * @param {string} repo
 * @param {string} branch
 * @param {Module} directory
 * @returns {Promise<INormalizedModules>}
 */
export async function extractDirectory(
  username: string,
  repo: string,
  branch: string,
  directoryPath: string,
  requests: number = 0
): Promise<IGitHubFiles> {
  if (requests > 40) {
    throw new Error(
      'This project is too big, it has more than 40 directories.'
    );
  }

  const result: IGitHubFiles = {};

  log(`Unpacking ${directoryPath}`);

  const contents = (await api.fetchContents(
    username,
    repo,
    branch,
    directoryPath
  )) as Array<Module>;

  const files = contents.filter(m => m.type === 'file').forEach(f => {
    result[f.path] = f;
  });
  const directories = contents.filter(d => d.type === 'dir');
  const normalizedDirectories = await Promise.all(
    directories.map(async dir => {
      const res = await extractDirectory(
        username,
        repo,
        branch,
        dir.path,
        requests + directories.length
      );

      Object.keys(res).forEach(p => {
        result[p] = res[p];
      });
    })
  );

  return result;
}

/**
 * Verify that the contents of the path have a correct (strict) structure,
 * we follow the structure of create-react-app
 *
 * @param {Array<Module>} modules
 */
function verifyFiles(modules: Array<Module>) {
  if (!modules.some(m => m.type === 'file' && m.name === 'package.json')) {
    throw new Error("The path doesn't contain a package.json");
  }
}

function countFiles(directory: {
  files: Array<Module>;
  directories: Array<NormalizedDirectory>;
}): number {
  return (
    directory.files.length +
    directory.directories.reduce((count, dir) => {
      return count + countFiles(dir);
    }, 0)
  );
}

const MAX_FILE_COUNT = 90;
function verifyFileCount(directory: NormalizedDirectory) {
  const fileCount = countFiles(directory);

  if (fileCount > MAX_FILE_COUNT) {
    throw new Error(
      `This repository more than ${MAX_FILE_COUNT} files, it's too big.`
    );
  }
}

/**
 * Extract the git repository to a list of files and directories with contents.
 * The sourceFolder is used to define which directory to use as source root
 */
export default async function extract(
  username: string,
  repository: string,
  branch: string,
  path: string = '',
  sourceFolder?: string
): Promise<IGitHubFiles> {
  const absoluteFiles = await extractDirectory(
    username,
    repository,
    branch,
    path
  );

  // Rewrite path to make it relative
  const relativeFiles = Object.keys(absoluteFiles).reduce(
    (total, next) => ({
      ...total,
      [next.replace(path, '')]: absoluteFiles[next],
    }),
    {}
  );

  // if (sourceFolder) {
  //   const absolutePath = join(path, sourceFolder);

  //   const srcDir = directory.directories.find(d => d.path === sourceFolder);

  //   if (!srcDir) {
  //     throw new Error('Cannot find directory ' + sourceFolder);
  //   }

  //   srcDir.name = '';
  //   srcDir.path = '';

  //   return srcDir;
  // }

  return relativeFiles;
}
