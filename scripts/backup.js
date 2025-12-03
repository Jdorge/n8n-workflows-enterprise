/**
 * backup.js - Workflow Backup & Restore System
 * Version: 2.0.0
 * 
 * Automated backup system for n8n workflows
 * Features:
 * - Scheduled backups
 * - Version control
 * - Restore capability
 * - Backup rotation (retention policy)
 * - Compression support
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { format } = require('date-fns');
require('dotenv').config();

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  n8nApiUrl: `${process.env.N8N_PROTOCOL || 'http'}://${process.env.N8N_HOST || 'localhost'}:${process.env.N8N_PORT || '5678'}/api/v1`,
  n8nApiKey: process.env.N8N_API_KEY,
  backupDir: path.join(__dirname, '..', 'backups'),
  retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30,
  includeCredentials: false, // Never backup credentials for security
  compressionEnabled: false // Can enable gzip compression if needed
};

// ============================================================================
// BACKUP OPERATIONS
// ============================================================================

/**
 * Fetches all workflows from n8n API
 * @returns {Promise<Array>} Array of workflows
 */
const fetchAllWorkflows = async () => {
  try {
    const response = await axios.get(`${CONFIG.n8nApiUrl}/workflows`, {
      headers: { 'X-N8N-API-KEY': CONFIG.n8nApiKey },
      timeout: 10000
    });
    
    return response.data.data;
  } catch (error) {
    throw new Error(`Failed to fetch workflows: ${error.message}`);
  }
};

/**
 * Creates a backup of all workflows
 * @param {Object} options - Backup options
 * @returns {Promise<string>} Path to backup file
 */
const createBackup = async (options = {}) => {
  const { tag = '', note = '' } = options;
  
  console.log(chalk.blue('\n📦 Starting backup process...'));
  
  // Ensure backup directory exists
  if (!fs.existsSync(CONFIG.backupDir)) {
    fs.mkdirSync(CONFIG.backupDir, { recursive: true });
    console.log(chalk.green(`✅ Created backup directory: ${CONFIG.backupDir}`));
  }
  
  try {
    // Fetch all workflows
    console.log(chalk.gray('   Fetching workflows...'));
    const workflows = await fetchAllWorkflows();
    console.log(chalk.green(`   ✅ Retrieved ${workflows.length} workflow(s)`));
    
    // Create backup object
    const backup = {
      metadata: {
        version: '2.0.0',
        createdAt: new Date().toISOString(),
        n8nVersion: '1.0.0', // Could fetch from n8n API
        workflowCount: workflows.length,
        tag: tag || format(new Date(), 'yyyy-MM-dd_HH-mm-ss'),
        note: note
      },
      workflows: workflows.map(wf => ({
        id: wf.id,
        name: wf.name,
        active: wf.active,
        nodes: wf.nodes,
        connections: wf.connections,
        settings: wf.settings,
        tags: wf.tags || [],
        createdAt: wf.createdAt,
        updatedAt: wf.updatedAt
      }))
    };
    
    // Generate filename
    const filename = `backup_${backup.metadata.tag}.json`;
    const filepath = path.join(CONFIG.backupDir, filename);
    
    // Write backup file
    console.log(chalk.gray(`   Writing backup to: ${filename}`));
    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2), 'utf8');
    
    // Calculate file size
    const stats = fs.statSync(filepath);
    const fileSizeKB = (stats.size / 1024).toFixed(2);
    
    console.log(chalk.green(`✅ Backup created successfully!`));
    console.log(chalk.gray(`   File: ${filename}`));
    console.log(chalk.gray(`   Size: ${fileSizeKB} KB`));
    console.log(chalk.gray(`   Workflows: ${workflows.length}`));
    
    return filepath;
  } catch (error) {
    console.error(chalk.red(`❌ Backup failed: ${error.message}`));
    throw error;
  }
};

/**
 * Lists all available backups
 * @returns {Array} Array of backup info objects
 */
const listBackups = () => {
  console.log(chalk.blue('\n📋 Available Backups'));
  console.log(chalk.gray('─'.repeat(70)));
  
  if (!fs.existsSync(CONFIG.backupDir)) {
    console.log(chalk.yellow('No backups found (backup directory does not exist)'));
    return [];
  }
  
  const files = fs.readdirSync(CONFIG.backupDir)
    .filter(file => file.startsWith('backup_') && file.endsWith('.json'))
    .sort()
    .reverse(); // Most recent first
  
  if (files.length === 0) {
    console.log(chalk.yellow('No backups found'));
    return [];
  }
  
  const backups = files.map((file, index) => {
    const filepath = path.join(CONFIG.backupDir, file);
    const stats = fs.statSync(filepath);
    const content = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    
    return {
      index: index + 1,
      filename: file,
      filepath,
      size: (stats.size / 1024).toFixed(2) + ' KB',
      createdAt: content.metadata?.createdAt || stats.mtime.toISOString(),
      workflowCount: content.metadata?.workflowCount || content.workflows?.length || 0,
      tag: content.metadata?.tag || 'unknown',
      note: content.metadata?.note || ''
    };
  });
  
  // Display table
  backups.forEach(backup => {
    console.log(chalk.white(`${backup.index.toString().padStart(2)}. ${backup.filename}`));
    console.log(chalk.gray(`    Created: ${new Date(backup.createdAt).toLocaleString()}`));
    console.log(chalk.gray(`    Workflows: ${backup.workflowCount} | Size: ${backup.size}`));
    if (backup.note) {
      console.log(chalk.gray(`    Note: ${backup.note}`));
    }
    console.log('');
  });
  
  return backups;
};

