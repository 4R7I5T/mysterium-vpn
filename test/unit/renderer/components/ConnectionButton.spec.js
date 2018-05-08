import Vue from 'vue'
import Vuex from 'vuex'
import ConnectionButton from '../../../../src/renderer/components/ConnectionButton'
import type from '../../../../src/renderer/store/types'
import ConnectionStatusEnum from '../../../../src/libraries/mysterium-tequilapi/dto/connection-status-enum'
import {state, mutations, getters} from '@/store/modules/connection'

const mountWithStore = function () {
  const store = new Vuex.Store({
    modules: {
      identity: {
        state: {
          current: {
            id: '0x1'
          }
        },
        getters: {
          currentIdentity (state) {
            return state.current.id
          }
        }
      },
      connection: {
        state,
        mutations,
        getters,
        actions: {
          [type.CONNECT] ({dispatch, commit}) {
            commit(type.SET_CONNECTION_STATUS, ConnectionStatusEnum.CONNECTED)
          },
          [type.DISCONNECT] ({dispatch, commit}) {
            commit(type.SET_CONNECTION_STATUS, ConnectionStatusEnum.NOT_CONNECTED)
          }
        }
      }
    }
  })

  const Constructor = Vue.extend(ConnectionButton)
  const vm = new Constructor({store,
    propsData: {
      providerId: 'dummy'
    }
  })

  return vm.$mount()
}

describe('ConnectionButton', () => {
  it('renders button text based on state', async () => {
    let rules = [
      ['NotConnected', 'Connect'],
      ['Connected', 'Disconnect'],
      ['Connecting', 'Cancel'],
      ['Disconnecting', 'Disconnecting']
    ]
    const vm = mountWithStore()
    for (let index in rules) {
      vm.$store.commit(type.SET_CONNECTION_STATUS, rules[index][0])
      vm._watcher.run()
      expect(vm.$el.textContent).to.eql(rules[index][1])
    }
    // reset store
    vm.$store.commit(type.SET_CONNECTION_STATUS, ConnectionStatusEnum.NOT_CONNECTED)
  })

  it('clicks change state', () => {
    const vm = mountWithStore()

    const clickEvent = new window.Event('click')
    const button = vm.$el.querySelector('.control__action')
    button.dispatchEvent(clickEvent)
    vm._watcher.run()
    expect(vm.$store.state.connection.status).to.equal('Connected')
    expect(vm.$el.textContent).to.eql('Disconnect')

    // handle disconnect
    button.dispatchEvent(clickEvent)
    vm._watcher.run()
    expect(vm.$el.textContent).to.eql('Connect')
  })
})
