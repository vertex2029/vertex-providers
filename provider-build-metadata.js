// This header is added after minification, so old clients simply ignore it.
function createProviderHeader(entry) {
  if (!entry || typeof entry.value !== 'string' || typeof entry.version !== 'string' ||
      !/^[A-Za-z0-9_.-]+$/.test(entry.value) || !/^[A-Za-z0-9_.+-]+$/.test(entry.version)) {
    throw new Error('Each built provider needs a valid manifest ID and version');
  }
  return `// @vertex-provider ${entry.value}\n// @vertex-version ${entry.version}\n`;
}
module.exports = {createProviderHeader};
