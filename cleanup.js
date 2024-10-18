import { indexFiles } from './src/indexFiles.js';
import { getRules } from './src/listRules.js';
import prettify from './src/prettify.js';
import { log, printReport } from './src/printReport.js';

const rules = await getRules();
const index = await indexFiles();

await prettify(index);

/*
////// VUE ATTRIBUTES & EVENTS
`addWarning( file, lineNumber, "template string", "`" + templateStrArr.join("") + "`", `Replace '${lineInfo.attributeValue}' by '\`${templateStrArr.join( "" )}\`' (template string).`

////// VMC
addWarning( vmcFile, null, `unused ${property}`, `'${name}' in ' ${property}' is not used (${_name})` );
addWarning( file, null, "name", `VMC component should be named: Add "name: '${validComponentName}'," to VMC file` );
addWarning( file, null, "name", `Wrong VMC component name: replace '${results.name}' by '${validComponentName}'` );

////// TS
addWarning( _export.file, _export.lineNumber, "EXPORT", `'export' keyword should be removed before '${keyword}'` );
addWarning( fn.filePath, fn.line, "unused function", `This function ${fn.name} is not used. Please remove!` );
addWarning( filePath, lineIndex + 1, "function declaration", `Exported function '${fnInfo.name}' should be before private function` );
addWarning( filePath, instruction.lineIndex + 1, "doublon instruction", `Please rename: '${text}'` );
addWarning(filePath, fnIndex + 1, "ASYNC", `Add 'async' here`);
addWarning( filePath, asyncFnLineIndex + 1, "ASYNC", `Remove 'async'` );
addWarning(filePath, null, "empty file", "Remove this empty file");
*/

const errorsByPath = {};

for (const rule of rules) {
  if (!rule.validate) {
    log(`Rule '${rule.id}' is invalid and ignored`, 'error');
    continue;
  }

  const result = rule.validate(index);

  for (const error of result.errors) {
    errorsByPath[error.filePath] ??= [];
    errorsByPath[error.filePath].push({ ...error, type: rule.id });
  }
}

printReport(errorsByPath);
