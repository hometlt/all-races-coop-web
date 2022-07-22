<template>
  <Users />
</template>

<script>
// import Users from './components/TechComponent.vue'
import Users from './components/TechComponent.vue'

export default {
  name: 'App',
  components: {
    Users
  }
}
</script>

<style>

  html, body {
    height: 100%;
    overflow: auto;
  }

  #app {
    background-color: rgba(0,0,0,0.5);
    height: 100%;
    font-family: Avenir, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-align: center;
    color: #fff;
  }

  body{
    background-color: #002650;
    background-image: url(./assets/bg.jpg);

    background-position: center top;
    background-repeat: no-repeat;
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    max-width: 100%;
    font-family: Open Sans,Helvetica,Arial,sans-serif;
    font-size: 16px;
    font-weight: 400;
    line-height: 1.7;
  }

  .col, .col-1, .col-10, .col-11, .col-12, .col-2, .col-3, .col-4, .col-5, .col-6, .col-7, .col-8, .col-9, .col-auto, .col-lg, .col-lg-1, .col-lg-10, .col-lg-11, .col-lg-12, .col-lg-2, .col-lg-3, .col-lg-4, .col-lg-5, .col-lg-6, .col-lg-7, .col-lg-8, .col-lg-9, .col-lg-auto, .col-md, .col-md-1, .col-md-10, .col-md-11, .col-md-12, .col-md-2, .col-md-3, .col-md-4, .col-md-5, .col-md-6, .col-md-7, .col-md-8, .col-md-9, .col-md-auto, .col-sm, .col-sm-1, .col-sm-10, .col-sm-11, .col-sm-12, .col-sm-2, .col-sm-3, .col-sm-4, .col-sm-5, .col-sm-6, .col-sm-7, .col-sm-8, .col-sm-9, .col-sm-auto, .col-xl, .col-xl-1, .col-xl-10, .col-xl-11, .col-xl-12, .col-xl-2, .col-xl-3, .col-xl-4, .col-xl-5, .col-xl-6, .col-xl-7, .col-xl-8, .col-xl-9, .col-xl-auto {
    padding-right: 0;
    padding-left: 0;
  }



  /*
   *  STYLE 1
   */

  *::-webkit-scrollbar-track
  {
    -webkit-box-shadow: inset 0 0 6px rgba(0,0,0,0.3);
    border-radius: 10px;
    background-color: #F5F5F5;
  }

  *::-webkit-scrollbar
  {
    width: 12px;
  }

  *::-webkit-scrollbar-thumb
  {
    border-radius: 10px;
    -webkit-box-shadow: inset 0 0 6px rgba(0,0,0,.3);
    background-color: #555;
  }



</style>
