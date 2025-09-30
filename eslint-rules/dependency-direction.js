/**
 * 依存方向リンター
 * 要件17.2: 依存方向リンターで `web → bff → core` の一方向依存を強制する
 */

module.exports = {
  rules: {
    'no-reverse-dependency': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Enforce dependency direction: web → bff → core',
          category: 'Architecture',
        },
        schema: [],
      },
      create(context) {
        const filename = context.getFilename();

        // パッケージの判定
        const isWebPackage = filename.includes('/apps/web/');
        const isBffPackage = filename.includes('/packages/bff/');
        const isCorePackage = filename.includes('/packages/core/');
        const isAdaptersPackage = filename.includes('/packages/adapters/');
        const isContractsPackage = filename.includes('/packages/contracts/');

        return {
          ImportDeclaration(node) {
            const importPath = node.source.value;

            // Core パッケージは他のパッケージに依存してはいけない
            if (isCorePackage) {
              if (importPath.startsWith('@template-gamma/')) {
                context.report({
                  node,
                  message: `Core package cannot depend on other packages. Found: ${importPath}`,
                });
              }
            }

            // BFF パッケージは Web パッケージに依存してはいけない
            if (isBffPackage) {
              if (
                importPath.startsWith('@template-gamma/') &&
                (importPath.includes('/web') || importPath.startsWith('web'))
              ) {
                context.report({
                  node,
                  message: `BFF package cannot depend on Web package. Found: ${importPath}`,
                });
              }
            }

            // Adapters パッケージは Web, BFF パッケージに依存してはいけない
            if (isAdaptersPackage) {
              if (
                importPath.startsWith('@template-gamma/') &&
                (importPath.includes('/web') ||
                  importPath.includes('/bff') ||
                  importPath.startsWith('web') ||
                  importPath.startsWith('bff'))
              ) {
                context.report({
                  node,
                  message: `Adapters package cannot depend on Web or BFF packages. Found: ${importPath}`,
                });
              }
            }

            // Contracts パッケージは他のパッケージに依存してはいけない（外部ライブラリは除く）
            if (isContractsPackage) {
              if (importPath.startsWith('@template-gamma/')) {
                context.report({
                  node,
                  message: `Contracts package cannot depend on other packages. Found: ${importPath}`,
                });
              }
            }
          },
        };
      },
    },
  },
};
