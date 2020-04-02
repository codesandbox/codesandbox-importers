import axios, { AxiosRequestConfig } from "axios";
import * as LRU from "lru-cache";
import * as zip from "jszip";
import fetch from "node-fetch";
import * as Sentry from "@sentry/node";

import log from "../../utils/log";

import { ITree, IGitInfo } from "./push";

const API_URL = "https://api.github.com";
const REPO_BASE_URL = API_URL + "/repos";

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

const NOT_FOUND_MESSAGE =
  "Could not find the specified repository or directory";

function buildRepoApiUrl(username: string, repo: string) {
  return `${REPO_BASE_URL}/${username}/${repo}`;
}

function buildPullApiUrl(username: string, repo: string, pull: number) {
  return `${buildRepoApiUrl(username, repo)}/pulls/${pull}`;
}

function buildSecretParams() {
  return `?client_id=${GITHUB_CLIENT_ID}&client_secret=${GITHUB_CLIENT_SECRET}`;
}

function buildContentsUrl(
  username: string,
  repo: string,
  branch: string,
  path: string
) {
  return `${buildRepoApiUrl(
    username,
    repo
  )}/contents/${path}${buildSecretParams()}&ref=${branch}`;
}

function buildCommitsUrl(
  username: string,
  repo: string,
  branch: string,
  path: string
) {
  return `${buildRepoApiUrl(
    username,
    repo
  )}/commits/${branch}${buildSecretParams()}&path=${path}`;
}

interface IRepoResponse {
  id: number;
  node_id: string;
  name: string;
  full_name: string;
  private: boolean;
}

export async function getRepo(username: string, repo: string, token: string) {
  const url = buildRepoApiUrl(username, repo);

  const response: { data: IRepoResponse } = await axios({
    url,
    headers: { Authorization: `Bearer ${token}` }
  });

  return response.data;
}

export async function isRepoPrivate(
  username: string,
  repo: string,
  token: string
) {
  const data = await getRepo(username, repo, token);

  return data.private;
}

type Response = Array<Module>;

/**
 * Fetch all directories (flat) and files that exist in this repo by path and branch
 *
 * @export
 * @param {string} username
 * @param {string} repo
 * @param {string} [branch='master']
 * @param {string} [path='']
 * @returns {Promise<Response>}
 */
export async function fetchContents(
  username: string,
  repo: string,
  branch: string = "master",
  path: string = ""
): Promise<Response | Module> {
  try {
    const url = buildContentsUrl(username, repo, branch, path);
    const response = await axios.get(url);

    return response.data;
  } catch (e) {
    if (e.response && e.response.status === 404) {
      e.message = NOT_FOUND_MESSAGE;
    }

    throw e;
  }
}

interface RightsResponse {
  permissions: {
    admin: boolean;
    push: boolean;
    pull: boolean;
  };
}

/**
 * Fetch the permissions of a user on a specific repository.
 */
export async function fetchRights(
  username: string,
  repo: string,
  token?: string
): Promise<"admin" | "write" | "read" | "none"> {
  const url = buildRepoApiUrl(username, repo);

  try {
    const headers: { Authorization?: string } = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response: { data: RightsResponse } = await axios({
      url,
      headers
    });

    if (response.data.permissions.admin) {
      return "admin";
    }

    if (response.data.permissions.push) {
      return "write";
    }

    return "read";
  } catch (e) {
    if (
      e.response &&
      (e.response.status === 403 || e.response.status === 401)
    ) {
      return "none";
    } else {
      throw e;
    }
  }
}

interface ITreeResponse {
  sha: string;
  tree: ITree;
  truncated: boolean;
  url: string;
}

export async function fetchTree(
  username: string,
  repo: string,
  path: string = "",
  commitSha: string,
  recursive: boolean = true,
  token?: string
): Promise<ITreeResponse> {
  let url = `${buildRepoApiUrl(
    username,
    repo
  )}/git/trees/${commitSha}${buildSecretParams()}&path=${path}`;

  if (recursive) {
    url += "&recursive=1";
  }

  const options: AxiosRequestConfig = { url };

  if (token) {
    options.headers = { Authorization: `Bearer ${token}` };
  }

  const response: { data: ITreeResponse } = await axios(options);

  return response.data;
}

interface IBlobResponse {
  url: string;
  sha: string;
}

