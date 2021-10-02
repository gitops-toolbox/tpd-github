const crypto = require('crypto');
const { Repo } = require('@gitops-toolbox/github-tools');
const child_process = require('child_process');

class Github {
  constructor(templates, logger, options) {
    this.templates = templates;
    this.logger = logger;
    this.errorLogger = this.logger.extend('error');
    logger('tpd-github templates: %o', templates);
    logger('tpd-github options: %o', options);
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
        this.logger('Template %o is missing one or more properties', template);
        invalid.push(template);
      }
    }

    return invalid;
  }

  _prepare_actions() {
    const templates = this.templates;
    const actions = {};

    for (const template of templates) {
      const params = template.destination.params;

      if (!actions[params.repo]) {
        actions[params.repo] = [];
      }
      this.logger('Template %o', template);
      this.logger('Added to: %o', actions[params.repo]);
      actions[params.repo].push(template);
    }

    return actions;
  }

  _parseGithubEndpoint(endpoint) {
    let repoName = endpoint.trim();

    if (endpoint.startsWith('git')) {
      repoName = repoName.split(':').slice('-1');
    } else if (endpoint.startsWith('http')) {
      repoName = repoName.split('/').slice('-2');
    } else {
      throw Error(`Github Endpoint format not supported for ${endpoint}`);
    }

    return repoName.join('/').replace(/\.git$/, '');
  }

  _tryGetRepoInfo() {
    const results = [];
    for (const cmd of [
      'git config --get remote.origin.url',
      'git rev-parse --short HEAD',
    ]) {
      results.push(
        child_process
          .execSync(cmd, {
            cwd: this.options.baseDir,
          })
          .toString('utf-8')
      );
    }
    results[0] = this._parseGithubEndpoint(results[0]);
    return results;
  }

  _preparePRs(actions) {
    const pr_by_repo = {};
    for (const [repo, templates] of Object.entries(actions)) {
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
          deleting.push(`${params.filepath}`);
          changes[params.filepath] = null;
        } else {
          generating.push(`${params.filepath}`);
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
        body = ['Generate:', ...generating, ''];
      }
      if (deleting.length > 0) {
        body = [...body, 'Delete:', ...deleting];
      }

      let message_suffix = 'with templator';
      try {
        const repoInfos = this._tryGetRepoInfo();
        message_suffix = `from ${repoInfos.join('@')}`;
      } catch (e) {
        this.errorLogger(e);
      }

      pr_by_repo[repo] = {
        message: `Generated ${message_suffix}`,
        branch: branchPrefix + hash.digest('hex'),
        title: `Generated ${message_suffix}`,
        body: body.join('\n'),
        changes,
      };
    }
    this.logger('Pr by repo: %o', pr_by_repo);
    return pr_by_repo;
  }

  async _apply(actions) {
    const pr_by_repo = this._preparePRs(actions);
    const results = {};
    for (const [repo, prData] of Object.entries(pr_by_repo)) {
      try {
        const pr = await new Repo(repo, { auth: this.githubToken }).openPR(
          prData.message,
          prData.branch,
          prData.title,
          prData.body,
          prData.changes,
          prData.base || false,
          prData.draft || false
        );

        results[repo] = (await pr.get()).html_url;
      } catch (e) {
        results[repo] = e.message;
      }
    }
    return results;
  }

  async persist() {
    const invalid = this.filterInvalid();
    if (invalid.length > 0) {
      return {
        invalidTemplates: invalid,
      };
    }
    const actions = this._prepare_actions();
    return await this._apply(actions);
  }
}

module.exports = Github;
