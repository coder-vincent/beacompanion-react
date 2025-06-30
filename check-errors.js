#!/usr/bin/env node

/**
 * Comprehensive Error Checker for BeaCompanion
 * Checks for syntax errors, missing dependencies, and configuration issues
 */

import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";
import {
  readFileSync,
  existsSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function log(msg, color = "reset") {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

// Track issues found
let issues = [];
let passed = [];

function addIssue(category, description, severity = "error") {
  issues.push({ category, description, severity });
  const icon =
    severity === "error" ? "❌" : severity === "warning" ? "⚠️" : "ℹ️";
  log(
    `${icon} [${category}] ${description}`,
    severity === "error" ? "red" : "yellow"
  );
}

function addPass(category, description) {
  passed.push({ category, description });
  log(`✅ [${category}] ${description}`, "green");
}

// Function to check if a file exists and is readable
function checkFile(filePath, description, required = true) {
  try {
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, "utf8");
      if (content.trim()) {
        addPass("Files", `${description} exists and is readable`);
        return true;
      } else {
        addIssue("Files", `${description} exists but is empty`, "warning");
        return false;
      }
    } else {
      if (required) {
        addIssue("Files", `${description} is missing`);
      } else {
        addIssue("Files", `${description} is missing (optional)`, "info");
      }
      return false;
    }
  } catch (error) {
    addIssue("Files", `Cannot read ${description}: ${error.message}`);
    return false;
  }
}

// Function to check JSON syntax
function checkJSON(filePath, description) {
  try {
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, "utf8");
      JSON.parse(content);
      addPass("JSON", `${description} has valid JSON syntax`);
      return true;
    }
  } catch (error) {
    addIssue("JSON", `${description} has invalid JSON: ${error.message}`);
    return false;
  }
  return false;
}

// Function to check package.json dependencies
function checkPackageJson(packagePath, description) {
  try {
    if (existsSync(packagePath)) {
      const pkg = JSON.parse(readFileSync(packagePath, "utf8"));

      // Check required fields
      if (!pkg.name)
        addIssue("Package", `${description} missing 'name' field`, "warning");
      if (!pkg.version)
        addIssue(
          "Package",
          `${description} missing 'version' field`,
          "warning"
        );

      // Check if dependencies exist
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      const depCount = Object.keys(deps).length;

      if (depCount > 0) {
        addPass(
          "Package",
          `${description} has ${depCount} dependencies defined`
        );
      } else {
        addIssue(
          "Package",
          `${description} has no dependencies defined`,
          "warning"
        );
      }

      return pkg;
    }
  } catch (error) {
    addIssue("Package", `Error reading ${description}: ${error.message}`);
  }
  return null;
}

// Function to run a command and capture output
function runCommand(command, args, cwd = __dirname) {
  return new Promise((resolve) => {
    const proc = spawn(command, args, { cwd, shell: true });
    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => (stdout += data.toString()));
    proc.stderr.on("data", (data) => (stderr += data.toString()));

    proc.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      proc.kill();
      resolve({ code: -1, stdout, stderr: "Command timeout" });
    }, 10000);
  });
}

