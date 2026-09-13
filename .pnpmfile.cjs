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
      // better-auth lists vitest as an optional peer for `better-auth/test`
      // helpers. We do not import those. Leaving the peer in place puts
      // vitest / @vitest/mocker (GHSA-82fw-gwwq-j7x9) on the prod audit
      // graph. A workspace-wide vitest >=4.1.11 override would break
      // @cloudflare/vitest-pool-workers 0.12.21 (vitest 2–3.x) and the
      // per-test D1 isolation our authz suite needs. Drop the unused peer
      // so vitest stays a workspace devDependency only.
      if (pkg.name === 'better-auth') {
        if (pkg.peerDependencies) {
          delete pkg.peerDependencies.vitest;
        }
        if (pkg.peerDependenciesMeta) {
          delete pkg.peerDependenciesMeta.vitest;
        }
      }
      return pkg;
    }
  }
};
