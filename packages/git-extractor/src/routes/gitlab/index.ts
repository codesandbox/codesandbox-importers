import { Context } from "koa";
import { extname, basename, dirname, join } from "path";
import createSandbox from "codesandbox-import-utils/lib/create-sandbox";

import { downloadRepository } from "./pull/download";
import * as api from "./api";

const getUserToken = (ctx: Context) => {
  const header = ctx.header.authorization;
  if (header) {
    return header;
  }

  return undefined;
};


export const info = async (ctx: Context, next: () => Promise<any>) => {
  const userToken = getUserToken(ctx);
  const response = await api.fetchRepoInfo(
    ctx.params.username,
    ctx.params.repo,
    ctx.params.branch,
    false,
    userToken
  );

  ctx.body = response;
};

export interface IGitInfo {
  username: string
  repo: string
  branch: string
  path?: string
}

import normalizeSandbox, {
  IModule,
  INormalizedModules
} from "../../utils/sandbox/normalize";

/**
 * This route will take a github path and return sandbox data for it
 *
 * Data contains all files, directories and package.json info
 */
export const data = async (ctx: Context, next: () => Promise<any>) => {
  // We get branch, etc from here because there could be slashes in a branch name,
  // we can retrieve if this is the case from this method
  const { username, repo, branch, commitSha, currentUsername } = ctx.params;
  const userToken = getUserToken(ctx);

  const title = `${username}/${repo}`;

  const downloadedFiles = await downloadRepository(
    {
      username,
      repo,
      branch
    },
    commitSha,
    userToken
  );

  const sandboxParams = await createSandbox(downloadedFiles);

  const finalTitle = sandboxParams.title || title;

  ctx.body = {
    ...sandboxParams,
    // If no title is set in package.json, go for this one
    title: finalTitle,

    // Privacy 2 is private, privacy 0 is public
    privacy: 0
  };
};
