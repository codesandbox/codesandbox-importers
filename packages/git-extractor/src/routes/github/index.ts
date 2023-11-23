import * as Sentry from "@sentry/node";
import { IModule, INormalizedModules } from "codesandbox-import-util-types";
import createSandbox from "codesandbox-import-utils/lib/create-sandbox";
import { Context } from "koa";

import * as api from "./api";
import { getComparison } from "./api";
import { downloadRepository } from "./pull/download";
import * as push from "./push";
import { IChanges, IGitInfo } from "./push";

const getUserToken = (ctx: Context) => {
  const header = ctx.header.authorization;
  if (header) {
    if (header.startsWith("Bearer ")) {
      return header.replace("Bearer ", "");
    }
    return header;
  }

  return undefined;
};

export const info = async (ctx: Context, next: () => Promise<any>) => {
  const userToken = getUserToken(ctx);
  let branch = ctx.params.branch;

  if (!branch) {
    branch = await api.getDefaultBranch(
      ctx.params.username,
      ctx.params.repo,
      userToken
    );
  }

  const response = await api.fetchRepoInfo(
    ctx.params.username,
    ctx.params.repo,
    branch,
    ctx.params.path,
    false,
    userToken
  );

  ctx.body = response;
};

// We receive paths as "/src/index.js" and root path as "src", and Git takes
// "src/index.js", so we need to ensure we produce the correct paths
const changesWithRootPath = (changes: IChanges, rootPath = ""): IChanges => {
  const convertPath = (path: string) => {
    if (rootPath) {
      return rootPath + path;
    }

    return path.substr(1);
  };
  return {
    added: changes.added.map((change) => ({
      ...change,
      path: convertPath(change.path),
    })),
    deleted: changes.deleted.map(convertPath),
    modified: changes.modified.map((change) => ({
      ...change,
      path: convertPath(change.path),
    })),
  };
};

export const pullInfo = async (ctx: Context, next: () => Promise<any>) => {
  const userToken = getUserToken(ctx);

  ctx.body = await api.fetchPullInfo(
    ctx.params.username,
    ctx.params.repo,
    ctx.params.pull,
    userToken
  );
};

export const getRights = async (ctx: Context) => {
  const userToken = getUserToken(ctx);

  const rights = await api.fetchRights(
    ctx.params.username,
    ctx.params.repo,
    userToken
  );

  ctx.body = {
    permission: rights,
  };
};

/**
 * This route will take a github path and return sandbox data for it
 *
 * Data contains all files, directories and package.json info
 */
export const data = async (ctx: Context, next: () => Promise<any>) => {
  try {
    // We get branch, etc from here because there could be slashes in a branch name,
    // we can retrieve if this is the case from this method
    let { username, repo, branch, commitSha } = ctx.params;
    const userToken = getUserToken(ctx);

    Sentry.setContext("repo", {
      username,
      repo,
      branch,
      commitSha,
    });

    const path = ctx.params.path && ctx.params.path.replace("+", " ");

    let title = `${username}/${repo}`;
    if (path) {
      const splittedPath = path.split("/");
      title = title + `: ${splittedPath[splittedPath.length - 1]}`;
    }

    let isPrivate = false;

    if (userToken) {
      isPrivate = await api.isRepoPrivate(username, repo, userToken);
    }

    if (!branch) {
      branch = await api.getDefaultBranch(username, repo, userToken);
    }

    const downloadedFiles = await downloadRepository(
      {
        username,
        repo,
        branch,
        path,
      },
      commitSha,
      isPrivate,
      userToken
    );

    if (isPrivate) {
      api.resetShaCache({ branch, username, repo, path });
    }

    console.log(
      `Creating sandbox for ${username}/${repo}, branch: ${branch}, path: ${path}`
    );

    const sandboxParams = await createSandbox(downloadedFiles);

    const finalTitle = sandboxParams.title || title;

    ctx.body = {
      ...sandboxParams,
      // If no title is set in package.json, go for this one
      title: finalTitle,

      // Privacy 2 is private, privacy 0 is public
      privacy: isPrivate ? 2 : 0,
    };
  } catch (e) {
    // Here we catch our false, preemptive rate limit and give it a proper error status code for the server.
    if (
      e.message == "Can't make axios requests, not enough rate limit remaining"
    ) {
      ctx.body = {
        error: "Can't make axios requests, not enough rate limit remaining",
      };
      ctx.status = 403;
    } else {
      throw e;
    }
  }
};

