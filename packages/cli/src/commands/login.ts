import * as http from "http";
import * as inquirer from "inquirer";
import { omit } from "lodash";
import * as open from "open";
import ora = require("ora");

import * as cfg from "../cfg";

import * as api from "../utils/api";
import confirm from "../utils/confirm";
import { error, info } from "../utils/log";
import { LOGIN_URL as CLI_LOGIN_URL } from "../utils/url";

// TYPES
import * as Commander from "commander";

/**
 * Start the sign in process by opening CodeSandbox CLI login url, this page
 * will show a token that the user will have to fill in in the CLI
 *
 * @returns
 */
async function handleSignIn() {
  // Open specific url
  info(`Opening ${CLI_LOGIN_URL}`);
  open(CLI_LOGIN_URL, { wait: false });

  const { authToken } = await inquirer.prompt([
    {
      message: "Token:",
      name: "authToken",
      type: "input",
    },
  ]);

  // We got the token! Ask the server on authorization
  const spinner = ora("Fetching user...").start();
  try {
    const { token, user } = await api.verifyUser(authToken);

    // Save definite token and user to config
    spinner.text = "Saving user...";
    await cfg.saveUser(token, user);
    spinner.stop();

    return user;
  } catch (e) {
    spinner.stop();
    throw e;
  }
}

export async function login() {
  info("We will open CodeSandbox and show an authorization token.");
  info("You'll need enter this token in the CLI to sign in.");

  const confirmed = await confirm(
    "We will open CodeSandbox to finish the login process."
  );

  console.log();

  if (confirmed) {
    try {
      const user = await handleSignIn();

      info(`Succesfully signed in as ${user.username}!`);
    } catch (e) {
      error("Something went wrong while signing in: " + e.message);
    }
  }
}

export default function registerCLI(program: typeof Commander) {
  program
    .command("login")
    .description("sign in to your CodeSandbox account or create a new one")
    .option("-s", "don't ask for sign in if you're already signed in")
    .action(async (cmd) => {
      const user = await cfg.getUser();
      const silent = !!cmd.S;

      if (user) {
        if (silent) {
          return;
        }

        const confirmed = await confirm(
          "You are already logged in, would you like to sign out first?"
        );

        if (confirmed) {
          await cfg.deleteUser();
        } else {
          return;
        }
      }

      await login();
    });
}
