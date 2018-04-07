import { generate as generateShortid } from "shortid";
import { pickBy } from "lodash";
import { join } from "path";

import {
  INormalizedModules,
  IModule,
  ISandboxFile,
  ISandboxDirectory,
  ISandbox,
  ITemplate
} from "codesandbox-import-util-types";
import denormalize from "./denormalize";

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
  if (!packageJson) throw new Error("Could not find package.json");

  const packageJsonPackage = JSON.parse(packageJson.content);

  const template = getTemplate(packageJsonPackage, directory);
  const mainFile = findMainFile(directory, packageJsonPackage.main, template);

  if (!directory[mainFile]) {
    throw new Error(
      `Cannot find the specified entry point: '${mainFile}'. Please specify one in 'package.json#main' or create a file at the specified entry point.`
    );
  }
  // Give the sandboxModules to getDependencies to fetch which devDependencies
  // are used in the code

  const { modules, directories } = denormalize(directory);

  return {
    title: packageJsonPackage.title || packageJsonPackage.name,
    description: packageJsonPackage.description,
    tags: packageJsonPackage.keywords || [],
    modules,
    directories,
    externalResources: [],
    template,
    entry: mainFile
  };
}
