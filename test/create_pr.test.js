const tap = require('tap');
const fs = require('fs');
const sinon = require('sinon');
const debug = require('debug')('tpd-github');
const { TpdGithub } = require('../lib');
const { Repo } = require('@gitops-toolbox/github-tools');
const valid_config = require('./fixtures/valid.json');
const child_process = require('child_process');

const destination_path = './test/fixtures/destination';
const logger = debug;
const args = {
  baseDir: destination_path,
  interactive: false,
};

tap.test('When instatiating a new TpdGithub object', (t) => {
  t.plan(7);

  t.beforeEach((t) => {
    t.context.repoStub = sinon.stub(Repo.prototype, 'openPR');
    sinon.replace(
      TpdGithub.prototype,
      '_tryGetRepoInfo',
      sinon.fake.throws('Failing to simulate error in tests')
    );
    t.context.original_log = console.log;
    console.log = debug;
    fs.mkdirSync(destination_path);
  });

  t.afterEach((t) => {
    sinon.restore();
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
    const prs_by_repo = tpdGithub.preparePRs(actions);

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
    const prs_by_repo = tpdGithub.preparePRs(actions);

    t.strictSame(prs_by_repo, {
      'LucaLanziani/giggi': {
        message: 'Generated with templator',
        branch:
          'ci_328a4a8e3fc13ab478b0836e7086122d497dee2fdc33f14d0d80ba0e7a0d6936',
        title: 'Generated with templator',
        body: 'Delete:\ntest.txt\nfolder/application.json',
        changes: {
          'test.txt': null,
          'folder/application.json': null,
        },
      },
    });
  });

  t.test('Will try to open two prs', async (t) => {
    t.plan(1);
    const tpdGithub = new TpdGithub(
      require('./fixtures/templates.json'),
      logger,
      args
    );

    await tpdGithub.persist();
    t.ok(t.context.repoStub.withArgs({}).onFirstCall());
  });

  t.test(
    'If remote origin available should open pr with the repo reference',
    (t) => {
      t.plan(8);
      const repoInfos = [
        'git@github.com:gitops-toolbox/templator.git',
        '7654321',
        'https://github.com/gitops-toolbox/templator.git',
        '1234567',
        'http://github.com/gitops-toolbox/templator.git',
        '7890123',
        'url/format/not/supported',
        '123345345',
      ];
      const expected = 'Generated from gitops-toolbox/templator@';
      sinon.restore();
      sinon.stub(child_process, 'execSync').callsFake(() => {
        return repoInfos.shift();
      });
      const tpdGithub = new TpdGithub(
        require('./fixtures/valid.json'),
        logger,
        args
      );

      const git = tpdGithub.preparePRs(tpdGithub.prepare_actions())[
        'LucaLanziani/giggi'
      ];
      const https = tpdGithub.preparePRs(tpdGithub.prepare_actions())[
        'LucaLanziani/giggi'
      ];
      const http = tpdGithub.preparePRs(tpdGithub.prepare_actions())[
        'LucaLanziani/giggi'
      ];

      const notSupported = tpdGithub.preparePRs(tpdGithub.prepare_actions())[
        'LucaLanziani/giggi'
      ];

      t.same(http.message, `${expected}7890123`);
      t.same(http.title, `${expected}7890123`);
      t.same(https.message, `${expected}1234567`);
      t.same(https.title, `${expected}1234567`);
      t.same(git.message, `${expected}7654321`);
      t.same(git.title, `${expected}7654321`);
      t.same(notSupported.message, `Generated with templator`);
      t.same(notSupported.title, `Generated with templator`);
    }
  );
});
