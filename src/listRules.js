import fs from 'fs';

const RULES_DIRECTORY = import.meta.dirname + '/rules';

export async function getRules() {
  const rulesPaths = fs.readdirSync(RULES_DIRECTORY).map((it) => `rules/${it}`);

  const rules = [];
  for (const rulePath of rulesPaths) {
    // if (!rulePath.includes('V_FOR')) {
    //   continue;
    // }
    const _import = await import(`./${rulePath}`);
    const id = rulePath.split('/').pop().split('.').shift();
    rules.push({ ..._import.default, id });
  }

  return rules;
}
