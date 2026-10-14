import { access, cp, lstat, mkdir, mkdtemp, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const source = fileURLToPath(new URL('../skills/tripi-tropi/', import.meta.url));
const files = ['SKILL.md', 'agents', 'assets', 'references', 'scripts', 'package.json', 'package-lock.json'];
const marker = '.tripi-tropi-install.json';

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, windowsHide: true, stdio: 'inherit', shell: false });
    child.once('error', reject);
    child.once('close', (code) => code === 0 ? resolve() : reject(new Error(`Command failed (${code}): ${command}. Check npm/network access and retry; the previous installation is preserved.`)));
  });
}

async function npmCli() {
  const candidates = [process.env.npm_execpath, path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js')];
  for (const directory of (process.env.PATH ?? '').split(path.delimiter)) {
    candidates.push(path.join(directory, 'node_modules/npm/bin/npm-cli.js'));
    try { candidates.push(await realpath(path.join(directory, 'npm'))); } catch {}
  }
  for (const candidate of candidates.filter(Boolean)) {
    if (!candidate.endsWith('.js')) continue;
    try { await access(candidate); return candidate; } catch {}
  }
  throw new Error('npm could not be found. Install Node.js 24+ with npm, reopen your terminal, and retry.');
}

export async function installSkill({ skillsDir = path.join(homedir(), '.agents/skills'), update = false, installDependencies } = {}) {
  if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('Node.js 24+ is required. Upgrade Node.js and retry.');
  const npm = installDependencies ? null : await npmCli();
  if (npm) await run(process.execPath, [npm, '--version']);
  const parent = path.resolve(skillsDir);
  const target = path.join(parent, 'tripi-tropi');
  const overlaps = (a, b) => { const relative = path.relative(a, b); return !relative || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative)); };
  if (overlaps(source, target) || overlaps(target, source)) throw new Error('Choose a skills directory outside the source package.');
  let existing = false;
  let originalStat;
  try {
    const stat = await lstat(target);
    existing = true;
    originalStat = stat;
    if (!update) throw new Error(`Already installed at ${target}. Stop its viewers and pass --update to replace it explicitly.`);
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error('Refusing to replace a link or non-directory. Choose another --skills-dir.');
    const record = JSON.parse(await readFile(path.join(target, marker), 'utf8').catch(() => '{}'));
    if (record.installer !== 'tripi-tropi' || record.format !== 1) throw new Error('Existing directory was not installed by this installer. Preserve it or choose another --skills-dir.');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await mkdir(parent, { recursive: true });
  // A sibling lock serializes installation; staging has no discoverable SKILL.md.
  const lock = path.join(parent, '.tripi-tropi-install.lock');
  try { await mkdir(lock); } catch (error) {
    if (error.code === 'EEXIST') throw new Error(`Another installation is running. Retry later; if it exited, remove the stale lock ${lock}.`);
    throw error;
  }
  let stage; let backup; let ownsTarget = false;
  async function checkTarget() {
    const current = await lstat(target).catch((error) => { if (error.code === 'ENOENT') return null; throw error; });
    if (Boolean(current) !== existing || (current && (current.isSymbolicLink() || current.dev !== originalStat.dev || current.ino !== originalStat.ino))) throw new Error('Installation changed concurrently. Retry with the intended options.');
  }
  try {
    // Recheck after acquiring the lock to prevent an unapproved replacement.
    await checkTarget();
    stage = await mkdtemp(path.join(parent, '.tripi-tropi-stage-'));
    for (const filename of files) await cp(path.join(source, filename), path.join(stage, filename === 'SKILL.md' ? 'SKILL.pending' : filename), { recursive: true, dereference: false });
    // Codex must not discover an incomplete stage, even when scanning hidden directories.
    if (installDependencies) await installDependencies(stage);
    else await run(process.execPath, [npm, 'ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'], stage);
    const metadata = await readFile(path.join(stage, 'SKILL.pending'), 'utf8');
    if (!/^---\r?\nname: tripi-tropi\r?\ndescription: .+\r?\n---/.test(metadata)) throw new Error('Invalid skill metadata; installation was not activated.');
    await run(process.execPath, ['--input-type=module', '-e', "await import('./scripts/server.mjs'); await Promise.all(['marked/lib/marked.umd.js','dompurify/dist/purify.min.js','gsap/dist/gsap.min.js'].map(p=>import('node:fs/promises').then(fs=>fs.access('node_modules/'+p))))"], stage);
    await writeFile(path.join(stage, marker), JSON.stringify({ installer: 'tripi-tropi', format: 1, version: JSON.parse(await readFile(path.join(stage, 'package.json'))).version }, null, 2));
    await checkTarget();
    if (existing) {
      backup = await mkdtemp(path.join(parent, '.tripi-tropi-backup-'));
      await rm(backup, { recursive: true });
      await rename(target, backup);
    }
    try {
      if (backup) await rename(path.join(backup, 'SKILL.md'), path.join(backup, 'SKILL.pending'));
      await rename(stage, target);
      ownsTarget = true;
      stage = null;
      await rename(path.join(target, 'SKILL.pending'), path.join(target, 'SKILL.md'));
    } catch (error) {
      // Activation failure restores the complete previous package.
      if (ownsTarget) await rm(target, { recursive: true, force: true });
      if (backup) {
        if (await access(path.join(backup, 'SKILL.pending')).then(() => true, () => false)) await rename(path.join(backup, 'SKILL.pending'), path.join(backup, 'SKILL.md'));
        try { await rename(backup, target); backup = null; }
        catch (restoreError) { throw new Error(`Activation failed: ${error.message}. Previous installation preserved at ${backup}; restore failed: ${restoreError.message}`); }
      }
      throw error;
    }
    if (backup) { await rm(backup, { recursive: true, force: true }); backup = null; }
    return target;
  } finally {
    if (stage) await rm(stage, { recursive: true, force: true });
    await rm(lock, { recursive: true, force: true });
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const { values } = parseArgs({ options: { 'skills-dir': { type: 'string' }, update: { type: 'boolean' }, help: { type: 'boolean' } } });
    if (values.help) console.log('node scripts/install-skill.mjs [--skills-dir <parent directory>] [--update]\nDefault: ~/.agents/skills. --update explicitly replaces a managed installation.');
    else console.log(`Installed tripi-tropi at ${await installSkill({ skillsDir: values['skills-dir'], update: values.update })}\nInvoke $tripi-tropi in Codex. If absent, restart Codex.`);
  } catch (error) { console.error(`Installation failed: ${error.message}`); process.exitCode = 1; }
}
