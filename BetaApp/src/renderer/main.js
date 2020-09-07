import Vue from 'vue'
import {BootstrapVue, BootstrapVueIcons} from 'bootstrap-vue/dist/bootstrap-vue.esm'
import axios from 'axios'

import App from './App'
import router from './router'
import store from './store'

// Import the styles directly. (Or you could add them via script tags.)
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'

if (!process.env.IS_WEB) Vue.use(require('vue-electron'))
Vue.http = Vue.prototype.$http = axios
Vue.config.productionTip = false

/* eslint-disable no-new */
Vue.use(BootstrapVue)
Vue.use(BootstrapVueIcons)

new Vue({
  components: { App },
  router,
  store,
  template: '<App/>'
}).$mount('#app')
