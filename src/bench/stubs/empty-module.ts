// Browser stub for node builtins that kokoro-js's dist imports but never
// uses in a browser ('path', 'fs/promises' — only its Node.js voice-loading
// branch touches them). Must NOT export readFile: kokoro-js checks
// hasOwn(fs, 'readFile') to decide between file and fetch voice loading.
export default {};
