import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import os from 'os';

const home = os.homedir();
const plistPath = path.join(
  home,
  'Library/LaunchAgents/com.user.emailagent.plist'
);

try {
  console.log('🗑️  Removing launchd agent...\n');

  // Check if plist exists
  if (!fs.existsSync(plistPath)) {
    console.log('ℹ️  Plist not found. Agent may not be installed.');
    process.exit(0);
  }

  // Unload the agent
  try {
    execSync(`launchctl unload ${plistPath}`, { stdio: 'inherit' });
    console.log('✅ Unloaded with launchctl');
  } catch (err) {
    console.warn('⚠️  Warning unloading agent (it may not have been running)');
  }

  // Remove plist file
  fs.unlinkSync(plistPath);
  console.log(`✅ Removed plist: ${plistPath}`);

  console.log('\n✨ Agent uninstalled successfully');
} catch (err) {
  console.error('❌ Removal failed:', err.message);
  process.exit(1);
}
