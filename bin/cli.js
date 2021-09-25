#!/usr/bin/env node
const yargs = require('yargs');

yargs
  .commandDir('../cmds')
  .wrap(yargs.terminalWidth())
  .showHelpOnFail(true)
  .demandCommand()
  .recommendCommands()
  .strict().argv;
