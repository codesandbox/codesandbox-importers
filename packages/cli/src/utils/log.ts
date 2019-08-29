import chalk from "chalk";

export function log(text = "") {
  console.log(`> ${text}`);
}

export function logCodeSandbox() {
  console.log(
    `  ${chalk.blue.bold("Code")}${chalk.yellow.bold("Sandbox")} ${chalk.bold(
      "CLI"
    )}`
  );
  console.log("  The official CLI for uploading projects to CodeSandbox");
}

export function extraHelp() {
  console.log("");
  console.log("  Notes:");
  console.log();
  console.log("    - You can only use the CLI if you are logged in");
  console.log();

  console.log("  Examples:");
  console.log("");
  console.log(chalk.gray("    Deploy current directory:"));
  console.log();
  console.log("    $ codesandbox ./");
  console.log();
  console.log(chalk.gray("    Deploy custom directory:"));
  console.log();
  console.log("    $ codesandbox /usr/src/project");
  console.log("");
}

export function info(text: string) {
  log(chalk.blue(text));
}

export function error(text: string) {
  console.log();
  log(chalk.red(`[error] ${text}`));
  console.log();
}

export function warn(text: string) {
  log(chalk.yellow(`[warn] ${text}`));
}

export function success(text: string) {
  log(chalk.green(`[success] ${text}`));
}
