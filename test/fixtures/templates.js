module.exports = {
  'org1/repo1/file1.txt': {
    template: 'test.txt',
    destination: {
      type: 'tpd-github',
      params: {
        repo: 'org1/repo1',
        filepath: 'file1.txt',
      },
    },
    renderedTemplate: 'test',
  },
  'org1/repo1/existingDir/text.txt': {
    template: 'test.txt',
    destination: {
      type: 'tpd-github',
      params: {
        repo: 'org1/repo1',
        filepath: 'existingDir/text.txt',
      },
    },
    renderedTemplate: 'test',
  },
  'org2/repo1/deep/folder/multiple/levels/text.txt': {
    template: 'test.txt',
    destination: {
      type: 'tpd-github',
      params: {
        repo: 'org2/repo1',
        filepath: 'deep/folder/multiple/levels/text.txt',
      },
    },
    renderedTemplate: 'test',
  },
  'missing/template/deep/folder/multiple/levels/text.txt': {
    destination: {
      type: 'tpd-github',
      params: {
        repo: 'missing/template',
        filepath: 'deep/folder/multiple/levels/text.txt',
      },
    },
    renderedTemplate: 'test',
  },
  'org2/repo1/deep/folder/multiple/levels/old.txt': {
    template: null,
    destination: {
      type: 'tpd-github',
      params: {
        repo: 'org2/repo1',
        filepath: 'deep/folder/multiple/levels/old.txt',
      },
    },
  },
};
