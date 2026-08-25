// Force every postcss declaration onto the patched 8.5.23+ line
// (GHSA-fxqj-rqcc-2cmp; incomplete fix of GHSA-6g55-p6wh-862q).
module.exports = {
  hooks: {
    readPackage(pkg) {
      if (pkg.dependencies && pkg.dependencies.postcss) {
        pkg.dependencies.postcss = '^8.5.23';
      }
      if (pkg.devDependencies && pkg.devDependencies.postcss) {
        pkg.devDependencies.postcss = '^8.5.23';
      }
      return pkg;
    }
  }
};
