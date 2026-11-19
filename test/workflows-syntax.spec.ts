import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

describe('GitHub Actions Workflows & Security Verification', () => {
  const workflowsDir = path.join(__dirname, '../.github/workflows');
  const examplesDir = path.join(__dirname, '../examples');
  const actionsDir = path.join(__dirname, '../actions');

  const workflowFiles = fs
    .readdirSync(workflowsDir)
    .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
    .map((f) => path.join(workflowsDir, f));

  const exampleFiles = fs
    .readdirSync(examplesDir)
    .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
    .map((f) => path.join(examplesDir, f));

  it('verifies that all workflow files parse valid YAML syntax', () => {
    expect(workflowFiles.length).toBeGreaterThanOrEqual(8);
    for (const file of workflowFiles) {
      const content = fs.readFileSync(file, 'utf8');
      expect(() => yaml.load(content)).not.toThrow();
    }
  });

  it('verifies least-privilege permissions are explicitly set on every reusable workflow', () => {
    for (const file of workflowFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const doc = yaml.load(content) as any;
      expect(doc).toBeDefined();
      expect(doc.permissions).toBeDefined();
      expect(typeof doc.permissions).toBe('object');
    }
  });

  it('verifies that all third-party actions are pinned to 40-character commit SHAs', () => {
    const sha40Regex = /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+@[a-f0-9]{40}/;

    const checkUsesInDoc = (rawText: string) => {
      const lines = rawText.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('uses:')) {
          const actionRef = trimmed
            .replace(/^uses:\s*/, '')
            .split('#')[0]
            .trim()
            .replace(/^['"]|['"]$/g, '');
          // Ignore local actions starting with . or internal henu-os reusable workflows
          if (actionRef.startsWith('.') || actionRef.startsWith('henu-os/')) {
            continue;
          }
          expect(actionRef).toMatch(sha40Regex);
        }
      }
    };

    // Check all workflows
    workflowFiles.forEach((file) => {
      const content = fs.readFileSync(file, 'utf8');
      checkUsesInDoc(content);
    });

    // Check custom actions
    const actionFiles: string[] = [];
    const findActions = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) findActions(full);
        else if (e.name === 'action.yml' || e.name === 'action.yaml') actionFiles.push(full);
      }
    };
    findActions(actionsDir);
    actionFiles.forEach((file) => {
      const content = fs.readFileSync(file, 'utf8');
      checkUsesInDoc(content);
    });
  });

  it('verifies example workflows for HENU PA, HENU AI and HENU IDE exist and configure the orchestrator', () => {
    expect(exampleFiles).toHaveLength(3);

    const paContent = fs.readFileSync(path.join(examplesDir, 'henu-pa-release.yml'), 'utf8');
    expect(paContent).toContain("product-id: 'henu-pa'");
    expect(paContent).toContain("windows-format: 'msi'");
    expect(paContent).toContain("macos-format: 'dmg'");
    expect(paContent).toContain("linux-format: 'appimage'");

    const aiContent = fs.readFileSync(path.join(examplesDir, 'henu-ai-release.yml'), 'utf8');
    expect(aiContent).toContain("product-id: 'henu-ai'");
    expect(aiContent).toContain("windows-format: 'exe'");
    expect(aiContent).toContain("macos-format: 'pkg'");
    expect(aiContent).toContain("linux-format: 'deb'");

    const ideContent = fs.readFileSync(path.join(examplesDir, 'henu-ide-release.yml'), 'utf8');
    expect(ideContent).toContain("product-id: 'henu-ide'");
    expect(ideContent).toContain("windows-format: 'zip'");
    expect(ideContent).toContain("macos-format: 'dmg'");
    expect(ideContent).toContain("linux-format: 'tar.gz'");
  });
});
