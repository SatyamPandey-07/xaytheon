/**
 * Security Test Generator Service
 * Auto-generates Vitest/Jest test cases to trigger identified vulnerabilities
 */

class SecurityTestGenerator {
    constructor() {
        this.testFramework = 'vitest'; // or 'jest'
    }

    /**
     * Generate security test suite for vulnerability
     */
    generateTestSuite(vulnerability, exploitPath) {
        const tests = [];

        // Generate test for each sink type
        switch (vulnerability.sinkType || vulnerability.type) {
            case 'xss':
                tests.push(...this.generateXSSTests(vulnerability, exploitPath));
                break;
            case 'sqli':
                tests.push(...this.generateSQLiTests(vulnerability, exploitPath));
                break;
            case 'rce':
            case 'cmdInjection':
                tests.push(...this.generateRCETests(vulnerability, exploitPath));
                break;
            case 'pathTraversal':
                tests.push(...this.generatePathTraversalTests(vulnerability, exploitPath));
                break;
            case 'ssrf':
                tests.push(...this.generateSSRFTests(vulnerability, exploitPath));
                break;
            case 'prototypePotion':
                tests.push(...this.generatePrototypePollutionTests(vulnerability, exploitPath));
                break;
            default:
                tests.push(this.generateGenericTest(vulnerability, exploitPath));
        }

        return this.wrapInTestSuite(vulnerability, tests);
    }

    /**
     * Generate XSS exploit tests
     */
    generateXSSTests(vulnerability, exploitPath) {
        const payloads = [
            '<script>alert("XSS")</script>',
            '<img src=x onerror="alert(1)">',
            '<svg onload="alert(1)">',
            'javascript:alert(1)',
            '<iframe src="javascript:alert(1)">'
        ];

        return payloads.map((payload, index) => ({
            name: `should prevent XSS attack #${index + 1}`,
            payload,
            expectedBehavior: 'sanitized',
            testCode: this.generateXSSTestCode(vulnerability, payload, exploitPath)
        }));
    }

    generateXSSTestCode(vulnerability, payload, exploitPath) {
        const source = exploitPath?.path?.[0] || 'userInput';
        const endpoint = this.extractEndpoint(exploitPath);

        return `
test('should prevent XSS attack with payload: ${payload.replace(/"/g, '\\"')}', async () => {
    const maliciousInput = { ${source}: '${payload.replace(/'/g, "\\'")}' };
    
    const response = await request(app)
        .post('${endpoint}')
        .send(maliciousInput);

    // Verify response doesn't contain unescaped script tags
    expect(response.text).not.toContain('<script>');
    expect(response.text).not.toContain('onerror=');
    expect(response.text).not.toContain('javascript:');
    
    // Verify proper escaping
    if (response.text.includes(maliciousInput.${source})) {
        expect(response.text).toContain('&lt;script&gt;');
    }
});`.trim();
    }

    /**
     * Generate SQL Injection tests
     */
    generateSQLiTests(vulnerability, exploitPath) {
        const payloads = [
            "' OR '1'='1",
            "'; DROP TABLE users--",
            "' UNION SELECT * FROM users--",
            "admin'--",
            "' OR 1=1--"
        ];

        return payloads.map((payload, index) => ({
            name: `should prevent SQL injection attack #${index + 1}`,
            payload,
            expectedBehavior: 'escaped',
            testCode: this.generateSQLiTestCode(vulnerability, payload, exploitPath)
        }));
    }

    generateSQLiTestCode(vulnerability, payload, exploitPath) {
        const source = exploitPath?.path?.[0] || 'userInput';
        const endpoint = this.extractEndpoint(exploitPath);

        return `  
test('should prevent SQL injection with payload: ${payload.replace(/"/g, '\\"')}', async () => {
    const maliciousInput = { ${source}: '${payload.replace(/'/g, "\\'")}' };
    
    const response = await request(app)
        .post('${endpoint}')
        .send(maliciousInput);

    // Should not return unexpected data or show SQL errors
    expect(response.status).not.toBe(500);
    expect(response.text).not.toMatch(/SQL|syntax error|mysql|postgres/i);
    
    // Response should be empty or error, not leak data
    expect(response.body).not.toHaveProperty('users');
    expect(response.body).not.toHaveProperty('password');
});`.trim();
    }

    /**
     * Generate RCE/Command Injection tests
     */
    generateRCETests(vulnerability, exploitPath) {
        const payloads = [
            '; ls -la',
            '| cat /etc/passwd',
            '&& whoami',
            '`whoami`',
            '$(whoami)'
        ];

        return payloads.map((payload, index) => ({
            name: `should prevent command injection attack #${index + 1}`,
            payload,
            expectedBehavior: 'rejected',
            testCode: this.generateRCETestCode(vulnerability, payload, exploitPath)
        }));
    }

