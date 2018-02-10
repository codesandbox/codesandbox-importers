import * as chalk from 'chalk';
import * as fs from 'fs-extra';
import * as inquirer from 'inquirer';
import * as path from 'path';

import mapDependencies from './dependency-mapper';
import FileError from './file-error';
import mapFiles, { ISandboxDirectory, ISandboxModule } from './file-mapper';
import parseHTML from './html-parser';

/**
 * Return package.json object
 *
 * @param {string} projectPath
 * @returns
 */
async function getPackageJSON(projectPath: string) {
  const packageJSONPath = path.join(projectPath, 'package.json');
  const fileExists = await fs.exists(packageJSONPath);
  if (!fileExists) {
    throw new Error(`The project doesn't have a package.json.`);
  }

  return fs.readJson(packageJSONPath);
}

/**
 * Validates the existence of the specified file
 *
 * @param {string} projectPath Path to project
 * @param {string} checkPath Absolute path to file to check
 */
async function validateExistance(projectPath: string, checkPath: string) {
  const fileExists = await fs.exists(checkPath);

  if (!fileExists) {
    const friendlyPath = checkPath.replace(projectPath, './');
    throw new Error(`The project doesn't contain a ${friendlyPath}`);
  }
}

/**
 * Return public/index.html contents
 *
 * @param {string} projectPath
 */
async function getIndexHTML(projectPath: string) {
  const indexHTMLPath = path.join(projectPath, 'public', 'index.html');
  const fileExists = await fs.exists(indexHTMLPath);
  if (!fileExists) {
    return '';
  }

  return fs.readFileSync(indexHTMLPath) || '';
}

/**
 * This will take a path and return all parameters that are relevant for the call
 * to the CodeSandbox API fir creating a sandbox
 *
 * @export
 * @param {string} path
 */
export default async function parseSandbox(projectPath: string) {
  const resolvedPath = path.join(process.cwd(), projectPath);

  const dirExists = await fs.exists(resolvedPath);
  if (!dirExists) {
    throw new Error(`The given path (${resolvedPath}) doesn't exist.`);
  }

  const packageJSON = await getPackageJSON(resolvedPath);

  // Check if src/index.js exists
  await validateExistance(
    resolvedPath,
    path.join(resolvedPath, 'src', 'index.js')
  );

  const indexHTML = await getIndexHTML(resolvedPath);

  const dependencies = await mapDependencies(packageJSON.dependencies);
  const { body, externalResources } = parseHTML(indexHTML.toString());

  const { directories, modules, errors } = await mapFiles(
    path.join(resolvedPath, 'src'),
    body
  );

  return {
    dependencies,
    directories,
    errors,
    externalResources,
    modules,
    resolvedPath,
  };
}
