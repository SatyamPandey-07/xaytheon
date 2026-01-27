/**
 * Refactor Service
 * Generates autonomous refactoring patches using AST parsing and LLM
 */

const fs = require('fs').promises;
const path = require('path');
const acorn = require('acorn');
const { generate } = require('escodegen');
const LlmService = require('./llm.service');

class RefactorService {
    constructor() {
        this.llmService = LlmService;
    }

    /**
     * Analyzes code and generates refactoring suggestions with patches
     */
    async generateRefactoringPatches(repoPath, analysis) {
        const patches = [];

        for (const file of analysis.files) {
            if (file.rating === 'D' || file.rating === 'F') {
                try {
                    const filePath = path.join(repoPath, file.path);
                    const content = await fs.readFile(filePath, 'utf8');
                    const patch = await this.analyzeAndRefactorFile(file.path, content, file);
                    if (patch) patches.push(patch);
                } catch (error) {
                    console.error(`Error processing ${file.path}:`, error);
                }
            }
        }

        return patches;
    }

    /**
     * Analyzes a single file and generates refactoring patch
     */
    async analyzeAndRefactorFile(filePath, content, metrics) {
        try {
            // Parse AST for JavaScript files
            let ast = null;
            if (filePath.endsWith('.js')) {
                ast = acorn.parse(content, { ecmaVersion: 2020, sourceType: 'module' });
            }

            // Generate AI-powered refactoring suggestion
            const suggestion = await this.generateAISuggestion(filePath, content, metrics, ast);

            // Generate the refactored code
            const refactoredCode = await this.applyRefactoring(content, suggestion, ast);

            // Create diff patch
            const patch = this.createPatch(filePath, content, refactoredCode, suggestion);

            return patch;
        } catch (error) {
            console.error(`Error analyzing ${filePath}:`, error);
            return null;
        }
    }

    /**
     * Uses LLM to generate intelligent refactoring suggestions
     */
    async generateAISuggestion(filePath, content, metrics, ast) {
        const context = `
File: ${filePath}
Complexity: ${metrics.cyclomaticComplexity}
Code Smells: ${metrics.codeSmells.map(s => s.type).join(', ')}
Lines: ${metrics.lines}

Code snippet:
${content.substring(0, 1000)}${content.length > 1000 ? '\n... (truncated)' : ''}

Please suggest specific refactoring improvements for this code. Focus on:
1. Breaking down complex functions
2. Extracting repeated logic
3. Improving readability
4. Following best practices

Provide a detailed refactoring plan.`;

        const aiResponse = await this.llmService.generateResponse(
            `Analyze this code and suggest refactoring improvements: ${context}`,
            context
        );

        return this.parseAISuggestion(aiResponse);
    }

    /**
     * Parses AI response into structured refactoring suggestion
     */
    parseAISuggestion(aiResponse) {
        // Mock parsing - in real implementation, would parse structured AI response
        return {
            type: 'extract_function',
            description: aiResponse.substring(0, 200),
            changes: [
                {
                    type: 'extract',
                    startLine: 10,
                    endLine: 30,
                    newFunctionName: 'extractedLogic'
                }
            ]
        };
    }

    /**
     * Applies refactoring to code based on suggestion
     */
    async applyRefactoring(originalCode, suggestion, ast) {
        if (!ast) return originalCode;

        // Simple refactoring: extract function for high complexity
        if (suggestion.type === 'extract_function' && suggestion.changes.length > 0) {
            const change = suggestion.changes[0];
            const lines = originalCode.split('\n');

            // Extract the code block
            const extractedLines = lines.slice(change.startLine - 1, change.endLine);
            const extractedCode = extractedLines.join('\n');

            // Create new function
            const newFunction = `\nfunction ${change.newFunctionName}() {\n${extractedCode}\n}\n`;

            // Replace original code with function call
            lines.splice(change.startLine - 1, extractedLines.length, `    ${change.newFunctionName}();`);

            // Add function at the end
            lines.push(newFunction);

            return lines.join('\n');
        }

        return originalCode;
    }

    /**
     * Creates a unified diff patch
     */
    createPatch(filePath, original, refactored, suggestion) {
        const diff = require('diff');

        const patch = diff.createPatch(
            filePath,
            original,
            refactored,
            'original',
            'refactored'
        );

        return {
            filePath,
            description: suggestion.description,
            type: suggestion.type,
            severity: 'major',
            patch,
            originalLines: original.split('\n').length,
            refactoredLines: refactored.split('\n').length,
            timestamp: new Date()
        };
    }

    /**
     * Applies a patch to the filesystem
     */
    async applyPatch(patch, repoPath) {
        const filePath = path.join(repoPath, patch.filePath);

        // Read current content
        const currentContent = await fs.readFile(filePath, 'utf8');

        // Apply patch using diff library
        const diff = require('diff');
        const applied = diff.applyPatch(currentContent, patch.patch);

        if (applied === false) {
            throw new Error('Patch application failed');
        }

        // Write back
        await fs.writeFile(filePath, applied);

        return { success: true, filePath };
    }
}

module.exports = new RefactorService();