/**
 * Restores workflows from a backup file
 * @param {string} backupFile - Backup filename or path
 * @param {Object} options - Restore options
 */
const restoreBackup = async (backupFile, options = {}) => {
  const { dryRun = false, selective = [] } = options;
  
  console.log(chalk.blue('\n🔄 Starting restore process...'));
  
  // Determine backup file path
  const filepath = backupFile.includes(path.sep)
    ? backupFile
    : path.join(CONFIG.backupDir, backupFile);
  
  if (!fs.existsSync(filepath)) {
    throw new Error(`Backup file not found: ${filepath}`);
  }
  
  try {
    // Read backup file
    console.log(chalk.gray(`   Reading backup: ${path.basename(filepath)}`));
    const backup = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    
    if (!backup.workflows || !Array.isArray(backup.workflows)) {
      throw new Error('Invalid backup format: missing workflows array');
    }
    
    console.log(chalk.green(`   ✅ Loaded backup from ${backup.metadata?.createdAt || 'unknown date'}`));
    console.log(chalk.gray(`   Workflows in backup: ${backup.workflows.length}`));
    
    // Filter workflows if selective restore
    const workflowsToRestore = selective.length > 0
      ? backup.workflows.filter(wf => selective.includes(wf.name))
      : backup.workflows;
    
    console.log(chalk.gray(`   Workflows to restore: ${workflowsToRestore.length}`));
    
    if (dryRun) {
      console.log(chalk.yellow('\n⚠️  DRY RUN - No changes will be made'));
      console.log(chalk.gray('\nWould restore the following workflows:'));
      workflowsToRestore.forEach((wf, i) => {
        console.log(chalk.gray(`   ${i + 1}. ${wf.name} (${wf.nodes.length} nodes)`));
      });
      return;
    }
    
    // Restore workflows
    const results = {
      created: 0,
      updated: 0,
      failed: 0
    };
    
    for (const workflow of workflowsToRestore) {
      try {
        console.log(chalk.gray(`\n   Processing: ${workflow.name}`));
        
        // Check if workflow exists
        const existing = await findWorkflowByName(workflow.name);
        
        if (existing) {
          // Update existing workflow
          await axios.patch(
            `${CONFIG.n8nApiUrl}/workflows/${existing.id}`,
            {
              name: workflow.name,
              nodes: workflow.nodes,
              connections: workflow.connections,
              settings: workflow.settings,
              tags: workflow.tags
            },
            { headers: { 'X-N8N-API-KEY': CONFIG.n8nApiKey } }
          );
          console.log(chalk.green(`   ✅ Updated: ${workflow.name}`));
          results.updated++;
        } else {
          // Create new workflow
          await axios.post(
            `${CONFIG.n8nApiUrl}/workflows`,
            {
              name: workflow.name,
              nodes: workflow.nodes,
              connections: workflow.connections,
              settings: workflow.settings,
              tags: workflow.tags,
              active: false // Keep inactive initially for safety
            },
            { headers: { 'X-N8N-API-KEY': CONFIG.n8nApiKey } }
          );
          console.log(chalk.green(`   ✅ Created: ${workflow.name}`));
          results.created++;
        }
      } catch (error) {
        console.error(chalk.red(`   ❌ Failed: ${workflow.name} - ${error.message}`));
        results.failed++;
      }
    }
    
    // Print summary
    console.log(chalk.bold.cyan('\n📊 RESTORE SUMMARY'));
    console.log(chalk.gray('─'.repeat(70)));
    console.log(chalk.green(`Created:  ${results.created}`));
    console.log(chalk.blue(`Updated:  ${results.updated}`));
    console.log(chalk.red(`Failed:   ${results.failed}`));
    
    if (results.failed > 0) {
      console.log(chalk.yellow('\n⚠️  Some workflows failed to restore'));
    } else {
      console.log(chalk.green('\n✅ Restore completed successfully!'));
    }
  } catch (error) {
    console.error(chalk.red(`❌ Restore failed: ${error.message}`));
    throw error;
  }
};

/**
 * Finds a workflow by name
 * @param {string} name - Workflow name
 * @returns {Promise<Object|null>} Workflow or null
 */
