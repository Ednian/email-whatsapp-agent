import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import os from 'os';

const home = os.homedir();
const projectRoot = path.resolve('.');
const plistPath = path.join(
  home,
  'Library/LaunchAgents/com.user.emailagent.plist'
);
const hour = parseInt(process.env.CRON_HOUR || '22');
const minute = parseInt(process.env.CRON_MINUTE || '0');

// Create LaunchAgent plist
const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.user.emailagent</string>

  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/node</string>
    <string>${projectRoot}/src/index.js</string>
  </array>

  <key>WorkingDirectory</key>
  <string>${projectRoot}</string>

  <key>StandardOutPath</key>
  <string>${projectRoot}/agent.log</string>

  <key>StandardErrorPath</key>
  <string>${projectRoot}/agent.log</string>

  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>${hour}</integer>
    <key>Minute</key>
    <integer>${minute}</integer>
  </dict>

  <key>RunAtLoad</key>
  <false/>
</dict>
</plist>`;

try {
  console.log('📦 Installing launchd agent...\n');

  // Ensure LaunchAgents directory exists
  const launchAgentsDir = path.join(home, 'Library/LaunchAgents');
  if (!fs.existsSync(launchAgentsDir)) {
    fs.mkdirSync(launchAgentsDir, { recursive: true });
  }

  // Write plist file
  fs.writeFileSync(plistPath, plistContent);
  console.log(`✅ Created plist: ${plistPath}`);

  // Load the agent
  execSync(`launchctl load ${plistPath}`, { stdio: 'inherit' });
  console.log('✅ Loaded with launchctl');

  console.log(`\n🕐 Agent scheduled to run daily at ${hour}:${minute.toString().padStart(2, '0')}`);
  console.log('\n📋 To verify installation:');
  console.log(`   launchctl list | grep com.user.emailagent`);
  console.log('\n⏹️  To uninstall:');
  console.log(`   npm run remove-cron`);
} catch (err) {
  console.error('❌ Installation failed:', err.message);
  process.exit(1);
}