export async function createBlob(
  username: string,
  repo: string,
  content: string,
  encoding: "utf-8" | "base64",
  token: string
) {
  const response: { data: IBlobResponse } = await axios.post(
    `${buildRepoApiUrl(username, repo)}/git/blobs${buildSecretParams()}`,
    { content: content, encoding },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return response.data;
}

interface ICreateTreeResponse {
  sha: string;
  url: string;
  tree: ITree;
}

export async function createTree(
  username: string,
  repo: string,
  tree: ITree,
  token: string
) {
  const response: { data: ICreateTreeResponse } = await axios.post(
    `${buildRepoApiUrl(username, repo)}/git/trees${buildSecretParams()}`,
    { base_tree: null, tree },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return response.data;
}

interface ICreateCommitResponse {
  sha: string;
  url: string;
  author: {
    date: string;
    name: string;
    email: string;
  };
  committer: {
    date: string;
    name: string;
    email: string;
  };
  message: string;
}

/**
 * Create a commit from the given tree
 */
export async function createCommit(
  username: string,
  repo: string,
  treeSha: string,
  parentCommitSha: string,
  message: string,
  token: string
) {
  const response: { data: ICreateCommitResponse } = await axios.post(
    `${buildRepoApiUrl(username, repo)}/git/commits${buildSecretParams()}`,
    { tree: treeSha, message, parents: [parentCommitSha] },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return response.data;
}

interface ICreateMergeResponse {
  sha: string;
  url: string;
}

/**
 * Create a merge for the specified commit
 *
 * @param branch The branch to merge into
 * @param commitSha The sha to merge
 */
export async function createMerge(
  username: string,
  repo: string,
  branch: string,
  commitSha: string,
  token: string
) {
  try {
    const response: { data: ICreateMergeResponse } = await axios.post(
      `${buildRepoApiUrl(username, repo)}/merges${buildSecretParams()}`,
      { base: branch, head: commitSha },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return response.data;
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.error(e);
    }
    if (e.response) {
      e.message = `Merging went wrong: '${e.response.data.message}'`;
    }

    throw e;
  }
}

interface IUpdateReferenceResponse {
  ref: string;
  url: string;
}

export async function updateReference(
  username: string,
  repo: string,
  branch: string,
  commitSha: string,
  token: string
) {
  const response: { data: IUpdateReferenceResponse } = await axios.patch(
    `${buildRepoApiUrl(
      username,
      repo
    )}/git/refs/heads/${branch}${buildSecretParams()}`,
    { sha: commitSha, force: false },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return response.data;
}

interface ICreateReferenceResponse {
  ref: string;
  url: string;
  object: {
    type: string;
    sha: string;
    url: string;
  };
}

export async function createReference(
  username: string,
  repo: string,
  branch: string,
  refSha: string,
  token: string
) {
  const response: { data: ICreateReferenceResponse } = await axios.post(
    `${buildRepoApiUrl(username, repo)}/git/refs${buildSecretParams()}`,
    { ref: `refs/heads/${branch}`, sha: refSha },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return response.data;
}

interface ICreateForkResponse {
  name: string;
  full_name: string;
  description: string;
  private: boolean;
  fork: boolean;
}

export async function createFork(
  username: string,
  repo: string,
  token: string
) {
  const response: { data: ICreateForkResponse } = await axios.post(
    `${buildRepoApiUrl(username, repo)}/forks${buildSecretParams()}`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return response.data;
}

interface ICreateRepoResponse {
  name: string;
  full_name: string;
  description: string;
  private: false;
  fork: false;
  url: string;
}

export async function createRepo(
  username: string,
  repo: string,
  token: string,
  privateRepo: boolean = false
) {
  const response: { data: ICreateRepoResponse } = await axios.post(
    `${API_URL}/user/repos${buildSecretParams()}`,
    {
      name: repo,
      description: "Created with CodeSandbox",
      homepage: `https://codesandbox.io/s/github/${username}/${repo}`,
      auto_init: true,
      private: privateRepo
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return response.data;
}

/**
 * Check if repository exists
 */
export async function doesRepoExist(username: string, repo: string) {
  try {
    const response = await axios.get(
      buildRepoApiUrl(username, repo) + buildSecretParams()
    );

    return true;
  } catch (e) {
    if (e.response && e.response.status === 404) {
      return false;
    }

    throw e;
  }
}

/**
 * Download the code of a github file
 *
 * @export
 * @param {Module} file
 * @returns {Promise<string>}
 */
export async function fetchCode(file: Module): Promise<string> {
  const response: { data: any } = await axios({
    url: file.download_url,
    responseType: "text",
    headers: {
      Accept: "text/plain"
    },
    // We need to tell axios not to do anything (don't parse)
    transformResponse: [d => d]
  }).catch(e => {
    if (e.response && e.response.status === 404) {
      // Maybe it is not yet added to github api, let's try the raw git object
      return axios({
        url: file.git_url + buildSecretParams()
      }).then(res => ({
        data: new Buffer(res.data.content, "base64").toString()
      }));
    }

    throw e;
  });

  return response.data;
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
  maxAge: 1000 * 5 // 5 seconds
});

const etagCache = LRU<string, { etag: string; sha: string }>({
  max: 50000
});

export function resetShaCache(gitInfo: IGitInfo) {
  const { username, repo, branch = "master", path = "" } = gitInfo;

  return shaCache.del(username + repo + branch + path);
}

export async function fetchRepoInfo(
  username: string,
  repo: string,
  branch: string = "master",
  path: string = "",
  skipCache: boolean = false,
  userToken?: string
): Promise<CommitResponse> {
  try {
    const cacheId = username + repo + branch + path;
    // We cache the latest retrieved sha for a limited time, so we don't spam the
    // GitHub API for every request
    let latestSha = shaCache.get(cacheId) as string;

    if (!latestSha || skipCache) {
      const url = buildCommitsUrl(username, repo, branch, path);

      const headers: { Authorization?: string; "If-None-Match"?: string } = {};
      if (userToken) {
        headers.Authorization = `Bearer ${userToken}`;
      }

      const etagCacheResponse = etagCache.get(cacheId);
      if (etagCacheResponse) {
        // Use an ETag header so duplicate requests don't count towards the limit
        headers["If-None-Match"] = etagCacheResponse.etag;
      }

      const response = await axios({
        url,
        headers,
        validateStatus: function(status) {
          // Axios sees 304 (Not Modified) as an error. We don't want that.
          return status < 400; // Reject only if the status code is greater than or equal to 400
        }
      });

      if (response.status === 304 && etagCacheResponse) {
        latestSha = etagCacheResponse.sha;
      } else {
        latestSha = response.data.sha;

        const etag = response.headers.etag;

        // Only save towards the cache if there is no userToken. For people with a userToken
        // we have 12k requests per hour to use. Won't hit that ever.
        if (etag && !userToken) {
          etagCache.set(cacheId, {
            etag,
            sha: response.data.sha
          });
        }
      }

      shaCache.set(cacheId, latestSha);
    }

    return {
      commitSha: latestSha,
      username,
      repo,
      branch,
      path
    };
  } catch (e) {
    // There is a chance that the branch contains slashes, we try to fix this
    // by requesting again with the first part of the path appended to the branch
    // when a request fails (404)
    if (
      e.response &&
      (e.response.status === 404 || e.response.status === 422)
    ) {
      const [branchAddition, ...newPath] = path.split("/");
      const newBranch = `${branch}/${branchAddition}`;

      if (branchAddition !== "") {
        return await fetchRepoInfo(
          username,
          repo,
          newBranch,
          newPath.join("/"),
          false,
          userToken
        );
      }

      e.message = NOT_FOUND_MESSAGE;
    }
    Sentry.captureException(e);

    throw e;
  }
}

export async function fetchPullInfo(
  username: string,
  repo: string,
  pull: number,
  userToken?: string
) {
  const url = buildPullApiUrl(username, repo, pull);

  try {
    const headers: { Authorization?: string } = {};
    if (userToken) {
      headers.Authorization = `Bearer ${userToken}`;
    }

    const response = await axios({
      url,
      headers
    });

    const data = response.data;

    return {
      repo: data.head.repo.name,
      username: data.head.repo.owner.login,
      branch: data.head.ref
    };
  } catch (e) {
    e.message = "Could not find pull request information";
    throw e;
  }
}

const MAX_ZIP_SIZE = 128 * 1024 * 1024; // 128Mb

export async function downloadZip(
  gitInfo: IGitInfo,
  commitSha: string,
  userToken?: string
) {
  const repoUrl = buildRepoApiUrl(gitInfo.username, gitInfo.repo);
  const url = `${repoUrl}/zipball/${commitSha}`;

  // @ts-ignore
  const headers: { Authorization: string } = {};
  if (userToken) {
    headers.Authorization = `Bearer ${userToken}`;
  }

  const buffer: Buffer = await fetch(url, {
    headers
  }).then(res => {
    if (+res.headers.get("Content-Length") > MAX_ZIP_SIZE) {
      throw new Error("This repo is too big to import");
    }

    return res.buffer();
  });

  const loadedZip = await zip.loadAsync(buffer);

  return loadedZip;
}