/*
  Compares two refs on the repo
*/
export const compare = async (ctx: Context) => {
  const { baseRef, headRef, token, includeContents } = ctx.request.body;
  const { username, repo } = ctx.params;

  const comparison = await getComparison(
    username,
    repo,
    baseRef,
    headRef,
    token
  );

  if (includeContents) {
    const files = await Promise.all(
      comparison.files.map(
        ({
          additions,
          changes,
          contents_url,
          deletions,
          filename,
          status,
          patch,
          sha,
        }) => {
          return api.getContent(contents_url, token).then((content) => {
            const data = content.content;
            const buffer = Buffer.from(data, content.encoding);

            let stringContent: string;

            // If patch it is a text file, if not it is a binary
            if (patch) {
              stringContent = buffer.toString("utf-8");
            } else {
              // When we include binary files, we include them as base64. This will allow a "merge commit", related to
              // a PR being out of sync with its source branch (ex. "master"), to add binary files
              stringContent = buffer.toString("base64");
            }

            return {
              additions,
              changes,
              deletions,
              filename,
              status,
              content: stringContent,
              isBinary: !patch,
            };
          });
        }
      )
    );

    ctx.body = {
      files,
      baseCommitSha: comparison.base_commit.sha,
      headCommitSha: comparison.commits.length
        ? comparison.commits[comparison.commits.length - 1].sha
        : comparison.merge_base_commit.sha,
    };
  } else {
    ctx.body = {
      files: comparison.files.map(
        ({ additions, status, filename, deletions, changes }) => ({
          additions,
          status,
          filename,
          deletions,
          changes,
        })
      ),
      baseCommitSha: comparison.base_commit.sha,
      headCommitSha: comparison.commits.length
        ? comparison.commits[0].sha
        : comparison.merge_base_commit.sha,
    };
  }
};

export const pr = async (ctx: Context) => {
  const {
    changes,
    title,
    description,
    commitSha,
    currentUser,
    token,
    sandboxId,
  }: {
    changes: IChanges;
    title: string;
    description: string;
    commitSha: string;
    currentUser: string;
    token: string;
    sandboxId: string;
  } = ctx.request.body;
  const { username, repo, branch, path } = ctx.params;

  let gitInfo: IGitInfo = {
    username,
    repo,
    branch,
    path,
  };

  const rights = await api.fetchRights(username, repo, token);

  if (rights === "none" || rights === "read") {
    // Ah, we need to fork...
    gitInfo = await push.createFork(gitInfo, currentUser, token);
  }

  const commit = await push.createInitialCommit(
    gitInfo,
    changesWithRootPath(changes, path),
    [commitSha],
    token
  );

  const res = await push.createBranch(
    gitInfo,
    commit.sha,
    token,
    `csb-${sandboxId}`
  );
  const base = {
    branch,
    repo,
    username,
  };
  const head = {
    branch: res.branchName,
    repo: gitInfo.repo,
    username: gitInfo.username,
  };

  ctx.body = await api.createPr(base, head, title, description, token);
};

export const commit = async (ctx: Context) => {
  const { parentCommitShas, changes, message, token } = ctx.request.body;
  const { username, repo, branch, path } = ctx.params;

  const gitInfo: IGitInfo = {
    username,
    repo,
    branch,
    path,
  };

  const commit = await push.createCommit(
    gitInfo,
    changesWithRootPath(changes, path),
    parentCommitShas,
    message,
    token
  );

  await api.updateReference(username, repo, branch, commit.sha, token);

  ctx.body = commit;
};

export const repo = async (ctx: Context, next: () => Promise<any>) => {
  const {
    token,
    normalizedFiles: fileArray,
    privateRepo,
  }: {
    token: string;
    normalizedFiles: Array<IModule & { path: string }>;
    privateRepo?: boolean;
  } = ctx.request.body;
  const { username, repo } = ctx.params;

  const normalizedFiles: INormalizedModules = fileArray.reduce(
    (total, file) => ({
      ...total,
      [file.path]: file,
    }),
    {}
  );

  if (!repo) {
    throw new Error("Repo name cannot be empty");
  }

  const result = await push.createRepo(
    username,
    repo,
    normalizedFiles,
    token,
    privateRepo
  );

  ctx.body = result;
};
