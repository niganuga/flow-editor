#!/bin/bash
# install-2025-agents.sh
# Based on October 2025 agent ecosystem research

echo "🚀 Installing Critical Missing Agents (October 2025)"
echo ""

# ============================================================================
# PRIORITY 1: OBSERVABILITY & MONITORING (Install Today)
# ============================================================================

echo "📊 Category 1: Observability & Monitoring"
echo ""

# Note: Custom agents need to be created manually
echo "⚠️  Manual creation required for:"
echo "  - llm-observability-agent.md"
echo "  - agent-workflow-tracer.md"
echo "  See implementation details in gap analysis doc"
echo ""

# ============================================================================
# PRIORITY 2: COMPLIANCE & SECURITY (Install This Week)
# ============================================================================

echo "🔒 Category 2: Compliance & Security"
echo ""

npx claude-code-templates@latest --agent=security/compliance-specialist --yes
npx claude-code-templates@latest --agent=web-tools/web-accessibility-checker --yes
npx claude-code-templates@latest --agent=security/security-auditor --yes
npx claude-code-templates@latest --agent=devops-infrastructure/security-engineer --yes

# ============================================================================
# PRIORITY 3: INTEGRATION & ORCHESTRATION (Install This Week)
# ============================================================================

echo ""
echo "🔗 Category 3: Integration & Orchestration"
echo ""

npx claude-code-templates@latest --agent=development-tools/mcp-expert --yes

echo ""
echo "⚠️  Manual creation required for:"
echo "  - workflow-orchestrator.md"
echo "  - github-integration-agent.md"
echo "  - slack-communication-agent.md"
echo ""

# ============================================================================
# PRIORITY 4: DATA & PERFORMANCE (Install Next Week)
# ============================================================================

echo "💾 Category 4: Data & Performance"
echo ""

npx claude-code-templates@latest --agent=data-ai/data-engineer --yes

echo ""
echo "⚠️  Manual creation required for:"
echo "  - vector-db-specialist.md"
echo "  - cache-optimization-agent.md"
echo ""

# ============================================================================
# PRIORITY 5: TESTING & QUALITY (Install Next Week)
# ============================================================================

echo "✅ Category 5: Testing & Quality"
echo ""

npx claude-code-templates@latest --agent=performance-testing/test-automator --yes
npx claude-code-templates@latest --agent=performance-testing/load-testing-specialist --yes
npx claude-code-templates@latest --agent=performance-testing/performance-engineer --yes
npx claude-code-templates@latest --agent=development-tools/performance-profiler --yes
npx claude-code-templates@latest --agent=performance-testing/web-vitals-optimizer --yes

echo ""
echo "⚠️  Manual creation required for:"
echo "  - visual-regression-testing-agent.md"
echo ""

# ============================================================================
# PRIORITY 6: DEPLOYMENT & DEVOPS (Install Next Week)
# ============================================================================

echo "🚢 Category 6: Deployment & DevOps"
echo ""

npx claude-code-templates@latest --agent=devops-infrastructure/deployment-engineer --yes
npx claude-code-templates@latest --agent=devops-infrastructure/vercel-deployment-specialist --yes
npx claude-code-templates@latest --agent=devops-infrastructure/devops-troubleshooter --yes
npx claude-code-templates@latest --agent=devops-infrastructure/terraform-specialist --yes
npx claude-code-templates@latest --agent=devops-infrastructure/monitoring-specialist --yes

# ============================================================================
# PRIORITY 7: DOCUMENTATION (Install Next Month)
# ============================================================================

echo ""
echo "📚 Category 7: Documentation"
echo ""

npx claude-code-templates@latest --agent=expert-advisors/documentation-expert --yes
npx claude-code-templates@latest --agent=documentation/technical-writer --yes
npx claude-code-templates@latest --agent=documentation/api-documenter --yes
npx claude-code-templates@latest --agent=documentation/changelog-generator --yes

# ============================================================================
# PRIORITY 8: SPECIALIZED DEVELOPMENT (Install Next Month)
# ============================================================================

echo ""
echo "⚙️ Category 8: Specialized Development"
echo ""

npx claude-code-templates@latest --agent=programming-languages/javascript-pro --yes
npx claude-code-templates@latest --agent=development-tools/dx-optimizer --yes

echo ""
echo "✅ Agent installation complete!"
echo ""
echo "📝 Next Steps:"
echo "1. Create custom agents listed above (see gap analysis doc)"
echo "2. Install MCP servers for tool integrations"
echo "3. Configure hooks for automated workflows"
echo "4. Set up observability platform (Helicone/LangSmith)"
echo "5. Run test coverage baseline"
echo ""
echo "🎯 Target: >95% confidence for production deployment"
