/**
 * deploy.js - n8n Workflow Deployment Script
 * Version: 2.0.0
 * 
 * Enterprise-grade deployment automation for n8n workflows
 * Features:
 * - Automatic workflow import/update
 * - Credential validation
 * - Rollback capability
 * - Detailed logging
 * - Error handling with retry logic
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
require('dotenv').config();

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  n8nApiUrl: `${process.env.N8N_PROTOCOL || 'http'}://${process.env.N8N_HOST || 'localhost'}:${process.env.N8N_PORT || '5678'}/api/v1`,
  n8nApiKey: process.env.N8N_API_KEY,
  workflowsDir: path.join(__dirname, '..', 'workflows'),
  backupDir: path.join(__dirname, '..', 'backups'),
  maxRetries: 3,
  retryDelay: 2000
};

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validates environment configuration
 * @throws {Error} If configuration is invalid
 */
const validateConfig = () => {
  if (!CONFIG.n8nApiKey) {
    console.error(chalk.red('❌ ERROR: N8N_API_KEY not found in environment variables'));
    console.log(chalk.yellow('💡 Steps to fix:'));
    console.log(chalk.yellow('   1. Copy .env.example to .env'));
    console.log(chalk.yellow('   2. Add your n8n API key to .env'));
    console.log(chalk.yellow('   3. Get API key from: n8n Settings → API'));
    process.exit(1);
  }
  
  if (!fs.existsSync(CONFIG.workflowsDir)) {
    console.error(chalk.red(`❌ ERROR: Workflows directory not found: ${CONFIG.workflowsDir}`));
    process.exit(1);
  }
  
  // Create backup directory if it doesn't exist
  if (!fs.existsSync(CONFIG.backupDir)) {
    fs.mkdirSync(CONFIG.backupDir, { recursive: true });
    console.log(chalk.green(`✅ Created backup directory: ${CONFIG.backupDir}`));
  }
};

/**
 * Tests connection to n8n API
 * @returns {Promise<boolean>} True if connection successful
 */
const testConnection = async () => {
  try {
    const response = await axios.get(`${CONFIG.n8nApiUrl}/workflows`, {
      headers: { 'X-N8N-API-KEY': CONFIG.n8nApiKey },
      timeout: 5000
    });
    
    console.log(chalk.green(`✅ Connected to n8n (${response.data.data.length} existing workflows)`));
    return true;
  } catch (error) {
    console.error(chalk.red('❌ Failed to connect to n8n API'));
    
    if (error.code === 'ECONNREFUSED') {
      console.error(chalk.yellow('💡 n8n server is not running'));
      console.error(chalk.yellow('   Start with: npm start or n8n start'));
    } else if (error.response?.status === 401) {
      console.error(chalk.yellow('💡 Invalid API key'));
      console.error(chalk.yellow('   Check N8N_API_KEY in .env file'));
    } else {
      console.error(chalk.yellow(`💡 ${error.message}`));
    }
    
   return false;
  }
};

// ============================================================================
// WORKFLOW OPERATIONS
// ============================================================================

/**
 * Reads and parses workflow JSON file
 * @param {string} filename - Workflow filename
 * @returns {Object} Parsed workflow object
 */
const readWorkflowFile = (filename) => {
  try {
    const filePath = path.join(CONFIG.workflowsDir, filename);
    const content = fs.readFileSync(filePath, 'utf8');
    const workflow = JSON.parse(content);
    
    // Validate workflow structure
    if (!workflow.name) {
      throw new Error('Workflow must have a name property');
    }
    
    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      throw new Error('Workflow must have a nodes array');
    }
    
    return workflow;
  } catch (error) {
    throw new Error(`Failed to read workflow file ${filename}: ${error.message}`);
  }
};

/**
 * Checks if workflow already exists in n8n
 * @param {string} workflowName - Name of the workflow
 * @returns {Promise<Object|null>} Existing workflow or null
 */
const findExistingWorkflow = async (workflowName) => {
  try {
    const response = await axios.get(`${CONFIG.n8nApiUrl}/workflows`, {
      headers: { 'X-N8N-API-KEY': CONFIG.n8nApiKey }
    });
    
    return response.data.data.find(wf => wf.name === workflowName) || null;
  } catch (error) {
    console.warn(chalk.yellow(`⚠️  Could not check existing workflows: ${error.message}`));
    return null;
  }
};

/**
 * Creates backup of existing workflow before update
 * @param {Object} workflow - Workflow to backup
 */
