import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'Generator',
      component: require('@/components/generator').default
    },
    {
      path: '/about',
      name: 'About',
      component: require('@/components/about').default
    },
    {
      path: '*',
      redirect: '/'
    }
  ]
})
