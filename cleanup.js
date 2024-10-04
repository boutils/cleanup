import { indexFiles } from './src/indexFiles.js';
import { getRules } from './src/listRules.js';
import { log, printReport } from './src/printReport.js';

const rules = await getRules();
const index = await indexFiles();

/*
addWarning(res.vmcPath, null, "obsolete emits", message);
#addWarning( res.vmcPath, null, "sorting", `Emits should be correctly sorted: ${sortingErrors}` );
addWarning( vmcFiles[componentId]._path, null, "incorrect component ID", `Component '${cpId}' should not be upper cased, rename '${cpId}' to '${ cpId.toLowerCase()[0] + cpId.slice(1) }'!` );
addWarning( vueFiles[componentId]._path, null, "unused component", `Component '${componentId}' is used anywhere, please remove it!` );
addWarning( filepath, null, "unused file", "This lib/utils file is not used. Please remove!" );
addWarning( fn.filePath, fn.line, "unused function", `This function ${fn.name} is not used. Please remove!` );
addWarning( filePath, lineIndex + 1, "function call", `The function '${fn.name}' accepts only ${totalArgs} args but have ${args.length}` );
addWarning( fn.filePath, fn.line, "function declaration", `The function '${fn.name}' has ${fn.requiredArgsCount} required args but is called sometimes with ${args.length}` );
addWarning( filePath, lineIndex + 1, "function declaration", fnInfo.error );
addWarning( filePath, lineIndex + 1, "function declaration", `Exported function '${fnInfo.name}' should be before private function` );
addWarning( file, null, "deprecated", "v-deep has been deprecated, replace this by `:deep(<inner-selector>)`" );
addWarning( file, sortingError.lineNumber, "sorting", sortingError.message );
addWarning( file, class_.line, "unused class", `Remove class '${class_}'. It is not used.` );
addWarning( filePath, null, "no JS file", 'Change extension to ".js" instead of ".mjs"' );
addWarning( filePath, instructions[0].lineIndex + 1, "invalid test name", `Rename '${instructions[0].text}' test to: '${fileName}'` );
addWarning( filePath, instruction.lineIndex + 1, "doublon instruction", `Please rename: '${text}'` );
addWarning( filePath, lineIndex + 1, "not used", "Remove this line (empty)" );
#addWarning(filePath, lineIndex + 1, "EMIT", "Use explicit $emit");
addWarning(filePath, fnIndex + 1, "ASYNC", `Add 'async' here`);
addWarning( filePath, asyncFnLineIndex + 1, "ASYNC", `Remove 'async'` );
addWarning(filePath, lineNumber, "empty line", "Add an empty line");
addWarning( filePath, null, "VMC sorting", `VMC property '${prop}' should be before '${lastProp}'` );
addWarning( _export.file, _export.lineNumber, "EXPORT", `'export' keyword should be removed before '${keyword}'` );
addWarning( file, null, "sorting", `IMPORT components: ${sortingErrors}` );
addWarning( file, null, "name", `VMC component should be named: Add "name: '${validComponentName}'," to VMC file` );
addWarning( file, null, "name", `Wrong VMC component name: replace '${results.name}' by '${validComponentName}'` );
addWarning(file, null, "sorting", `${property} ${sortingErrors}`);
addWarning( vmcFile, null, `unused ${property}`, `'${name}' in ' ${property}' is not used (${_name})` );
addWarning( file, lineNumber, "quote", 'Use double quotes instead of single"' );
addWarning( file, lineNumber, "BackTick", `BackTick should be removed, there is no variable inside` );
addWarning( file, lineNumber, "BackTick", `BackTick should be removed, this is not a vue binding` );
addWarning(file, lineNumber, "BackTick", 'BackTick should be removed"');
addWarning( vmcFilePath, null, "unnecessary import", `IMPORT of '${componentId}' is not used. Please remove it.` );
addWarning(file, lineNumber, "invalid this", 'Remove "this."');
addWarning(file, lineNumber, "missing term", 'Remove hardcoded "mdi-"');
addWarning( file, lineNumber - 1, "empty line", "Remove this empty line" );
#addWarning(file, lineNumber, "EMIT", "Use explicit $emit");
addWarning( file, lineNumber, "template string", "`" + templateStrArr.join("") + "`", `Replace '${lineInfo.attributeValue}' by '\`${templateStrArr.join( "" )}\`' (template string).`
addWarning( file, lineNumber, "inline css", "style should be in a dedicated stylesheet" );
addWarning( file, lineNumber, "add space", `Add 'space' after '{'  and before '}' in dynamic class.` );
addWarning( file, lineNumber, "remove space", `Remove 'space' before ':' in dynamic class.` );
addWarning( file, lineNumber, "unused class", `Remove class '${class_}'. It is not used.` );
addWarning(file, lineNumber, "empty line", "Remove this empty line");
addWarning(file, lineNumber, "empty line", "Remove this empty line");
addWarning(file, lineNumber, "unscoped CSS", "CSS is unscoped");
#addWarning( file, lineNumber, "trailing spaces", "Remove trailing spaces" );
#addWarning( file, lineNumber, "bad indentation", `Indentation should be ${expectedIndentation} instead of ${lineInfo.indentationCount}` );
addWarning(file, lineNumber, "empty line", "Add an empty line before");
#addWarning(file, lineNumber, "space", "Too much spaces");
addWarning( file, lineNumber, "case", `'${attribute}' should be kebab case (no upper case)` );
addWarning( file, lineNumber, "invalid attribute", `'${attribute}' is invalid for tag '${lineInfo.tagName}'` );
#addWarning( file, lineNumber, "space", `'=' should be surronded by at least one space` );
addWarning( file, lineNumber, "past participle", `"${lineInfo.eventName}" should not end with 'ed'` );
addWarning( file, lineIndex, "sorting", `'${previousLineInfo.eventName}' should be declared after attributes` );
addWarning(file, lineNumber, "space", `Missing space after '{{'`);
addWarning(file, lineNumber, "space", `Missing space before '}}'`);
addWarning( file, sortingAttrError.lineNumber, "sorting", sortingAttrError.message );
addWarning( file, lineNumber, "only-one-attribute", "Attribute should be on the previous line" );
addWarning( file, sortingAttrError.lineNumber, "sorting", sortingAttrError.message );
addWarning( file, sortingEventsError.lineNumber, "sorting", sortingEventsError.message );
addWarning( file, equalError.lineNumber, "equal", equalError.message );
addWarning( file, null, "empty spec", "Remove this spec file, it is unused" );
addWarning( filePath, lineNumber, "shortand", `Replace '${beforeKeyword} && ${afterKeyword}' by '${afterKeyword.replace( ".", "?." )}'` );
addWarning( filePath, lineIndex + 1, "empty line", "Add an empty line before" );
addWarning( filePath, null, "duplicate", `import "${duplicate}" is duplicated` );
addWarning( filePath, firstImportSortingError.lineNumber, "sorting", `import ${firstImportSortingError.message}` );
addWarning( filePath, lineNumber, "unused prop", `Prop '${prop}' should be removed` );
addWarning( filePath, lineNumber, "unused event", `Event '${eventName}' should be removed (${_name})` );
addWarning( filePath, null, "invalid copyright", "Missing or invalid copyright" );
addWarning( filePath, lineIndex, "empty line", "Add an empty line after copyright" );
addWarning( filePath, lineNumber, "missing extension", `Add an extension to import "${line}"` );
addWarning( filePath, lineNumber, "wrong repo", `Fermat's 'utils' should be imported from Principia` );
addWarning( filePath, importLines.length + 1, "empty line", "Add an empty line after imports" );
addWarning(filePath, null, "empty file", "Remove this empty file");
addWarning( filePath, emptyLinePosition, "empty line", "Remove this empty line" );
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