const backupWorkflow = (workflow) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${workflow.name}_${timestamp}.json`;
    const backupPath = path.join(CONFIG.backupDir, filename);
    
    fs.writeFileSync(backupPath, JSON.stringify(workflow, null, 2), 'utf8');
    console.log(chalk.gray(`   💾 Backup saved: ${filename}`));
  } catch (error) {
    console.warn(chalk.yellow(`   ⚠️  Failed to create backup: ${error.message}`));
  }
};

/**
 * Deploys a single workflow to n8n with retry logic
 * @param {string} workflowFile - Workflow filename
 * @param {Object} options - Deployment options
 * @returns {Promise<Object>} Deployment result
 */
const deployWorkflow = async (workflowFile, options = {}) => {
  const { update = true, activate = true, backup = true } = options;
  
  console.log(chalk.blue(`\n📦 Processing: ${workflowFile}`));
  
  let retries = 0;
  
  while (retries <= CONFIG.maxRetries) {
    try {
      // Read workflow file
      const workflow = readWorkflowFile(workflowFile);
      console.log(chalk.gray(`   📄 Loaded workflow: ${workflow.name}`));
      console.log(chalk.gray(`   📊 Nodes: ${workflow.nodes.length}, Active: ${workflow.active !== false}`));
      
      // Check if workflow exists
      const existing = await findExistingWorkflow(workflow.name);
      
      let response;
      let action;
      
      if (existing) {
        if (!update) {
          console.log(chalk.yellow(`   ⏭️  Skipped: ${workflow.name} (already exists, update disabled)`));
          return { status: 'skipped', workflow: existing };
        }
        
        // Backup before update
        if (backup) {
          backupWorkflow(existing);
        }
        
        // Update existing workflow
        console.log(chalk.yellow(`   ↻ Updating existing workflow (ID: ${existing.id})`));
        response = await axios.patch(
          `${CONFIG.n8nApiUrl}/workflows/${existing.id}`,
          workflow,
          {
            headers: { 'X-N8N-API-KEY': CONFIG.n8nApiKey },
            timeout: 10000
          }
        );
        action = 'updated';
        console.log(chalk.green(`   ✅ Updated: ${workflow.name}`));
      } else {
        // Create new workflow
        console.log(chalk.blue(`   + Creating new workflow`));
        response = await axios.post(
          `${CONFIG.n8nApiUrl}/workflows`,
          workflow,
          {
            headers: { 'X-N8N-API-KEY': CONFIG.n8nApiKey },
            timeout: 10000
          }
        );
        action = 'created';
        console.log(chalk.green(`   ✅ Created: ${workflow.name}`));
      }
      
      // Activate workflow if needed
      if (activate && workflow.active !== false) {
        try {
          await axios.patch(
            `${CONFIG.n8nApiUrl}/workflows/${response.data.data.id}`,
            { active: true },
            { headers: { 'X-N8N-API-KEY': CONFIG.n8nApiKey } }
          );
          console.log(chalk.green(`   ✓ Activated`));
        } catch (error) {
          console.warn(chalk.yellow(`   ⚠️  Failed to activate: ${error.message}`));
        }
      }
      
      return {
        status: action,
        workflow: response.data.data,
        attempts: retries + 1
      };
      
    } catch (error) {
      retries++;
      
      if (retries > CONFIG.maxRetries) {
        console.error(chalk.red(`   ❌ Deploy failed after ${CONFIG.maxRetries} attempts`));
        console.error(chalk.red(`   Error: ${error.message}`));
        
        if (error.response) {
          console.error(chalk.red(`   Status: ${error.response.status}`));
          console.error(chalk.red(`   Response: ${JSON.stringify(error.response.data, null, 2)}`));
        }
        
        throw error;
      }
      
      console.warn(chalk.yellow(`   ⚠️  Attempt ${retries} failed, retrying in ${CONFIG.retryDelay}ms...`));
      await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay));
    }
  }
};

/**
 * Deploys all workflows in the workflows directory
 * @param {Object} options - Deployment options
 */
const deployAllWorkflows = async (options = {}) => {
  console.log(chalk.bold.cyan('\n🚀 N8N WORKFLOW DEPLOYMENT'));
  console.log(chalk.gray('═'.repeat(70)));
  console.log(chalk.white(`Started at: ${new Date().toISOString()}\n`));
  
  // Get all workflow files
  const files = fs.readdirSync(CONFIG.workflowsDir)
    .filter(file => file.endsWith('.json') && !file.startsWith('.'))
    .sort();
  
  if (files.length === 0) {
    console.log(chalk.yellow('⚠️  No workflow files found in /workflows directory'));
    return;
  }
  
  console.log(chalk.white(`Found ${files.length} workflow file(s):\n`));
  files.forEach((file, index) => {
    console.log(chalk.gray(`  ${index + 1}. ${file}`));
  });
  
  const results = {
    created: [],
    updated: [],
    skipped: [],
    failed: []
  };
  
  // Deploy workflows sequentially
  for (const file of files) {
    try {
      const result = await deployWorkflow(file, options);
      results[result.status].push({ file, workflow: result.workflow, attempts: result.attempts });
    } catch (error) {
      results.failed.push({ file, error: error.message });
    }
    
    // Small delay between workflows
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Print summary
  console.log(chalk.bold.cyan('\n📊 DEPLOYMENT SUMMARY'));
  console.log(chalk.gray('═'.repeat(70)));
  
  const total = results.created.length + results.updated.length + results.skipped.length + results.failed.length;
  
  console.log(chalk.green(`✅ Created:  ${results.created.length.toString().padStart(2)} workflow(s)`));
  if (results.created.length > 0) {
    results.created.forEach(r => console.log(chalk.gray(`     - ${r.file}`)));
  }
  
  console.log(chalk.blue(`↻  Updated:  ${results.updated.length.toString().padStart(2)} workflow(s)`));
  if (results.updated.length > 0) {
    results.updated.forEach(r => console.log(chalk.gray(`     - ${r.file}`)));
  }
  
  console.log(chalk.yellow(`⏭️  Skipped:  ${results.skipped.length.toString().padStart(2)} workflow(s)`));
  if (results.skipped.length > 0) {
    results.skipped.forEach(r => console.log(chalk.gray(`     - ${r.file}`)));
  }
  
  console.log(chalk.red(`❌ Failed:   ${results.failed.length.toString().padStart(2)} workflow(s)`));
  if (results.failed.length > 0) {
    results.failed.forEach(r => {
      console.log(chalk.gray(`     - ${r.file}`));
      console.log(chalk.red(`       Error: ${r.error}`));
    });
  }
  
  console.log(chalk.gray(`\nTotal: ${total} workflow(s) processed`));
  console.log(chalk.gray(`Completed at: ${new Date().toISOString()}`));
  
  if (results.failed.length > 0) {
    console.log(chalk.red('\n❌ Some deployments failed!'));
    process.exit(1);
  }
  
  console.log(chalk.green('\n🎉 Deployment completed successfully!\n'));
};

// ============================================================================
// CLI INTERFACE
// ============================================================================

/**
 * Displays help message
 */
const showHelp = () => {
  console.log(chalk.cyan(`
