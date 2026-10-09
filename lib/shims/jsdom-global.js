// gpxparser calls `require('jsdom-global')()` whenever `module` is defined,
// which is always true inside a bundler. Parsing only runs in the browser,
// where a real DOMParser exists, so this no-op keeps jsdom out of the bundle.
module.exports = function jsdomGlobalNoop() {
  return function cleanup() {};
};
