import { IGitHubFiles } from './extract';
import { IModule, INormalizedModules } from '../../../utils/sandbox/normalize';

import { fetchCode } from '../api';

const FILE_LOADER_REGEX = /\.(ico|jpg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm)(\?.*)?$/;
const MAX_FILE_SIZE = 100000;

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

async function downloadFile(file: Module): Promise<IModule> {
  // Check if this is a file_loader case, return url if this is the case
  const isBinary =
    FILE_LOADER_REGEX.test(file.name) || file.size > MAX_FILE_SIZE;
  const content = isBinary
    ? rawGitUrl(file.download_url)
    : await fetchCode(file);
  return {
    content,
    isBinary,
  };
}

/**
* Downloads all files of this directory and its subdirectories
*
* @param {NormalizedDirectory} directory
* @returns {Promise<NormalizedDirectory>}
*/
async function downloadFiles(
  directory: IGitHubFiles
): Promise<INormalizedModules> {
  const downloadedFiles = await Promise.all(
    Object.keys(directory).map(async path => {
      const data = await downloadFile(directory[path]);

      return { path, data };
    })
  );

  return downloadedFiles.reduce(
    (total, file) => ({ ...total, [file.path]: file.data }),
    {}
  );
}

export async function downloadExtractedFiles(
  files: IGitHubFiles
): Promise<INormalizedModules> {
  const packageJSON = files['package.json'];

  if (packageJSON == null) {
    throw new Error('Could not find package.json in specified directory');
  }

  if (Object.keys(files).length > 90) {
    throw new Error(
      `There are ${files.length} files in this repository, we have a max of 90. Contact us if you want more.`
    );
  }

  const normalizedFiles = await downloadFiles(files);

  return normalizedFiles;
}
