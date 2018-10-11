import axios from "axios";
import * as LRU from "lru-cache";
import * as zip from "jszip";
import fetch from "node-fetch";

import log from "../../utils/log";

import { ITree, IGitInfo } from "./push";

const API_URL = "https://gitlab.com/api/v4";
const BASE_URL = API_URL + "/projects";

const NOT_FOUND_MESSAGE =
  "Could not find the specified repository or directory";

function buildApiUrl(username: string, repo: string) {
  return `${BASE_URL}/${username}%2F${repo}`;
}


function buildContentsUrl(
  username: string,
  repo: string,
  branch: string,
  path: string
) {
  return `${buildApiUrl(
    username,
    repo
  )}/repository/tree?path=${path}&ref=${branch}`;
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

interface IRepoResponse {
  id: number;
  node_id: string;
  name: string;
  full_name: string;
  private: boolean;
}

export async function getRepo(username: string, repo: string, token: string) {
  const url = buildApiUrl(username, repo);

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
  permission: "admin" | "write" | "read" | "none";
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
  recursive: boolean = true
): Promise<ITreeResponse> {
  let url = `${buildApiUrl(
    username,
    repo
  )}/git/trees/${commitSha}&path=${path}`;

  if (recursive) {
    url += "&recursive=1";
  }

  const response: { data: ITreeResponse } = await axios({ url });

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
  token: string
) {
  const response: { data: IBlobResponse } = await axios.post(
    `${buildApiUrl(username, repo)}/git/blobs`,
    { content: content },
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
  const response: { data: ITreeResponse } = await axios.post(
    `${buildApiUrl(username, repo)}/git/trees`,
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
    `${buildApiUrl(username, repo)}/git/commits`,
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
      `${buildApiUrl(username, repo)}/merges`,
      { base: branch, head: commitSha },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return response.data;
  } catch (e) {
    console.error(e);
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
    `${buildApiUrl(
      username,
      repo
    )}/git/refs/heads/${branch}`,
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
    `${buildApiUrl(username, repo)}/git/refs`,
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
    `${buildApiUrl(username, repo)}/forks`,
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
  token: string
) {
  const response: { data: ICreateRepoResponse } = await axios.post(
    `${API_URL}/user/repos`,
    {
      name: repo,
      description: "Created with CodeSandbox",
      homepage: `https://codesandbox.io/s/github/${username}/${repo}`,
      auto_init: true
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
      buildApiUrl(username, repo)
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
        url: file.git_url
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
  maxAge: 1000 * 30 // 30 seconds
});

export function resetShaCache(gitInfo: IGitInfo) {
  const { username, repo, branch = "master", path = "" } = gitInfo;

  return shaCache.del(username + repo + branch + path);
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
    // GitHub API for every request
    let latestSha = shaCache.get(cacheId) as string;

    if (!latestSha || skipCache) {
      const url = buildCommitsUrl(username, repo, branch);
      console.log(url)
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
  const url = `${repoUrl}/zipball/${commitSha}`;

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
