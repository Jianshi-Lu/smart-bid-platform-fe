<template>
  <div class="app">
    <nav class="app-nav">
      <router-link to="/list">公告列表</router-link>
      <router-link to="/create">创建公告</router-link>
    </nav>
    <main class="app-main">
      <router-view />
    </main>
  </div>
</template>
