# Ax Vue Loader

_Simple webpack loader for `*.vue` files_

This loader compile a Vue file with `<script>` and `<template>` tags.
It allowed for a lighter configuration of the Vue environement and, for me, resolve some configuration nightmare.:

Config exemple:

```
{ 
  module: {
    rules: [
      { test: /\.vue/, use: [ 
        { loader: 'ax-vue-loader', options: {
          jshint: {
            undef: true, esversion: 11,
            predef: { axios:true }
          }
        }}
      ]}
    
    ]
  }     
}
```


