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
      return {
        ...file,
        code: await fetchCode(file),
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
  return [
    directory,
    ...directory.directories.reduce(
      (directories: NormalizedDownloadedDirectory[], directory) => [
        ...directories,
        ...flattenDirectories(directory),
      ],
      [],
    ),
  ];
}

/**
 * Map directory and its children to a format that the CodeSanbox API can understand
 *
 * @param {NormalizedDownloadedDirectory} directory
 * @returns {SandboxDirectory}
 */
function mapModulesToSandboxStructure(
  directory: NormalizedDownloadedDirectory,
): {
  files: Array<SandboxFile>;
  directories: Array<SandboxDirectory>;
} {
  const shortid = generateShortid();
  const flattenedDirectories = flattenDirectories(directory);

  const sandboxDirectories = flattenedDirectories.map(directory => {
    const shortid = generateShortid();
    return {
      directory: {
        title: directory.name,
        shortid,
      },
      files: directory.files.map(file => ({
        title: file.name,
        code: file.code,
        directoryShortid: shortid,
      })),
    };
  });

  return sandboxDirectories.reduce(
    (
      normalizedModules: {
        files: SandboxFile[];
        directories: SandboxDirectory[];
      },
      directory: { directory: SandboxDirectory; files: SandboxFile[] },
    ) => ({
      directories: [...normalizedModules.directories, directory.directory],
      files: [...normalizedModules.files, ...directory.files],
    }),
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

  const downloadedSrc = await downloadFiles(srcFolder);

  const packageJsonCode = await fetchCode(packageJson);
  const packageJsonPackage = JSON.parse(packageJsonCode);

  const dependencies = await getDependencies(packageJsonPackage);

  const modules = mapModulesToSandboxStructure(downloadedSrc);

  return {
    title: packageJsonPackage.title,
    modules: modules.files,
    directories: modules.directories,
    npmDependencies: dependencies,
  };
}
