const ts = require('typescript');
const fs = require('fs');

module.exports.findImports = function findImports(filePaths) {
  const importStatements = [];

  for (let filePath of filePaths) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const scanner = ts.createScanner(ts.ScriptTarget.Latest, false);
    const onlyImports = stripSourceCode(scanner, content);
    const sourceFile = ts.createSourceFile(filePath, onlyImports, ts.ScriptTarget.ES2015, true);

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

function stripSourceCode(scanner,  contents) {
  let SyntaxKind = ts.SyntaxKind;

  if (contents.indexOf('loadChildren') > -1) {
    return contents;
  }

  scanner.setText(contents);
  let token = scanner.scan();
  let lastNonTriviaToken = SyntaxKind.Unknown;
  const statements = [];
  const templateStack = [];
  let ignoringLine = false;
  let braceDepth = 0;
  let start = null;
  while (token !== SyntaxKind.EndOfFileToken) {
    const currentToken = token;
    const potentialStart = scanner.getStartPos();
    switch (token) {
      case SyntaxKind.MultiLineCommentTrivia:
      case SyntaxKind.SingleLineCommentTrivia: {
        const isMultiLineCommentTrivia =
          token === SyntaxKind.MultiLineCommentTrivia;
        const start = potentialStart + 2;
        token = scanner.scan();
        const end = scanner.getStartPos() - (isMultiLineCommentTrivia ? 2 : 0);
        const comment = contents.substring(start, end).trim();
        if (comment === 'nx-ignore-next-line') {
          // reading till the end of the line
          while (
            token === SyntaxKind.WhitespaceTrivia ||
            token === SyntaxKind.NewLineTrivia
          ) {
            token = scanner.scan();
          }
          ignoringLine = true;
        }
        break;
      }

      case SyntaxKind.NewLineTrivia: {
        ignoringLine = false;
        token = scanner.scan();
        break;
      }

      case SyntaxKind.RequireKeyword:
      case SyntaxKind.ImportKeyword: {
        token = scanner.scan();
        if (ignoringLine) {
          break;
        }
        while (
          token === SyntaxKind.WhitespaceTrivia ||
          token === SyntaxKind.NewLineTrivia
        ) {
          token = scanner.scan();
        }
        start = potentialStart;
        break;
      }

      case SyntaxKind.TemplateHead: {
        templateStack.push(braceDepth);
        braceDepth = 0;
        token = scanner.scan();
        break;
      }

      case SyntaxKind.SlashToken: {
        if (shouldRescanSlashToken(lastNonTriviaToken)) {
          token = scanner.reScanSlashToken();
        }
        token = scanner.scan();
        break;
      }

      case SyntaxKind.OpenBraceToken: {
        ++braceDepth;
        token = scanner.scan();
        break;
      }

      case SyntaxKind.CloseBraceToken: {
        if (braceDepth) {
          --braceDepth;
        } else if (templateStack.length) {
          token = scanner.reScanTemplateToken(false);
          if (token === SyntaxKind.LastTemplateToken) {
            braceDepth = templateStack.pop();
          }
        }
        token = scanner.scan();
        break;
      }

      case SyntaxKind.ExportKeyword: {
        token = scanner.scan();
        if (ignoringLine) {
          break;
        }
        while (
          token === SyntaxKind.WhitespaceTrivia ||
          token === SyntaxKind.NewLineTrivia
        ) {
          token = scanner.scan();
        }
        if (
          token === SyntaxKind.OpenBraceToken ||
          token === SyntaxKind.AsteriskToken ||
          token === SyntaxKind.TypeKeyword
        ) {
          start = potentialStart;
        }
        break;
      }

      case SyntaxKind.StringLiteral: {
        if (start !== null) {
          token = scanner.scan();
          if (token === SyntaxKind.CloseParenToken) {
            token = scanner.scan();
          }
          const end = scanner.getStartPos();
          statements.push(contents.substring(start, end));
          start = null;
        } else {
          token = scanner.scan();
        }
        break;
      }

      default: {
        token = scanner.scan();
      }
    }

    if (currentToken > SyntaxKind.LastTriviaToken) {
      lastNonTriviaToken = currentToken;
    }
  }

  return statements.join('\n');
}

function shouldRescanSlashToken(lastNonTriviaToken) {
  switch (lastNonTriviaToken) {
    case ts.SyntaxKind.Identifier:
    case ts.SyntaxKind.StringLiteral:
    case ts.SyntaxKind.NumericLiteral:
    case ts.SyntaxKind.BigIntLiteral:
    case ts.SyntaxKind.RegularExpressionLiteral:
    case ts.SyntaxKind.ThisKeyword:
    case ts.SyntaxKind.PlusPlusToken:
    case ts.SyntaxKind.MinusMinusToken:
    case ts.SyntaxKind.CloseParenToken:
    case ts.SyntaxKind.CloseBracketToken:
    case ts.SyntaxKind.CloseBraceToken:
    case ts.SyntaxKind.TrueKeyword:
    case ts.SyntaxKind.FalseKeyword:
      return false;
    default:
      return true;
  }
}

