import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function main() {
  console.log('🔄 Starting database backup...');
  
  // Create backups directory if it doesn't exist
  const backupDir = path.join(__dirname, '../../backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `waffleo_pos_${timestamp}.sql`);
  
  // Extract connection details from DATABASE_URL
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/waffleo_pos?schema=public';
  
  // Parse URL to hide password in logs but use it for pg_dump
  const url = new URL(connectionString);
  const dbName = url.pathname.substring(1);
  const host = url.hostname;
  const port = url.port || '5432';
  const username = url.username;
  // Use password via PGPASSWORD env variable for security (pg_dump requirement)
  const password = url.password;

  const command = `pg_dump -h ${host} -p ${port} -U ${username} -d ${dbName} -F c -b -v -f "${backupFile}"`;
  
  console.log(`📡 Connecting to database ${dbName} at ${host}:${port}...`);
  console.log(`💾 Saving to ${backupFile}`);

  try {
    const { stdout, stderr } = await execAsync(command, {
      env: { ...process.env, PGPASSWORD: password }
    });
    console.log('✅ Backup completed successfully!');
    console.log(`📍 File saved at: ${backupFile}`);
  } catch (error) {
    console.error('❌ Backup failed!');
    console.error(error);
    process.exit(1);
  }
}

main();
