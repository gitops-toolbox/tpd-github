const crypto = require('crypto');
const { Repo } = require('@gitops-toolbox/github-tools');

class Github {
  constructor(templates, logger, options) {
    this.templates = templates;
    this.logger = logger;
    this.options = options;
    this.githubToken = process.env.GITHUB_TOKEN;
  }

  isValid(template) {
    return (
      template.template !== undefined &&
      template.destination &&
      template.destination.type &&
      template.destination.type === 'tpd-github' &&
      template.destination.params &&
      template.destination.params.repo &&
      template.destination.params.filepath &&
      (template.template == null || template.renderedTemplate)
    );
  }

  filterInvalid() {
    let invalid = [];

    for (const template of this.templates) {
      if (!this.isValid(template)) {
        this.logger('Template %o is misssing one or more properties', template);
        invalid.push(template);
      }
    }

    return invalid;
  }

  prepare_actions() {
    const templates = this.templates;
    const actions = {
      invalid: [],
      by_repo: {},
    };

    for (const template of templates) {
      const params = template.destination.params;
      if (!this.isValid(template)) {
        actions.invalid.push(template);
        continue;
      }

      if (!actions.by_repo[params.repo]) {
        actions.by_repo[params.repo] = [];
      }
      actions.by_repo[params.repo].push(template);
    }

    return actions;
  }

  prepare_prs(actions) {
    const pr_by_repo = {};
    for (const [repo, templates] of Object.entries(actions.by_repo)) {
      let body = [];
      const generating = [];
      const deleting = [];
      const changes = {};
      const branchPrefix = 'ci_';
      const hash = crypto.createHash('sha256');
      const hash_strings = [];

      for (const template of templates) {
        const params = template.destination.params;
        hash_strings.push(`${params.filepath}${template.renderedTemplate}`);
        if (template.template === null) {
          deleting.push(`\t${params.filepath}`);
          changes[params.filepath] = null;
        } else {
          generating.push(`\t${params.filepath}`);
          changes[params.filepath] = {
            mode: params.mode || 'normal',
            content: template.renderedTemplate,
          };
        }
      }

      hash_strings.sort().forEach((element) => {
        hash.update(element);
      });

      if (generating.length > 0) {
        body = ['Generate:', ...generating];
      }
      if (deleting.length > 0) {
        body = [...body, 'Delete:', ...deleting];
      }

      pr_by_repo[repo] = {
        message: 'Generated from',
        branch: branchPrefix + hash.digest('hex'),
        title: 'Generated from',
        body: body.join('\n'),
        changes,
      };
    }

    return pr_by_repo;
  }

  async _apply(actions) {
    const pr_by_repo = this.prepare_prs(actions);

    for (const [repo, pr] of Object.entries(pr_by_repo)) {
      await new Repo(repo, { auth: this.githubToken }).openPR(
        pr.message,
        pr.branch,
        pr.title,
        pr.body,
        pr.changes,
        pr.base || false,
        pr.draft || false
      );
    }
  }

  async persist() {
    const actions = this.prepare_actions();
    await this._apply(actions);
    return actions;
  }
}

module.exports = Github;
