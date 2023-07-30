import {
  INormalizedModules,
  IModule,
  ISandbox,
  ITemplate,
} from "codesandbox-import-util-types";
import denormalize from "../utils/files/denormalize";

import parseHTML from "./html-parser";
import { getMainFile, getTemplate } from "./templates";

interface IDependencies {
  [name: string]: string;
}

function getHTMLInfo(html: IModule | undefined) {
  if (!html) {
    return { externalResources: [], file: null };
  }

  const { externalResources } = parseHTML(html.content);

  return { externalResources, file: html };
}

function findMainFile(
  directory: INormalizedModules,
  mainFile: string,
  template: ITemplate
) {
  if (directory[mainFile]) {
    return mainFile;
  }
  if (directory[getMainFile(template)]) {
    return getMainFile(template);
  }
  if (directory["src/index.js"]) {
    return "src/index.js";
  }
  if (directory["index.js"]) {
    return "index.js";
  }

  return mainFile || getMainFile(template);
}

const CLOUD_TEMPLATES = [
  "adonis",
  "vue-cli",
  "svelte",
  "angular-cli",
  "cxjs",
  "gatsby",
  "nuxt",
  "next",
  "reason",
  "apollo",
  "sapper",
  "ember",
  "nest",
  "styleguidist",
  "gridsome",
  "vuepress",
  "mdx-deck",
  "quasar",
  "docusaurus",
  "remix",
  "node",
];
function isCloudTemplate(template: ITemplate): boolean {
  return CLOUD_TEMPLATES.indexOf(template) > -1;
}

function getSandboxMetadata(
  directory: INormalizedModules
): {
  title: string;
  description: string;
  tags: string[];
  iconUrl?: string;
} {
  const packageJson = directory["package.json"];
  if (packageJson && packageJson.type === "directory") {
    throw new Error("package.json is a directory");
  }

  let packageJsonPackage = packageJson ? JSON.parse(packageJson.content) : null;

  const packageJsonInfo = {
    title: packageJsonPackage?.title || packageJsonPackage?.name,
    description: packageJsonPackage?.description,
    tags: packageJsonPackage?.keywords || [],
    iconUrl: packageJsonPackage?.iconUrl,
  };

  const templateInfo = directory[".codesandbox/template.json"];
  if (templateInfo && "content" in templateInfo) {
    const content = JSON.parse(templateInfo.content);

    return {
      title: content.title || packageJsonInfo.title,
      description: content.description || packageJsonInfo.description,
      tags: content.tags || packageJsonInfo.tags,
      iconUrl: content.iconUrl || packageJsonInfo.iconUrl,
    };
  }

  return packageJsonInfo;
}

/**
 * Creates all relevant data for create a sandbox, like dependencies and which
 * files are in a sandbox
 *
 * @export SandboxObject
 * @param {Array<Module>} files
 * @param {Array<Module>} directories
 */
export default async function createSandbox(
  directory: INormalizedModules
): Promise<ISandbox> {
  const packageJson = directory["package.json"];
  if (packageJson && packageJson.type === "directory") {
    throw new Error("package.json is a directory");
  }

  let packageJsonPackage = packageJson ? JSON.parse(packageJson.content) : null;
  let template = getTemplate(packageJsonPackage, directory);

  if (template === undefined) {
    console.log("Got undefined template, defaulting to 'create-react-app'");

    template = "create-react-app";
  } else {
    console.log(`Creating sandbox with template '${template}'`);
  }

  packageJsonPackage = packageJsonPackage || { main: "/index.html" };

  const mainFileUnix = findMainFile(
    directory,
    packageJsonPackage.main,
    template
  );
  const mainFile =
    process.platform === "win32"
      ? mainFileUnix.replace(/\//g, "\\")
      : mainFileUnix;

  // Give the sandboxModules to getDependencies to fetch which devDependencies
  // are used in the code
  const metadata = getSandboxMetadata(directory);

  const { modules, directories } = denormalize(directory);

  return {
    title: metadata.title,
    description: metadata.description,
    tags: metadata.tags,
    modules,
    directories,
    externalResources: [],
    template,
    entry: mainFile,
    v2: isCloudTemplate(template),
    templateParams: metadata.iconUrl
      ? {
          iconUrl: metadata.iconUrl,
        }
      : undefined,
  };
}
