/*
 * Copyright (C) 2017 The "mysteriumnetwork/mysterium-vpn" Authors.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

// @flow

import os from 'os'
import path from 'path'
import logger from '../../../app/logger'
import type { ClientConfig } from '../config'
import type { Installer } from '../index'
import type { System } from '../system'
import ServiceManager, { SERVICE_STATE } from './service-manager'

const SERVICE_NAME = 'MysteriumClient'
const SERVICE_MANAGER_BIN = 'servicemanager.exe'
const SERVICE_MANAGER_CONFIG = 'servicemanager.json'
const TAP_DRIVER_BIN = 'tap-windows.exe'

class ServiceManagerInstaller implements Installer {
  _system: System
  _config: ClientConfig
  _serviceManagerDir: string
  _serviceManager: ServiceManager

  constructor (system: System, config: ClientConfig, serviceManager: ServiceManager) {
    this._system = system
    this._config = config
    this._serviceManagerDir = serviceManager.directory
    this._serviceManager = serviceManager
  }

  async needsInstallation (): Promise<boolean> {
    if (!this._configExists()) {
      logger.info('[needs-install] config does not exist')

      return true
    }

    if (this._configChecksumMismatch()) {
      logger.info('[needs-install] checksum mismatch')

      return true
    }

    if (!await this._serviceInstalled()) {
      logger.info('[needs-install] service not installed')

      return true
    }

    if (!await this._tapDriversInstalled()) {
      logger.info('[needs-install] drivers not installed')

      return true
    }

    return false
  }

  async install (): Promise<void> {
    if (!this._configExists() || this._configChecksumMismatch()) {
      logger.info('[install] config needs to be recreated')

      await this._system.writeFile(this._getConfigPath(), this._getServiceManagerConfigContents())
    }

    if (!await this._serviceInstalled()) {
      logger.info('[install] installing service')

      await this._serviceManager.install()
    }

    if (!await this._tapDriversInstalled()) {
      logger.info('[install] installing tap drivers')

      await this._installTapDrivers()
    }
  }

  _configExists () {
    return this._system.fileExists(this._getConfigPath())
  }

  _configChecksumMismatch () {
    const config = this._getServiceManagerConfigContents()
    const installedConfig = this._system.readFile(this._getConfigPath())

    return config !== installedConfig
  }

  async _serviceInstalled (): Promise<boolean> {
    const state = await this._serviceManager.getServiceState()
    return state !== SERVICE_STATE.UNKNOWN
  }

  async _tapDriversInstalled (): Promise<boolean> {
    let stdout
    try {
      stdout = await this._system.userExec({ path: this._config.openVPNBin, args: [`--show-adapters`] })
    } catch (e) {
      logger.info('Check for tap drivers failed', e.message)
      return false
    }

    return this._stdoutHasGuid(stdout)
  }

  _stdoutHasGuid (stdout: string): boolean {
    let lines = stdout.split(os.EOL)

    const guidRule = new RegExp(/(\{?([A-Z0-9]{8})-(([A-Z0-9]{4}-){3})[A-Z0-9]{12}\}?)/i)

    lines = lines.filter(line => {
      return guidRule.test(line)
    })

    return lines.length > 0
  }

  async _installTapDrivers () {
    await this._system.userExec({ path: path.join(this._serviceManagerDir, TAP_DRIVER_BIN) })
  }

  _getConfigPath () {
    return path.join(this._serviceManagerDir, SERVICE_MANAGER_CONFIG)
  }

  _getServiceManagerConfigContents () {
    const file = {
      Name: SERVICE_NAME,
      DisplayName: 'Mysterium Client',
      Description: 'Mysterium Client service',
      Directory: this._serviceManagerDir,
      Executable: this._config.clientBin,
      Port: this._config.tequilapiPort,
      Arguments: [
        'daemon',
        `--config-dir=${this._config.configDir}`,
        `--data-dir=${this._config.dataDir}`,
        `--runtime-dir=${this._config.runtimeDir}`,
        `--openvpn.binary=${this._config.openVPNBin}`,
        `--tequilapi.port=${this._config.tequilapiPort}`
      ],
      Logging: {
        Stderr: path.join(this._config.logDir, this._config.stdErrFileName),
        Stdout: path.join(this._config.logDir, this._config.stdOutFileName)
      }
    }

    return JSON.stringify(file)
  }
}

export { SERVICE_MANAGER_BIN, SERVICE_NAME }
export default ServiceManagerInstaller
