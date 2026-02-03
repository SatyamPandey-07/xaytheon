/**
 * AST-Based Fingerprinting Service
 * Converts code into Abstract Syntax Trees and generates structural hashes
 * Uses MinHash/LSH for similarity detection
 */

const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class ASTFingerprintService {
    constructor() {
        // MinHash parameters
        this.numHashes = 128; // Number of hash functions for MinHash
        this.shingleSize = 3; // Size of shingles for code fragments
        this.lshBands = 16; // Number of bands for LSH
        this.lshRows = 8; // Rows per band (numHashes / lshBands)
        
        // Similarity threshold
        this.similarityThreshold = 0.7;
        
        // AST node type weights (semantic importance)
        this.nodeWeights = {
            'FunctionDeclaration': 10,
            'ClassDeclaration': 10,
            'ArrowFunctionExpression': 8,
            'CallExpression': 5,
            'BinaryExpression': 3,
            'IfStatement': 4,
            'ForStatement': 4,
            'WhileStatement': 4,
            'ReturnStatement': 3,
            'VariableDeclaration': 2,
            'AssignmentExpression': 3
        };
    }

    /**
     * Parse code and extract AST
     */
    parseCode(code, filePath = 'unknown') {
        try {
            const ast = parser.parse(code, {
                sourceType: 'module',
                plugins: [
                    'jsx',
                    'typescript',
                    'decorators-legacy',
                    'classProperties',
                    'asyncGenerators',
                    'dynamicImport',
                    'optionalChaining',
                    'nullishCoalescingOperator'
                ],
                errorRecovery: true
            });
            
            return { ast, error: null };
        } catch (error) {
            return { ast: null, error: error.message };
        }
    }

    /**
     * Extract structural features from AST
     */
    extractStructuralFeatures(ast) {
        const features = {
            nodeSequence: [],
            controlFlow: [],
            dependencies: new Set(),
            complexity: 0,
            depth: 0,
            functions: []
        };

        let currentDepth = 0;
        let maxDepth = 0;

        traverse(ast, {
            enter(path) {
                currentDepth++;
                maxDepth = Math.max(maxDepth, currentDepth);
                
                const nodeType = path.node.type;
                
                // Record node sequence (structure)
                features.nodeSequence.push(nodeType);
                
                // Extract control flow patterns
                if (['IfStatement', 'ForStatement', 'WhileStatement', 'SwitchStatement'].includes(nodeType)) {
                    features.controlFlow.push(nodeType);
                    features.complexity++;
                }
                
                // Extract function signatures
                if (nodeType === 'FunctionDeclaration' || nodeType === 'ArrowFunctionExpression') {
                    const params = path.node.params?.length || 0;
                    features.functions.push({
                        type: nodeType,
                        params,
                        async: path.node.async || false,
                        generator: path.node.generator || false
                    });
                    features.complexity += 2;
                }
                
                // Extract dependencies
                if (nodeType === 'ImportDeclaration') {
                    features.dependencies.add(path.node.source.value);
                }
                
                if (nodeType === 'CallExpression') {
                    if (path.node.callee.name === 'require') {
                        const arg = path.node.arguments[0];
                        if (arg && arg.type === 'StringLiteral') {
                            features.dependencies.add(arg.value);
                        }
                    }
                }
            },
            exit() {
                currentDepth--;
            }
        });

        features.depth = maxDepth;
        features.dependencies = Array.from(features.dependencies);
        
        return features;
    }

    /**
     * Generate structural hash (Code DNA)
     */
    generateStructuralHash(features) {
        // Normalize the structure by converting to canonical form
        const canonical = this.canonicalizeStructure(features);
        
        // Create hash from canonical representation
        const hash = crypto
            .createHash('sha256')
            .update(JSON.stringify(canonical))
            .digest('hex');
        
        return hash;
    }

    /**
     * Canonicalize structure (remove variable names, normalize)
     */
    canonicalizeStructure(features) {
        return {
            nodeSeq: features.nodeSequence.join(','),
            controlFlow: features.controlFlow.join(','),
            funcCount: features.functions.length,
            complexity: features.complexity,
            depth: features.depth,
            depCount: features.dependencies.length
        };
    }

    /**
     * Generate MinHash signature
     */
    generateMinHashSignature(features) {
        // Create shingles from node sequence
        const shingles = this.createShingles(features.nodeSequence, this.shingleSize);
        
        // Apply multiple hash functions
        const signature = [];
        
        for (let i = 0; i < this.numHashes; i++) {
            let minHash = Infinity;
            
            for (const shingle of shingles) {
                const hash = this.hashFunction(shingle, i);
                minHash = Math.min(minHash, hash);
            }
            
            signature.push(minHash);
        }
        
        return signature;
    }

    /**
     * Create shingles (n-grams) from node sequence
     */
    createShingles(sequence, size) {
        const shingles = new Set();
        
        for (let i = 0; i <= sequence.length - size; i++) {
            const shingle = sequence.slice(i, i + size).join('|');
            shingles.add(shingle);
        }
        
        return Array.from(shingles);
    }

    /**
     * Hash function for MinHash
     */
    hashFunction(value, seed) {
        const hash = crypto
            .createHash('sha256')
            .update(value + seed.toString())
            .digest();
        
        // Convert first 4 bytes to integer
        return hash.readUInt32BE(0);
    }

    /**
     * Generate LSH buckets
     */
    generateLSHBuckets(signature) {
        const buckets = [];
        
        for (let band = 0; band < this.lshBands; band++) {
            const start = band * this.lshRows;
            const end = start + this.lshRows;
            const bandSignature = signature.slice(start, end);
            
            // Hash the band to create bucket ID
            const bucketId = crypto
                .createHash('md5')
                .update(bandSignature.join(','))
                .digest('hex');
            
            buckets.push({
                band,
                bucketId,
                signature: bandSignature
            });
        }
        
        return buckets;
    }

    /**
     * Calculate Jaccard similarity between two signatures
     */
    calculateJaccardSimilarity(sig1, sig2) {
        if (sig1.length !== sig2.length) {
            return 0;
        }
        
        let matches = 0;
        for (let i = 0; i < sig1.length; i++) {
            if (sig1[i] === sig2[i]) {
                matches++;
            }
        }
        
        return matches / sig1.length;
    }

    /**
     * Extract functions from code
     */
    extractFunctions(ast, filePath = 'unknown') {
        const functions = [];
        let functionIndex = 0;

        traverse(ast, {
            FunctionDeclaration(path) {
                const funcNode = path.node;
                const funcName = funcNode.id?.name || `anonymous_${functionIndex++}`;
                
                functions.push({
                    name: funcName,
                    type: 'FunctionDeclaration',
                    loc: funcNode.loc,
                    params: funcNode.params.length,
                    async: funcNode.async,
                    generator: funcNode.generator,
                    filePath,
                    code: path.toString()
                });
            },
            
            ArrowFunctionExpression(path) {
                const funcNode = path.node;
                const parent = path.parent;
                
                let funcName = `arrow_${functionIndex++}`;
                if (parent.type === 'VariableDeclarator' && parent.id.name) {
                    funcName = parent.id.name;
                }
                
                functions.push({
                    name: funcName,
                    type: 'ArrowFunctionExpression',
                    loc: funcNode.loc,
                    params: funcNode.params.length,
                    async: funcNode.async,
                    filePath,
                    code: path.toString()
                });
            },
            
            ClassMethod(path) {
                const funcNode = path.node;
                const funcName = funcNode.key.name || `method_${functionIndex++}`;
                
                functions.push({
                    name: funcName,
                    type: 'ClassMethod',
                    kind: funcNode.kind, // constructor, method, get, set
                    loc: funcNode.loc,
                    params: funcNode.params.length,
                    async: funcNode.async,
                    static: funcNode.static,
                    filePath,
                    code: path.toString()
                });
            }
        });

        return functions;
    }

    /**
     * Generate complete fingerprint for a code file
     */
    async generateFingerprint(code, filePath = 'unknown') {
        const parseResult = this.parseCode(code, filePath);
        
        if (parseResult.error) {
            return {
                success: false,
                error: parseResult.error,
                filePath
            };
        }

        const features = this.extractStructuralFeatures(parseResult.ast);
        const structuralHash = this.generateStructuralHash(features);
        const minHashSignature = this.generateMinHashSignature(features);
        const lshBuckets = this.generateLSHBuckets(minHashSignature);
        const functions = this.extractFunctions(parseResult.ast, filePath);

        return {
            success: true,
            filePath,
            structuralHash,
            minHashSignature,
            lshBuckets,
            features: {
                complexity: features.complexity,
                depth: features.depth,
                functionCount: features.functions.length,
                nodeCount: features.nodeSequence.length,
                dependencies: features.dependencies
            },
            functions,
            metadata: {
                linesOfCode: code.split('\n').length,
                timestamp: Date.now()
            }
        };
    }

    /**
     * Analyze directory recursively
     */
    async analyzeDirectory(dirPath, extensions = ['.js', '.jsx', '.ts', '.tsx']) {
        const fingerprints = [];
        
        async function scanDir(currentPath) {
            try {
                const entries = await fs.readdir(currentPath, { withFileTypes: true });
                
                for (const entry of entries) {
                    const fullPath = path.join(currentPath, entry.name);
                    
                    // Skip node_modules and common ignore directories
                    if (entry.isDirectory()) {
                        if (!['node_modules', '.git', 'dist', 'build', 'coverage'].includes(entry.name)) {
                            await scanDir(fullPath);
                        }
                    } else if (entry.isFile()) {
                        const ext = path.extname(entry.name);
                        if (extensions.includes(ext)) {
                            try {
                                const code = await fs.readFile(fullPath, 'utf-8');
                                const fingerprint = await this.generateFingerprint(code, fullPath);
                                
                                if (fingerprint.success) {
                                    fingerprints.push(fingerprint);
                                }
                            } catch (error) {
                                console.error(`Error processing ${fullPath}:`, error.message);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error(`Error scanning directory ${currentPath}:`, error.message);
            }
        }
        
        await scanDir(dirPath);
        return fingerprints;
    }

    /**
     * Find similar code using LSH buckets
     */
    findSimilarCode(fingerprints, threshold = null) {
        threshold = threshold || this.similarityThreshold;
        const similarPairs = [];
        const bucketIndex = new Map();

        // Build bucket index
        fingerprints.forEach((fp, idx) => {
            fp.lshBuckets.forEach(bucket => {
                if (!bucketIndex.has(bucket.bucketId)) {
                    bucketIndex.set(bucket.bucketId, []);
                }
                bucketIndex.get(bucket.bucketId).push(idx);
            });
        });

        // Find candidates in same buckets
        const candidates = new Set();
        bucketIndex.forEach(indices => {
            if (indices.length > 1) {
                for (let i = 0; i < indices.length; i++) {
                    for (let j = i + 1; j < indices.length; j++) {
                        candidates.add(`${indices[i]},${indices[j]}`);
                    }
                }
            }
        });

        // Calculate exact similarity for candidates
        candidates.forEach(pair => {
            const [idx1, idx2] = pair.split(',').map(Number);
            const fp1 = fingerprints[idx1];
            const fp2 = fingerprints[idx2];
            
            const similarity = this.calculateJaccardSimilarity(
                fp1.minHashSignature,
                fp2.minHashSignature
            );
            
            if (similarity >= threshold) {
                similarPairs.push({
                    file1: fp1.filePath,
                    file2: fp2.filePath,
                    similarity: parseFloat((similarity * 100).toFixed(2)),
                    hash1: fp1.structuralHash,
                    hash2: fp2.structuralHash,
                    features1: fp1.features,
                    features2: fp2.features
                });
            }
        });

        // Sort by similarity descending
        similarPairs.sort((a, b) => b.similarity - a.similarity);
        
        return similarPairs;
    }

    /**
     * Generate similarity statistics
     */
    generateStatistics(fingerprints, similarPairs) {
        const totalFiles = fingerprints.length;
        const duplicatePairs = similarPairs.filter(p => p.similarity >= 90).length;
        const similarPairsCount = similarPairs.filter(p => p.similarity >= 70 && p.similarity < 90).length;
        
        const avgComplexity = fingerprints.reduce((sum, fp) => sum + fp.features.complexity, 0) / totalFiles;
        const avgDepth = fingerprints.reduce((sum, fp) => sum + fp.features.depth, 0) / totalFiles;
        
        return {
            totalFiles,
            totalFunctions: fingerprints.reduce((sum, fp) => sum + fp.features.functionCount, 0),
            duplicatePairs,
            similarPairsCount,
            avgComplexity: parseFloat(avgComplexity.toFixed(2)),
            avgDepth: parseFloat(avgDepth.toFixed(2)),
            potentialSavings: this.calculatePotentialSavings(similarPairs, fingerprints)
        };
    }

    /**
     * Calculate potential code savings from deduplication
     */
    calculatePotentialSavings(similarPairs, fingerprints) {
        const duplicates = similarPairs.filter(p => p.similarity >= 90);
        
        let totalDuplicateLines = 0;
        duplicates.forEach(pair => {
            const fp1 = fingerprints.find(f => f.filePath === pair.file1);
            if (fp1) {
                totalDuplicateLines += fp1.metadata.linesOfCode;
            }
        });
        
        return {
            duplicateLines: totalDuplicateLines,
            estimatedReduction: `${((duplicates.length / (fingerprints.length || 1)) * 100).toFixed(1)}%`
        };
    }
}

module.exports = new ASTFingerprintService();
