import * as api from './api';
import log from '../../utils/log';

/**
 * Converts a directory to a normalized directory, this means that it will download
 * it's children (directories and files), for every child directory it will download
 * the files/directories too
 *
 * @param {string} username
 * @param {string} repo
 * @param {string} branch
 * @param {Module} directory
 * @returns {Promise<NormalizedDirectory>}
 */
async function extractDirectory(
  username: string,
  repo: string,
  branch: string,
  directory: Module,
  requests: number = 0
): Promise<NormalizedDirectory> {
  if (requests > 40) {
    throw new Error(
      'This project is too big, it has more than 40 directories.'
    );
  }

  log(`Unpacking ${directory.path}`);

  const contents = await api.fetchContents(
    username,
    repo,
    branch,
    directory.path
  );

  const files = contents.filter(m => m.type === 'file');
  const directories = contents.filter(m => m.type === 'dir');
  const normalizedDirectories = await Promise.all(
    directories.map(async dir => {
      return await extractDirectory(
        username,
        repo,
        branch,
        dir,
        requests + directories.length
      );
    })
  );

  return {
    ...directory,
    files,
    directories: normalizedDirectories,
  };
}

/**
 * Verify that the contents of the path have a correct (strict) structure,
 * we follow the structure of create-react-app
 *
 * @param {Array<Module>} modules
 */
function verifyFiles(modules: Array<Module>) {
  if (!modules.some(m => m.name === 'package.json')) {
    throw new Error("The path doesn't contain a package.json");
  }

  if (!modules.some(m => m.name === 'src')) {
    throw new Error('The project should include a src folder');
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

export default async function extract(
  username: string,
  repository: string,
  branch: string,
  path: string
) {
  const rootContent = await api.fetchContents(
    username,
    repository,
    branch,
    path
  );
  verifyFiles(rootContent);

  const files = rootContent.filter(m => m.type === 'file');
  // Directories in src
  const directories = await Promise.all(
    rootContent
      .filter(
        m =>
          m.type === 'dir' &&
          (m.name === 'src' || m.name === 'public' || m.name === 'static')
      )
      .map(async dir => {
        return await extractDirectory(username, repository, branch, dir);
      })
  );

  const contents = { files, directories };

  const sourceDir = contents.directories.find(m => m.name === 'src');
  if (!sourceDir) throw new Error('Should include a src directory');

  verifyFileCount(sourceDir);

  return contents;
}
