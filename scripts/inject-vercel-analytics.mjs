import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Analytics script to inject (using the inject method for static HTML)
// This will be injected right after the opening <head> tag
const ANALYTICS_SCRIPT = `
<script>
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
</script>
<script defer src="/_vercel/insights/script.js"></script>`;

function findHtmlFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findHtmlFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function injectAnalytics(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Check if analytics is already injected
  if (content.includes('/_vercel/insights/script.js') || content.includes('window.va =')) {
    console.log(`  ✓ Analytics already present in ${filePath}`);
    return false;
  }
  
  // Find the <head> tag and inject after it
  const headMatch = content.match(/<head[^>]*>/i);
  if (!headMatch) {
    console.log(`  ⚠ No <head> tag found in ${filePath}`);
    return false;
  }
  
  const insertPosition = headMatch.index + headMatch[0].length;
  content = content.slice(0, insertPosition) + ANALYTICS_SCRIPT + content.slice(insertPosition);
  
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`  ✓ Injected analytics into ${filePath}`);
  return true;
}

function main() {
  const publicDir = path.join(__dirname, '..', 'public');
  
  if (!fs.existsSync(publicDir)) {
    console.error('Error: public directory not found');
    process.exit(1);
  }
  
  console.log('Finding HTML files...');
  const htmlFiles = findHtmlFiles(publicDir);
  
  console.log(`Found ${htmlFiles.length} HTML files\n`);
  console.log('Injecting Vercel Analytics...');
  
  let injectedCount = 0;
  let alreadyPresentCount = 0;
  
  for (const file of htmlFiles) {
    const wasInjected = injectAnalytics(file);
    if (wasInjected) {
      injectedCount++;
    } else if (file.includes('/_vercel/insights/script.js')) {
      alreadyPresentCount++;
    }
  }
  
  console.log('\n=== Summary ===');
  console.log(`Total files: ${htmlFiles.length}`);
  console.log(`Injected: ${injectedCount}`);
  console.log(`Already present: ${alreadyPresentCount}`);
  console.log(`Skipped: ${htmlFiles.length - injectedCount - alreadyPresentCount}`);
}

main();
