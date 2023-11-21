import * as Sentry from "@sentry/node";
import axios, { AxiosPromise, AxiosRequestConfig } from "axios";
import * as zip from "jszip";
import * as LRU from "lru-cache";
import fetch from "node-fetch";
import { encode } from "base-64";
import { IGitInfo, ITree } from "./push";
import { appsignal } from "../../utils/appsignal";

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

function buildCommitApiUrl(username: string, repo: string, commitSha: string) {
  return `${REPO_BASE_URL}/${username}/${repo}/commits/${commitSha}`;
}

function buildTreesApiUrl(username: string, repo: string, treeSha: string) {
  return `${REPO_BASE_URL}/${username}/${repo}/git/trees/${treeSha}`;
}

function buildContentsApiUrl(username: string, repo: string, path: string) {
  return `${REPO_BASE_URL}/${username}/${repo}/contents/${path}`;
}

function requestAxios(
  requestName: string,
  requestObject: AxiosRequestConfig
): AxiosPromise {
  const tracer = appsignal.tracer();
  const span = tracer.createSpan(undefined, tracer.currentSpan());
  return tracer.withSpan(span, (span) => {
    span.setCategory("request-api.github");
    span.setName(requestName);
    const meter = appsignal.metrics();

    const snakeCaseRequestName = requestName.toLowerCase().replace(/\s/g, "_");
    meter.incrementCounter(`github_request_${snakeCaseRequestName}`, 1);

    // To keep track of how many binary files we are actually trying to request SHAs for
    if (
      snakeCaseRequestName === "checking_remaining_rate_limit" &&
      requestObject?.params?.numberOfRequests
    ) {
      meter.incrementCounter(
        "number_of_binary_files",
        requestObject.params.numberOfRequests
      );
    }

    if (requestObject.auth) {
      // In the case we're using not the user token, let's log that as well!
      meter.incrementCounter(
        `github_unauthorized_request_${snakeCaseRequestName}`,
        1
      );
    }

    return axios(requestObject)
      .then((res) => {
        span.close();
        return res;
      })
      .catch((e) => {
        span.addError(e);
        span.close();

        return Promise.reject(e);
      });
  });
}

function buildCompareApiUrl(
  username: string,
  repo: string,
  baseRef: string,
  headRef: string
) {
  return `${buildRepoApiUrl(username, repo)}/compare/${baseRef}...${headRef}`;
}

function createAxiosRequestConfig(token?: string): AxiosRequestConfig {
  const Accept = "application/vnd.github.v3+json";
  return token
    ? {
        headers: { Accept, Authorization: `Bearer ${token}` },
      }
    : {
        auth: {
          username: GITHUB_CLIENT_ID!,
          password: GITHUB_CLIENT_SECRET!,
        },
        headers: { Accept },
      };
}

function buildContentsUrl(
  username: string,
  repo: string,
  branch: string,
  path: string
) {
  return `${buildRepoApiUrl(username, repo)}/contents/${path}?ref=${branch}`;
}

function buildCommitsUrl(
  username: string,
  repo: string,
  branch: string,
  path: string
) {
  return `${buildRepoApiUrl(username, repo)}/commits/${branch}?path=${path}`;
}

function buildCommitsByPathUrl(
  username: string,
  repo: string,
  branch: string,
  path: string
) {
  return `${buildRepoApiUrl(
    username,
    repo
  )}/commits?sha=${branch}&path=${path}`;
}

interface IRepoResponse {
  id: number;
  node_id: string;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
}

interface ICompareResponse {
  files: Array<{
    sha: string;
    filename: string;
    status: "added" | "deleted";
    additions: number;
    deletions: number;
    changes: number;
    contents_url: string;
    patch?: string;
  }>;
  base_commit: {
    sha: string;
  };
  merge_base_commit: {
    sha: string;
  };
  commits: Array<{ sha: string }>;
}

interface IContentResponse {
  content: string;
  encoding: "base64" | "utf-8" | "binary";
  sha: string;
}

