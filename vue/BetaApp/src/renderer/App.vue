<template>
  <div id="app">
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary mb-5">
      <a class="navbar-brand font-weight-bold" href="#">Heatmap Generator</a>
      <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navbarNav">
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
  export default {
    name: 'HeatmapGenerator'
  }
</script>

<style>
  /* CSS */
</style>
