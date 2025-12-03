/**
 * test.js - n8n Workflow Test Suite
 * Version: 2.0.0
 * 
 * Comprehensive automated testing for workflows and integrations
 * Test categories:
 * - Unit tests (validation functions)
 * - Integration tests (API connections)
 * - E2E tests (workflow execution)
 * - Performance tests
 */

const axios = require('axios');
const chalk = require('chalk');
const {
  validateEmail,
  validatePhone,
  validateCNPJ,
  validateLeadSchema,
  validateTransactionSchema,
  calculateLeadScore,
  sanitizeData,
  formatCurrency,
  isBusinessHours
} = require('./validators');
require('dotenv').config();

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const CONFIG = {
  n8nWebhookUrl: process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook',
  testTimeout: 10000,
  enableWebhookTests: process.env.ENABLE_WEBHOOK_TESTS === 'true'
};

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: [],
  startTime: null,
  endTime: null
};

// ============================================================================
// TEST UTILITIES
// ============================================================================

/**
 * Test runner utility
 * @param {string} name - Test name
 * @param {Function} fn - Test function
 * @returns {Function} Async test executor
 */
const test = (name, fn) => {
  return async () => {
    try {
      await fn();
      results.passed++;
      results.tests.push({ name, status: 'PASS', duration: 0 });
      console.log(chalk.green(`  ✓ ${name}`));
    } catch (error) {
      results.failed++;
      results.tests.push({ name, status: 'FAIL', error: error.message, duration: 0 });
      console.log(chalk.red(`  ✗ ${name}`));
      console.log(chalk.red(`    ${error.message}`));
    }
  };
};

/**
 * Assertion utilities
 */
const assert = {
  equal: (actual, expected, message) => {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  },
  notEqual: (actual, expected, message) => {
    if (actual === expected) {
      throw new Error(message || `Expected not to equal ${expected}`);
    }
  },
  true: (value, message) => {
    if (value !== true) {
      throw new Error(message || `Expected true, got ${value}`);
    }
  },
  false: (value, message) => {
    if (value !== false) {
      throw new Error(message || `Expected false, got ${value}`);
    }
  },
  exists: (value, message) => {
    if (value === undefined || value === null) {
      throw new Error(message || 'Expected value to exist');
    }
  },
  includes: (array, value, message) => {
    if (!Array.isArray(array) || !array.includes(value)) {
      throw new Error(message || `Expected array to include ${value}`);
    }
  },
  throws: (fn, message) => {
    try {
      fn();
      throw new Error(message || 'Expected function to throw');
    } catch (error) {
      // Expected
    }
  },
  greaterThan: (actual, expected, message) => {
    if (actual <= expected) {
      throw new Error(message || `Expected ${actual} > ${expected}`);
    }
  },
  lessThan: (actual, expected, message) => {
    if (actual >= expected) {
      throw new Error(message || `Expected ${actual} < ${expected}`);
    }
  }
};

// ============================================================================
// VALIDATION TESTS
// ============================================================================

