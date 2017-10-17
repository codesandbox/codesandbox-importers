import { Context } from 'koa';
import { extname, basename, dirname, join } from 'path';

import extractGitRepository, { extractDirectory } from './extract';
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
  const splittedPath = path.split(`src/`);

  const filePath = splittedPath.pop();
  const rootPath = splittedPath[splittedPath.length - 1];

  if (rootPath == null) {
    throw new Error("The given path doesn't include a 'src' folder.");
  }

  let sourceDirectory;
  // It's index.js, so we only change the source folder
  if (filePath && basename(filePath) === 'index.js') {
    // Change source folder to according folder
    const sourceDirectory = join('src', dirname(filePath));

    const { directories, files } = await extractGitRepository(
      username,
      repo,
      branch,
      rootPath,
      sourceDirectory
    );

    const fetchedDirectory = (await fetchContents(
      username,
      repo,
      branch,
      sourceDirectory
    )) as Module;

    return { directories, files };
  } else {
    // Okay, random file (eg. src/koe/test.js), then we change the scenario to be
    // src/index.js
    const indexFile = (await fetchContents(
      username,
      repo,
      branch,
      path
    )) as Module;

    indexFile.path = join(rootPath, 'src', 'index.js');
    indexFile.name = 'index.js';

    const { directories, files } = await extractGitRepository(
      username,
      repo,
      branch,
      rootPath,
      ''
    );
    directories.push({
      name: 'src',
      path: join(rootPath, 'src'),
      files: [indexFile],
      directories: [],
    });

    return { directories, files };
  }
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

  const isFilePath = path && !!extname(path);

  const { directories, files } = await (isFilePath
    ? extractGitRepoWithCustomIndex
    : extractGitRepository)(username, repo, branch, path);

  const sandboxParams = await createSandbox(files, directories);

  let finalTitle = sandboxParams.title || title;

  if (isFilePath) {
    const relativePath = path.split('src/').pop();
    finalTitle = finalTitle + '/' + relativePath;
  }

  ctx.body = {
    ...sandboxParams,
    // If no title is set in package.json, go for this one
    title: finalTitle,
  };
};
