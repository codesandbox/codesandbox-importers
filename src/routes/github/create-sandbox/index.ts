import { generate as generateShortid } from 'shortid';

import { fetchCode } from '../api';
import mapDependencies from './dependency-mapper';

/**
 * Downloads all files of this directory and its subdirectories
 *
 * @param {NormalizedDirectory} directory
 * @returns {Promise<NormalizedDirectory>}
 */
async function downloadFiles(
  directory: NormalizedDirectory,
): Promise<NormalizedDownloadedDirectory> {
  const downloadedFiles = await Promise.all(
    directory.files.map(async (file): Promise<DownloadedFile> => {
      const code = await fetchCode(file);
      return {
        ...file,
        code,
      };
    }),
  );

  const downloadedDirectories = await Promise.all(
    directory.directories.map(async dir => {
      return await downloadFiles(dir);
    }),
  );

  return {
    ...directory,
    files: downloadedFiles,
    directories: downloadedDirectories,
  };
}

function flattenDirectories(
  directory: NormalizedDownloadedDirectory,
): NormalizedDownloadedDirectory[] {
  return directory.directories.reduce(
    (
      directories: NormalizedDownloadedDirectory[],
      directory: NormalizedDownloadedDirectory,
    ) => {
      return [...directories, directory, ...flattenDirectories(directory)];
    },
    [],
  );
}

/**
 * Converts a downloaded file to a SandboxFile
 */
function createFile(
  file: DownloadedFile,
  directoryShortid?: string,
): SandboxFile {
  const shortid = generateShortid();
  return {
    title: file.name,
    code: file.code,
    directoryShortid,
    shortid,
  };
}

/**
 * Map directory and its children to a format that the CodeSanbox API can understand
 *
 * @param {NormalizedDownloadedDirectory} directory
 * @returns {SandboxDirectory}
 */
function mapDirectoryToSandboxStructure(
  directory: NormalizedDownloadedDirectory,
  directoryShortid?: string,
): {
  files: SandboxFile[];
  directories: SandboxDirectory[];
} {
  return directory.directories.reduce(
    (
      result: {
        files: SandboxFile[];
        directories: SandboxDirectory[];
      },
      directory: NormalizedDownloadedDirectory,
    ) => {
      const shortid = generateShortid();
      const children = mapDirectoryToSandboxStructure(directory, shortid);
      return {
        files: [
          ...result.files,
          ...children.files,
          ...directory.files.map(f => createFile(f, shortid)),
        ],
        directories: [
          ...result.directories,
          ...children.directories,
          {
            title: directory.name,
            shortid,
            directoryShortid,
          },
        ],
      };
    },
    { files: [], directories: [] },
  );
}

/**
 * Download package.json and format dependencies
 */
async function getDependencies(packageJSON: { dependencies: Dependencies }) {
  const { dependencies } = packageJSON;

  if (!dependencies)
    throw new Error('There are no dependencies in package.json');

  // Exclude some dependencies that are not needed in CodeSandbox
  const alteredDependencies = await mapDependencies(dependencies);
  return alteredDependencies;
}

/**
 * Creates all relevant data for create a sandbox, like dependencies and which
 * files are in a sandbox
 *
 * @export SandboxObject
 * @param {Array<Module>} files
 * @param {Array<Module>} directories
 */
export default async function createSandbox(
  files: Array<Module>,
  directories: Array<NormalizedDirectory>,
) {
  const packageJson = files.find(m => m.name === 'package.json');
  const srcFolder = directories.find(m => m.name === 'src');

  if (!packageJson) throw new Error('Could not find package.json');
  if (!srcFolder) throw new Error('Could not find src directory');

  const downloadedSrcFilter = await downloadFiles(srcFolder);

  const packageJsonCode = await fetchCode(packageJson);
  const packageJsonPackage = JSON.parse(packageJsonCode);

  const dependencies = await getDependencies(packageJsonPackage);
  const modules = mapDirectoryToSandboxStructure(downloadedSrcFilter);
  const sourceFiles = downloadedSrcFilter.files.map(f => createFile(f));

  return {
    title: packageJsonPackage.title,
    // TODO make this better
    modules: [...modules.files, ...sourceFiles],
    directories: modules.directories,
    npmDependencies: dependencies,
  };
}
