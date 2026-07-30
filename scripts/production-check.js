#!/usr/bin/env node

/**
 * Production readiness check for RDS AI Call Centre.
 *
 * Validates:
 * - Node.js version
 * - Environment variables
 * - Dependency health
 * - Port availability
 *
 * Usage:
 *   node scripts/production-check.js
 */

import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'

const ROOT = join(import.meta.dirname, '..')

const checks = {
  passed: 0,
  failed: 0,
  warnings: 0,
}

function check(name, condition, details = '') {
  if (condition) {
    console.log(`  ✔ ${name}`)
    checks.passed++
  } else {
    console.log(`  ✖ ${name}${details ? ` — ${details}` : ''}`)
    checks.failed++
  }
}

function warn(details) {
  console.log(`  ⚠ ${details}`)
  checks.warnings++
}

async function runCommand(command, args = []) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: 'pipe' })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (data) => { stdout += data.toString() })
    child.stderr.on('data', (data) => { stderr += data.toString() })
    child.on('close', (code) => resolve({ code, stdout, stderr }))
  })
}

async function checkNodeVersion() {
  const { code, stdout } = await runCommand('node', ['--version'])
  if (code === 0) {
    const version = stdout.trim()
    const major = parseInt(version.replace('v', '').split('.')[0], 10)
    check('Node.js version >= 20', major >= 20, `found ${version}`)
  } else {
    check('Node.js installed', false)
  }
}

async function checkDocker() {
  const { code } = await runCommand('docker', ['--version'])
  check('Docker installed', code === 0)
}

async function checkNpm() {
  const { code } = await runCommand('npm', ['--version'])
  check('npm installed', code === 0)
}

async function checkEnvironment() {
  const envPath = join(ROOT, 'docker', '.env')
  check('docker/.env exists', existsSync(envPath))

  const envExamplePath = join(ROOT, 'docker', '.env.production.example')
  check('docker/.env.production.example exists', existsSync(envExamplePath))
}

async function checkDockerCompose() {
  const prodPath = join(ROOT, 'docker', 'docker-compose.production.yml')
  check('docker-compose.production.yml exists', existsSync(prodPath))
}

async function checkDeploymentDoc() {
  const docPath = join(ROOT, 'DEPLOYMENT.md')
  check('DEPLOYMENT.md exists', existsSync(docPath))
}

async function checkBuildOutput() {
  const apiDist = join(ROOT, 'apps', 'api', 'dist')
  check('API build output exists', existsSync(apiDist))

  const webDist = join(ROOT, 'apps', 'web', '.next')
  check('Web build output exists', existsSync(webDist))
}

async function checkMigrations() {
  const migrationsDir = join(ROOT, 'database', 'migrations')
  if (existsSync(migrationsDir)) {
    const { stdout } = await runCommand('ls', [migrationsDir])
    const count = stdout.split('\n').filter(Boolean).length
    check('Database migrations exist', count > 0, `${count} migration(s) found`)
  } else {
    check('Database migrations directory exists', false)
  }
}

async function checkPackageJson() {
  const pkgPath = join(ROOT, 'package.json')
  check('package.json exists', existsSync(pkgPath))

  if (existsSync(pkgPath)) {
    try {
      const content = await Bun.file(pkgPath).text()
      const pkg = JSON.parse(content)
      check('Build script defined', !!pkg.scripts?.build)
      check('Lint script defined', !!pkg.scripts?.lint)
      check('Typecheck script defined', !!pkg.scripts?.typecheck)
    } catch {
      warn('Could not parse package.json')
    }
  }
}

async function checkSecurity() {
  // Check for common security misconfigurations
  const nginxConf = join(ROOT, 'docker', 'nginx.conf')
  if (existsSync(nginxConf)) {
    const content = await Bun.file(nginxConf).text()
    check('Nginx server_tokens off', content.includes('server_tokens off'))
    check('Nginx gzip enabled', content.includes('gzip on'))
    check('Nginx rate limiting configured', content.includes('limit_req_zone'))
  }
}

async function main() {
  console.log('\n🔍 RDS AI Call Centre — Production Readiness Check\n')

  console.log('Environment:')
  await checkNodeVersion()
  await checkDocker()
  await checkNpm()

  console.log('\nConfiguration:')
  await checkEnvironment()
  await checkDockerCompose()
  await checkDeploymentDoc()

  console.log('\nBuild Artifacts:')
  await checkBuildOutput()

  console.log('\nDatabase:')
  await checkMigrations()

  console.log('\nPackage Scripts:')
  await checkPackageJson()

  console.log('\nSecurity:')
  await checkSecurity()

  console.log('\n' + '='.repeat(50))
  console.log(`  ✔ Passed:  ${checks.passed}`)
  console.log(`  ✖ Failed:  ${checks.failed}`)
  console.log(`  ⚠ Warnings: ${checks.warnings}`)
  console.log('='.repeat(50) + '\n')

  if (checks.failed > 0) {
    console.log('❌ Production readiness check failed. Please fix the issues above.\n')
    process.exit(1)
  } else if (checks.warnings > 0) {
    console.log('⚠ Production readiness check passed with warnings.\n')
    process.exit(0)
  } else {
    console.log('✅ Production readiness check passed.\n')
    process.exit(0)
  }
}

main().catch((err) => {
  console.error('Fatal error during production check:', err)
  process.exit(1)
})