interface ICommitResponse {
  commit: {
    tree: {
      sha: string;
    };
  };
}

interface IPrResponse {
  number: number;
  repo: string;
  username: string;
  branch: string;
  state: string;
  merged: boolean;
  mergeable: boolean;
  mergeable_state: string;
  commitSha: string;
  baseCommitSha: string;
  rebaseable: boolean;
  commits: number;
  additions: number;
  deletions: number;
  changed_files: number;
}

interface IDeleteContentResponse {
  commit: {
    sha: string;
  };
}

export async function getComparison(
  username: string,
  repo: string,
  baseRef: string,
  headRef: string,
  token: string
) {
  const url = buildCompareApiUrl(username, repo, baseRef, headRef);

  const response: { data: ICompareResponse } = await requestAxios(
    "Get Comparison",
    {
      url: encodeURI(url),
      ...createAxiosRequestConfig(token),
    }
  );

  return response.data;
}

export async function getContent(url: string, token: string) {
  const response: { data: IContentResponse } = await requestAxios(
    "Get Content",
    {
      url: encodeURI(url),
      ...createAxiosRequestConfig(token),
    }
  );

  return response.data;
}

type RepoInfoCache = {
  etag: string;
  response: IRepoResponse;
};
const repoInfoCache = new LRU<string, RepoInfoCache>({
  max: 50 * 1024 * 1024, // 50 MB
});

export async function getRepo(username: string, repo: string, token?: string) {
  const url = buildRepoApiUrl(username, repo);
  const cacheIdentifier = [username, repo, token].filter(Boolean).join("::");
  let etagCache: RepoInfoCache | undefined = repoInfoCache.get(cacheIdentifier);

  const config = {
    url: encodeURI(url),
    ...createAxiosRequestConfig(token),
  };

  if (etagCache) {
    config.headers = config.headers = {};
    config.headers["If-None-Match"] = etagCache.etag;
    config.validateStatus = function (status: number) {
      // Axios sees 304 (Not Modified) as an error. We don't want that.
      return status < 400; // Reject only if the status code is greater than or equal to 400
    };
  }

  const response: {
    data: IRepoResponse;
    status: number;
    headers: any;
  } = await requestAxios("Get Repo", config);

  if (response.status === 304) {
    return etagCache!.response;
  } else {
    const etag = response.headers.etag;
    repoInfoCache.set(cacheIdentifier, {
      etag,
      response: response.data,
    });
  }

  return response.data;
}

export async function getTreeWithDeletedFiles(
  username: string,
  repo: string,
  treeSha: string,
  deletedFiles: string[],
  token: string,
  path = []
) {
  async function fetchTree(sha: string) {
    const url = buildTreesApiUrl(username, repo, sha);

    const response: { data: ITreeResponse } = await requestAxios("Get Tree", {
      url: encodeURI(url),
      ...createAxiosRequestConfig(token),
    });

    return response.data.tree;
  }

  let tree = await fetchTree(treeSha);

  return deletedFiles.reduce(
    (aggr, file) =>
      aggr.then(async (tree) => {
        const parts = file.split("/");
        parts.pop();
        const dirs = parts.reduce<string[]>((aggr, part, index) => {
          return aggr.concat(
            aggr[index - 1] ? aggr[index - 1] + "/" + part : part
          );
        }, []);

        const newTree = await dirs.reduce(
          (subaggr, dir) =>
            subaggr.then(async (tree) => {
              const treeIndex = tree.findIndex(
                (item) => item.type === "tree" && item.path === dir
              );

              if (treeIndex >= 0) {
                const nestedTree = await fetchTree(tree[treeIndex].sha);
                const newTree = tree.concat(
                  nestedTree.map((item) => ({
                    ...item,
                    path: dir + "/" + item.path,
                  }))
                );
                newTree.splice(treeIndex, 1);

                return newTree;
              }

              return tree;
            }),
          Promise.resolve(tree)
        );

        return newTree.filter((item) => item.path !== file);
      }),
    Promise.resolve(tree)
  );
}

