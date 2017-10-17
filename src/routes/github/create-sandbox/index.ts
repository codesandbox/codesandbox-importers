import { generate as generateShortid } from 'shortid';
import { pickBy } from 'lodash';

import { fetchCode } from '../api';
import mapDependencies from './dependency-mapper';
import getDependencyRequiresFromFiles from './dependency-analyzer';
import parseHTML from './html-parser';

import { alterFilesForTemplate, getTemplate } from './templates';

const FILE_LOADER_REGEX = /\.(ico|jpg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm)(\?.*)?$/;
const MAX_FILE_SIZE = 64000;

/**
 * We use https://rawgit.com/ as urls, since they change the content-type corresponding
 * to the file. Github always uses text/plain
 * @param downloadLink link to transform
 */
const rawGitUrl = (downloadLink: string) =>
  downloadLink.replace(
    'https://raw.githubusercontent.com/',
    'https://rawgit.com/'
  );

async function downloadFile(file: Module): Promise<DownloadedFile> {
  // Check if this is a file_loader case, return url if this is the case
  const isBinary =
    FILE_LOADER_REGEX.test(file.name) || file.size > MAX_FILE_SIZE;
  const code = isBinary ? rawGitUrl(file.download_url) : await fetchCode(file);
  return {
    ...file,
    code,
    isBinary: isBinary,
  };
}

/**
 * Downloads all files of this directory and its subdirectories
 *
 * @param {NormalizedDirectory} directory
 * @returns {Promise<NormalizedDirectory>}
 */
async function downloadFiles(
  directory: NormalizedDirectory
): Promise<NormalizedDownloadedDirectory> {
  const downloadedFiles = await Promise.all(
    directory.files.map(async (file): Promise<DownloadedFile> => {
      return await downloadFile(file);
    })
  );

  const downloadedDirectories = await Promise.all(
    directory.directories.map(async dir => {
      return await downloadFiles(dir);
    })
  );

  return {
    ...directory,
    files: downloadedFiles,
    directories: downloadedDirectories,
  };
}

function flattenDirectories(
  directory: NormalizedDownloadedDirectory
): NormalizedDownloadedDirectory[] {
  return directory.directories.reduce(
    (
      directories: NormalizedDownloadedDirectory[],
      directory: NormalizedDownloadedDirectory
    ) => {
      return [...directories, directory, ...flattenDirectories(directory)];
    },
    []
  );
}

/**
 * Converts a downloaded file to a SandboxFile
 */
function createFile(
  file: DownloadedFile,
  directoryShortid?: string
): SandboxFile {
  const shortid = generateShortid();
  return {
    title: file.name,
    code: file.code,
    isBinary: file.isBinary,
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
  directoryShortid?: string
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
      directory: NormalizedDownloadedDirectory
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
    { files: [], directories: [] }
  );
}

/**
 * Get which dependencies are needed and map them to the latest version, needs
 * files to determine which devDependencies are used in the code.
 *
 * @param packageJSON PackageJSON containing all dependencies
 * @param files files with code about which dependencies are used
 */
async function getDependencies(
  packageJSON: {
    dependencies: { [key: string]: string };
    devDependencies: { [key: string]: string };
  },
  files: SandboxFile[]
) {
  const { dependencies = {}, devDependencies = {} } = packageJSON;

  const dependenciesInFiles = getDependencyRequiresFromFiles(files);

  // Filter the devDependencies that are actually used in files
  const depsToMatch = pickBy(devDependencies, (_, key) =>
    dependenciesInFiles.some(dep => dep.startsWith(key))
  ) as IDependencies;

  // Exclude some dependencies that are not needed in CodeSandbox
  const alteredDependencies = await mapDependencies({
    ...dependencies,
    ...depsToMatch,
  });
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
  modules: Module[]
): Promise<SandboxFile | undefined> {
  let publicFolder = directories.find(m => m.name === 'public');

  if (!publicFolder) {
    publicFolder = directories.find(m => m.name === 'static');
  }

  if (!publicFolder) return;

  const indexHtml =
    publicFolder.files.find(m => m.name === 'index.html') ||
    modules.find(m => m.name === 'index.html');
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
  directories: Array<NormalizedDirectory>
) {
  const packageJson = files.find(m => m.name === 'package.json');
  const srcFolder = directories.find(m => m.name === 'src');

  if (!packageJson) throw new Error('Could not find package.json');
  if (!srcFolder) throw new Error('Could not find src directory');
  if (
    !srcFolder.files.find(
      file => file.name === 'index.js' || file.name === 'main.js'
    )
  )
    throw new Error('The src folder should have an index.js');

  const downloadedSrcFiles = await downloadFiles(srcFolder);

  const packageJsonCode = await fetchCode(packageJson);
  const packageJsonPackage = JSON.parse(packageJsonCode);

  // Fetch index html seperately, we need to extract external resources and
  // the body from it
  const indexHTML = await getIndexHTML(directories, files);
  const htmlInfo = getHTMLInfo(indexHTML);

  const modules = mapDirectoryToSandboxStructure(downloadedSrcFiles);
  const sourceFiles = downloadedSrcFiles.files.map(f => createFile(f));

  const sandboxModules = [
    ...modules.files,
    ...sourceFiles,
    htmlInfo.file,
  ].filter(x => x) as SandboxFile[];

  // Give the sandboxModules to getDependencies to fetch which devDependencies
  // are used in the code
  const dependencies = await getDependencies(
    packageJsonPackage,
    sandboxModules
  );

  const template = getTemplate(packageJsonPackage, sandboxModules);
  const templateFiles = alterFilesForTemplate(template, sandboxModules);

  console.log('Creating sandbox with template ' + template);

  return {
    title: packageJsonPackage.title || packageJsonPackage.name,
    description: packageJsonPackage.description,
    tags: packageJsonPackage.keywords || [],
    modules: templateFiles,
    directories: modules.directories,
    npmDependencies: dependencies,
    externalResources: htmlInfo.externalResources,
    template,
  };
}
