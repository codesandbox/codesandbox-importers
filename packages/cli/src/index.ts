#!/usr/bin/env node
import * as program from "commander";
import * as updateNotifier from "update-notifier";

// Commands
import deployCommand from "./commands/deploy";
import loginCommand from "./commands/login";
import logoutCommand from "./commands/logout";
import tokenCommand from "./commands/token";

import { extraHelp, logCodeSandbox } from "./utils/log";

// tslint:disable no-var-requires
const packageInfo = require("../package.json");

program.version(packageInfo.version);

program.on("--help", extraHelp);

// Register commands
deployCommand(program);
loginCommand(program);
tokenCommand(program);
logoutCommand(program);

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  console.log();
  logCodeSandbox();
  console.log();

  program.outputHelp();
}

updateNotifier({ pkg: packageInfo }).notify();
