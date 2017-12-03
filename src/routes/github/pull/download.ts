import * as JSZip from 'jszip';
import { IGitInfo } from '../push/index';
import { downloadZip } from '../api';
import { INormalizedModules } from '../../../utils/sandbox/normalize';

const getFolderName = (zip: JSZip) =>
  `${Object.keys(zip.files)[0].split('/')[0]}/`;

const FILE_LOADER_REGEX = /\.(ico|jpg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm)(\?.*)?$/i;
const MAX_FILE_SIZE = 200 * 1024;

/**
 * We use https://rawgit.com/ as urls, since they change the content-type corresponding
 * to the file. Github always uses text/plain
 */
const rawGitUrl = (gitInfo: IGitInfo, filePath: string, commitSha: string) => {
  let url = `https://rawgit.com/${gitInfo.username}/${
    gitInfo.repo
  }/${commitSha || gitInfo.branch}/`;
  if (gitInfo.path) {
    url += gitInfo.path + '/';
  }
  url += filePath;

  return url;
};

export async function downloadRepository(
  gitInfo: IGitInfo,
  commitSha: string
): Promise<INormalizedModules> {
  const zip = await downloadZip(gitInfo);
  let folderName = getFolderName(zip);

  if (gitInfo.path) {
    folderName += gitInfo.path + '/';
  }

  const result: INormalizedModules = {};

  await Promise.all(
    Object.keys(zip.files).map(async path => {
      if (path.startsWith(folderName)) {
        const relativePath = path.replace(folderName, '');

        const file = zip.files[path];

        if (!file.dir) {
          const contents = await file.async('text');
          if (
            FILE_LOADER_REGEX.test(relativePath) ||
            contents.length > MAX_FILE_SIZE
          ) {
            result[relativePath] = {
              content: rawGitUrl(gitInfo, relativePath, commitSha),
              isBinary: true,
            };
          } else {
            result[relativePath] = {
              content: contents,
              isBinary: false,
            };
          }
        }
      }
    })
  );

  return result;
}
