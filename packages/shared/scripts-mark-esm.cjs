// Marks dist/esm as ES modules so bundlers can tree-shake it (zod stays out of storefront bundles).
require('node:fs').writeFileSync(require('node:path').join(__dirname, 'dist/esm/package.json'), '{ "type": "module", "sideEffects": false }\n');
