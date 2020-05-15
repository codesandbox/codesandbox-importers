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
  const response = await api.fetchRepoInfo(
    ctx.params.username,
    ctx.params.repo,
    ctx.params.branch,
    ctx.params.path,
    false,
    userToken
  );

  ctx.body = response;
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
  // We get branch, etc from here because there could be slashes in a branch name,
  // we can retrieve if this is the case from this method
  const { username, repo, branch, commitSha, currentUsername } = ctx.params;
  const userToken = getUserToken(ctx);

  const path = ctx.params.path && ctx.params.path.replace("+", " ");

  let title = `${username}/${repo}`;
  if (path) {
    const splittedPath = path.split("/");
    title = title + `: ${splittedPath[splittedPath.length - 1]}`;
  }

  const downloadedFiles = await downloadRepository(
    {
      username,
      repo,
      branch,
      path,
    },
    commitSha,
    userToken
  );

  let isPrivate = false;

  if (userToken) {
    isPrivate = await api.isRepoPrivate(username, repo, userToken);
  }

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
        ({ additions, changes, contents_url, deletions, filename, status }) => {
          return api.getContent(contents_url, token).then((content) => {
            const data = content.content;
            const buffer = Buffer.from(data, content.encoding);

            return {
              additions,
              changes,
              deletions,
              filename,
              status,
              content: buffer.toString("utf-8"),
            };
          });
        }
      )
    );

    ctx.body = {
      files,
      baseCommitSha: comparison.base_commit.sha,
      headCommitSha: comparison.merge_base_commit.sha,
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
      headCommitSha: comparison.merge_base_commit.sha,
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

  const relativeChanges: IChanges = {
    added: changes.added.map((change) => ({
      ...change,
      path: `${gitInfo.path ? gitInfo.path : ""}${change.path}`,
    })),
    modified: changes.modified.map((change) => ({
      ...change,
      path: `${gitInfo.path ? gitInfo.path : ""}${change.path}`,
    })),
    deleted: changes.deleted.map(
      (path) => `${gitInfo.path ? gitInfo.path : ""}${path}`
    ),
  };

  const rights = await api.fetchRights(username, repo, token);

  if (rights === "none" || rights === "read") {
    // Ah, we need to fork...
    gitInfo = await push.createFork(gitInfo, currentUser, token);
  }

  const commit = await push.createInitialCommit(
    gitInfo,
    relativeChanges,
    commitSha,
    token
  );

  const res = await push.createBranch(gitInfo, commit.sha, token, sandboxId);
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
  const { parent_commit_shas, changes, message, token } = ctx.request.body;
  const { username, repo, branch, path } = ctx.params;

  const gitInfo: IGitInfo = {
    username,
    repo,
    branch,
    path,
  };

  const commit = await push.createCommit(
    gitInfo,
    changes,
    parent_commit_shas,
    message,
    token
  );

  await api.updateReference(username, repo, branch, commit.sha, token);

  ctx.body = commit;
};

export const repo = async (ctx: Context, next: () => Promise<any>) => {
  const {
    token,
    changes,
    privateRepo,
  }: {
    token: string;
    changes: IChanges;
    privateRepo?: boolean;
  } = ctx.request.body;
  const { username, repo } = ctx.params;

  if (!repo) {
    throw new Error("Repo name cannot be empty");
  }

  const result = await push.createRepo(
    username,
    repo,
    changes,
    token,
    privateRepo
  );

  ctx.body = result;
};