const validationTests = [
  test('Email validation - valid emails', () => {
    assert.true(validateEmail('user@example.com'));
    assert.true(validateEmail('test.user+tag@company.com.br'));
    assert.true(validateEmail('admin@subdomain.example.com'));
  }),
  
  test('Email validation - invalid emails', () => {
    assert.false(validateEmail('invalid.email'));
    assert.false(validateEmail('@example.com'));
    assert.false(validateEmail('user@'));
    assert.false(validateEmail('user @example.com'));
    assert.false(validateEmail(''));
    assert.false(validateEmail(null));
  }),
  
  test('Phone validation - valid Brazilian numbers', () => {
    assert.true(validatePhone('+55 11 98765-4321'));
    assert.true(validatePhone('11987654321'));
    assert.true(validatePhone('(11) 98765-4321'));
    assert.true(validatePhone('+55 21 3333-4444'));
  }),
  
  test('Phone validation - valid international numbers', () => {
    assert.true(validatePhone('+1-555-123-4567'));
    assert.true(validatePhone('+44 20 7946 0958'));
  }),
  
  test('Phone validation - invalid numbers', () => {
    assert.false(validatePhone('123'));
    assert.false(validatePhone('abcdefghij'));
    assert.false(validatePhone(''));
    assert.false(validatePhone(null));
  }),
  
  test('CNPJ validation - valid CNPJs', () => {
    assert.true(validateCNPJ('11.222.333/0001-81'));
    assert.true(validateCNPJ('11222333000181'));
  }),
  
  test('CNPJ validation - invalid CNPJs', () => {
    assert.false(validateCNPJ('11.222.333/0001-80')); // Wrong digit
    assert.false(validateCNPJ('11111111111111')); // All same digits
    assert.false(validateCNPJ('123'));
    assert.false(validateCNPJ(''));
  }),
  
  test('Lead schema validation - valid lead', () => {
    const lead = {
      name: 'João Silva',
      email: 'joao@empresa.com',
      phone: '+55 11 98765-4321',
      company: 'Empresa XYZ',
      source: 'website'
    };
    const result = validateLeadSchema(lead);
    assert.true(!result.error, 'Lead should be valid');
  }),
  
  test('Lead schema validation - invalid lead (missing required fields)', () => {
    const lead = {
      name: 'Jo', // Too short
      email: 'invalid-email',
      phone: '123',
      source: 'invalid-source'
    };
    const result = validateLeadSchema(lead);
    assert.true(!!result.error, 'Lead should be invalid');
  }),
  
  test('Transaction schema validation - valid transaction', () => {
    const transaction = {
      type: 'income',
      amount: 1500.50,
      currency: 'BRL',
      description: 'Payment received from client',
      category: 'sales',
      date: new Date().toISOString()
    };
    const result = validateTransactionSchema(transaction);
    assert.true(!result.error, 'Transaction should be valid');
  }),
  
  test('Transaction schema validation - invalid transaction', () => {
    const transaction = {
      type: 'invalid_type',
      amount: -100, // Negative
      description: '', // Empty
      date: 'invalid-date'
    };
    const result = validateTransactionSchema(transaction);
    assert.true(!!result.error, 'Transaction should be invalid');
  }),
  
  test('Lead score calculation - high quality lead', () => {
    const lead = {
      email: 'ceo@bigcompany.com',
      company: 'Big Company Inc',
      position: 'CEO',
      phone: '+55 11 98765-4321',
      source: 'referral'
    };
    const score = calculateLeadScore(lead);
    assert.greaterThan(score, 70, `Expected high score, got ${score}`);
  }),
  
  test('Lead score calculation - low quality lead', () => {
    const lead = {
      email: 'user@gmail.com',
      source: 'cold_call'
    };
    const score = calculateLeadScore(lead);
    assert.lessThan(score, 50, `Expected low score, got ${score}`);
  }),
  
  test('Lead score calculation - medium quality lead', () => {
    const lead = {
      email: 'analyst@company.com',
      company: 'Company',
      position: 'Analyst',
      phone: '+55 11 98765-4321',
      source: 'website'
    };
    const score = calculateLeadScore(lead);
    assert.greaterThan(score, 40, `Expected medium+ score, got ${score}`);
    assert.lessThan(score, 80, `Expected medium score, got ${score}`);
  }),
  
  test('Data sanitization - remove script tags', () => {
    const dirty = {
      name: '<script>alert("xss")</script>John Doe',
      email: 'test@test.com'
    };
    const clean = sanitizeData(dirty);
    assert.false(clean.name.includes('<script>'), 'Should remove script tags');
    assert.true(clean.name.includes('John Doe'), 'Should keep clean content');
  }),
  
  test('Data sanitization - remove SQL injection patterns', () => {
    const dirty = {
      name: 'John',
      query: 'SELECT * FROM users; DROP TABLE--'
    };
    const clean = sanitizeData(dirty);
    assert.false(clean.query.includes('SELECT'), 'Should remove SQL keywords');
    assert.false(clean.query.includes('DROP'), 'Should remove SQL keywords');
  }),
  
  test('Currency formatting - BRL', () => {
    const formatted = formatCurrency(1234.56, 'BRL');
    assert.true(formatted.includes('1.234') || formatted.includes('1,234'), 'Should format number');
    assert.true(formatted.includes('R$') || formatted.includes('BRL'), 'Should include currency symbol');
  }),
  
  test('Currency formatting - USD', () => {
    const formatted = formatCurrency(1234.56, 'USD');
    assert.true(formatted.includes('1,234') || formatted.includes('1.234'), 'Should format number');
    assert.true(formatted.includes('$') || formatted.includes('USD'), 'Should include currency symbol');
  }),
  
  test('Business hours check - weekday within hours', () => {
    // Wednesday at 14:00
    const date = new Date('2024-12-04T14:00:00');
    process.env.WORKING_HOURS_START = '09:00';
    process.env.WORKING_HOURS_END = '18:00';
    assert.true(isBusinessHours(date), 'Should be within business hours');
  }),
  
  test('Business hours check - weekend', () => {
    // Saturday at 14:00
    const date = new Date('2024-12-07T14:00:00');
    assert.false(isBusinessHours(date), 'Weekend should not be business hours');
  }),
  
  test('Business hours check - after hours', () => {
    // Wednesday at 19:00
    const date = new Date('2024-12-04T19:00:00');
    process.env.WORKING_HOURS_START = '09:00';
    process.env.WORKING_HOURS_END = '18:00';
    assert.false(isBusinessHours(date), 'After hours should not be business hours');
  })
];

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

