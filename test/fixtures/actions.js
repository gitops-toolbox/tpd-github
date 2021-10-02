module.exports = {
  'org1/repo1': [
    {
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
    {
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
  ],
  'org2/repo1': [
    {
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
    {
      template: null,
      destination: {
        type: 'tpd-github',
        params: {
          repo: 'org2/repo1',
          filepath: 'deep/folder/multiple/levels/old.txt',
        },
      },
    },
  ],
};
