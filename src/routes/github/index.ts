import { Context } from 'koa';

import extractGitRepository from './extract';
import { fetchRepoInfo } from './api';
import createSandbox from './create-sandbox';

async function getGitRepository(
  username: string,
  repo: string,
  branch: string,
  path: string,
) {
  const { directories, files } = await extractGitRepository(
    username,
    repo,
    branch,
    path,
  );

  const sandboxParams = await createSandbox(files, directories);

  return sandboxParams;
}

export const info = async (ctx: Context, next: () => Promise<any>) => {
  const response = await fetchRepoInfo(
    ctx.params.username,
    ctx.params.repo,
    ctx.params.branch,
    ctx.params.path,
  );

  ctx.body = response;
};

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

  const sandboxParams = await getGitRepository(username, repo, branch, path);
  ctx.body = {
    ...sandboxParams,
    // If no title is set in package.json, go for this one
    title: sandboxParams.title || title,
  };
};
