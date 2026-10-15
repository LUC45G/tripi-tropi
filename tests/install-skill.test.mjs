import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { installSkill } from '../scripts/install-skill.mjs';

function launch(skill, repo, stop = false) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(skill, 'scripts/launch.mjs'), '--repo', repo, '--no-open', ...(stop ? ['--stop'] : ['--thread', ''])], { windowsHide: true });
    let output = ''; let errors = '';
    child.stdout.on('data', (data) => { output += data; });
    child.stderr.on('data', (data) => { errors += data; });
    child.once('error', reject);
    child.once('close', (code) => code === 0 ? resolve(stop ? output : JSON.parse(output)) : reject(new Error(errors)));
  });
}

test('isolated installation is complete, launches two repositories, and updates explicitly', { timeout: 120000 }, async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'tripi-tropi-install test-'));
  const skillsDir = path.join(root, 'user skills');
  const repos = [path.join(root, 'repo-one'), path.join(root, 'repo with spaces')];
  let skill;
  try {
    await mkdir(path.join(skillsDir, 'unrelated'), { recursive: true });
    await writeFile(path.join(skillsDir, 'unrelated/SKILL.md'), 'preserve me');
    await writeFile(path.join(root, 'config.toml'), 'preserve config');
    skill = await installSkill({ skillsDir });
    assert.equal(await readFile(path.join(skillsDir, 'unrelated/SKILL.md'), 'utf8'), 'preserve me');
    assert.equal(await readFile(path.join(root, 'config.toml'), 'utf8'), 'preserve config');
    await assert.rejects(installSkill({ skillsDir, installDependencies: async () => {} }), /--update/);
    assert.match(await readFile(path.join(skill, 'SKILL.md'), 'utf8'), /name: tripi-tropi/);
    assert.match(await readFile(path.join(skill, 'references/ticket-format.md'), 'utf8'), /```markdown/);
    const index = spawnSync(process.execPath, [path.join(skill, 'scripts/ticket-index.mjs'), '--repo', root, '--json'], { encoding: 'utf8', windowsHide: true });
    assert.equal(index.status, 0, index.stderr);
    assert.deepEqual(JSON.parse(index.stdout), { tickets: [], diagnostics: [] });
    await assert.rejects(readFile(path.join(skill, 'node_modules/playwright/package.json')), /ENOENT/);
    for (const [index, repo] of repos.entries()) {
      const issues = path.join(repo, '.scratch/demo/issues');
      await mkdir(issues, { recursive: true });
      const ticket = `# 01: Original ${index}\nStatus: ready-for-agent\nExecution: pending\nLabels: demo\nBlocked by: none\nCommits: none\n`;
      await writeFile(path.join(issues, '01-demo.md'), ticket);
      const { url } = await launch(skill, repo);
      try {
        const snapshot = await (await fetch(`${url}/api/snapshot`)).json();
        assert.equal(snapshot.tickets[0].title, `Original ${index}`);
        for (const resource of ['/', '/app.js', '/graph.mjs', '/style.css', '/icon.svg', '/vendor/marked.js', '/vendor/purify.js', '/vendor/gsap.js']) assert.equal((await fetch(`${url}${resource}`)).status, 200);
        assert.equal(await readFile(path.join(issues, '01-demo.md'), 'utf8'), ticket);
      } finally { await launch(skill, repo, true); }
    }
    await writeFile(path.join(skill, 'old-version.txt'), 'old');
    await assert.rejects(installSkill({ skillsDir, update: true, installDependencies: async () => { throw new Error('network unavailable'); } }), /network unavailable/);
    assert.equal(await readFile(path.join(skill, 'old-version.txt'), 'utf8'), 'old');
    assert.match(await readFile(path.join(skill, 'SKILL.md'), 'utf8'), /name: tripi-tropi/);
    await assert.rejects(installSkill({ skillsDir, update: true, installDependencies: async () => {} }), /Command failed/);
    assert.equal(await readFile(path.join(skill, 'old-version.txt'), 'utf8'), 'old');
    await installSkill({ skillsDir, update: true });
    await assert.rejects(readFile(path.join(skill, 'old-version.txt')), /ENOENT/);
    assert.deepEqual((await readdir(skillsDir)).sort(), ['tripi-tropi', 'unrelated']);
    const unmanaged = path.join(root, 'unmanaged');
    await mkdir(path.join(unmanaged, 'tripi-tropi'), { recursive: true });
    await writeFile(path.join(unmanaged, 'tripi-tropi/SKILL.md'), 'user data');
    await assert.rejects(installSkill({ skillsDir: unmanaged, update: true, installDependencies: async () => {} }), /not installed by this installer/);
    assert.equal(await readFile(path.join(unmanaged, 'tripi-tropi/SKILL.md'), 'utf8'), 'user data');
    const fresh = path.join(root, 'failed first install');
    await assert.rejects(installSkill({ skillsDir: fresh, installDependencies: async () => { throw new Error('offline'); } }), /offline/);
    assert.deepEqual(await readdir(fresh), []);
    await mkdir(path.join(fresh, '.tripi-tropi-install.lock'));
    await assert.rejects(installSkill({ skillsDir: fresh, installDependencies: async () => {} }), /Another installation/);
    await assert.rejects(installSkill({ skillsDir: 'skills', installDependencies: async () => {} }), /outside the source/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
