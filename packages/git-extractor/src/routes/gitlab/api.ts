import axios from "axios";
import * as LRU from "lru-cache";
import * as zip from "jszip";
import fetch from "node-fetch";

import log from "../../utils/log";

interface IGitInfo {
  username: string
  repo: string
  branch: string
  path?: string
}

interface ITreeFile {
  path: string
  mode: string
  type: string
  size: number
  sha: string
  url: string
}

type ITree = ITreeFile[]

const API_URL = "https://gitlab.com/api/v4";
const BASE_URL = API_URL + "/projects";

const NOT_FOUND_MESSAGE =
  "Could not find the specified repository or directory";

type Response = Array<Module>;

function buildApiUrl(username: string, repo: string) {
  return `${BASE_URL}/${username}%2F${repo}`;
}

function buildCommitsUrl(
  username: string,
  repo: string,
  branch: string
) {
  return `${buildApiUrl(
    username,
    repo
  )}/repository/commits?ref_name=${branch}`;
}


interface CommitResponse {
  commitSha: string;
  username: string;
  repo: string;
  branch: string;
  path: string;
}

const shaCache = LRU({
  max: 500,
  maxAge: 1000 * 30 // 30 seconds
});

export function resetShaCache(gitInfo: IGitInfo) {
  const { username, repo, branch = "master" } = gitInfo;

  return shaCache.del(username + repo + branch);
}

export async function fetchRepoInfo(
  username: string,
  repo: string,
  branch: string = "master",
  skipCache: boolean = false,
  userToken?: string
): Promise<CommitResponse> {
  try {
    const cacheId = username + repo + branch;
    // We cache the latest retrieved sha for a limited time, so we don't spam the
    // Gitlab API for every request
    let latestSha = shaCache.get(cacheId) as string;

    if (!latestSha || skipCache) {
      const url = buildCommitsUrl(username, repo, branch);
      const response = await axios({
        url,
        headers: {
          Authorization: userToken ? `Bearer ${userToken}` : ""
        }
      });
      latestSha = response.data[0].id as string;

      shaCache.set(cacheId, latestSha);
    }

    return {
      commitSha: latestSha,
      username,
      repo,
      branch,
      path: ''
    };
  } catch (e) {
    throw e;
  }
}

const MAX_ZIP_SIZE = 128 * 1024 * 1024; // 128Mb

export async function downloadZip(
  gitInfo: IGitInfo,
  commitSha: string,
  userToken?: string
) {
  const repoUrl = buildApiUrl(gitInfo.username, gitInfo.repo);
  const url = `${repoUrl}/repository/archive.zip?sha=${commitSha}`;

  const buffer: Buffer = await fetch(url, {
    headers: { Authorization: userToken ? `Bearer ${userToken}` : "" }
  }).then(res => {
    if (+res.headers.get("Content-Length") > MAX_ZIP_SIZE) {
      throw new Error("This repo is too big to import");
    }

    return res.buffer();
  });

  const loadedZip = await zip.loadAsync(buffer);

  return loadedZip;
}
