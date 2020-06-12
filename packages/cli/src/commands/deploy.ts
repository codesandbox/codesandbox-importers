import chalk from "chalk";
import * as Commander from "commander";
import * as inquirer from "inquirer";
import * as filesize from "filesize";
import createSandbox from "codesandbox-import-utils/lib/create-sandbox";
import { join } from "path";

import { getUser } from "../cfg";
import { uploadSandbox } from "../utils/api";
import confirm from "../utils/confirm";
import { error, info, log, success } from "../utils/log";
import { createSandboxUrl } from "../utils/url";
import { login } from "./login";

import parseSandbox, { IUploads } from "../utils/parse-sandbox";
import FileError from "../utils/parse-sandbox/file-error";
import uploadFiles from "../utils/parse-sandbox/upload-files";

// tslint:disable no-var-requires
const ora = require("ora");
const MAX_MODULE_COUNT = 500;
const MAX_DIRECTORY_COUNT = 500;

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
        )} files that cannot be deployed:`
      )
    );
    for (const err of errors) {
      const relativePath = err.path.replace(resolvedPath, "");

      log(`${chalk.yellow.bold(relativePath)}: ${err.message}`);
    }
    console.log();
  }
}

async function showUploads(resolvedPath: string, uploads: IUploads) {
  if (Object.keys(uploads).length > 0) {
    console.log();
    log(
      chalk.blue(
        `We will upload ${
          Object.keys(uploads).length
        } static files to your CodeSandbox upload storage:`
      )
    );
    Object.keys(uploads).forEach((path) => {
      const relativePath = path.replace(resolvedPath, "");
      log(
        `${chalk.yellow.bold(relativePath)}: ${filesize(
          uploads[path].byteLength
        )}`
      );
    });
    console.log();
  }
}

export default function registerCommand(program: typeof Commander) {
  program
    .command("deploy <path>")
    .alias("*")
    .description(
      `deploy an application to CodeSandbox ${chalk.bold("(default)")}`
    )
    .action(async (path) => {
      const user = await getUser();

      if (!user) {
        info("You need to sign in before you can deploy applications");
        const confirmed = await confirm("Do you want to sign in using GitHub?");

        if (!confirmed) {
          return;
        }

        await login();
      }

      info(`Deploying ${path} to CodeSandbox`);
      try {
        let resolvedPath = join("./", path);

        if (resolvedPath.endsWith("/")) {
          resolvedPath = resolvedPath.slice(0, -1);
        }

        const fileData = await parseSandbox(resolvedPath);

        // Show files that will be uploaded
        await showUploads(resolvedPath, fileData.uploads);

        // Show warnings for all errors
        await showWarnings(resolvedPath, fileData.errors);

        info(
          "By deploying to CodeSandbox, the code of your project will be made " +
            chalk.bold("public")
        );

        const acceptPublic = await confirm(
          "Are you sure you want to proceed with the deployment?",
          true
        );
        if (!acceptPublic) {
          return;
        }

        let finalFiles = fileData.files;
        const spinner = ora("").start();
        if (Object.keys(fileData.uploads).length) {
          spinner.text = "Uploading files to CodeSandbox";

          const uploadedFiles = await uploadFiles(fileData.uploads);

          finalFiles = { ...finalFiles, ...uploadedFiles };
        }

        const sandbox = await createSandbox(finalFiles);

        if (sandbox.modules.length > MAX_MODULE_COUNT) {
          throw new Error(
            `This project is too big, it contains ${sandbox.modules.length} files which is more than the max of ${MAX_MODULE_COUNT}.`
          );
        }

        if (sandbox.directories.length > MAX_DIRECTORY_COUNT) {
          throw new Error(
            `This project is too big, it contains ${sandbox.directories.length} directories which is more than the max of ${MAX_DIRECTORY_COUNT}.`
          );
        }

        spinner.text = "Deploying to CodeSandbox";

        try {
          const sandboxData = await uploadSandbox(sandbox);

          spinner.stop();

          success(
            "Succesfully created the sandbox, you can find the sandbox here:"
          );
          success(createSandboxUrl(sandboxData));
        } catch (e) {
          spinner.stop();

          error("Something went wrong while uploading to the API");
          error(e.message);
        }
      } catch (e) {
        error(e.message);
      }
    });
}