const integrationTests = [
  test('Environment - variables loaded', () => {
    assert.exists(process.env.N8N_HOST, 'N8N_HOST should be defined');
    assert.exists(process.env.N8N_PORT, 'N8N_PORT should be defined');
  }),
  
  test('Environment - Notion credentials format', () => {
    if (process.env.NOTION_SECRET) {
      assert.true(
        process.env.NOTION_SECRET.startsWith('secret_'),
        'NOTION_SECRET should start with secret_'
      );
    } else {
      results.skipped++;
      console.log(chalk.yellow('  ⊘ Notion credentials not configured (skipped)'));
    }
  }),
  
  test('Environment - HubSpot credentials format', () => {
    if (process.env.HUBSPOT_API_KEY) {
      assert.true(
        process.env.HUBSPOT_API_KEY.startsWith('pat-'),
        'HUBSPOT_API_KEY should start with pat-'
      );
    } else {
      results.skipped++;
      console.log(chalk.yellow('  ⊘ HubSpot credentials not configured (skipped)'));
    }
  }),
  
  test('Environment - Slack credentials format', () => {
    if (process.env.SLACK_BOT_TOKEN) {
      assert.true(
        process.env.SLACK_BOT_TOKEN.startsWith('xoxb-'),
        'SLACK_BOT_TOKEN should start with xoxb-'
      );
    } else {
      results.skipped++;
      console.log(chalk.yellow('  ⊘ Slack credentials not configured (skipped)'));
    }
  })
];

// ============================================================================
// WEBHOOK TESTS (E2E)
// ============================================================================

