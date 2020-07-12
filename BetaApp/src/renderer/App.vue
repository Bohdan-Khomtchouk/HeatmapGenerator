<template>
  <div id="app">
    <b-navbar toggleable="lg" type="dark" variant="primary" class="mb-5">
      <b-navbar-brand ><img src="../renderer/assets/IconSmall.png" height="30px" alt="Contact"></b-navbar-brand>
      <b-navbar-toggle target="nav-collapse"></b-navbar-toggle>
      <b-collapse id="nav-collapse" is-nav>
        <b-navbar-nav>
          <b-nav-item to="/" v-bind:class="{ active: this.$route.path === '/'}">Home</b-nav-item>
          <b-nav-item to="/about" v-bind:class="{ active: this.$route.path === '/about'}">About</b-nav-item>
        </b-navbar-nav>
      </b-collapse>
    </b-navbar>
    <transition name="fade" mode="out-in">
      <router-view></router-view>
    </transition>
  </div>
</template>

<script>
  export default {
    name: 'HeatmapGenerator',
    data: function () {
      return {
      }
    }
  }
</script>

<style>
  /* CSS */
</style>
