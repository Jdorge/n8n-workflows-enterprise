# Contributing to n8n Enterprise Workflows

Thank you for your interest in contributing! 🎉

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)

## 📜 Code of Conduct

This project adheres to the Contributor Covenant Code of Conduct. By participating, you are expected to uphold this code.

### Our Standards

- Be respectful and inclusive
- Accept constructive criticism gracefully
- Focus on what is best for the community
- Show empathy towards others

## 🤝 How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues. When creating a bug report, include:

- **Clear title** and description
- **Steps to reproduce** the issue
- **Expected behavior** vs actual behavior
- **Environment details** (OS, Node version, n8n version)
- **Screenshots** if applicable

### Suggesting Enhancements

Enhancement suggestions are welcome! Include:

- **Clear use case** - What problem does it solve?
- **Proposed solution** - How should it work?
- **Alternatives considered** - What else did you think about?

### Contributing Code

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Contributing Documentation

Documentation improvements are always welcome:

- Fix typos or unclear explanations
- Add examples
- Improve existing guides
- Translate documentation

## 🔧 Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- n8n installed globally
- Git

### Setup Steps

```bash
# Clone your fork
git clone https://github.com/YOUR-USERNAME/n8n-workflows-enterprise.git
cd n8n-workflows-enterprise

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Configure your credentials
# Edit .env with your test credentials

# Start n8n
npm start
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test scripts/validators.test.js

# Run with coverage
npm run test:coverage
```

## 🔄 Pull Request Process

### Before Submitting

1. ✅ **Test your changes** - Ensure all tests pass
2. ✅ **Update documentation** - Document new features/changes
3. ✅ **Follow coding standards** - Run linter
4. ✅ **Add tests** - Cover new functionality
5. ✅ **Update CHANGELOG.md** - Document your changes

### PR Checklist

```markdown
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] Linter passes
- [ ] New tests added (if applicable)
- [ ] CHANGELOG.md updated
- [ ] Follows coding standards
- [ ] Rebased on latest main branch
```

### PR Title Format

Use conventional commits format:

```
feat: Add new workflow for inventory management
fix: Correct lead scoring calculation
docs: Update API credentials guide
chore: Update dependencies
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### Review Process

1. Automated tests will run on your PR
2. At least one maintainer will review your code
3. Address any requested changes
4. Once approved, a maintainer will merge

## 📝 Coding Standards

### JavaScript

```javascript
// Use modern ES6+ syntax
const myFunction = async (param) => {
  // Use descriptive variable names
  const enrichedData = processData(param);
  
  // Add JSDoc comments for functions
  /**
   * Processes data and returns enriched version
   * @param {Object} data - Input data
   * @returns {Object} Enriched data
   */
  
  // Handle errors properly
  try {
    return await someAsyncOperation();
  } catch (error) {
    logger.error('Operation failed:', error);
    throw error;
  }
};
```

### n8n Workflows

- Use descriptive node names
- Add comments explaining complex logic
- Group related nodes visually
- Use consistent naming conventions
- Handle errors at each step

### Validation

- Always validate input data
- Sanitize user inputs
- Use Joi schemas for complex validation
- Return helpful error messages

## 🧪 Testing

### Test Structure

```javascript
const { test, assert } = require('./test-utils');

test('Lead score calculation - high quality lead', () => {
  const lead = {
    email: 'ceo@company.com',
    company: 'Big Corp',
    position: 'CEO'
  };
  
  const score = calculateLeadScore(lead);
  assert.true(score >= 70, 'Expected high score');
});
```

### Test Coverage

Aim for:
- **Statements:** > 80%
- **Branches:** > 75%
- **Functions:** > 80%
- **Lines:** > 80%

### What to Test

- ✅ Validation functions
- ✅ Business logic
- ✅ Error handling
- ✅ Edge cases
- ✅ Integration points

## 📁 Project Structure

```
n8n-workflows-enterprise/
├── workflows/       # n8n workflow JSON files
├── scripts/         # Automation scripts
├── docs/            # Documentation
├── tests/           # Test files
└── .github/         # GitHub Actions & templates
```

## 🏷️ Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

Example:
```
feat(workflows): Add financial approval workflow

- Implement multi-level approval logic
- Add email notifications
- Update documentation

Closes #123
```

## 🎯 Areas We Need Help

- [ ] **Documentation** - Improve guides and add examples
- [ ] **Testing** - Increase test coverage
- [ ] **Workflows** - Create new workflow templates
- [ ] **Translations** - Translate docs to Portuguese
- [ ] **Bug Fixes** - Fix reported issues
- [ ] **Performance** - Optimize workflow execution

## ❓ Questions?

- Open a GitHub Discussion
- Join our community chat
- Email: support@example.com

## 🙏 Recognition

Contributors will be:
- Added to CONTRIBUTORS.md
- Mentioned in release notes
- Thanked in the community

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to n8n Enterprise Workflows!** 🎉
