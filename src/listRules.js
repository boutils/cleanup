import fs from 'fs';

const RULES_DIRECTORY = import.meta.dirname + '/rules';

export async function getRules() {
  const rulesPaths = fs.readdirSync(RULES_DIRECTORY).map((it) => `rules/${it}`);

  return Promise.all(
    rulesPaths.map(async (rulePath) => {
      const _import = await import(`./${rulePath}`);
      const id = rulePath.split('/').pop().split('.').shift();
      return { ..._import.default, id };
    })
  );
}