const webhookTests = [
  test('Webhook - Core Router accepts valid request', async () => {
    if (!CONFIG.enableWebhookTests) {
      results.skipped++;
      console.log(chalk.yellow('  ⊘ Webhook tests disabled (set ENABLE_WEBHOOK_TESTS=true)'));
      return;
    }
    
    const payload = {
      domain: 'comercial',
      intent: 'create_lead',
      data: {
        name: 'Test User',
        email: 'test@example.com',
        phone: '+55 11 98765-4321',
        source: 'website'
      }
    };
    
    try {
      const response = await axios.post(
        `${CONFIG.n8nWebhookUrl}/process-request`,
        payload,
        {
          timeout: CONFIG.testTimeout,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      assert.equal(response.status, 200, 'Expected status 200');
      assert.exists(response.data, 'Response should have data');
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        results.skipped++;
       console.log(chalk.yellow('  ⊘ n8n server not running (skipped)'));
      } else {
        throw error;
      }
    }
  }),
  
  test('Webhook - Reject invalid domain', async () => {
    if (!CONFIG.enableWebhookTests) {
      results.skipped++;
      console.log(chalk.yellow('  ⊘ Webhook tests disabled'));
      return;
    }
    
    const payload = {
      domain: 'invalid_domain',
      intent: 'test',
      data: {}
    };
    
    try {
      await axios.post(
        `${CONFIG.n8nWebhookUrl}/process-request`,
        payload,
        { timeout: CONFIG.testTimeout }
      );
      throw new Error('Should have rejected invalid domain');
    } catch (error) {
      if (error.response) {
        assert.true(error.response.status >= 400, 'Should return error status');
      } else if (error.code === 'ECONNREFUSED') {
        results.skipped++;
        console.log(chalk.yellow('  ⊘ n8n server not running (skipped)'));
      } else if (error.message.includes('Should have rejected')) {
        throw error;
      }
    }
  })
];

// ============================================================================
// TEST EXECUTION
// ============================================================================

/**
 * Runs all test suites
 */
const runTests = async () => {
  results.startTime = new Date();
  
  console.log(chalk.bold.cyan('\n🧪 N8N WORKFLOW TEST SUITE v2.0.0'));
  console.log(chalk.gray('═'.repeat(70)));
  console.log(chalk.white(`Started: ${results.startTime.toISOString()}\n`));
  
  // Run validation tests
  console.log(chalk.bold.blue('📋 Validation Tests'));
  console.log(chalk.gray('─'.repeat(70)));
  for (const testFn of validationTests) {
    await testFn();
  }
  
  // Run integration tests
  console.log(chalk.bold.blue('\n🔌 Integration Tests'));
  console.log(chalk.gray('─'.repeat(70)));
  for (const testFn of integrationTests) {
    await testFn();
  }
  
  // Run webhook tests
  console.log(chalk.bold.blue('\n🌐 Webhook Tests (E2E)'));
  console.log(chalk.gray('─'.repeat(70)));
  for (const testFn of webhookTests) {
    await testFn();
  }
  
  results.endTime = new Date();
  const duration = ((results.endTime - results.startTime) / 1000).toFixed(2);
  
  // Print summary
  console.log(chalk.bold.cyan('\n📊 TEST SUMMARY'));
  console.log(chalk.gray('═'.repeat(70)));
  
  const total = results.passed + results.failed + results.skipped;
  const passRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;
  
  console.log(chalk.green(`✓ Passed:  ${results.passed.toString().padStart(3)} tests`));
  console.log(chalk.red(`✗ Failed:  ${results.failed.toString().padStart(3)} tests`));
  console.log(chalk.yellow(`⊘ Skipped: ${results.skipped.toString().padStart(3)} tests`));
  console.log(chalk.white(`━━━━━━━━━━━━━━━━━━━━`));
  console.log(chalk.white(`Total:    ${total.toString().padStart(3)} tests`));
  console.log(chalk.white(`Duration:  ${duration}s`));
  console.log(chalk.white(`Pass Rate: ${passRate}%`));
  
  if (results.failed > 0) {
    console.log(chalk.red('\n❌ Some tests failed!'));
    console.log(chalk.yellow('\n💡 Failed tests:'));
    results.tests
      .filter(t => t.status === 'FAIL')
      .forEach(t => {
        console.log(chalk.red(`   - ${t.name}`));
        console.log(chalk.gray(`     ${t.error}`));
      });
    process.exit(1);
  }
  
  console.log(chalk.green('\n✅ All tests passed!\n'));
  process.exit(0);
};

// ============================================================================
// EXECUTION
// ============================================================================

// Execute if run directly
if (require.main === module) {
  runTests().catch(error => {
    console.error(chalk.red(`\n💥 Test suite error: ${error.message}`));
    console.error(chalk.gray(error.stack));
    process.exit(1);
  });
}

// Export for programmatic use
module.exports = {
  test,
  assert,
  runTests
};
