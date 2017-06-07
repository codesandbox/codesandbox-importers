import axios from 'axios';

const BASE_URL = 'https://api.github.com/repos';

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

function buildContentsUrl(
  username: string,
  repo: string,
  branch: string,
  path: string,
) {
  return `${BASE_URL}/${username}/${repo}/contents/${path}?client_id=${GITHUB_CLIENT_ID}&client_secret=${GITHUB_CLIENT_SECRET}&ref=${branch}`;
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
  path: string = '',
): Promise<Response> {
  try {
    const url = buildContentsUrl(username, repo, branch, path);
    const response = await axios.get(url);

    return response.data;
  } catch (e) {
    if (e.response && e.response.status === 404) {
      throw new Error('Could not find the specified repository or directory');
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
