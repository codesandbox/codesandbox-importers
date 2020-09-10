import * as fs from "fs";
import { basename, dirname } from "path";

/* tslint:disable no-var-requires */
const branch = require("git-branch");
const username = require("git-username");
const repoName = require("git-repo-name");
/* tslint:enable */

export interface IOptions {
  examplePath?: string;
  openedModule?: string;
  fontSize?: number;
  highlightedLines?: number[];
  editorSize?: number;
  view?: "editor" | "preview";
  hideNavigation?: boolean;
  currentModuleView?: boolean;
  autoResize?: boolean;
  useCodeMirror?: boolean;
  enableEslint?: boolean;
  forceRefresh?: boolean;
  expandDevTools?: boolean;
  initialPath?: string;
  gitRepo?: string;
  gitUsername?: string;
  gitBranch?: string;
}

function optionsToParameterizedUrl(options: { [option: string]: any }) {
  const keyValues = Object.keys(options)
    .sort()
    .filter((x) => options[x])
    .map(
      (key) => `${encodeURIComponent(key)}=${encodeURIComponent(options[key])}`
    )
    .join("&");

  return keyValues ? `?${keyValues}` : "";
}

function getUrlOptions(options: IOptions) {
  const {
    view,
    autoResize,
    hideNavigation,
    currentModuleView,
    fontSize,
    initialPath,
    enableEslint,
    useCodeMirror,
    expandDevTools,
    forceRefresh,
    openedModule,
  } = options;

  const results: { [option: string]: any } = {};

  results.module = openedModule;
  results.view = view;
  results.initialpath = initialPath;

  if (autoResize) {
    results.autoresize = 1;
  }

  if (hideNavigation) {
    results.hidenavigation = 1;
  }

  if (currentModuleView) {
    results.moduleview = 1;
  }

  if (enableEslint) {
    results.eslint = 1;
  }

  if (expandDevTools) {
    results.expanddevtools = 1;
  }

  if (useCodeMirror) {
    results.codemirror = 1;
  }

  if (forceRefresh) {
    results.forcerefresh = 1;
  }

  if (fontSize !== 14) {
    results.fontsize = fontSize;
  }

  if (initialPath) {
    results.initialpath = initialPath;
  }

  if (expandDevTools) {
    results.expanddevtools = 1;
  }

  return optionsToParameterizedUrl(results);
}

const CODESANDBOX_ROOT = `https://codesandbox.io`;

function findGitRoot() {
  let currentPath = __dirname;

  while (
    !fs.readdirSync(currentPath).find((f) => basename(f) === ".git") &&
    currentPath !== "/"
  ) {
    currentPath = dirname(currentPath);
  }

  if (currentPath === "/") {
    throw new Error("Could not find .git folder");
  }

  return currentPath;
}

function getRepoPath(options: IOptions) {
  const gitPath = findGitRoot();
  let currentBranch;
  let currentUsername;
  const currentRepo = options.gitRepo || repoName.sync(gitPath);

  // Check whether the build is happening on Netlify
  if (process.env.REPOSITORY_URL) {
    const usernameParts = process.env.REPOSITORY_URL.match(
      /github.com[:|\/](.*)\/reactjs\.org/
    );

    if (usernameParts) {
      currentUsername = usernameParts[1];
    }
    currentBranch = process.env.BRANCH;
  } else {
    currentBranch = branch.sync(gitPath);
    currentUsername = username(gitPath);
  }

  currentBranch = currentBranch || options.gitBranch;
  currentUsername = currentUsername || options.gitUsername;

  if (!currentBranch) {
    throw new Error("Could not fetch branch from the git info.");
  }
  if (!currentUsername) {
    throw new Error("Could not fetch username from the git info.");
  }
  if (!currentRepo) {
    throw new Error("Could not fetch repository from the git info.");
  }

  let path = `${currentUsername}/${currentRepo}/tree/${currentBranch}`;

  if (options.examplePath) {
    path += "/" + options.examplePath;
  }

  return path;
}

function getFullUrl(type: "s" | "embed", options: IOptions) {
  const gitPath = getRepoPath(options);
  const urlOptions = getUrlOptions(options);

  return `${CODESANDBOX_ROOT}/${type}/github/${gitPath}${urlOptions}`;
}

export function getSandboxUrl(options?: IOptions) {
  return getFullUrl("s", options || {});
}

export function getEmbedUrl(options?: IOptions) {
  return getFullUrl("embed", options || {});
}
