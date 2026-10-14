import fs from 'fs';

const RULES_DIRECTORY = import.meta.dirname + '/rules';

export function listRuleIds() {
  return fs.readdirSync(RULES_DIRECTORY).map((it) => it.split('.').shift());
}

export async function getRules(ruleIds = listRuleIds()) {
  return Promise.all(
    ruleIds.map(async (id) => {
      const _import = await import(`./rules/${id}.js`);
      return { ..._import.default, id };
    })
  );
}
