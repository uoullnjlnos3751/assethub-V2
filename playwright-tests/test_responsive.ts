import { chromium, Page } from 'playwright';
import * as jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load backend .env for JWT_SECRET
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const BASE_URL = 'http://localhost:5173'; // Assuming frontend is running locally
const OUTPUT_DIR = path.join(__dirname, 'screenshots');
const RESULTS_FILE = path.join(__dirname, 'results.json');

const ROUTES = [
  { name: 'Dashboard', path: '/' },
  { name: 'Assets', path: '/assets' },
  { name: 'PM_Plans', path: '/pm/plans' },
  { name: 'PM_Runs', path: '/pm/runs' },
  { name: 'Settings', path: '/settings' }
];

const BREAKPOINTS = [
  { name: 'Mobile_Small', width: 320, height: 600 },
  { name: 'Mobile_Large', width: 480, height: 800 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Laptop', width: 1024, height: 768 },
  { name: 'Desktop', width: 1440, height: 900 }
];

interface TestResult {
  route: string;
  breakpoint: string;
  width: number;
  hasOverflow: boolean;
  scrollWidth: number;
  innerWidth: number;
  screenshotPath: string;
}

// Generate an admin token to bypass login
function generateAdminToken(): string {
  const payload = {
    id: 1, // Assumed admin user ID
    username: 'admin',
    displayName: 'Admin User',
    role: 'ADMIN',
    department: 'IT',
    company: 'TRR',
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

async function runTests() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const token = generateAdminToken();
  const results: TestResult[] = [];

  console.log('Starting browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  // Inject token to bypass authentication
  await context.addInitScript((tokenVal) => {
    window.localStorage.setItem('token', tokenVal);
  }, token);

  const page = await context.newPage();

  for (const route of ROUTES) {
    console.log(`\nTesting route: ${route.name} (${route.path})`);
    
    for (const bp of BREAKPOINTS) {
      console.log(`  -> Breakpoint: ${bp.name} (${bp.width}px)`);
      
      await page.setViewportSize({ width: bp.width, height: bp.height });
      
      // Navigate and wait for network/dom to settle
      await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'networkidle' });
      
      // Additional wait to ensure any animations/charts settle
      await page.waitForTimeout(1500);

      // Check for horizontal overflow
      const overflowMetrics = await page.evaluate(() => {
        const docScrollWidth = document.documentElement.scrollWidth;
        const winInnerWidth = window.innerWidth;
        const bodyScrollWidth = document.body.scrollWidth;
        const maxWidth = Math.max(docScrollWidth, bodyScrollWidth);
        return {
          hasOverflow: maxWidth > winInnerWidth,
          scrollWidth: maxWidth,
          innerWidth: winInnerWidth
        };
      });

      const fileName = `${route.name}_${bp.name}_${bp.width}px.png`;
      const screenshotPath = path.join(OUTPUT_DIR, fileName);
      
      // Capture screenshot
      await page.screenshot({ path: screenshotPath, fullPage: true });

      if (overflowMetrics.hasOverflow) {
        console.warn(`     [!] OVERFLOW DETECTED: scrollWidth=${overflowMetrics.scrollWidth}, innerWidth=${overflowMetrics.innerWidth}`);
      } else {
        console.log(`     [OK] No overflow.`);
      }

      results.push({
        route: route.name,
        breakpoint: bp.name,
        width: bp.width,
        hasOverflow: overflowMetrics.hasOverflow,
        scrollWidth: overflowMetrics.scrollWidth,
        innerWidth: overflowMetrics.innerWidth,
        screenshotPath: screenshotPath
      });
    }
  }

  await browser.close();

  // Save results to JSON
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  console.log(`\nTests completed. Results saved to ${RESULTS_FILE}`);
}

runTests().catch(console.error);
