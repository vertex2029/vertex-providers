const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const UPSTREAM_REPO =
  process.env.UPSTREAM_REPO || "https://github.com/Zenda-Cross/vega-providers.git";
const UPSTREAM_BRANCH = process.env.UPSTREAM_BRANCH || "main";
const TARGET_SLUG = "vertex2029/vertex-providers";
const UPSTREAM_SLUG = "Zenda-Cross/vega-providers";

const rootDir = path.join(__dirname, "..", "..");

const rebrandRules = {
  "manifest.json": [[UPSTREAM_SLUG, TARGET_SLUG]],
  "providers/getBaseUrl.ts": [[UPSTREAM_SLUG, TARGET_SLUG]],
  "providers/durbinLive/api.ts": [[UPSTREAM_SLUG, TARGET_SLUG]],
  "tests/provider-build-metadata.test.js": [
    ["// @vega-provider", "// @vertex-provider"],
    ["// @vega-version", "// @vertex-version"],
  ],
  "tests/provider-test-context.js": [
    [UPSTREAM_SLUG, TARGET_SLUG],
    ["Vega App's", "Vertex App's"],
    ["Vega app", "Vertex app"],
  ],
  "tests/test-provider.js": [["Vega Providers", "Vertex Providers"]],
  "tests/test-providers.js": [["Vega Providers", "Vertex Providers"]],
  "docs/hold-to-preview.md": [
    ["Vega Mobile", "Vertex Mobile"],
    ["Vega also", "Vertex also"],
    ["Vega infers", "Vertex infers"],
  ],
  "docs/provider-drm.md": [
    ["Vega converts", "Vertex converts"],
    ["Vega mobile", "Vertex mobile"],
    ["Vega clients", "Vertex clients"],
  ],
};

function applyRebrand(relPath, content) {
  const rules = rebrandRules[relPath];
  if (!rules) return content;
  let updated = content;
  for (const [from, to] of rules) {
    updated = updated.split(from).join(to);
  }
  return updated;
}

function listFilesRecursive(baseDir, currentDir = baseDir) {
  if (!fs.existsSync(currentDir)) return [];
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listFilesRecursive(baseDir, fullPath));
    } else if (entry.isFile()) {
      results.push(path.relative(baseDir, fullPath).split(path.sep).join("/"));
    }
  }
  return results;
}

function syncFile(srcRoot, relPath, summary) {
  const srcFile = path.join(srcRoot, relPath);
  const dstFile = path.join(rootDir, relPath);
  if (!fs.existsSync(srcFile)) return;

  const isTextRebrand = Boolean(rebrandRules[relPath]);
  const srcBuffer = isTextRebrand
    ? Buffer.from(applyRebrand(relPath, fs.readFileSync(srcFile, "utf8")), "utf8")
    : fs.readFileSync(srcFile);

  if (fs.existsSync(dstFile)) {
    const dstBuffer = fs.readFileSync(dstFile);
    if (Buffer.compare(srcBuffer, dstBuffer) === 0) return;
    summary.updated.push(relPath);
  } else {
    fs.mkdirSync(path.dirname(dstFile), { recursive: true });
    summary.added.push(relPath);
  }

  fs.writeFileSync(dstFile, srcBuffer);
}

function main() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "vega-sync-"));
  const summary = { added: [], updated: [] };

  try {
    console.log(`Cloning ${UPSTREAM_REPO} (${UPSTREAM_BRANCH})...`);
    execFileSync(
      "git",
      ["clone", "--depth", "1", "--branch", UPSTREAM_BRANCH, UPSTREAM_REPO, tmpDir],
      { stdio: "inherit" },
    );

    const syncDirs = ["assets", "providers", "tests", "docs"];
    for (const dir of syncDirs) {
      const files = listFilesRecursive(path.join(tmpDir, dir));
      for (const file of files) {
        syncFile(tmpDir, `${dir}/${file}`, summary);
      }
    }

    for (const rootFile of ["manifest.json", "urls.json"]) {
      syncFile(tmpDir, rootFile, summary);
    }

    console.log(`Added (${summary.added.length}):`, summary.added);
    console.log(`Updated (${summary.updated.length}):`, summary.updated);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

main();
