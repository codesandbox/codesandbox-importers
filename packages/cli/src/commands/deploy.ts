import * as chalk from 'chalk';
import * as Commander from 'commander';
import * as inquirer from 'inquirer';
import ora = require('ora');

import { getUser } from '../cfg';
import { uploadSandbox } from '../utils/api';
import confirm from '../utils/confirm';
import { error, info, log, success } from '../utils/log';
import { createSandboxUrl } from '../utils/url';
import { login } from './login';

import parseSandbox from '../utils/parse-sandbox';
import FileError from '../utils/parse-sandbox/file-error';

const MAX_MODULE_COUNT = 100;
const MAX_DIRECTORY_COUNT = 50;

/**
 * Show warnings for the errors that occured during mapping of files, we
 * still give the user to continue deployment without those files.
 *
 * @param {string} resolvedPath
 * @param {FileError[]} errors
 */
async function showWarnings(resolvedPath: string, errors: FileError[]) {
  if (errors.length > 0) {
    console.log();
    log(
      chalk.yellow(
        `There are ${chalk.bold(
          errors.length.toString()
        )} files that cannot be uploaded:`
      )
    );
    for (const err of errors) {
      const relativePath = err.path.replace(resolvedPath, '');

      log(`${chalk.yellow.bold(relativePath)}: ${err.message}`);
    }
  }

  console.log();
  log(
    chalk.yellow(
      'File hosting using the ' +
        chalk.bold('public') +
        ' folder is not supported yet.'
    )
  );
  console.log();
}

export default function registerCommand(program: typeof Commander) {
  program
    .command('deploy <path>')
    .alias('*')
    .description(
      `deploy an application to CodeSandbox ${chalk.bold('(default)')}`
    )
    .action(async path => {
      const user = await getUser();

      if (!user) {
        info('You need to sign in before you can deploy applications');
        const confirmed = await confirm('Do you want to sign in using GitHub?');

        if (!confirmed) {
          return;
        }

        await login();
      }

      info(`Deploying ${path} to CodeSandbox`);
      try {
        const {
          modules,
          directories,
          errors,
          externalResources,
          dependencies,
          resolvedPath,
        } = await parseSandbox(path);

        if (modules.length > MAX_MODULE_COUNT) {
          throw new Error(
            `This project is too big, it contains ${
              modules.length
            } files which is more than the max of ${MAX_MODULE_COUNT}.`
          );
        }

        if (directories.length > MAX_DIRECTORY_COUNT) {
          throw new Error(
            `This project is too big, it contains ${
              directories.length
            } directories which is more than the max of ${MAX_DIRECTORY_COUNT}.`
          );
        }

        // Show warnings for all errors
        await showWarnings(resolvedPath, errors);

        info(
          'By deploying to CodeSandbox, the code of your project will be made ' +
            chalk.bold('public')
        );
        const acceptPublic = await confirm(
          'Are you sure you want to proceed with the deployment?',
          true
        );
        if (!acceptPublic) {
          return;
        }

        const spinner = ora('Uploading to CodeSandbox').start();

        try {
          const sandbox = await uploadSandbox(
            modules,
            directories,
            externalResources,
            dependencies
          );
          spinner.stop();

          success(
            'Succesfully created the sandbox, you can find the sandbox here:'
          );
          success(createSandboxUrl(sandbox));
        } catch (e) {
          spinner.stop();

          error('Something went wrong while uploading to the API');
          error(e.message);
        }
      } catch (e) {
        error(e.message);
      }
    });
}
