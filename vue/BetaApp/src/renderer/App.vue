<template>
  <div id="app">
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary mb-5">
      <a class="navbar-brand" href="#"><img src="../renderer/assets/IconSmall.png" height="30px" alt=""></a>
      <div class="navbar-header">
        <ul class="navbar-nav">
          <li class="nav-item" v-bind:class="{ active: this.$route.path === '/generate'}">
            <router-link to="/generate" class="nav-link">Home</router-link>
          </li>
          <li class="nav-item" v-bind:class="{ active: this.$route.path === '/'}">
            <router-link to="/" class="nav-link">Dependencies</router-link>
          </li>
          <li class="nav-item" v-bind:class="{ active: this.$route.path === '/about'}">
            <a class="nav-link" href="#">About</a>
          </li>
        </ul>
      </div>
    </nav>
    <transition name="fade" mode="out-in">
      <router-view></router-view>
    </transition>
  </div>
</template>

<script>
  import OSManager from './OSManager.js'
  export default {
    name: 'HeatmapGenerator',
    data: function () {
      return {
        systemManager: null
      }
    },
    created: function () {
      this.systemManager = new OSManager()
    }
  }
</script>

<style>
  /* CSS */
</style>
