const tap = require('tap');
const fs = require('fs');
const sinon = require('sinon');
const debug = require('debug')('tpd-github');
const { TpdGithub } = require('../lib');
const { Repo } = require('@gitops-toolbox/github-tools');
const valid_config = require('./fixtures/valid.json');

const destination_path = './test/fixtures/destination';
const logger = debug;
const args = {
  baseDir: destination_path,
  interactive: false,
};

tap.test('When instatiating a new TpdGithub object', (t) => {
  t.plan(6);

  t.beforeEach((t) => {
    t.context.original_log = console.log;
    console.log = debug;
    fs.mkdirSync(destination_path);
  });

  t.afterEach((t) => {
    console.log = t.context.original_log;
    fs.rmSync(destination_path, { recursive: true, force: true });
  });

  t.test('give a valid input should return an empty list', (t) => {
    t.plan(1);
    t.match(new TpdGithub(valid_config, logger, args).filterInvalid(), []);
  });

  t.test(
    'given an invalid input should return the invalid config in a list',
    (t) => {
      t.plan(1);
      t.equal(
        new TpdGithub(
          require('./fixtures/invalid.json'),
          logger,
          args
        ).filterInvalid().length,
        7
      );
    }
  );

  t.test('Will split actions per repos', async (t) => {
    t.plan(1);

    const actions = new TpdGithub(
      require('./fixtures/templates.json'),
      logger,
      args
    ).prepare_actions();

    t.strictSame(actions, require('./fixtures/actions.js'));
  });

  t.test('Will generate multiple Prs', async (t) => {
    t.plan(1);
    const tpdGithub = new TpdGithub(
      require('./fixtures/templates.json'),
      logger,
      args
    );

    const actions = tpdGithub.prepare_actions();
    const prs_by_repo = tpdGithub.prepare_prs(actions);

    t.strictSame(prs_by_repo, require('./fixtures/prs_by_repo.js'));
  });

  t.test('Will a PR to delete files', async (t) => {
    t.plan(1);
    const tpdGithub = new TpdGithub(
      require('./fixtures/valid.json'),
      logger,
      args
    );

    const actions = tpdGithub.prepare_actions();
    const prs_by_repo = tpdGithub.prepare_prs(actions);

    t.strictSame(prs_by_repo, {
      'org1/repo1': {
        message: 'Generated from',
        branch:
          'ci_a09f53d4a270c0f3e6d96a3db49ab51cd0a182ba33b92c455eaec5a8e368d5fa',
        title: 'Generated from',
        body: 'Delete:\n\tfolder/application.json\n\tfolder/application.json',
        changes: {
          'folder/application.json': null,
        },
      },
    });
  });

  t.test('Will try to open two prs', async (t) => {
    t.plan(1);
    const stub = sinon.stub(Repo.prototype, 'openPR');

    const tpdGithub = new TpdGithub(
      require('./fixtures/templates.json'),
      logger,
      args
    );

    await tpdGithub.persist();
    t.ok(stub.withArgs({}).onFirstCall());
  });
});
