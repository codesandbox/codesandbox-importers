#!/usr/bin/env node

import * as chalk from 'chalk';
import * as program from 'commander';
import * as updateNotifier from 'update-notifier';

import { read } from './cfg';

// Commands
import deployCommand from './commands/deploy';
import loginCommand from './commands/login';
import logoutCommand from './commands/logout';

import { extraHelp, logCodeSandbox } from './utils/log';

import packageInfo = require('../package.json');

console.log();
logCodeSandbox();
console.log();

program.version(packageInfo.version);

program.on('--help', extraHelp);

// Register commands
deployCommand(program);
loginCommand(program);
logoutCommand(program);

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}

updateNotifier({ pkg: packageInfo }).notify();
