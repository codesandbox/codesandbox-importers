import { generate as generateShortid } from 'shortid';
import { pickBy } from 'lodash';
import { join } from 'path';

import { INormalizedModules, IModule } from '../normalize';
import denormalize, { ISandboxFile, ISandboxDirectory } from '../denormalize';

import mapDependencies from './dependency-mapper';
import getDependencyRequiresFromFiles from './dependency-analyzer';
import parseHTML from './html-parser';
import { getMainFile, getTemplate, ITemplate } from './templates';

import log from '../../log';

interface IDependencies {
  [name: string]: string;
}

/**
 * Get which dependencies are needed and map them to the latest version, needs
 * files to determine which devDependencies are used in the code.
 *
 * @param packageJSON PackageJSON containing all dependencies
 * @param files files with code about which dependencies are used
 */
async function getDependencies(
  packageJSON: {
    dependencies: { [key: string]: string };
    devDependencies: { [key: string]: string };
  },
  files: INormalizedModules
) {
  const { dependencies = {}, devDependencies = {} } = packageJSON;

  const dependenciesInFiles = getDependencyRequiresFromFiles(files);

  // Filter the devDependencies that are actually used in files
  const depsToMatch = pickBy(devDependencies, (_, key) =>
    dependenciesInFiles.some(dep => dep.startsWith(key))
  ) as IDependencies;

  // Exclude some dependencies that are not needed in CodeSandbox
  const alteredDependencies = await mapDependencies({
    ...dependencies,
    ...depsToMatch,
  });
  return alteredDependencies;
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
  if (directory['src/index.js']) {
    return 'src/index.js';
  }
  if (directory['index.js']) {
    return 'index.js';
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
export default async function createSandbox(directory: INormalizedModules) {
  const packageJson = directory['package.json'];
  if (!packageJson) throw new Error('Could not find package.json');

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
  const dependencies = await getDependencies(packageJsonPackage, directory);

  const { modules, directories } = denormalize(directory);

  log('Creating sandbox with template ' + template);

  return {
    title: packageJsonPackage.title || packageJsonPackage.name,
    description: packageJsonPackage.description,
    tags: packageJsonPackage.keywords || [],
    modules,
    directories,
    npmDependencies: dependencies,
    externalResources: [],
    template,
    entry: mainFile,
  };
}