const findWorkflowByName = async (name) => {
  try {
    const response = await axios.get(`${CONFIG.n8nApiUrl}/workflows`, {
      headers: { 'X-N8N-API-KEY': CONFIG.n8nApiKey }
    });
    return response.data.data.find(wf => wf.name === name) || null;
  } catch (error) {
    return null;
  }
};

/**
 * Cleans old backups based on retention policy
 */
const cleanOldBackups = () => {
  console.log(chalk.blue('\n🧹 Cleaning old backups...'));
  
  if (!fs.existsSync(CONFIG.backupDir)) {
    console.log(chalk.yellow('No backup directory found'));
    return;
  }
  
  const now = new Date();
  const cutoffDate = new Date(now.getTime() - (CONFIG.retentionDays * 24 * 60 * 60 * 1000));
  
  const files = fs.readdirSync(CONFIG.backupDir)
    .filter(file => file.startsWith('backup_') && file.endsWith('.json'));
  
  let deleted = 0;
  
  files.forEach(file => {
    const filepath = path.join(CONFIG.backupDir, file);
    const stats = fs.statSync(filepath);
    
    if (stats.mtime < cutoffDate) {
      fs.unlinkSync(filepath);
      console.log(chalk.gray(`   Deleted: ${file}`));
      deleted++;
    }
  });
  
  if (deleted > 0) {
    console.log(chalk.green(`✅ Deleted ${deleted} old backup(s)`));
  } else {
    console.log(chalk.green('✅ No old backups to delete'));
  }
};

// ============================================================================
// CLI INTERFACE
// ============================================================================

/**
 * Displays help message
 */
const showHelp = () => {
  console.log(chalk.cyan(`
N8N Workflow Backup System v2.0.0

${chalk.bold('USAGE:')}
  node scripts/backup.js <command> [options]

${chalk.bold('COMMANDS:')}
  create              Create a new backup
  list                List all available backups
  restore <file>      Restore from backup file
  clean               Clean old backups (based on retention policy)

${chalk.bold('OPTIONS:')}
  --tag <tag>         Custom tag for backup (default: timestamp)
  --note <note>       Add a note to the backup
  --dry-run           Simulate restore without making changes
  --selective <names> Restore only specific workflows (comma-separated)
  --help, -h          Show this help message

${chalk.bold('EXAMPLES:')}
  ${chalk.gray('# Create a backup')}
  node scripts/backup.js create --tag "before-deploy" --note "Pre-deployment backup"

  ${chalk.gray('# List backups')}
  node scripts/backup.js list

  ${chalk.gray('# Restore from backup')}
  node scripts/backup.js restore backup_2024-12-03_14-30-00.json

  ${chalk.gray('# Dry run restore')}
  node scripts/backup.js restore backup_2024-12-03_14-30-00.json --dry-run

  ${chalk.gray('# Selective restore')}
  node scripts/backup.js restore backup.json --selective "WF_CORE_ROUTER,SW1_LEADS"

  ${chalk.gray('# Clean old backups')}
  node scripts/backup.js clean

${chalk.bold('CONFIGURATION:')}
  BACKUP_RETENTION_DAYS    Days to keep backups (default: 30)
  N8N_API_KEY              n8n API key (required)
  `));
};

/**
 * Main execution function
 */
const main = async () => {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }
  
  const command = args[0];
  
  // Parse options
  const getOption = (name) => {
    const index = args.indexOf(`--${name}`);
    return index !== -1 && args[index + 1] ? args[index + 1] : null;
  };
  
  const options = {
    tag: getOption('tag'),
    note: getOption('note'),
    dryRun: args.includes('--dry-run'),
    selective: getOption('selective')?.split(',').map(s => s.trim()) || []
  };
  
  try {
    switch (command) {
      case 'create':
        await createBackup(options);
        break;
      
      case 'list':
        listBackups();
        break;
      
      case 'restore':
        const backupFile = args[1];
        if (!backupFile) {
          console.error(chalk.red('❌ Please specify a backup file'));
          console.log(chalk.yellow('💡 Use: node scripts/backup.js restore <filename>'));
          process.exit(1);
        }
        await restoreBackup(backupFile, options);
        break;
      
      case 'clean':
        cleanOldBackups();
        break;
      
      default:
        console.error(chalk.red(`❌ Unknown command: ${command}`));
        console.log(chalk.yellow('💡 Use --help for usage information'));
        process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red(`\n💥 Error: ${error.message}`));
    process.exit(1);
  }
};

// ============================================================================
// EXECUTION
// ============================================================================

// Execute if run directly
if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red(`\n💥 Fatal error: ${error.message}`));
    process.exit(1);
  });
}

// Export for programmatic use
module.exports = {
  createBackup,
  listBackups,
  restoreBackup,
  cleanOldBackups
};
