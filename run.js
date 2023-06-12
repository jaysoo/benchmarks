const path = require('path');
const fg = require('fast-glob');

const useNode = process.argv[2] === 'node';
const maxFiles = process.argv[3] ? parseInt(process.argv[3]) : null;

process.chdir(path.join(__dirname, '../nx'));

async function main () {
  const files = fg.sync(['packages/**/*.ts']);
  const f = useNode ? require('./node-impl').findImports : require('find-typescript-imports').findImports;
  const results = await f(maxFiles ? files.slice(0, maxFiles) : files);
  console.log(`Found ${results.length} import statements.`);
}

main();
