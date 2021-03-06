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
import Publisher from '../../publisher'
import type { StatusNotifier } from './status-notifier'
import { onFirstEventOrTimeout } from '../../../app/events'
import type { Unsubscribe } from '../../publisher'

const HEALTH_CHECK_INTERVAL = 1500

type StatusCallback = (boolean) => void
type EmptyCallback = () => void

const MYSTERIUM_CLIENT_WAITING_THRESHOLD = 10000

// TODO: ensure that users unsubscribe
class Monitoring {
  _statusPublisher: Publisher<boolean> = new Publisher()
  _upPublisher: Publisher<void> = new Publisher()
  _downPublisher: Publisher<void> = new Publisher()
  _changeUpPublisher: Publisher<void> = new Publisher()
  _changeDownPublisher: Publisher<void> = new Publisher()

  _lastStatus: ?boolean = null

  _process: StatusNotifier

  constructor (process: StatusNotifier) {
    this._process = process
  }

  start (): void {
    this._process.onStatus(status => {
      this._updateStatus(status)
    })
    this._process.start()
  }

  stop (): void {
    this._process.stop()
  }

  /**
   * Triggers once service is up. Triggers instantly if it is already up.
   */
  onStatusUp (callback: EmptyCallback): Unsubscribe {
    if (this._lastStatus) {
      callback()
    }
    return this.onNewStatusUp(callback)
  }

  waitForStatusUpWithTimeout (): Promise<void> {
    return onFirstEventOrTimeout(this.onStatusUp.bind(this), MYSTERIUM_CLIENT_WAITING_THRESHOLD)
  }

  /**
   * Triggers once service is up. Does not trigger instantly if it is already up.
   */
  onNewStatusUp (callback: EmptyCallback): Unsubscribe {
    return this._upPublisher.addSubscriber(callback)
  }

  waitForNewStatusUpWithTimeout (): Promise<void> {
    return onFirstEventOrTimeout(this.onNewStatusUp.bind(this), MYSTERIUM_CLIENT_WAITING_THRESHOLD)
  }

  /**
   * Triggers once service status changes to up.
   */
  onStatusChangeUp (callback: EmptyCallback): Unsubscribe {
    return this._changeUpPublisher.addSubscriber(callback)
  }

  /**
   * Triggers once service is down. Triggers instantly if it is already down.
   */
  onStatusDown (callback: EmptyCallback): Unsubscribe {
    if (this._lastStatus === false) {
      callback()
    }
    return this.onNewStatusDown(callback)
  }

  waitForStatusDownWithTimeout (): Promise<void> {
    return onFirstEventOrTimeout(this.onStatusDown.bind(this), MYSTERIUM_CLIENT_WAITING_THRESHOLD)
  }

  /**
   * Triggers once service is down. Does not trigger instantly if it is already down.
   */
  onNewStatusDown (callback: EmptyCallback): Unsubscribe {
    return this._downPublisher.addSubscriber(callback)
  }

  waitForNewStatusDownWithTimeout (): Promise<void> {
    return onFirstEventOrTimeout(this.onNewStatusDown.bind(this), MYSTERIUM_CLIENT_WAITING_THRESHOLD)
  }

  /**
   * Triggers once service status changes to down.
   */
  onStatusChangeDown (callback: EmptyCallback): Unsubscribe {
    return this._changeDownPublisher.addSubscriber(callback)
  }

  _updateStatus (status: boolean) {
    this._triggerStatus(status)
    this._lastStatus = status
  }

  _triggerStatus (status: boolean) {
    this._statusPublisher.publish(status)

    if (status) {
      this._upPublisher.publish()
    } else {
      this._downPublisher.publish()
    }

    if (status !== this._lastStatus) {
      this._triggerStatusChange(status)
    }
  }

  _triggerStatusChange (newStatus: boolean) {
    if (newStatus) {
      this._triggerStatusChangeUp()
    } else {
      this._triggerStatusChangeDown()
    }
  }

  _triggerStatusChangeUp () {
    this._changeUpPublisher.publish()
  }

  _triggerStatusChangeDown () {
    this._changeDownPublisher.publish()
  }
}

export { HEALTH_CHECK_INTERVAL }
export type { StatusCallback, EmptyCallback }
export default Monitoring
