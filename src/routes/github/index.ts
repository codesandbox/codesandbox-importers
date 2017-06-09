import { Context } from 'koa';

import { decamelizeKeys } from 'humps';

import extractGitRepository from './extract';
import { fetchLastCommitSha } from './api';
import createSandbox from './create-sandbox';

/**
 * This route will take a github path and create a sandbox from it.
 *
 * If the sandbox for the specified checkout tag already exists it will just return
 * that repository
 */
export default async (ctx: Context, next: () => Promise<any>) => {
  const { username, repo, branch, path } = ctx.params;

  const commitSha = await fetchLastCommitSha(username, repo, branch, path);

  const { directories, files } = await extractGitRepository(
    username,
    repo,
    branch,
    path,
  );

  const sandboxParams = await createSandbox(files, directories);

  ctx.body = decamelizeKeys(sandboxParams);
};
