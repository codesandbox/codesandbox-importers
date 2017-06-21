import { generate as generateShortid } from 'shortid';

import { fetchCode } from '../api';
import mapDependencies from './dependency-mapper';
import parseHTML from './html-parser';

async function downloadFile(file: Module): Promise<DownloadedFile> {
  const code = await fetchCode(file);
  return {
    ...file,
    code,
  };
}

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
      return await downloadFile(file);
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
 * Gets the index HTML from all directories, this is a separate step since we need
 * to move the index.html to the source folder. This needs to be changed in the future
 * when CodeSandbox supports templates.
 *
 * @param directories All directories of the app
 */
async function getIndexHTML(
  directories: Array<NormalizedDirectory>,
): Promise<SandboxFile | undefined> {
  const publicFolder = directories.find(m => m.name === 'public');
  if (!publicFolder) return;

  const indexHtml = publicFolder.files.find(m => m.name === 'index.html');
  if (!indexHtml) return;

  const downloadedIndexHtml = await downloadFile(indexHtml);
  const sandboxIndex = await createFile(downloadedIndexHtml, undefined);
  return sandboxIndex;
}

function getHTMLInfo(html: SandboxFile | undefined) {
  if (!html) {
    return { externalResources: [], file: null };
  }

  const { body, externalResources } = parseHTML(html.code);

  if (body) {
    html.code = body;
  }

  return { externalResources, file: html };
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
  if (!srcFolder.files.find(file => file.name === 'index.js'))
    throw new Error('The src folder should have an index.js');

  const downloadedSrcFiles = await downloadFiles(srcFolder);

  const packageJsonCode = await fetchCode(packageJson);
  const packageJsonPackage = JSON.parse(packageJsonCode);

  // Fetch index html seperately, we need to extract external resources and
  // the body from it
  const indexHTML = await getIndexHTML(directories);
  const htmlInfo = getHTMLInfo(indexHTML);

  const dependencies = await getDependencies(packageJsonPackage);
  const modules = mapDirectoryToSandboxStructure(downloadedSrcFiles);
  const sourceFiles = downloadedSrcFiles.files.map(f => createFile(f));

  return {
    title: packageJsonPackage.title,
    // TODO make this better
    modules: [...modules.files, ...sourceFiles, htmlInfo.file].filter(x => x),
    directories: modules.directories,
    npmDependencies: dependencies,
    externalResources: htmlInfo.externalResources,
  };
}
