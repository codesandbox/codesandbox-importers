import * as JSZip from "jszip";
import { CancelToken } from "axios";

import { isText } from "codesandbox-import-utils/lib/is-text";
import { INormalizedModules } from "codesandbox-import-util-types";

import { IGitInfo } from "../push/index";
import {
  downloadZip,
  getLatestCommitShaOfFile,
  checkRemainingRateLimit
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
  let url = `https://rawcdn.githack.com/${gitInfo.username}/${gitInfo.repo}/${commitSha || gitInfo.branch
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
  userToken?: string,
  axiosCancelToken?: CancelToken,
): Promise<INormalizedModules> {
  const zip = await downloadZip(gitInfo, commitSha, userToken);
  let folderName = getFolderName(zip);

  console.log("FOLDER NAME IS ", folderName)

  if (gitInfo.path) {
    folderName += gitInfo.path + "/";
  }

  const result: INormalizedModules = {};

  //console.log(zip.files)

  const shaArray = <string[]>[];

  // First process non-binary files
  await Promise.all(
    Object.keys(zip.files).map(async (path) => {
      if (path.startsWith(folderName)) {
        const relativePath = path.replace(folderName, "");

        const file = zip.files[path];

        console.log(file.name)

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
              console.log(`FILE ${file} IS NOT TEXT AND IS NOT PRIVATE - GETTING LATEST COMMIT SHA OF FILE`)
              shaArray.push(relativePath)
              // const fileSha = await getLatestCommitShaOfFile(
              //   gitInfo.username,
              //   gitInfo.repo,
              //   gitInfo.branch,
              //   relativePath
              // );
              // console.log("FILE SHA IS: ", fileSha)
              // result[relativePath] = {
              //   content: rawGitUrl(gitInfo, relativePath, fileSha),
              //   isBinary: true,
              // };
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

  //console.log("result so far", result)

  console.log("shaArray", shaArray)

  const requestsToMake = shaArray.length

  const canRequest = await checkRemainingRateLimit(requestsToMake);
  if (!canRequest) {
    console.log("Can't make axios requests, not enough rate limit remaining")
    throw new Error("Can't make axios requests, not enough rate limit remaining")
  }

  console.log("got past requests")

  // Then we can request the SHAs of binary files if there is enough rate limit left.
  await Promise.all(shaArray.map(async (relativePath) => {
    console.log("getting commit for: ", relativePath)
    const fileSha = await getLatestCommitShaOfFile(
      gitInfo.username,
      gitInfo.repo,
      gitInfo.branch,
      relativePath,
      undefined,
      axiosCancelToken
    );

    console.log("FILE SHA IS: ", fileSha)

    result[relativePath] = {
      content: rawGitUrl(gitInfo, relativePath, fileSha),
      isBinary: true,
    };

  }));

  return result;
}
