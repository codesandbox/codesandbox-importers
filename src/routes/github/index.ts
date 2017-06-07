import { Context } from 'koa';

import extractGitRepository from './extract';
import createSandbox from './create-sandbox';

/**
 * This route will take a github path and create a sandbox from it.
 *
 * If the sandbox for the specified checkout tag already exists it will just return
 * that repository
 */
export default async (ctx: Context, next: () => Promise<any>) => {
  const { username, repo, branch, path } = ctx.params;

  const { directories, files } = await extractGitRepository(
    username,
    repo,
    branch,
    path,
  );

  const sandbox = await createSandbox(files, directories);

  ctx.body = sandbox;
};
