/**
 * Configuration Migration Service
 *
 * Handles version migrations for exported composite projection configurations.
 * Ensures backward compatibility when schema changes are introduced.
 *
 * Migration Strategy:
 * - Each version has a migration function to upgrade to the next version
 * - Migrations are chained: v1.0 -> v1.1 -> v1.2 -> current
 * - Original data is never modified (pure functions)
 * - All changes are logged in migration messages
 *
 * Adding New Versions:
 * 1. Add new version type to export-config.ts
 * 2. Add migration function: migrateV{X}ToV{Y}
 * 3. Update SUPPORTED_VERSIONS and CURRENT_VERSION
 * 4. Add migration to MIGRATION_CHAIN
 * 5. Write tests for migration path
 */

import type {
  AnyVersionConfig,
  ConfigVersion,
  ExportedCompositeConfig,
  ExportedCompositeConfigV1,
  MigrationResult,
} from '@/types/export-config'

/**
 * Current supported configuration version
 */
export const CURRENT_VERSION: ConfigVersion = '1.0'

/**
 * All supported configuration versions (oldest to newest)
 */
export const SUPPORTED_VERSIONS: ConfigVersion[] = ['1.0']

/**
 * Check if a version is supported
 */
export function isSupportedVersion(version: string): version is ConfigVersion {
  return SUPPORTED_VERSIONS.includes(version as ConfigVersion)
}

/**
 * Check if a version is current
 */
export function isCurrentVersion(version: ConfigVersion): boolean {
  return version === CURRENT_VERSION
}

/**
 * Get version index (for comparison)
 */
function getVersionIndex(version: ConfigVersion): number {
  const index = SUPPORTED_VERSIONS.indexOf(version)
  return index === -1 ? -1 : index
}

/**
 * Compare two versions
 * Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
export function compareVersions(v1: ConfigVersion, v2: ConfigVersion): number {
  const idx1 = getVersionIndex(v1)
  const idx2 = getVersionIndex(v2)

  if (idx1 === -1 || idx2 === -1) {
    throw new Error(`Cannot compare versions: ${v1}, ${v2}`)
  }

  return Math.sign(idx1 - idx2)
}

/**
 * Configuration Migrator Service
 *
 * Provides methods for migrating configurations between versions
 */
export class ConfigMigrator {
  /**
   * Migrate configuration to current version
   *
   * @param config - Configuration of any supported version
   * @returns Migration result with upgraded configuration
   */
  static migrateToCurrentVersion(config: AnyVersionConfig): MigrationResult {
    // Already current version
    if (isCurrentVersion(config.version)) {
      return {
        success: true,
        config: config as ExportedCompositeConfig,
        fromVersion: config.version,
        toVersion: CURRENT_VERSION,
        messages: ['Configuration is already at current version'],
        errors: [],
        warnings: [],
      }
    }

    // Check if version is supported
    if (!isSupportedVersion(config.version)) {
      return {
        success: false,
        fromVersion: config.version as ConfigVersion,
        toVersion: CURRENT_VERSION,
        messages: [],
        errors: [`Unsupported version: ${config.version}`],
        warnings: [],
      }
    }

    // Check if downgrade (not supported)
    if (compareVersions(config.version, CURRENT_VERSION) > 0) {
      return {
        success: false,
        fromVersion: config.version,
        toVersion: CURRENT_VERSION,
        messages: [],
        errors: [`Cannot downgrade from ${config.version} to ${CURRENT_VERSION}`],
        warnings: [],
      }
    }

    // Perform migration chain
    try {
      const result = this.performMigrationChain(config)
      return result
    }
    catch (error) {
      return {
        success: false,
        fromVersion: config.version,
        toVersion: CURRENT_VERSION,
        messages: [],
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
      }
    }
  }

  /**
   * Perform migration through chain of versions
   */
  private static performMigrationChain(config: AnyVersionConfig): MigrationResult {
    let currentConfig: AnyVersionConfig = config
    const messages: string[] = []
    const warnings: string[] = []

    // Currently only v1.0 exists, so no migration needed
    // When v1.1 is added, implement migration chain here:
    //
    // if (currentConfig.version === '1.0') {
    //   const result = this.migrateV1ToV11(currentConfig as ExportedCompositeConfigV1)
    //   currentConfig = result.config
    //   messages.push(...result.messages)
    //   warnings.push(...result.warnings)
    // }
    //
    // if (currentConfig.version === '1.1') {
    //   const result = this.migrateV11ToV12(currentConfig as ExportedCompositeConfigV11)
    //   currentConfig = result.config
    //   messages.push(...result.messages)
    //   warnings.push(...result.warnings)
    // }

    return {
      success: true,
      config: currentConfig as ExportedCompositeConfig,
      fromVersion: config.version,
      toVersion: currentConfig.version,
      messages,
      errors: [],
      warnings,
    }
  }

  /**
   * Example migration function (template for future versions)
   *
   * Uncomment and implement when adding v1.1:
   *
   * private static migrateV1ToV11(
   *   config: ExportedCompositeConfigV1
   * ): { config: ExportedCompositeConfigV11, messages: string[], warnings: string[] } {
   *   const messages: string[] = []
   *   const warnings: string[] = []
   *
   *   // Example: Add new field with default value
   *   const migratedConfig: ExportedCompositeConfigV11 = {
   *     ...config,
   *     version: '1.1',
   *     // Add new fields here
   *     newField: 'defaultValue'
   *   }
   *
   *   messages.push('Migrated from v1.0 to v1.1')
   *   messages.push('Added newField with default value')
   *
   *   // Example: Warn about breaking change
   *   if (someCondition) {
   *     warnings.push('Some behavior has changed in v1.1')
   *   }
   *
   *   return { config: migratedConfig, messages, warnings }
   * }
   */

  /**
   * Get migration path from one version to another
   *
   * @param from - Source version
   * @param to - Target version
   * @returns Array of versions in migration path
   */
  static getMigrationPath(from: ConfigVersion, to: ConfigVersion): ConfigVersion[] {
    const fromIdx = getVersionIndex(from)
    const toIdx = getVersionIndex(to)

    if (fromIdx === -1 || toIdx === -1) {
      throw new Error(`Invalid versions: from=${from}, to=${to}`)
    }

    if (fromIdx > toIdx) {
      throw new Error(`Cannot downgrade from ${from} to ${to}`)
    }

    return SUPPORTED_VERSIONS.slice(fromIdx, toIdx + 1)
  }

  /**
   * Check if migration is needed
   */
  static needsMigration(config: AnyVersionConfig): boolean {
    return !isCurrentVersion(config.version)
  }

  /**
   * Validate configuration can be migrated
   */
  static canMigrate(config: AnyVersionConfig): boolean {
    if (!isSupportedVersion(config.version)) {
      return false
    }

    // Check if downgrade
    if (compareVersions(config.version, CURRENT_VERSION) > 0) {
      return false
    }

    return true
  }
}
