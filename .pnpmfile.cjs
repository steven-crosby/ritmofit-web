module.exports = {
  hooks: {
    readPackage(pkg) {
      if (pkg.dependencies && pkg.dependencies.postcss) {
        pkg.dependencies.postcss = '^8.5.18';
      }
      if (pkg.devDependencies && pkg.devDependencies.postcss) {
        pkg.devDependencies.postcss = '^8.5.18';
      }
      return pkg;
    }
  }
};
