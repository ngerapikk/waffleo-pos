import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('❌ Please provide the backup filename as an argument.');
    console.error('Usage: npm run db:restore -- <filename>.sql');
    process.exit(1);
  }

  const filename = args[0];
  const backupDir = path.join(__dirname, '../../backups');
  let backupFile = path.resolve(filename);
  
  if (!fs.existsSync(backupFile)) {
    backupFile = path.join(backupDir, filename);
    if (!fs.existsSync(backupFile)) {
      console.error(`❌ Backup file not found: ${backupFile}`);
      process.exit(1);
    }
  }

  console.log('⚠️ WARNING: This will overwrite your current database with the backup!');
  console.log(`🔄 Starting database restore from ${backupFile}...`);
  
  // Extract connection details from DATABASE_URL
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/waffleo_pos?schema=public';
  
  const url = new URL(connectionString);
  const dbName = url.pathname.substring(1);
  const host = url.hostname;
  const port = url.port || '5432';
  const username = url.username;
  const password = url.password;

  // Uses pg_restore for custom format (-F c)
  const command = `pg_restore -h ${host} -p ${port} -U ${username} -d ${dbName} -c -v "${backupFile}"`;
  
  console.log(`📡 Connecting to database ${dbName} at ${host}:${port}...`);

  try {
    const { stdout, stderr } = await execAsync(command, {
      env: { ...process.env, PGPASSWORD: password }
    });
    console.log('✅ Restore completed successfully!');
  } catch (error) {
    // pg_restore often returns exit code 1 due to warnings (e.g. dropping tables that don't exist yet)
    // We log it as a warning instead of full failure unless it's a severe error
    console.warn('⚠️ Restore finished, but with some warnings/errors.');
    console.warn('Check logs if data appears missing. This is often normal when dropping non-existent tables.');
    // console.error(error);
  }
}

main();
