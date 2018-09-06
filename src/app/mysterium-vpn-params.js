/*
 * Copyright (C) 2018 The "mysteriumnetwork/mysterium-vpn" Authors.
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
import { BrowserWindow } from 'electron'
import type { Installer, Process } from '../libraries/mysterium-client'
import TequilapiRegistrationFetcher from './data-fetchers/tequilapi-registration-fetcher'
import type { EnvironmentCollector } from './bug-reporting/environment/environment-collector'
import ProcessMonitoring from '../libraries/mysterium-client/monitoring'
import { UserSettingsStore } from './user-settings/user-settings-store'
import MainMessageBusCommunication from './communication/main-message-bus-communication'
import MainBufferedIpc from './communication/ipc/main-buffered-ipc'
import Terms from './terms'
import LogCache from './logging/log-cache'
import TequilapiProposalFetcher from './data-fetchers/tequilapi-proposal-fetcher'
import CountryList from './data-fetchers/country-list'
import type { MysteriumVpnConfig } from './mysterium-vpn-config'
import Window from './window'
import SyncCallbacksInitializer from './sync-callbacks-initializer'
import { BugReporterMetrics } from './bug-reporting/bug-reporter-metrics'
import FeatureToggle from './features/feature-toggle'
import type { BugReporter } from './bug-reporting/interface'
import Notification from './notification'
import StartupEventTracker from './statistics/startup-event-tracker'
import type { StringLogger } from './logging/string-logger'

export type MysteriumVpnParams = {
  browserWindowFactory: () => BrowserWindow,
  windowFactory: () => Window,
  config: MysteriumVpnConfig,
  terms: Terms,
  installer: Installer,
  monitoring: ProcessMonitoring,
  process: Process,
  proposalFetcher: TequilapiProposalFetcher,
  registrationFetcher: TequilapiRegistrationFetcher,
  countryList: CountryList,
  bugReporter: BugReporter,
  environmentCollector: EnvironmentCollector,
  bugReporterMetrics: BugReporterMetrics,
  logger: StringLogger,
  frontendLogCache: LogCache,
  mysteriumProcessLogCache: LogCache,
  userSettingsStore: UserSettingsStore,
  disconnectNotification: Notification,
  featureToggle: FeatureToggle,
  startupEventTracker: StartupEventTracker,
  mainIpc: MainBufferedIpc,
  mainCommunication: MainMessageBusCommunication,
  syncCallbacksInitializer: SyncCallbacksInitializer
}
