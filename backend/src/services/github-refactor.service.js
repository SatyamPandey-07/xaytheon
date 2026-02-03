/**
 * GitHub Refactor Service
 * Handles GitHub API operations for applying refactoring patches
 */

const axios = require('axios');

class GithubRefactorService {
    constructor() {
        this.baseUrl = 'https://api.github.com';
        this.token = process.env.GITHUB_TOKEN;
        this.headers = {
            'Authorization': `token ${this.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'XAYTHEON-Refactor-Agent'
        };
    }

    /**
     * Create a new branch for refactoring changes
     */
    async createRefactorBranch(owner, repo, baseBranch = 'main') {
        try {
            // Get the base branch SHA
            const baseBranchResponse = await axios.get(
                `${this.baseUrl}/repos/${owner}/${repo}/git/refs/heads/${baseBranch}`,
                { headers: this.headers }
            );

            const baseSha = baseBranchResponse.data.object.sha;

            // Create new branch name with blackboxai prefix
            const timestamp = Date.now();
            const branchName = `blackboxai/refactor-${timestamp}`;

            // Create the new branch
            await axios.post(
                `${this.baseUrl}/repos/${owner}/${repo}/git/refs`,
                {
                    ref: `refs/heads/${branchName}`,
                    sha: baseSha
                },
                { headers: this.headers }
            );

            return {
                branchName,
                baseSha,
                success: true
            };
        } catch (error) {
            console.error('Error creating refactor branch:', error.response?.data || error.message);
            throw new Error('Failed to create refactor branch');
        }
    }

    /**
     * Apply a patch by creating a commit on the refactor branch
     */
    async applyPatchToBranch(owner, repo, branchName, patch, commitMessage) {
        try {
            // Get the current branch SHA
            const branchResponse = await axios.get(
                `${this.baseUrl}/repos/${owner}/${repo}/git/refs/heads/${branchName}`,
                { headers: this.headers }
            );

            const currentSha = branchResponse.data.object.sha;

            // Get the current commit
            const commitResponse = await axios.get(
                `${this.baseUrl}/repos/${owner}/${repo}/git/commits/${currentSha}`,
                { headers: this.headers }
            );

            const treeSha = commitResponse.data.tree.sha;

            // Create blob for the patched file
            const blobResponse = await axios.post(
                `${this.baseUrl}/repos/${owner}/${repo}/git/blobs`,
                {
                    content: Buffer.from(patch.refactoredCode).toString('base64'),
                    encoding: 'base64'
                },
                { headers: this.headers }
            );

            const blobSha = blobResponse.data.sha;

            // Create new tree with the updated file
            const treeResponse = await axios.post(
                `${this.baseUrl}/repos/${owner}/${repo}/git/trees`,
                {
                    base_tree: treeSha,
                    tree: [
                        {
                            path: patch.filePath,
                            mode: '100644',
                            type: 'blob',
                            sha: blobSha
                        }
                    ]
                },
                { headers: this.headers }
            );

            const newTreeSha = treeResponse.data.sha;

            // Create commit
            const newCommitResponse = await axios.post(
                `${this.baseUrl}/repos/${owner}/${repo}/git/commits`,
                {
                    message: commitMessage,
                    tree: newTreeSha,
                    parents: [currentSha]
                },
                { headers: this.headers }
            );

            const newCommitSha = newCommitResponse.data.sha;

            // Update branch reference
            await axios.patch(
                `${this.baseUrl}/repos/${owner}/${repo}/git/refs/heads/${branchName}`,
                {
                    sha: newCommitSha
                },
                { headers: this.headers }
            );

            return {
                commitSha: newCommitSha,
                branchName,
                success: true
            };
        } catch (error) {
            console.error('Error applying patch to branch:', error.response?.data || error.message);
            throw new Error('Failed to apply patch to branch');
        }
    }

    /**
     * Create a pull request for the refactoring changes
     */
    async createPullRequest(owner, repo, branchName, title, description, baseBranch = 'main') {
        try {
            const prResponse = await axios.post(
                `${this.baseUrl}/repos/${owner}/${repo}/pulls`,
                {
                    title,
                    head: branchName,
                    base: baseBranch,
                    body: description,
                    draft: false
                },
                { headers: this.headers }
            );

            return {
                prNumber: prResponse.data.number,
                prUrl: prResponse.data.html_url,
                success: true
            };
        } catch (error) {
            console.error('Error creating pull request:', error.response?.data || error.message);
            throw new Error('Failed to create pull request');
        }
    }

    /**
     * Complete refactoring workflow: create branch, apply patch, create PR
     */
    async applyRefactoringPatch(owner, repo, patch, baseBranch = 'main') {
        try {
            // Step 1: Create refactor branch
            const branchResult = await this.createRefactorBranch(owner, repo, baseBranch);

            // Step 2: Apply patch to branch
            const commitMessage = `♻️ AI Refactor: ${patch.description}\n\nApplied automated refactoring patch for ${patch.filePath}`;
            const applyResult = await this.applyPatchToBranch(owner, repo, branchResult.branchName, patch, commitMessage);

            // Step 3: Create pull request
            const prTitle = `♻️ AI Refactoring: ${patch.description}`;
            const prDescription = `
## 🤖 AI-Powered Code Refactoring

This pull request contains automated refactoring improvements generated by XAYTHEON's AI Refactor Agent.

### 📁 Changes Applied
- **File**: \`${patch.filePath}\`
- **Type**: ${patch.type}
- **Severity**: ${patch.severity}
- **Description**: ${patch.description}

### 📊 Technical Details
- Complexity reduction: ${patch.originalComplexity || 'N/A'} → ${patch.refactoredComplexity || 'N/A'}
- Lines changed: ${patch.stats?.changes || 'N/A'}

### 🔍 Review Notes
Please review the changes carefully. The AI has identified potential improvements, but human review is recommended to ensure correctness.

### 🤖 Automation Details
- **Generated by**: XAYTHEON AI Refactor Agent
- **Branch**: ${branchResult.branchName}
- **Commit**: ${applyResult.commitSha}

---
*This refactoring was automatically generated and applied by XAYTHEON's autonomous refactor agent.*
            `;

            const prResult = await this.createPullRequest(owner, repo, branchResult.branchName, prTitle, prDescription, baseBranch);

            return {
                branchName: branchResult.branchName,
                commitSha: applyResult.commitSha,
                prNumber: prResult.prNumber,
                prUrl: prResult.prUrl,
                success: true
            };
        } catch (error) {
            console.error('Error in complete refactoring workflow:', error);
            throw error;
        }
    }

    /**
     * Get repository information
     */
    async getRepoInfo(owner, repo) {
        try {
            const response = await axios.get(
                `${this.baseUrl}/repos/${owner}/${repo}`,
                { headers: this.headers }
            );

            return {
                name: response.data.name,
                fullName: response.data.full_name,
                defaultBranch: response.data.default_branch,
                private: response.data.private,
                owner: response.data.owner.login
            };
        } catch (error) {
            console.error('Error getting repo info:', error.response?.data || error.message);
            throw new Error('Failed to get repository information');
        }
    }
}

module.exports = new GithubRefactorService();
