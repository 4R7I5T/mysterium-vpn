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

import { afterEach, beforeEach, describe, expect, it } from '../../../../helpers/dependencies'
import LaunchDaemonInstaller from '../../../../../src/libraries/mysterium-client/launch-daemon/launch-daemon-installer'
import mock from 'mock-fs'
import fs from 'fs'
import SystemMock from '../../../../helpers/system-mock'
import type { System } from '../../../../../src/libraries/mysterium-client/system'
import type { SystemMockManager } from '../../../../helpers/system-mock'

const CLIENT_CONFIG = {
  clientBin: '/client-bin',
  configDir: '/config-dir',
  openVPNBin: 'open-vpn-bin',
  dataDir: '/data-dir',
  runtimeDir: '/runtime-dir',
  logDir: 'log-dir',
  stdOutFileName: 'stdout.log',
  stdErrFileName: 'stderr.log',
  systemLogPath: 'system-log-path',
  tequilapiPort: 4050
}

const TEMPLATE = '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '      <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" ' +
  '"http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n' +
  '      <plist version="1.0">\n' +
  '      <dict>\n' +
  '        <key>Label</key>\n' +
  '          <string>network.mysterium.mysteriumclient</string>\n' +
  '          <key>Program</key>\n' +
  '          <string>/client-bin</string>\n' +
  '          <key>ProgramArguments</key>\n' +
  '          <array>\n' +
  '            <string>/client-bin</string>\n' +
  '            <string>--config-dir</string>\n' +
  '            <string>/config-dir</string>\n' +
  '            <string>--data-dir</string>\n' +
  '            <string>/data-dir</string>\n' +
  '            <string>--runtime-dir</string>\n' +
  '            <string>/runtime-dir</string>\n' +
  '            <string>--openvpn.binary</string>\n' +
  '            <string>open-vpn-bin</string>\n' +
  '            <string>--tequilapi.port</string>\n' +
  '            <string>4050</string>\n' +
  '            <string>--experiment-promise-check=1</string>\n' +
  '            <string>daemon</string>\n' +
  '          </array>\n' +
  '          <key>Sockets</key>\n' +
  '            <dict>\n' +
  '              <key>Listener</key>\n' +
  '              <dict>\n' +
  '                <key>SockType</key>\n' +
  '                <string>stream</string>\n' +
  '                <key>SockServiceName</key>\n' +
  '                <string>4051</string>\n' +
  '              </dict>\n' +
  '            </dict>\n' +
  '          <key>inetdCompatibility</key>\n' +
  '          <dict>\n' +
  '            <key>Wait</key>\n' +
  '            <false/>\n' +
  '          </dict>\n' +
  '          <key>WorkingDirectory</key>\n' +
  '          <string>/runtime-dir</string>\n' +
  '          <key>StandardOutPath</key>\n' +
  '          <string>log-dir/stdout.log</string>\n' +
  '          <key>StandardErrorPath</key>\n' +
  '          <string>log-dir/stderr.log</string>\n' +
  '         </dict>\n' +
  '      </plist>'

describe('LaunchDaemonInstaller', () => {
  let system: System
  let systemMockManager: SystemMockManager
  let installer: LaunchDaemonInstaller

  beforeEach(() => {
    const systemMock = new SystemMock()
    system = (systemMock: System)
    systemMockManager = (systemMock: SystemMockManager)

    installer = new LaunchDaemonInstaller(CLIENT_CONFIG, system)

    mock({
      '/Library/LaunchDaemons': {
        'network.mysterium.mysteriumclient.plist': TEMPLATE
      },
      '/runtime-dir': {
        'network.mysterium.mysteriumclient.plist': mock.file()
      },
      'log-dir': {
        'stdout.log': mock.file()
      }
    })
  })

  afterEach(() => {
    mock.restore()
  })

  describe('.template', () => {
    it('returns valid template generated from client config', async () => {
      const template = installer.template()
      expect(template).to.be.eql(TEMPLATE)
    })
  })

  describe('.needsInstallation', () => {
    it('returns false if process is installed', async () => {
      const result = await installer.needsInstallation()
      expect(result).to.be.false
    })

    it('returns true if wrong process is not installed', async () => {
      mock.restore()
      const result = await installer.needsInstallation()
      expect(result).to.be.true
    })

    it('returns true if wrong process is installed', async () => {
      mock.restore()
      mock({
        '/Library/LaunchDaemons': {
          'network.mysterium.mysteriumclient.plist': 'WRONG_TEMPLATE'
        }
      })
      const result = await installer.needsInstallation()
      expect(result).to.be.true
    })
  })

  describe('.install', () => {
    it('does not throw error when everything is fine', async () => {
      await installer.install()
    })

    it('repairs previously installed daemon', async () => {
      await installer.install()

      expect(systemMockManager.sudoExecCalledCommands).to.have.length(1)
      expect(systemMockManager.sudoExecCalledCommands[0]).to.be.eql(
        'launchctl unload /Library/LaunchDaemons/network.mysterium.mysteriumclient.plist && ' +
        'cp /runtime-dir/network.mysterium.mysteriumclient.plist ' +
          '/Library/LaunchDaemons/network.mysterium.mysteriumclient.plist' +
        ' && launchctl load /Library/LaunchDaemons/network.mysterium.mysteriumclient.plist')
    })

    it('executes right commands to install new daemon', async () => {
      mock.restore()
      mock({
        '/runtime-dir': {
          'network.mysterium.mysteriumclient.plist': mock.file()
        },
        'log-dir': {
          'stdout.log': mock.file()
        }
      })

      await installer.install()

      expect(systemMockManager.sudoExecCalledCommands).to.have.length(1)
      expect(systemMockManager.sudoExecCalledCommands[0]).to.be.eql(
        'cp /runtime-dir/network.mysterium.mysteriumclient.plist ' +
          '/Library/LaunchDaemons/network.mysterium.mysteriumclient.plist' +
        ' && launchctl load /Library/LaunchDaemons/network.mysterium.mysteriumclient.plist')
    })

    it('copies template file', async () => {
      await installer.install()

      const destinationPath = '/runtime-dir/network.mysterium.mysteriumclient.plist'
      const content = fs.readFileSync(destinationPath).toString()
      expect(content).to.be.eql(TEMPLATE)
    })
  })
})
