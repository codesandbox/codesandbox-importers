import axios from 'axios';

import log from '../../utils/log';

const BASE_URL = 'https://api.github.com/repos';

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

const NOT_FOUND_MESSAGE =
  'Could not find the specified repository or directory';

function buildApiUrl(username: string, repo: string) {
  return `${BASE_URL}/${username}/${repo}`;
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
  return `${buildApiUrl(
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
  return `${buildApiUrl(
    username,
    repo
  )}/commits/${branch}${buildSecretParams()}&path=${path}`;
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
  branch: string = 'master',
  path: string = ''
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

/**
 * Download the code of a github file
 *
 * @export
 * @param {Module} file
 * @returns {Promise<string>}
 */
export async function fetchCode(file: Module): Promise<string> {
  const response = await axios({
    url: file.download_url,
    responseType: 'text',
    headers: {
      Accept: 'text/plain',
    },
    // We need to tell axios not to do anything (don't parse)
    transformResponse: [d => d],
  });
  return response.data;
}

type CommitResponse = {
  commitSha: string;
  username: string;
  repo: string;
  branch: string;
  path: string;
};
export async function fetchRepoInfo(
  username: string,
  repo: string,
  branch: string = 'master',
  path: string = ''
): Promise<CommitResponse> {
  try {
    const url = buildCommitsUrl(username, repo, branch, path);
    const response = await axios(url);
    return {
      commitSha: response.data.sha,
      username,
      repo,
      branch,
      path,
    };
  } catch (e) {
    // There is a chance that the branch contains slashes, we try to fix this
    // by requesting again with the first part of the path appended to the branch
    // when a request fails (404)
    if (e.response && e.response.status === 404) {
      const [branchAddition, ...newPath] = path.split('/');
      const newBranch = `${branch}/${branchAddition}`;

      if (branchAddition !== '') {
        return await fetchRepoInfo(
          username,
          repo,
          newBranch,
          newPath.join('/')
        );
      }

      e.message = NOT_FOUND_MESSAGE;
    }

    throw e;
  }
}
