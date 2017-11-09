import { Context } from 'koa';
import { extname, basename, dirname, join } from 'path';

import { downloadRepository } from './pull/download';
import createSandbox from './pull/create-sandbox';
import {
  fetchRepoInfo,
  fetchContents,
  fetchRights,
  fetchCode,
  resetShaCache,
} from './api';

import * as push from './push';

import normalizeSandbox from '../../utils/sandbox/normalize';

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

  const isFilePath = path && !!extname(path);

  const downloadedFiles = await downloadRepository({
    commitSha,
    username,
    repo,
    branch,
    path,
  });

  const sandboxParams = await createSandbox(downloadedFiles);

  let finalTitle = sandboxParams.title || title;

  if (isFilePath) {
    const relativePath = path.split('src/').pop();
    if (relativePath) {
      if (basename(relativePath) === 'index.js') {
        finalTitle = dirname(relativePath)
          .split('/')
          .pop();
      } else {
        finalTitle = basename(relativePath);
      }
    }
  }

  ctx.body = {
    ...sandboxParams,
    // If no title is set in package.json, go for this one
    title: finalTitle,
  };
};

export const diff = async (ctx: Context, next: () => Promise<any>) => {
  const { username, repo, branch, path } = ctx.params;
  const {
    modules,
    directories,
    commitSha,
    currentUser,
    token,
  } = ctx.request.body;
  const normalizedFiles = normalizeSandbox(modules, directories);

  const [delta, rights] = await Promise.all([
    push.getFileDifferences(
      { username, commitSha, repo, branch, path },
      normalizedFiles
    ),
    fetchRights(username, repo, currentUser, token),
  ]);

  ctx.body = {
    added: delta.added,
    modified: delta.modified,
    deleted: delta.deleted,
    rights,
  };
};

export const commit = async (ctx: Context, next: () => Promise<any>) => {
  const { username, repo, branch, path } = ctx.params;
  const { modules, directories, commitSha, message, token } = ctx.request.body;
  const normalizedFiles = normalizeSandbox(modules, directories);

  const response = await push.createCommit(
    { username, commitSha, repo, branch, path },
    normalizedFiles,
    message,
    token
  );

  // On the client we redirect to the original git sandbox, so we want to
  // reset the cache so the user sees the latest version
  resetShaCache({ username, repo, branch, path, commitSha });

  ctx.body = {
    url: response.url,
  };
};
