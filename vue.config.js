const { defineConfig } = require('@vue/cli-service')
const path = require("path");


module.exports = defineConfig({
  // outputDir: path.resolve(__dirname, "./../all-races-website-heroku"),
  transpileDependencies: true
})
