const ts = require('typescript');
const fs = require('fs');

module.exports.findImports = function findImports(filePaths) {
  const importStatements = [];

  for (let filePath of filePaths) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.ES2015, true);

    ts.forEachChild(sourceFile, visitNode);

    function visitNode(node) {
      if (ts.isImportDeclaration(node)) {
        const importPath = node.getText();
        importStatements.push(importPath);
      }

      ts.forEachChild(node, visitNode);
    }
  }

  return importStatements;
}

