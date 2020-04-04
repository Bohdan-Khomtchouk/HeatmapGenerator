import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'Dependency',
      component: require('@/components/dependencies').default
    },
    {
      path: '/generate',
      name: 'Generator',
      component: require('@/components/generator').default
    },
    {
      path: '*',
      redirect: '/'
    }
  ]
})
