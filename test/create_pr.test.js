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

function openPR(message, branch, title, body, changes) {
  return {
    get: () => {
      return new Promise((resolve) => {
        resolve({
          html_url: {
            message,
            branch,
            changes,
            body,
          },
        });
      });
    },
  };
}

tap.test('When opening a PR', (t) => {
  t.plan(2);

  t.afterEach((t) => {
    sinon.restore();
  });

  t.test('Error should be returned if cannot open a PR', async (t) => {
    sinon.replace(
      TpdGithub.prototype,
      '_tryGetRepoInfo',
      sinon.fake.throws('Failing to simulate error in tests')
    );
    sinon.replace(
      Repo.prototype,
      'openPR',
      sinon.fake.throws('Failed to open PR')
    );

    const tpdGithub = new TpdGithub(
      require('./fixtures/valid.json'),
      logger,
      args
    );

    const prs = await tpdGithub.persist();

    t.strictSame(prs, {
      'LucaLanziani/giggi': 'Failed to open PR',
    });
  });

  t.test(
    'If remote origin available should open pr with the repo reference',
    async (t) => {
      t.plan(4);
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

      sinon.replace(Repo.prototype, 'openPR', openPR);

      sinon.stub(child_process, 'execSync').callsFake(() => {
        return repoInfos.shift();
      });

      const tpdGithub = new TpdGithub(
        require('./fixtures/valid.json'),
        logger,
        args
      );

      const git = await tpdGithub.persist();
      const https = await tpdGithub.persist();
      const http = await tpdGithub.persist();

      const notSupported = await tpdGithub.persist();

      t.same(http['LucaLanziani/giggi'].message, `${expected}7890123`);
      t.same(https['LucaLanziani/giggi'].message, `${expected}1234567`);
      t.same(git['LucaLanziani/giggi'].message, `${expected}7654321`);
      t.same(
        notSupported['LucaLanziani/giggi'].message,
        `Generated with templator`
      );
    }
  );
});

tap.test('When instatiating a new TpdGithub object', (t) => {
  t.plan(5);

  t.beforeEach((t) => {
    sinon.replace(
      TpdGithub.prototype,
      '_tryGetRepoInfo',
      sinon.fake.throws('Failing to simulate error in tests')
    );

    sinon.replace(Repo.prototype, 'openPR', openPR);

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

  t.test('Will open a PR per repo', async (t) => {
    t.plan(1);
    const fixture = require('./fixtures/templates.js');
    const PRs = await new TpdGithub(
      Object.values(fixture),
      logger,
      args
    ).persist();

    t.strictSame(PRs, {
      invalidTemplates: [
        fixture['missing/template/deep/folder/multiple/levels/text.txt'],
      ],
    });
  });

  t.test('Will generate multiple Prs', async (t) => {
    t.plan(1);
    const fixture = require('./fixtures/actions.js');
    const tpdGithub = new TpdGithub(
      Object.values(fixture).flat(),
      logger,
      args
    );

    const PRs = await tpdGithub.persist();

    t.strictSame(PRs, {
      'org1/repo1': {
        message: 'Generated with templator',
        branch:
          'ci_1c4652b83af0c32c9ba0377dbaaa96c026bf3d80f03ce68e1d6abfce52972002',
        body: 'Generate:\nfile1.txt\nexistingDir/text.txt\n',
        changes: {
          'file1.txt': {
            mode: 'normal',
            content: 'test',
          },
          'existingDir/text.txt': {
            mode: 'normal',
            content: 'test',
          },
        },
      },
      'org2/repo1': {
        message: 'Generated with templator',
        branch:
          'ci_ef1071136cffc393333da2c62665a779cbeeb7b7516220a908174012537424d2',
        changes: {
          'deep/folder/multiple/levels/text.txt': {
            mode: 'normal',
            content: 'test',
          },
          'deep/folder/multiple/levels/old.txt': null,
        },
        body: `Generate:
deep/folder/multiple/levels/text.txt

Delete:
deep/folder/multiple/levels/old.txt`,
      },
    });
  });

  t.test('Will open a PR to delete files', async (t) => {
    t.plan(1);
    const tpdGithub = new TpdGithub(
      require('./fixtures/valid.json'),
      logger,
      args
    );

    const prs = await tpdGithub.persist();

    t.strictSame(prs, {
      'LucaLanziani/giggi': {
        message: 'Generated with templator',
        branch:
          'ci_328a4a8e3fc13ab478b0836e7086122d497dee2fdc33f14d0d80ba0e7a0d6936',
        body: 'Delete:\ntest.txt\nfolder/application.json',
        changes: {
          'test.txt': null,
          'folder/application.json': null,
        },
      },
    });
  });
});
