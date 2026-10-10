#!/usr/bin/env node
import { installSkill } from './install-skill.mjs';

try {
  const args = process.argv.slice(2);
  const help = args.includes('--help') || args.includes('-h');
  if (help) {
    console.log('Install tripi-tropi for Codex.\n\nUsage: npx @messieszurdo/tripi-tropi [--update] [--skills-dir <parent directory>]');
    process.exit(0);
  }
  const skillsIndex = args.indexOf('--skills-dir');
  const skillsDir = skillsIndex >= 0 ? args[skillsIndex + 1] : undefined;
  if (skillsIndex >= 0 && (!skillsDir || skillsDir.startsWith('-'))) throw new Error('--skills-dir requires a directory.');
  const unknown = args.filter((arg, index) => arg !== '--update' && arg !== '--skills-dir' && !(index === skillsIndex + 1));
  if (unknown.length) throw new Error(`Unknown option: ${unknown.join(', ')}`);
  const target = await installSkill({ skillsDir, update: args.includes('--update') });
  console.log(`Installed tripi-tropi at ${target}\nInvoke $tripi-tropi in Codex. If absent, restart Codex.`);
} catch (error) {
  console.error(`Installation failed: ${error.message}`);
  process.exitCode = 1;
}
