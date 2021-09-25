const { TpdGithub } = require('../lib');
const log = require('debug')('tpd-github');

exports.desc = 'opens prs based on the json passed';

exports.builder = (yargs) => {
  yargs.option('templates', {
    describe: 'json templates',
    coerce: (param) => {
      return JSON.parse(param);
    },
  });
};

exports.handler = async function (args) {
  const tpdGithub = new TpdGithub(args.templates, log, args);
  await tpdGithub.persist();
};