// Main error checking function
async function checkErrors() {
  log("🔍 Starting comprehensive error check for BeaCompanion...", "blue");
  log("=".repeat(60), "cyan");

  // 1. Check essential files
  log("\n📁 Checking essential files...", "blue");
  checkFile(join(__dirname, "package.json"), "Root package.json", false);
  checkFile(join(__dirname, "start_dev.js"), "Development startup script");
  checkFile(join(__dirname, "server/package.json"), "Server package.json");
  checkFile(join(__dirname, "client/package.json"), "Client package.json");
  checkFile(
    join(__dirname, "machine-learning/requirements.txt"),
    "Python requirements"
  );
  checkFile(join(__dirname, "Dockerfile"), "Dockerfile");
  checkFile(join(__dirname, ".gitignore"), "Git ignore file");

  // 2. Check configuration files
  log("\n⚙️ Checking configuration files...", "blue");
  checkJSON(join(__dirname, "server/package.json"), "Server package.json");
  checkJSON(join(__dirname, "client/package.json"), "Client package.json");
  checkJSON(join(__dirname, "client/vite.config.js"), "Vite config", false);
  checkFile(
    join(__dirname, "client/components.json"),
    "Components config",
    false
  );

  // 3. Check Docker files
  log("\n🐳 Checking Docker files...", "blue");
  checkFile(join(__dirname, "Dockerfile"), "Main Dockerfile");
  checkFile(
    join(__dirname, "Dockerfile.optimized"),
    "Optimized Dockerfile",
    false
  );
  checkFile(
    join(__dirname, "docker-compose.yml"),
    "Docker Compose config",
    false
  );
  checkFile(join(__dirname, ".dockerignore"), "Docker ignore file", false);

  // 4. Validate package.json files
  log("\n📦 Validating package.json files...", "blue");
  const serverPkg = checkPackageJson(
    join(__dirname, "server/package.json"),
    "Server package"
  );
  const clientPkg = checkPackageJson(
    join(__dirname, "client/package.json"),
    "Client package"
  );

  // 5. Check Node.js syntax
  log("\n🔧 Checking Node.js syntax...", "blue");
  try {
    const serverResult = await runCommand(
      "node",
      ["-c", "server.js"],
      join(__dirname, "server")
    );
    if (serverResult.code === 0) {
      addPass("Syntax", "Server main file has valid syntax");
    } else {
      addIssue("Syntax", `Server syntax error: ${serverResult.stderr}`);
    }

    const startResult = await runCommand(
      "node",
      ["-c", "start_dev.js"],
      __dirname
    );
    if (startResult.code === 0) {
      addPass("Syntax", "Start dev script has valid syntax");
    } else {
      addIssue(
        "Syntax",
        `Start dev script syntax error: ${startResult.stderr}`
      );
    }
  } catch (error) {
    addIssue("Syntax", `Could not check Node.js syntax: ${error.message}`);
  }

  // 6. Check Python environment
  log("\n🐍 Checking Python environment...", "blue");
  try {
    const pythonResult = await runCommand("python", ["--version"]);
    if (pythonResult.code === 0) {
      addPass("Python", `Python available: ${pythonResult.stdout.trim()}`);
    } else {
      addIssue("Python", "Python not available or not in PATH");
    }

    const pipResult = await runCommand("pip", ["--version"]);
    if (pipResult.code === 0) {
      addPass("Python", "pip package manager available");
    } else {
      addIssue("Python", "pip not available", "warning");
    }
  } catch (error) {
    addIssue("Python", `Python check failed: ${error.message}`);
  }

  // 7. Check ML requirements
  log("\n🤖 Checking ML requirements...", "blue");
  const reqPath = join(__dirname, "machine-learning/requirements.txt");
  if (existsSync(reqPath)) {
    const requirements = readFileSync(reqPath, "utf8")
      .split("\n")
      .filter((line) => line.trim());
    addPass("ML", `${requirements.length} Python packages required`);

    // Check for potential issues in requirements
    const problematicPackages = requirements.filter(
      (req) => req.includes("==") && req.includes(".")
    );
    if (problematicPackages.length > 0) {
      addIssue(
        "ML",
        `${problematicPackages.length} packages have pinned versions`,
        "info"
      );
    }
  }

  // 8. Check critical imports
  log("\n📥 Checking critical imports...", "blue");
  const criticalFiles = [
    "server/server.js",
    "server/controllers/mlController.js",
    "machine-learning/utils/ml_analyzer.py",
  ];

  for (const file of criticalFiles) {
    const filePath = join(__dirname, file);
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, "utf8");
      const importCount = (content.match(/^import\s+|^from\s+.*import/gm) || [])
        .length;
      if (importCount > 0) {
        addPass("Imports", `${file} has ${importCount} import statements`);
      } else {
        addIssue("Imports", `${file} has no imports`, "warning");
      }
    }
  }

  // Summary
  log("\n" + "=".repeat(60), "cyan");
  log("📊 SUMMARY", "bright");
  log("=".repeat(60), "cyan");

  log(`\n✅ Passed checks: ${passed.length}`, "green");
  if (passed.length > 0) {
    passed.forEach((p) => log(`  • [${p.category}] ${p.description}`, "green"));
  }

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  const info = issues.filter((i) => i.severity === "info");

  if (errors.length > 0) {
    log(`\n❌ Errors found: ${errors.length}`, "red");
    errors.forEach((e) => log(`  • [${e.category}] ${e.description}`, "red"));
  }

  if (warnings.length > 0) {
    log(`\n⚠️ Warnings: ${warnings.length}`, "yellow");
    warnings.forEach((w) =>
      log(`  • [${w.category}] ${w.description}`, "yellow")
    );
  }

  if (info.length > 0) {
    log(`\n ℹ️ Info: ${info.length}`, "blue");
    info.forEach((i) => log(`  • [${i.category}] ${i.description}`, "blue"));
  }

  log("\n" + "=".repeat(60), "cyan");

  if (errors.length === 0) {
    log(
      "🎉 No critical errors found! Your project structure is healthy.",
      "green"
    );
  } else {
    log(
      `💥 Found ${errors.length} critical errors that need attention.`,
      "red"
    );
  }

  log(`\n📋 Total checks: ${passed.length + issues.length}`, "blue");
  process.exit(errors.length > 0 ? 1 : 0);
}