export async function getCommitTreeSha(
  username: string,
  repo: string,
  commitSha: string,
  token: string
) {
  const url = buildCommitApiUrl(username, repo, commitSha);

  const response: { data: ICommitResponse } = await requestAxios(
    "Get CommitTreeSha",
    {
      url: encodeURI(url),
      ...createAxiosRequestConfig(token),
    }
  );

  return response.data.commit.tree.sha;
}

export async function getLatestCommitShaOfFile(
  username: string,
  repo: string,
  branch: string,
  path: string,
  token?: string
): Promise<string | undefined> {
  const url = buildCommitsByPathUrl(username, repo, branch, path);
  const response: { data: { sha: string }[] } = await requestAxios(
    "Get Commits of File",
    {
      url: encodeURI(url),
      ...createAxiosRequestConfig(token),
    }
  );

  if (response.data[0]) {
    return response.data[0].sha;
  }

  return undefined;
}

export async function isRepoPrivate(
  username: string,
  repo: string,
  token: string
) {
  const data = await getRepo(username, repo, token);

  return data.private;
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
    const response: { data: RightsResponse } = await requestAxios(
      "Get Rights",
      {
        url: encodeURI(url),
        ...createAxiosRequestConfig(token),
      }
    );

    // No token
    if (!response.data.permissions) {
      return "none";
    }

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

interface IBlobResponse {
  url: string;
  sha: string;
}

export async function createPr(
  base: {
    username: string;
    repo: string;
    branch: string;
  },
  head: {
    username: string;
    repo: string;
    branch: string;
  },
  title: string,
  body: string,
  token: string
): Promise<IPrResponse> {
  const { data } = await requestAxios("Create PR", {
    method: "post",
    url: encodeURI(`${buildRepoApiUrl(base.username, base.repo)}/pulls`),
    data: {
      base: base.branch,
      head: `${base.username === head.username ? "" : head.username + ":"}${
        head.branch
      }`,
      title,
      body,
      maintainer_can_modify: true,
    },
    ...createAxiosRequestConfig(token),
  });

  return {
    number: data.number,
    repo: data.head.repo.name,
    username: data.head.repo.owner.login,
    commitSha: data.head.sha,
    branch: data.head.ref,
    merged: data.merged,
    state: data.state,
    mergeable: data.mergeable,
    mergeable_state: data.mergeable_state,
    rebaseable: data.rebaseable,
    additions: data.additions,
    changed_files: data.changed_files,
    commits: data.commits,
    baseCommitSha: data.base.sha,
    deletions: data.deletions,
  };
}

export async function createBlob(
  username: string,
  repo: string,
  content: string,
  encoding: "utf-8" | "base64",
  token: string
) {
  const response: { data: IBlobResponse } = await requestAxios("Create Blob", {
    method: "post",
    url: encodeURI(`${buildRepoApiUrl(username, repo)}/git/blobs`),
    data: { content: content, encoding },
    ...createAxiosRequestConfig(token),
  });

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
  baseTreeSha: string | null,
  token: string
) {
  const response: { data: ICreateTreeResponse } = await requestAxios(
    "Create Tree",
    {
      method: "post",
      url: encodeURI(`${buildRepoApiUrl(username, repo)}/git/trees`),
      data: { base_tree: baseTreeSha, tree },
      ...createAxiosRequestConfig(token),
    }
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
  parentCommitShas: string[],
  message: string,
  token: string
) {
  const response: { data: ICreateCommitResponse } = await requestAxios(
    "Create Commit",
    {
      method: "post",
      url: encodeURI(`${buildRepoApiUrl(username, repo)}/git/commits`),
      data: { tree: treeSha, message, parents: parentCommitShas },
      ...createAxiosRequestConfig(token),
    }
  );

  return response.data;
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
  const response: { data: IUpdateReferenceResponse } = await requestAxios(
    "Update Reference",
    {
      method: "patch",
      url: encodeURI(
        `${buildRepoApiUrl(username, repo)}/git/refs/heads/${branch}`
      ),
      data: { sha: commitSha, force: true },
      ...createAxiosRequestConfig(token),
    }
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
  const response: {
    data: ICreateReferenceResponse;
  } = await requestAxios("Create Reference", {
    method: "post",
    url: encodeURI(`${buildRepoApiUrl(username, repo)}/git/refs`),
    data: { ref: `refs/heads/${branch}`, sha: refSha },
    ...createAxiosRequestConfig(token),
  });

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
  const response: { data: ICreateForkResponse } = await requestAxios(
    "Create Fork",
    {
      method: "post",
      url: encodeURI(`${buildRepoApiUrl(username, repo)}/forks`),
      data: {},
      ...createAxiosRequestConfig(token),
    }
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
  default_branch: string;
}

export async function getDefaultBranch(
  username: string,
  repo: string,
  token?: string
) {
  const data = await getRepo(username, repo, token);

  return data.default_branch;
}

export async function createRepo(
  username: string,
  repo: string,
  token: string,
  privateRepo: boolean = false
) {
  const repoExists = await doesRepoExist(username, repo, token);
  if (repoExists) {
    const error = new Error(
      `The repository ${username}/${repo} already exists.`
    );
    // @ts-ignore
    error.status = 422;

    throw error;
  }

  const response: { data: ICreateRepoResponse } = await requestAxios(
    "Create Repo",
    {
      method: "post",
      url: encodeURI(`${API_URL}/user/repos`),
      data: {
        name: repo,
        description: "Created with CodeSandbox",
        homepage: `https://codesandbox.io/p/github/${username}/${repo}`,
        auto_init: true,
        private: privateRepo,
      },
      ...createAxiosRequestConfig(token),
    }
  );

  return response.data;
}

/**
 * Check if repository exists
 */
export async function doesRepoExist(
  username: string,
  repo: string,
  userToken?: string
) {
  try {
    await requestAxios("Repo Exists", {
      method: "get",
      url: encodeURI(buildRepoApiUrl(username, repo)),
      ...createAxiosRequestConfig(userToken),
    });

    return true;
  } catch (e) {
    if (e.response && e.response.status === 404) {
      return false;
    }

    throw e;
  }
}

interface CommitResponse {
  commitSha: string;
  username: string;
  repo: string;
  branch: string;
  path: string;
}

const shaCache = new LRU({
  max: 500,
  maxAge: 1000 * 5, // 5 seconds
});

const etagCache = new LRU<string, { etag: string; sha: string }>({
  max: 50000,
});

export function resetShaCache(gitInfo: IGitInfo) {
  const { username, repo, branch, path = "" } = gitInfo;

  return shaCache.del(username + repo + branch + path);
}

export async function fetchRepoInfo(
  username: string,
  repo: string,
  branch: string,
  path: string = "",
  skipCache: boolean = false,
  userToken?: string
): Promise<CommitResponse> {
  let span;
  try {
    const cacheId = username + repo + branch + path;
    // We cache the latest retrieved sha for a limited time, so we don't spam the
    // GitHub API for every request
    let latestSha = shaCache.get(cacheId) as string;

    if (!latestSha || skipCache) {
      const tracer = appsignal.tracer();
      span = tracer.createSpan(undefined, tracer.currentSpan());
      span.setCategory("request-api.github");
      span.setName("GET api.github.com/info");

      const url = buildCommitsUrl(username, repo, branch, path);

      const headers: { "If-None-Match"?: string } = {};

      const etagCacheResponse = etagCache.get(cacheId);
      if (etagCacheResponse) {
        // Use an ETag header so duplicate requests don't count towards the limit
        headers["If-None-Match"] = etagCacheResponse.etag;
      }

      const defaultConfig = createAxiosRequestConfig(userToken);
      const response = await requestAxios("Get Repo Info", {
        url: encodeURI(url),
        validateStatus: function (status) {
          // Axios sees 304 (Not Modified) as an error. We don't want that.
          return status < 400; // Reject only if the status code is greater than or equal to 400
        },
        ...defaultConfig,
        headers: {
          ...defaultConfig.headers,
          ...headers,
        },
      });

      span.setSampleData("custom_data", {
        etagCacheUsed: response.status === 304 && etagCacheResponse,
      });
      const meter = appsignal.metrics();
      if (response.status === 304 && etagCacheResponse) {
        meter.incrementCounter("github_cache_hit", 1);

        latestSha = etagCacheResponse.sha;
      } else {
        meter.incrementCounter("github_cache_miss", 1);

        latestSha = response.data.sha;

        const etag = response.headers.etag;

        // Only save towards the cache if there is no userToken. For people with a userToken
        // we have 12k requests per hour to use. Won't hit that ever.
        if (etag && !userToken) {
          etagCache.set(cacheId, {
            etag,
            sha: response.data.sha,
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
      path,
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

    if (e.response && e.response.status === 403 && userToken == null) {
      const meter = appsignal.metrics();
      meter.incrementCounter("github_rate_limit", 1);
    }

    Sentry.captureException(e);

    throw e;
  } finally {
    if (span) {
      span.close();
    }
  }
}

export async function fetchPullInfo(
  username: string,
  repo: string,
  pull: number,
  userToken?: string
): Promise<IPrResponse> {
  const url = buildPullApiUrl(username, repo, pull);

  try {
    const response = await requestAxios("Get Pull Info", {
      url: encodeURI(url),
      ...createAxiosRequestConfig(userToken),
    });

    const data = response.data;

    return {
      number: data.head.number,
      repo: data.head.repo.name,
      username: data.head.repo.owner.login,
      commitSha: data.head.sha,
      branch: data.head.ref,
      state: data.state,
      merged: data.merged,
      mergeable: data.mergeable,
      mergeable_state: data.mergeable_state,
      rebaseable: data.rebaseable,
      additions: data.additions,
      changed_files: data.changed_files,
      commits: data.commits,
      baseCommitSha: data.base.sha,
      deletions: data.deletions,
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
  const url = encodeURI(`${repoUrl}/zipball/${commitSha}`);
  const Accept = "application/vnd.github.v3+json";
  const buffer: Buffer = await fetch(url, {
    headers: {
      Authorization: userToken
        ? `Bearer ${userToken}`
        : `Basic ${encode(`${GITHUB_CLIENT_ID}:${GITHUB_CLIENT_SECRET}`)}`,
      Accept,
    },
  }).then((res) => {
    if (Number(res.headers.get("Content-Length")) > MAX_ZIP_SIZE) {
      throw new Error("This repo is too big to import");
    }

    if (!res.ok) {
      return res.text().then((text) => {
        const error = new Error(
          `Could not import repo from GitHub, error from GitHub. Status code: ${res.status}, error: ${text}`
        );

        // Forward the error status from GitHub, eg. if GH returns 404 we return that as well.
        // This is handled in error-handler.ts middleware.
        // @ts-ignore
        error.status = res.status;

        throw error;
      });
    } else {
      return res.buffer();
    }
  });

  const loadedZip = await zip.loadAsync(buffer);

  return loadedZip;
}

export async function checkRemainingRateLimit(
  numberOfRequests: number
): Promise<boolean> {
  const url = "https://api.github.com/rate_limit";
  const response: {
    data: { resources: { core: { remaining: number } } };
  } = await requestAxios("Checking Remaining Rate Limit", {
    url: encodeURI(url),
    params: {
      numberOfRequests: numberOfRequests,
    },
  });

  let remaining = 0;

  if (response.data) {
    remaining = response.data.resources.core.remaining;
  }

  return numberOfRequests < remaining;
}
