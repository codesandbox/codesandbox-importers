import * as fs from 'fs-extra';
import * as path from 'path';
import { generate as generateShortid } from 'shortid';

import FileError from './file-error';

export interface ISandboxDirectory {
  shortid: string;
  title: string;
  directory_shortid: string | undefined;
}

export interface ISandboxModule {
  shortid: string;
  title: string;
  code: string;
  directory_shortid: string | undefined;
}

/**
 * Creates an entity that's parseable for the CodeSandbox API
 * @param name dirName
 * @param parentShortid parent shortid of sandbox
 */
const createSandboxDirectory = (
  name: string,
  parentShortid?: string
): ISandboxDirectory => ({
  directory_shortid: parentShortid,
  shortid: generateShortid(),
  title: name,
});

/**
 * Creates a sandbox module that's parseable by the API
 * @param name name of module
 * @param code code in module
 * @param isBinary whether the module is binary (like an image)
 * @param parentShortid parent directory of the module (null if root)
 */
const createSandboxModule = (
  name: string,
  code: string,
  isBinary: boolean = false,
  parentShortid?: string
) => ({
  code,
  directory_shortid: parentShortid,
  is_binary: isBinary,
  shortid: generateShortid(),
  title: name,
});

const MAX_FILE_SIZE = 64000;
const FILE_LOADER_REGEX = /\.(ico|jpg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm)(\?.*)?$/;

/**
 * Read the specific file and return a sandbox module, can throw
 * errors based on current limitations of CodeSandbox
 *
 * @param {string} modulePath
 * @param {string} [parentShortid]
 * @returns {ISandboxModule}
 */
function readFileToSandboxModule(
  modulePath: string,
  parentShortid?: string
): ISandboxModule {
  const name = path.basename(modulePath);

  if (FILE_LOADER_REGEX.test(name)) {
    throw new FileError(
      `Static file hosting is not supported yet.`,
      modulePath,
      true
    );
  }

  const code = fs.readFileSync(modulePath, 'utf8');

  if (code.length > MAX_FILE_SIZE) {
    throw new FileError(
      `The file ${name} is too big to be added (${code.length} > ${MAX_FILE_SIZE}).`,
      modulePath,
      true
    );
  }

  return createSandboxModule(name, code, false, parentShortid);
}

interface ICategorizedPaths {
  files: string[];
  directories: string[];
}
/**
 * Will categorize paths to files or directories
 *
 * @param {any} paths
 * @return {{files: string[], directories: string[] }}
 */
function categorizePaths(paths: string[]): ICategorizedPaths {
  return paths.reduce(
    (result: ICategorizedPaths, childPath: string) => {
      if (fs.lstatSync(childPath).isDirectory()) {
        return { ...result, directories: [...result.directories, childPath] };
      }
      return { ...result, files: [...result.files, childPath] };
    },
    { files: [], directories: [] }
  );
}

export interface ISandboxResult {
  directories: ISandboxDirectory[];
  modules: ISandboxModule[];
  errors: FileError[];
}

async function mapDirectory(
  dirPath: string,
  parentShortid?: string
): Promise<ISandboxResult> {
  const dirName = path.basename(dirPath);
  const exists = await fs.pathExists(dirPath);
  if (!exists) {
    throw new Error(`Path '${dirPath}' does not exist.`);
  }

  const children = (await fs.readdir(dirPath)).map(name =>
    path.join(dirPath, name)
  );
  const { files, directories } = categorizePaths(children);
  // We don't stop deployment if there is an error, we save the errors and notify
  // the user of the files that errored
  const errors: FileError[] = [];

  // Convert all file paths in this dir to sandbox modules
  const sandboxModules = files
    .map(filePath => {
      try {
        return readFileToSandboxModule(filePath, parentShortid);
      } catch (e) {
        if (!e.path) {
          e.path = filePath;
        }

        errors.push(e);

        if (e.isBinary) {
          // Return a mock module for binary
          return createSandboxModule(
            path.basename(filePath),
            '',
            e.isBinary,
            parentShortid
          );
        }
      }
    })
    .filter(x => x) as ISandboxModule[];

  // Convert all directory paths to sandbox directories
  const sandboxDirectories = directories.map(childDirPath =>
    createSandboxDirectory(path.basename(childDirPath), parentShortid)
  );

  const result: ISandboxResult = {
    directories: sandboxDirectories,
    errors,
    modules: sandboxModules,
  };

  // Also fetch modules, errors, dirs from all children directories
  const childrenResults = await Promise.all(
    sandboxDirectories.map(sandboxDir => {
      return mapDirectory(
        path.join(dirPath, sandboxDir.title),
        sandboxDir.shortid
      );
    })
  );

  // And now merge the results of the children directories in the final result
  return childrenResults.reduce(
    (combinedResult: ISandboxResult, childResult: ISandboxResult) => ({
      directories: [...combinedResult.directories, ...childResult.directories],
      errors: [...combinedResult.errors, ...childResult.errors],
      modules: [...combinedResult.modules, ...childResult.modules],
    }),
    result
  );
}

/**
 * This will get all files and directories recursively from the file system and
 * will map these to sandbox module parameters.
 *
 * @export
 * @param {string} path
 * @param {string} htmlBody the body of index.html in `public` folder
 */
export default async function mapFiles(dirPath: string, htmlBody: string) {
  const result = await mapDirectory(dirPath);

  // We manually add index.html from the public folder right now, because we
  // only want to include this file
  result.modules = [
    ...result.modules,
    createSandboxModule('index.html', htmlBody),
  ];

  return result;
}
