const fs = require('fs');
const path = require('path');
const fg = require('fast-glob');

main();

async function main () {
  const dir = process.argv[3] ?? '../nx';
  process.chdir(dir.startsWith('.') ? path.join(__dirname, dir) : dir);
  const files = getFiles(dir);
  const f = getImpl(process.argv[2]);
  const results = await f(files);
  console.log(`Found ${results.length} import statements.`);
}

function getFiles(dir) {
  if (!fs.existsSync('./node_modules')) {
    fs.mkdirSync('./node_modules');
  }
  if (fs.existsSync('./node_modules/.cache.json')) {
    try {
      const cache = JSON.parse(fs.readFileSync('./node_modules/.cache.json').toString());
      if (cache[dir]) return cache[dir];
    } catch (e) {}
  }
  const files = fg.sync(['packages/**/*.ts', 'libs/**/*.ts', 'apps/**/*.ts', 'packages/**/*.tsx', 'libs/**/*.tsx', 'apps/**/*.tsx']);
  fs.writeFileSync('./node_modules/.cache.json', JSON.stringify({ [dir]: files }));
  return files;
}

function getImpl(stategy) {
  switch(stategy) {
    case 'node': 
      return require('./node-impl').findImports;
    case 'rust':
      return require('find-typescript-imports').findImports
    default:
      return () =>  [];
  }
}