class Github {
  constructor(templates, logger, options) {
    this.templates = templates;
    this.logger = logger;
    this.options = options;
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
      invalid: {},
      by_repo: {},
    };

    for (const template of templates) {
      const params = template.destination.params;
      const destination = `${params.repo}/${params.filepath}`;
      if (!this.isValid(template)) {
        actions.invalid[destination] = template;
        continue;
      }

      if (!actions.by_repo[params.repo]) {
        actions.by_repo[params.repo] = [];
      }
      actions.by_repo[params.repo].push(template);
    }

    return actions;
  }

  async persist() {
    this.prepare_actions();
    await this._apply(actions);
    return actions;
  }
}

module.exports = Github;
