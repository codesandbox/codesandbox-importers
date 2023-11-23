import * as JSZip from "jszip";

import { isText } from "codesandbox-import-utils/lib/is-text";
import { INormalizedModules } from "codesandbox-import-util-types";

import { IGitInfo } from "../push/index";
import {
  downloadZip,
  getLatestCommitShaOfFile,
  checkRemainingRateLimit,
} from "../api";

const getFolderName = (zip: JSZip) =>
  `${Object.keys(zip.files)[0].split("/")[0]}/`;

/**
 * We use https://rawgit.com/ as urls, since they change the content-type corresponding
 * to the file. Github always uses text/plain
 */
export const rawGitUrl = (
  gitInfo: IGitInfo,
  filePath: string,
  commitSha?: string
) => {
  let url = `https://rawcdn.githack.com/${gitInfo.username}/${gitInfo.repo}/${
    commitSha || gitInfo.branch
  }/`;
  if (gitInfo.path) {
    url += gitInfo.path + "/";
  }
  url += filePath;

  return url;
};

export async function downloadRepository(
  gitInfo: IGitInfo,
  commitSha: string,
  isPrivate: boolean,
  userToken?: string
): Promise<INormalizedModules> {
  const zip = await downloadZip(gitInfo, commitSha, userToken);
  let folderName = getFolderName(zip);

  if (gitInfo.path) {
    folderName += gitInfo.path + "/";
  }

  const result: INormalizedModules = {};

  const pathArray: string[] = [];

  // First process non-binary files, and save paths of binary files to request
  await Promise.all(
    Object.keys(zip.files).map(async (path) => {
      if (path.startsWith(folderName)) {
        const relativePath = path.replace(folderName, "");

        const file = zip.files[path];

        if (!file.dir) {
          const bufferContents = await file.async("nodebuffer");
          const text = await isText(file.name, bufferContents);

          if (!text) {
            if (isPrivate) {
              result[relativePath] = {
                binaryContent: bufferContents.toString("base64"),
                content: "",
                isBinary: true,
              };
            } else {
              pathArray.push(relativePath);
            }
          } else {
            const contents = await file.async("text");
            result[relativePath] = {
              content: contents || "",
              isBinary: false,
            };
          }
        }
      }
    })
  );

  const requestsToMake = pathArray.length;

  /**
   * Check if there is enough of our CodeSandbox Github token rate limit left to be able to
   * request all the files we need to. If there isn't, then we shouldn't make the Promise.all
   * request because when the first 403 rate limit comes through, it rejects everything, and
   * it wastes even more rate limit tries.
   */
  if (!userToken) {
    const canRequest = await checkRemainingRateLimit(requestsToMake);
    if (!canRequest) {
      throw new Error(
        "Can't make axios requests, not enough rate limit remaining"
      );
    }
  }

  // Then we can request the SHAs of binary files if there is enough rate limit left.
  await Promise.all(
    pathArray.map(async (relativePath) => {
      const fileSha = await getLatestCommitShaOfFile(
        gitInfo.username,
        gitInfo.repo,
        gitInfo.branch,
        relativePath,
        userToken
      );

      result[relativePath] = {
        content: rawGitUrl(gitInfo, relativePath, fileSha),
        isBinary: true,
      };
    })
  );

  return result;
}