// Create a root package.json if it doesn't exist
function createRootPackageJson() {
  const rootPkgPath = join(__dirname, "package.json");
  if (!existsSync(rootPkgPath)) {
    log("📝 Creating root package.json...", "yellow");

    const rootPackage = {
      name: "beacompanion",
      version: "1.0.0",
      description: "BeaCompanion - AI-powered behavioral analysis platform",
      type: "module",
      scripts: {
        dev: "node start_dev.js",
        start: "node start_dev.js",
        check: "node check-errors.js",
        "install:all":
          "npm install && cd server && npm install && cd ../client && npm install",
        "build:client": "cd client && npm run build",
        "docker:build":
          "docker build -f Dockerfile.optimized -t beacompanion:latest .",
        "docker:run": "docker-compose up -d",
        "docker:stop": "docker-compose down",
      },
      repository: {
        type: "git",
        url: "https://github.com/coder-vincent/beacompanion-react.git",
      },
      keywords: [
        "ai",
        "healthcare",
        "behavioral-analysis",
        "adhd",
        "machine-learning",
      ],
      author: "BeaCompanion Team",
      license: "ISC",
      engines: {
        node: ">=18.0.0",
        npm: ">=8.0.0",
      },
    };

    try {
      writeFileSync(rootPkgPath, JSON.stringify(rootPackage, null, 2));
      addPass("Setup", "Created root package.json");
    } catch (error) {
      addIssue("Setup", `Failed to create root package.json: ${error.message}`);
    }
  }
}

// Fix Dockerfile health check
function fixDockerfile() {
  const dockerfilePath = join(__dirname, "Dockerfile.optimized");
  if (existsSync(dockerfilePath)) {
    let dockerfile = readFileSync(dockerfilePath, "utf8");

    // Add curl installation for health check
    if (!dockerfile.includes("curl")) {
      dockerfile = dockerfile.replace(
        /RUN apt-get update && apt-get install -y \\/,
        `RUN apt-get update && apt-get install -y \\
    curl \\`
      );

      try {
        writeFileSync(dockerfilePath, dockerfile);
        addPass("Docker", "Added curl to Dockerfile for health checks");
      } catch (error) {
        addIssue("Docker", `Failed to update Dockerfile: ${error.message}`);
      }
    }
  }
}

// Run the checks
if (import.meta.url === `file://${process.argv[1]}`) {
  createRootPackageJson();
  fixDockerfile();
  checkErrors().catch(console.error);
}
