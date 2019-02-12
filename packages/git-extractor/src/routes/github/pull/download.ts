import * as JSZip from "jszip";

import { isText } from "codesandbox-import-utils/lib/is-text";
import { INormalizedModules } from "codesandbox-import-util-types";

import { IGitInfo } from "../push/index";
import { downloadZip } from "../api";

const getFolderName = (zip: JSZip) =>
  `${Object.keys(zip.files)[0].split("/")[0]}/`;

/**
 * We use https://rawgit.com/ as urls, since they change the content-type corresponding
 * to the file. Github always uses text/plain
 */
const rawGitUrl = (gitInfo: IGitInfo, filePath: string, commitSha: string) => {
  let url = `https://rawcdn.githack.com/${gitInfo.username}/${
    gitInfo.repo
  }/${commitSha || gitInfo.branch}/`;
  if (gitInfo.path) {
    url += gitInfo.path + "/";
  }
  url += filePath;

  return url;
};

export async function downloadRepository(
  gitInfo: IGitInfo,
  commitSha: string,
  userToken?: string
): Promise<INormalizedModules> {
  const zip = await downloadZip(gitInfo, commitSha, userToken);
  let folderName = getFolderName(zip);

  if (gitInfo.path) {
    folderName += gitInfo.path + "/";
  }

  const result: INormalizedModules = {};

  await Promise.all(
    Object.keys(zip.files).map(async path => {
      if (path.startsWith(folderName)) {
        const relativePath = path.replace(folderName, "");

        const file = zip.files[path];

        if (!file.dir) {
          const bufferContents = await file.async("nodebuffer");
          const text = await isText(file.name, bufferContents);

          const contents = await file.async("text");
          if (!text) {
            result[relativePath] = {
              content: rawGitUrl(gitInfo, relativePath, commitSha),
              isBinary: true
            };
          } else {
            result[relativePath] = {
              content: contents || "",
              isBinary: false
            };
          }
        }
      }
    })
  );

  return result;
}
