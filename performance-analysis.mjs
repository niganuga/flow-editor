#!/usr/bin/env node

/**
 * Performance Analysis Script for Flow Editor
 * October 2025 - Modern performance analysis
 *
 * This script analyzes:
 * 1. Bundle sizes and code splitting
 * 2. Image processing performance
 * 3. Memory usage patterns
 * 4. React re-render issues
 * 5. API call patterns
 * 6. Canvas rendering performance
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Colors for output
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const MAGENTA = '\x1b[35m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

class PerformanceAnalyzer {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.optimizations = [];
    this.metrics = {};
  }

  // 1. Analyze Bundle Size
  analyzeBundleSize() {
    console.log(`\n${BOLD}${BLUE}1. BUNDLE SIZE ANALYSIS${RESET}`);
    console.log('=' .repeat(50));

    try {
      // Check if .next exists
      const nextDir = path.join(__dirname, '.next');
      if (!fs.existsSync(nextDir)) {
        this.warnings.push('Build directory not found. Run "pnpm build" first.');
        return;
      }

      // Analyze static assets
      const staticDir = path.join(nextDir, 'static');
      if (fs.existsSync(staticDir)) {
        const totalSize = this.getDirectorySize(staticDir);
        this.metrics.staticSize = totalSize;
        console.log(`Static assets: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

        if (totalSize > 5 * 1024 * 1024) {
          this.issues.push({
            type: 'bundle',
            severity: 'high',
            message: 'Static assets exceed 5MB',
            fix: 'Consider code splitting and lazy loading'
          });
        }
      }

      // Check for large dependencies
      this.checkLargeDependencies();

    } catch (error) {
      console.error(`${RED}Error analyzing bundle:${RESET}`, error.message);
    }
  }

  // 2. Analyze Image Processing Performance
  analyzeImageProcessing() {
    console.log(`\n${BOLD}${BLUE}2. IMAGE PROCESSING PERFORMANCE${RESET}`);
    console.log('=' .repeat(50));

    // Check image store implementation
    const imageStorePath = path.join(__dirname, 'lib', 'image-store.ts');
    const imageStoreContent = fs.readFileSync(imageStorePath, 'utf-8');

    // Check for memory leaks in history
    if (imageStoreContent.includes('history:')) {
      const historyMatch = imageStoreContent.match(/maxHistorySize:\s*(\d+)/);
      if (historyMatch) {
        const maxHistory = parseInt(historyMatch[1]);
        console.log(`Max history size: ${maxHistory} states`);

        if (maxHistory > 20) {
          this.issues.push({
            type: 'memory',
            severity: 'medium',
            message: `History stores ${maxHistory} full image states in memory`,
            fix: 'Consider reducing history size or implementing compression',
            file: 'lib/image-store.ts',
            line: historyMatch.index
          });
        }

        // Each image state could be several MB
        const estimatedMemory = maxHistory * 5; // Assume 5MB per image
        if (estimatedMemory > 50) {
          this.issues.push({
            type: 'memory',
            severity: 'high',
            message: `History could use up to ${estimatedMemory}MB of memory`,
            fix: 'Implement image compression or offload to IndexedDB',
            file: 'lib/image-store.ts'
          });
        }
      }
    }

    // Check for FileReader usage (synchronous operation)
    const canvasPath = path.join(__dirname, 'components', 'canvas.tsx');
    const canvasContent = fs.readFileSync(canvasPath, 'utf-8');

    if (canvasContent.includes('readAsDataURL')) {
      console.log(`${YELLOW}Warning: Using readAsDataURL for image loading${RESET}`);
      this.warnings.push({
        type: 'performance',
        message: 'FileReader.readAsDataURL creates base64 strings (33% larger)',
        fix: 'Consider using createObjectURL for better memory efficiency',
        file: 'components/canvas.tsx'
      });
    }
  }

  // 3. Analyze React Performance
  analyzeReactPerformance() {
    console.log(`\n${BOLD}${BLUE}3. REACT RENDERING PERFORMANCE${RESET}`);
    console.log('=' .repeat(50));

    const componentsDir = path.join(__dirname, 'components');
    const files = this.getAllFiles(componentsDir, '.tsx');

    let memoizedComponents = 0;
    let unmemoizedComponents = 0;
    let useCallbackCount = 0;
    let useMemoCount = 0;

    files.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');

      // Check for React.memo
      if (content.includes('React.memo') || content.includes('memo(')) {
        memoizedComponents++;
      } else if (content.includes('export function') || content.includes('export const')) {
        unmemoizedComponents++;
      }

      // Check for useCallback
      useCallbackCount += (content.match(/useCallback/g) || []).length;

      // Check for useMemo
      useMemoCount += (content.match(/useMemo/g) || []).length;

      // Check for inline functions in renders
      const inlineFunctions = content.match(/onClick=\{[^}]*=>/g);
      if (inlineFunctions && inlineFunctions.length > 3) {
        this.warnings.push({
          type: 'react',
          message: `Multiple inline functions in ${path.basename(file)}`,
          fix: 'Use useCallback for event handlers to prevent re-renders',
          file: path.relative(__dirname, file)
        });
      }

      // Check for heavy computations in render
      if (content.includes('.map(') && content.includes('.filter(')) {
        const mapFilterCount = (content.match(/\.(map|filter)\(/g) || []).length;
        if (mapFilterCount > 5) {
          this.warnings.push({
            type: 'react',
            message: `Heavy array operations in ${path.basename(file)}`,
            fix: 'Consider using useMemo for expensive computations',
            file: path.relative(__dirname, file)
          });
        }
      }
    });

    console.log(`Components: ${memoizedComponents} memoized, ${unmemoizedComponents} not memoized`);
    console.log(`Hooks: ${useCallbackCount} useCallback, ${useMemoCount} useMemo`);

    if (unmemoizedComponents > memoizedComponents * 2) {
      this.issues.push({
        type: 'react',
        severity: 'medium',
        message: 'Most components are not memoized',
        fix: 'Consider using React.memo for pure components'
      });
    }
  }

  // 4. Analyze Canvas Performance
  analyzeCanvasPerformance() {
    console.log(`\n${BOLD}${BLUE}4. CANVAS RENDERING PERFORMANCE${RESET}`);
    console.log('=' .repeat(50));

    const canvasPath = path.join(__dirname, 'components', 'canvas.tsx');
    const content = fs.readFileSync(canvasPath, 'utf-8');

    // Check for requestAnimationFrame usage
    if (!content.includes('requestAnimationFrame')) {
      console.log(`${YELLOW}Not using requestAnimationFrame for animations${RESET}`);
      this.warnings.push({
        type: 'canvas',
        message: 'Canvas animations not using requestAnimationFrame',
        fix: 'Use requestAnimationFrame for smooth 60fps animations',
        file: 'components/canvas.tsx'
      });
    }

    // Check for pan/zoom implementation
    if (content.includes('onMouseMove') && content.includes('isPanning')) {
      console.log(`${GREEN}Pan/zoom implemented with mouse events${RESET}`);

      // Check if throttling is implemented
      if (!content.includes('throttle') && !content.includes('debounce')) {
        this.issues.push({
          type: 'canvas',
          severity: 'medium',
          message: 'Mouse move events not throttled',
          fix: 'Throttle mousemove events to improve performance',
          file: 'components/canvas.tsx'
        });
      }
    }

    // Check image rendering
    if (content.includes('img') && content.includes('src=')) {
      console.log('Using <img> tag for image display');
      this.optimizations.push({
        type: 'canvas',
        message: 'Consider using Canvas API for image manipulation',
        benefit: 'Direct pixel manipulation and better performance'
      });
    }
  }

  // 5. Analyze AI Tool Performance
  analyzeAIPerformance() {
    console.log(`\n${BOLD}${BLUE}5. AI TOOL PERFORMANCE${RESET}`);
    console.log('=' .repeat(50));

    const aiToolsDir = path.join(__dirname, 'lib', 'tools');
    if (fs.existsSync(aiToolsDir)) {
      const files = this.getAllFiles(aiToolsDir, '.ts');

      files.forEach(file => {
        const content = fs.readFileSync(file, 'utf-8');
        const fileName = path.basename(file);

        // Check for proper async/await usage
        const asyncFunctions = (content.match(/async\s+function/g) || []).length;
        const awaitUsage = (content.match(/await\s+/g) || []).length;

        console.log(`${fileName}: ${asyncFunctions} async functions, ${awaitUsage} await calls`);

        // Check for parallel processing opportunities
        if (content.includes('for') && content.includes('await')) {
          if (!content.includes('Promise.all')) {
            this.warnings.push({
              type: 'async',
              message: `Sequential awaits in loop in ${fileName}`,
              fix: 'Consider using Promise.all for parallel processing',
              file: path.relative(__dirname, file)
            });
          }
        }

        // Check for FormData usage (for file uploads)
        if (content.includes('FormData')) {
          console.log(`${GREEN}${fileName} uses FormData for efficient file uploads${RESET}`);
        }

        // Check for progress callbacks
        if (content.includes('onProgress')) {
          console.log(`${GREEN}${fileName} implements progress tracking${RESET}`);
        }
      });
    }
  }

  // 6. Check for Memory Leaks
  checkMemoryLeaks() {
    console.log(`\n${BOLD}${BLUE}6. MEMORY LEAK DETECTION${RESET}`);
    console.log('=' .repeat(50));

    const files = this.getAllFiles(__dirname, '.tsx', '.ts');

    files.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      const fileName = path.relative(__dirname, file);

      // Check for event listeners without cleanup
      if (content.includes('addEventListener')) {
        if (!content.includes('removeEventListener')) {
          this.issues.push({
            type: 'memory',
            severity: 'high',
            message: `Event listener without cleanup in ${path.basename(file)}`,
            fix: 'Add removeEventListener in cleanup/unmount',
            file: fileName
          });
        }
      }

      // Check for setInterval without cleanup
      if (content.includes('setInterval')) {
        if (!content.includes('clearInterval')) {
          this.issues.push({
            type: 'memory',
            severity: 'high',
            message: `setInterval without cleanup in ${path.basename(file)}`,
            fix: 'Add clearInterval in cleanup/unmount',
            file: fileName
          });
        }
      }

      // Check for blob URLs without cleanup
      if (content.includes('createObjectURL')) {
        if (!content.includes('revokeObjectURL')) {
          this.issues.push({
            type: 'memory',
            severity: 'medium',
            message: `Blob URL not revoked in ${path.basename(file)}`,
            fix: 'Call URL.revokeObjectURL when done with blob',
            file: fileName
          });
        }
      }
    });
  }

  // 7. Modern Performance Patterns Check (October 2025)
  checkModernPatterns() {
    console.log(`\n${BOLD}${BLUE}7. MODERN PATTERNS CHECK (2025)${RESET}`);
    console.log('=' .repeat(50));

    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));

    // Check React version
    const reactVersion = packageJson.dependencies.react;
    console.log(`React version: ${reactVersion}`);
    if (reactVersion.includes('^19')) {
      console.log(`${GREEN}✓ Using React 19 with automatic batching${RESET}`);
    }

    // Check Next.js version
    const nextVersion = packageJson.dependencies.next;
    console.log(`Next.js version: ${nextVersion}`);
    if (nextVersion.includes('15')) {
      console.log(`${GREEN}✓ Using Next.js 15 with improved performance${RESET}`);
    }

    // Check for server components
    const appDir = path.join(__dirname, 'app');
    if (fs.existsSync(appDir)) {
      console.log(`${GREEN}✓ Using App Router for better performance${RESET}`);
    }

    // Check for image optimization
    const nextConfig = path.join(__dirname, 'next.config.mjs');
    const configContent = fs.readFileSync(nextConfig, 'utf-8');
    if (configContent.includes('unoptimized: true')) {
      this.issues.push({
        type: 'config',
        severity: 'medium',
        message: 'Next.js image optimization disabled',
        fix: 'Enable image optimization for better performance',
        file: 'next.config.mjs'
      });
    }

    // Check for modern state management
    if (packageJson.dependencies.zustand) {
      console.log(`${GREEN}✓ Using Zustand for efficient state management${RESET}`);
    }

    // Check for modern build tools
    if (packageJson.devDependencies.vitest) {
      console.log(`${GREEN}✓ Using Vitest for fast testing${RESET}`);
    }
  }

  // Helper functions
  getDirectorySize(dir) {
    let totalSize = 0;
    const files = fs.readdirSync(dir);

    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        totalSize += this.getDirectorySize(filePath);
      } else {
        totalSize += stat.size;
      }
    });

    return totalSize;
  }

  getAllFiles(dir, ...extensions) {
    let files = [];

    if (!fs.existsSync(dir)) return files;

    const items = fs.readdirSync(dir);

    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !item.includes('node_modules')) {
        files = files.concat(this.getAllFiles(fullPath, ...extensions));
      } else if (extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    });

    return files;
  }

  checkLargeDependencies() {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));
    const largeDeps = {
      '@anthropic-ai/sdk': '~2MB',
      '@google/genai': '~1.5MB',
      'canvas': '~15MB',
      '@radix-ui': '~3MB total',
      'recharts': '~500KB'
    };

    console.log('\nLarge dependencies detected:');
    Object.keys(largeDeps).forEach(dep => {
      if (Object.keys(packageJson.dependencies).some(d => d.includes(dep))) {
        console.log(`  - ${dep}: ${largeDeps[dep]}`);
      }
    });

    // Canvas package is particularly large
    if (packageJson.dependencies.canvas) {
      this.issues.push({
        type: 'bundle',
        severity: 'high',
        message: 'Canvas package adds ~15MB to bundle',
        fix: 'Consider using browser Canvas API or lazy loading'
      });
    }
  }

  // Generate report
  generateReport() {
    console.log(`\n${BOLD}${CYAN}${'='.repeat(60)}${RESET}`);
    console.log(`${BOLD}${CYAN}PERFORMANCE ANALYSIS REPORT${RESET}`);
    console.log(`${BOLD}${CYAN}${'='.repeat(60)}${RESET}`);

    // Critical Issues
    const criticalIssues = this.issues.filter(i => i.severity === 'high');
    if (criticalIssues.length > 0) {
      console.log(`\n${BOLD}${RED}CRITICAL ISSUES (${criticalIssues.length}):${RESET}`);
      criticalIssues.forEach((issue, i) => {
        console.log(`\n${i + 1}. ${RED}[${issue.type.toUpperCase()}]${RESET} ${issue.message}`);
        if (issue.file) console.log(`   File: ${issue.file}`);
        console.log(`   Fix: ${issue.fix}`);
      });
    }

    // Medium Issues
    const mediumIssues = this.issues.filter(i => i.severity === 'medium');
    if (mediumIssues.length > 0) {
      console.log(`\n${BOLD}${YELLOW}MEDIUM ISSUES (${mediumIssues.length}):${RESET}`);
      mediumIssues.forEach((issue, i) => {
        console.log(`\n${i + 1}. ${YELLOW}[${issue.type.toUpperCase()}]${RESET} ${issue.message}`);
        if (issue.file) console.log(`   File: ${issue.file}`);
        console.log(`   Fix: ${issue.fix}`);
      });
    }

    // Warnings
    if (this.warnings.length > 0) {
      console.log(`\n${BOLD}${YELLOW}WARNINGS (${this.warnings.length}):${RESET}`);
      this.warnings.forEach((warning, i) => {
        console.log(`\n${i + 1}. ${YELLOW}[${warning.type.toUpperCase()}]${RESET} ${warning.message}`);
        if (warning.file) console.log(`   File: ${warning.file}`);
        console.log(`   Fix: ${warning.fix}`);
      });
    }

    // Optimization Opportunities
    if (this.optimizations.length > 0) {
      console.log(`\n${BOLD}${GREEN}OPTIMIZATION OPPORTUNITIES:${RESET}`);
      this.optimizations.forEach((opt, i) => {
        console.log(`\n${i + 1}. ${GREEN}[${opt.type.toUpperCase()}]${RESET} ${opt.message}`);
        console.log(`   Benefit: ${opt.benefit}`);
      });
    }

    // Summary
    console.log(`\n${BOLD}${CYAN}${'='.repeat(60)}${RESET}`);
    console.log(`${BOLD}SUMMARY:${RESET}`);
    console.log(`- Critical Issues: ${criticalIssues.length}`);
    console.log(`- Medium Issues: ${mediumIssues.length}`);
    console.log(`- Warnings: ${this.warnings.length}`);
    console.log(`- Optimization Opportunities: ${this.optimizations.length}`);

    const score = Math.max(0, 100 - (criticalIssues.length * 20) - (mediumIssues.length * 10) - (this.warnings.length * 3));
    const scoreColor = score >= 80 ? GREEN : score >= 60 ? YELLOW : RED;
    console.log(`\n${BOLD}Performance Score: ${scoreColor}${score}/100${RESET}`);

    // Recommendations
    console.log(`\n${BOLD}TOP RECOMMENDATIONS:${RESET}`);
    console.log('1. Implement image compression and lazy loading');
    console.log('2. Add React.memo to frequently re-rendered components');
    console.log('3. Use Web Workers for heavy image processing');
    console.log('4. Implement virtual scrolling for long lists');
    console.log('5. Set up performance monitoring with Web Vitals');
  }

  run() {
    console.log(`${BOLD}${CYAN}Flow Editor Performance Analysis${RESET}`);
    console.log(`${CYAN}October 2025 - Modern Performance Patterns${RESET}`);
    console.log('=' .repeat(60));

    this.analyzeBundleSize();
    this.analyzeImageProcessing();
    this.analyzeReactPerformance();
    this.analyzeCanvasPerformance();
    this.analyzeAIPerformance();
    this.checkMemoryLeaks();
    this.checkModernPatterns();
    this.generateReport();
  }
}

// Run the analyzer
const analyzer = new PerformanceAnalyzer();
analyzer.run();