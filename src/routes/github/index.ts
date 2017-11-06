import { Context } from 'koa';
import { extname, basename, dirname, join } from 'path';

import extractGitRepository, { extractDirectory } from './pull/extract';
import { downloadExtractedFiles } from './pull/download';
import createSandbox from './pull/create-sandbox';
import { fetchRepoInfo, fetchContents } from './api';

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

  const fileData = await extractGitRepository(username, repo, branch, path);
  const downloadedFiles = await downloadExtractedFiles(fileData);

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
  const { modules, directories, commitSha } = ctx.request.body.sandbox;
  const normalizedFiles = normalizeSandbox(modules, directories);

  const delta = await push.getFileDifferences(
    '',
    {
      user: username,
      commitSha,
      repo,
      branch,
      path,
    },
    normalizedFiles
  );

  ctx.body = {
    status: 'ok',
    delta,
  };
};
