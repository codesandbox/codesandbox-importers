import { Context } from 'koa';
import { extname, join } from 'path';

import extractGitRepository from './extract';
import { fetchRepoInfo, fetchContents } from './api';
import createSandbox from './create-sandbox';

export const info = async (ctx: Context, next: () => Promise<any>) => {
  const response = await fetchRepoInfo(
    ctx.params.username,
    ctx.params.repo,
    ctx.params.branch,
    ctx.params.path
  );

  ctx.body = response;
};

/**
 * When a file is given directly we want to use that file as main file for the
 * project it's in
 *
 * @param {string} username
 * @param {string} repo
 * @param {string} branch
 * @param {string} path
 * @returns
 */
async function extractGitRepoWithCustomIndex(
  username: string,
  repo: string,
  branch: string,
  path: string
) {
  // Find the root path of the project
  const splittedPath = path.split(`/src/`);

  splittedPath.pop();
  const rootPath = splittedPath[splittedPath.length - 1];

  const indexFile = (await fetchContents(
    username,
    repo,
    branch,
    path
  )) as Module;

  indexFile.path = join(rootPath, 'src', 'index.js');

  const { directories, files } = await extractGitRepository(
    username,
    repo,
    branch,
    rootPath,
    true
  );

  directories.push({
    download_url: '',
    git_url: '',
    name: 'src',
    path: join(rootPath, 'src'),
    files: [indexFile],
    directories: [],
    sha: '',
    size: 0,
    url: '',
    html_url: '',
    type: 'dir',
  });

  return { directories, files };
}

/**
 * This route will take a github path and return sandbox data for it
 *
 * Data contains all files, directories and package.json info
 */
export const data = async (ctx: Context, next: () => Promise<any>) => {
  // We get branch, etc from here because there could be slashes in a branch name,
  // we can retrieve if this is the case from this method
  const { commitSha, username, repo, branch, path } = ctx.params;

  let title = `${username}/${repo}`;
  if (path) {
    const splittedPath = path.split('/');
    title = title + `: ${splittedPath[splittedPath.length - 1]}`;
  }

  const pathIsFile = path && !!extname(path);

  const { directories, files } = await (pathIsFile
    ? extractGitRepoWithCustomIndex
    : extractGitRepository)(username, repo, branch, path);

  const sandboxParams = await createSandbox(files, directories);

  ctx.body = {
    ...sandboxParams,
    // If no title is set in package.json, go for this one
    title: sandboxParams.title || title,
  };
};
