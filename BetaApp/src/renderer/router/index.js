import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '',
      component: require('@/views/landingPage').default
    },
    {
      path: '/new',
      name: 'New Heatmap',
      component: require('@/views/newHeatmap').default
    },
    {
      path: '/existing',
      name: 'Existing Heatmap',
      component: require('@/views/existingHeatmap').default
    },
    {
      path: '/info',
      name: 'Info/About Us',
      component: require('@/views/infoPage').default
    },
    {
      path: '/data',
      name: 'Data Editor',
      component: require('@/views/dataEditor').default
    },
    {
      path: '/compute',
      name: 'Computational Settings',
      component: require('@/views/compute').default
    },
    {
      path: '/visualizer',
      name: 'Visualizer',
      component: require('@/views/visualizer').default
    },
    {
      path: '*',
      redirect: '/'
    }
  ]
})
