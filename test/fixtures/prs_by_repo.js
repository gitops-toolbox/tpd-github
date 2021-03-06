module.exports = {
  'org1/repo1': {
    message: 'Generated with templator',
    branch:
      'ci_1c4652b83af0c32c9ba0377dbaaa96c026bf3d80f03ce68e1d6abfce52972002',
    title: 'Generated with templator',
    body: `Generate:\nfile1.txt\nexistingDir/text.txt\n`,
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
    title: 'Generated with templator',
    body: `Generate:\ndeep/folder/multiple/levels/text.txt\n\nDelete:\ndeep/folder/multiple/levels/old.txt`,
    changes: {
      'deep/folder/multiple/levels/text.txt': {
        mode: 'normal',
        content: 'test',
      },
      'deep/folder/multiple/levels/old.txt': null,
    },
  },
};