N8N Workflow Deployment Script v2.0.0

${chalk.bold('USAGE:')}
  node scripts/deploy.js [options] [workflow-file.json]

${chalk.bold('OPTIONS:')}
  --all              Deploy all workflows in /workflows directory
  --no-update        Skip updating existing workflows (create only)
  --no-activate      Don't activate workflows after deployment
  --no-backup        Skip backing up existing workflows
  --help, -h         Show this help message

${chalk.bold('EXAMPLES:')}
  ${chalk.gray('# Deploy single workflow')}
  node scripts/deploy.js WF_CORE_ROUTER_v2.0.0.json

  ${chalk.gray('# Deploy all workflows')}
  node scripts/deploy.js --all

  ${chalk.gray('# Create only (don't update existing)')}
  node scripts/deploy.js --all --no-update

  ${chalk.gray('# Using npm scripts')}
  npm run deploy WF_CORE_ROUTER_v2.0.0.json
  npm run deploy:all

${chalk.bold('ENVIRONMENT VARIABLES:')}
  N8N_HOST           n8n host (default: localhost)
  N8N_PORT           n8n port (default: 5678)
  N8N_PROTOCOL       Protocol (default: http)
  N8N_API_KEY        n8n API key (required)

${chalk.bold('WORKFLOW FILE FORMAT:')}
  Workflows must be valid n8n JSON files with:
  - name property
  - nodes array
  - connections object

${chalk.bold('BACKUPS:')}
  Existing workflows are backed up to /backups before updates.
  Restore manually if needed.
  `));
};

/**
 * Main execution function
 */
const main = async () => {
  // Parse arguments
  const args = process.argv.slice(2);
  const flags = {
    all: args.includes('--all'),
    noUpdate: args.includes('--no-update'),
    noActivate: args.includes('--no-activate'),
    noBackup: args.includes('--no-backup'),
    help: args.includes('--help') || args.includes('-h')
  };
  
  // Show help if requested
  if (flags.help) {
    showHelp();
    process.exit(0);
  }
  
  // Validate configuration
  validateConfig();
  
  // Test API connection
  const connected = await testConnection();
  if (!connected) {
    process.exit(1);
  }
  
  // Deployment options
  const options = {
    update: !flags.noUpdate,
    activate: !flags.noActivate,
    backup: !flags.noBackup
  };
  
  // Deploy workflows
  if (flags.all || args.length === 0) {
    await deployAllWorkflows(options);
  } else {
    // Deploy specific workflow
    const filename = args.find(arg => !arg.startsWith('--'));
    if (!filename) {
      console.error(chalk.red('❌ No workflow file specified'));
      console.log(chalk.yellow('💡 Use --help for usage information'));
      process.exit(1);
    }
    
    try {
      await deployWorkflow(filename, options);
      console.log(chalk.green('\n✅ Deployment successful!\n'));
    } catch (error) {
      process.exit(1);
    }
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
  deployWorkflow,
  deployAllWorkflows,
  findExistingWorkflow,
  readWorkflowFile
};