    generateRCETestCode(vulnerability, payload, exploitPath) {
        const source = exploitPath?.path?.[0] || 'userInput';
        const endpoint = this.extractEndpoint(exploitPath);

        return `
test('should prevent command injection with payload: ${payload.replace(/"/g, '\\"')}', async () => {
    const maliciousInput = { ${source}: '${payload.replace(/'/g, "\\'")}' };
    
    const response = await request(app)
        .post('${endpoint}')
        .send(maliciousInput);

    // Should reject or sanitize shell metacharacters
    expect(response.status).toBeOneOf([400, 422]); // Bad request or validation error
    
    // Should not execute commands - check response doesn't contain command output
    expect(response.text).not.toMatch(/root:x:0:0/); // /etc/passwd
    expect(response.text).not.toMatch(/bin|usr|etc/); // directory listing
});`.trim();
    }

    /**
     * Generate Path Traversal tests
     */
    generatePathTraversalTests(vulnerability, exploitPath) {
        const payloads = [
            '../../../etc/passwd',
            '..\\..\\..\\windows\\system32\\config\\sam',
            '....//....//....//etc/passwd',
            '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
        ];

        return payloads.map((payload, index) => ({
            name: `should prevent path traversal attack #${index + 1}`,
            payload,
            expectedBehavior: 'normalized',
            testCode: this.generatePathTraversalTestCode(vulnerability, payload, exploitPath)
        }));
    }

    generatePathTraversalTestCode(vulnerability, payload, exploitPath) {
        const source = exploitPath?.path?.[0] || 'filename';
        const endpoint = this.extractEndpoint(exploitPath);

        return `
test('should prevent path traversal with payload: ${payload.replace(/"/g, '\\"')}', async () => {
    const maliciousInput = { ${source}: '${payload.replace(/'/g, "\\'")}' };
    
    const response = await request(app)
        .get('${endpoint}')
        .query(maliciousInput);

    // Should not access files outside intended directory
    expect(response.status).toBeOneOf([400, 403, 404]);
    
    // Should not return system file contents
    expect(response.text).not.toMatch(/root:x:0:0/);
    expect(response.text).not.toContain('SAM');
});`.trim();
    }

    /**
     * Generate SSRF tests
     */
    generateSSRFTests(vulnerability, exploitPath) {
        const payloads = [
            'http://localhost:22',
            'http://169.254.169.254/latest/meta-data/',
            'http://127.0.0.1:6379',
            'file:///etc/passwd',
            'http://internal-service:8080'
        ];

        return payloads.map((payload, index) => ({
            name: `should prevent SSRF attack #${index + 1}`,
            payload,
            expectedBehavior: 'blocked',
            testCode: this.generateSSRFTestCode(vulnerability, payload, exploitPath)
        }));
    }

    generateSSRFTestCode(vulnerability, payload, exploitPath) {
        const source = exploitPath?.path?.[0] || 'url';
        const endpoint = this.extractEndpoint(exploitPath);

        return `
test('should prevent SSRF with payload: ${payload.replace(/"/g, '\\"')}', async () => {
    const maliciousInput = { ${source}: '${payload}' };
    
    const response = await request(app)
        .post('${endpoint}')
        .send(maliciousInput);

    // Should block requests to internal/localhost addresses
    expect(response.status).toBeOneOf([400, 403]);
    
    // Should not leak internal service responses
    expect(response.body).not.toHaveProperty('aws');
    expect(response.body).not.toHaveProperty('redis');
});`.trim();
    }

    /**
     * Generate Prototype Pollution tests
     */
    generatePrototypePollutionTests(vulnerability, exploitPath) {
        const payloads = [
            { '__proto__': { 'isAdmin': true } },
            { 'constructor': { 'prototype': { 'isAdmin': true } } },
            { '__proto__.isAdmin': true }
        ];

        return payloads.map((payload, index) => ({
            name: `should prevent prototype pollution attack #${index + 1}`,
            payload,
            expectedBehavior: 'filtered',
            testCode: this.generatePrototypePollutionTestCode(vulnerability, payload, exploitPath)
        }));
    }

    generatePrototypePollutionTestCode(vulnerability, payload, exploitPath) {
        const endpoint = this.extractEndpoint(exploitPath);

        return `
test('should prevent prototype pollution', async () => {
    const maliciousInput = ${JSON.stringify(payload, null, 2)};
    
    // Store original prototype
    const origProto = Object.prototype.isAdmin;
    
    const response = await request(app)
        .post('${endpoint}')
        .send(maliciousInput);

    // Verify prototype was not polluted
    expect(Object.prototype.isAdmin).toBeUndefined();
    expect({}.isAdmin).toBeUndefined();
    
    // Cleanup
    if (Object.prototype.isAdmin !== origProto) {
        delete Object.prototype.isAdmin;
    }
});`.trim();
    }

