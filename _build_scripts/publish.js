import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.join(__dirname, '..');
const packageJsonPath = path.join(packageRoot, 'package.json');
const packageName = 'choicy';

const readPackageJson = () => JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const writePackageJson = (packageJson) => {
  fs.writeFileSync(packageJsonPath, `${ JSON.stringify(packageJson, null, 2) }\n`);
};

const parseVersion = (version) => version.split('.').map((part) => Number(part) || 0);

const isVersionGreater = (left, right) => {
  const [leftMajor, leftMinor, leftPatch] = parseVersion(left);
  const [rightMajor, rightMinor, rightPatch] = parseVersion(right);

  if (leftMajor !== rightMajor) {
    return leftMajor > rightMajor;
  }

  if (leftMinor !== rightMinor) {
    return leftMinor > rightMinor;
  }

  return leftPatch > rightPatch;
};

const bumpPatch = (version) => {
  const [major, minor, patch] = parseVersion(version);
  return [major, minor, patch + 1].join('.');
};

const getPublishedVersion = () => {
  try {
    return execSync(`npm view ${ packageName } version`, {
      cwd: packageRoot,
      encoding: 'utf8',
    }).trim();
  } catch {
    return '';
  }
};

const ensureLoggedIn = () => {
  try {
    execSync('npm whoami', {
      cwd: packageRoot,
      encoding: 'utf8',
      stdio: 'pipe',
    });
  } catch {
    console.log('Not logged in to npm. Running `npm login`…');
    execSync('npm login', {
      cwd: packageRoot,
      stdio: 'inherit',
    });

    try {
      execSync('npm whoami', {
        cwd: packageRoot,
        encoding: 'utf8',
        stdio: 'pipe',
      });
    } catch {
      throw new Error(`Still not logged in to npm. Use an account that can publish ${ packageName }.`);
    }
  }
};

const askWithDefault = async (question, defaultAnswer) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await new Promise((resolve) => {
    rl.question(`${ question } [${ defaultAnswer }] `, resolve);
  });

  rl.close();
  return answer.trim() || defaultAnswer;
};

const publish = async () => {
  ensureLoggedIn();

  const packageJson = readPackageJson();
  const localVersion = packageJson.version;
  const publishedVersion = getPublishedVersion();

  let version = localVersion;

  const localIsAhead = publishedVersion && isVersionGreater(localVersion, publishedVersion);

  if (!localIsAhead) {
    const latestVersion = publishedVersion || localVersion;
    const suggestedVersion = publishedVersion ? bumpPatch(latestVersion) : localVersion;
    version = await askWithDefault('What version should we use?', suggestedVersion);
  }

  packageJson.version = version;
  writePackageJson(packageJson);

  // --ignore-scripts avoids re-running this `publish` lifecycle script
  execSync('npm publish --ignore-scripts', {
    cwd: packageRoot,
    stdio: 'inherit',
  });

  console.log(`Published ${ packageName }@${ version }`);
};

publish().catch((error) => {
  console.error(error);
  process.exit(1);
});