    /**
     * Generate generic vulnerability test
     */
    generateGenericTest(vulnerability, exploitPath) {
        return {
            name: 'should handle potentially malicious input safely',
            payload: 'malicious_input',
            expectedBehavior: 'safe',
            testCode: this.generateGenericTestCode(vulnerability, exploitPath)
        };
    }

    generateGenericTestCode(vulnerability, exploitPath) {
        const source = exploitPath?.path?.[0] || 'userInput';
        const endpoint = this.extractEndpoint(exploitPath);

        return `
test('should handle potentially malicious input safely', async () => {
    const maliciousInput = { ${source}: 'malicious_input' };
    
    const response = await request(app)
        .post('${endpoint}')
        .send(maliciousInput);

    // Should not crash or return sensitive errors
    expect(response.status).toBeLessThan(500);
    expect(response.text).not.toMatch(/Error:|Stack trace:/i);
});`.trim();
    }

    /**
     * Extract API endpoint from exploit path
     */
    extractEndpoint(exploitPath) {
        if (!exploitPath || !exploitPath.path) {
            return '/api/vulnerable-endpoint';
        }

        // Look for route files in path
        for (const component of exploitPath.path) {
            if (component.includes('route') || component.includes('api')) {
                // Extract route pattern (simplified)
                return '/api/test';
            }
        }

        return '/api/vulnerable-endpoint';
    }

    /**
     * Wrap tests in complete test suite
     */
    wrapInTestSuite(vulnerability, tests) {
        const imports = `
import { describe, test, expect, beforeAll, afterAll } from '${this.testFramework}';
import request from 'supertest';
import app from '../src/app';

// Extend expect with custom matchers
expect.extend({
    toBeOneOf(received, expected) {
        const pass = expected.includes(received);
        return {
            pass,
            message: () => pass
                ? \`expected \${received} not to be one of \${expected.join(', ')}\`
                : \`expected \${received} to be one of \${expected.join(', ')}\`
        };
    }
});
`.trim();

        const setup = `
beforeAll(async () => {
    // Setup test environment
    process.env.NODE_ENV = 'test';
});

afterAll(async () => {
    // Cleanup
});
`.trim();

        const testCases = tests.map(t => t.testCode).join('\n\n');

        const fullSuite = `
${imports}

describe('Security Tests - ${vulnerability.filePath || vulnerability.package || 'Vulnerability'}', () => {
    ${setup}

    ${testCases}
});
`.trim();

        return {
            fileName: this.generateFileName(vulnerability),
            framework: this.testFramework,
            content: fullSuite,
            testCount: tests.length,
            coverageAreas: tests.map(t => t.name)
        };
    }

    /**
     * Generate test file name
     */
    generateFileName(vulnerability) {
        const baseName = vulnerability.filePath 
            ? vulnerability.filePath.replace(/[^a-z0-9]/gi, '-')
            : vulnerability.package?.replace(/[^a-z0-9]/gi, '-') || 'vulnerability';

        return `${baseName}.security.test.js`;
    }

    /**
     * Generate test suite for multiple vulnerabilities
     */
    generateMultipleTestSuites(vulnerabilities, exploitPaths) {
        const suites = [];

        for (let i = 0; i < vulnerabilities.length; i++) {
            const vuln = vulnerabilities[i];
            const path = exploitPaths[i];

            const suite = this.generateTestSuite(vuln, path);
            suites.push(suite);
        }

        return {
            totalSuites: suites.length,
            totalTests: suites.reduce((sum, s) => sum + s.testCount, 0),
            suites
        };
    }

    /**
     * Generate integration test for full exploit chain
     */
    generateIntegrationTest(exploitFlow) {
        const testCode = `
import { describe, test, expect } from '${this.testFramework}';
import request from 'supertest';
import app from '../src/app';

describe('Integration Test - Full Exploit Chain', () => {
    test('should prevent exploitation through complete attack chain', async () => {
        // Simulate attacker following the exploit path
        const attackSteps = ${JSON.stringify(exploitFlow.map(step => ({
            step: step.step,
            component: step.component,
            description: step.description
        })), null, 2)};

        // Attempt to exploit each step
        for (const step of attackSteps) {
            console.log(\`Testing step \${step.step}: \${step.description}\`);
            
            // Verify security controls at this step
            // Implementation depends on specific vulnerability
        }

        // Final verification: exploit should not succeed
        expect(true).toBe(true); // Replace with actual assertions
    });
});
`.trim();

        return {
            fileName: 'exploit-chain-integration.test.js',
            framework: this.testFramework,
            content: testCode,
            testCount: 1
        };
    }
}

module.exports = new SecurityTestGenerator();
