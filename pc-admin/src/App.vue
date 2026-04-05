<template>
  <div class="layout">
    <header class="head">
      <h1>茶叶溯源管理</h1>
      <nav>
        <router-link to="/">批次与审核</router-link>
        <router-link to="/roles">角色分配</router-link>
      </nav>
      <div class="token-row">
        <input v-model="tokenInput" type="password" placeholder="X-Admin-Token" />
        <button type="button" @click="saveToken">保存令牌</button>
      </div>
    </header>
    <main class="main">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { getAdminToken, setAdminToken } from "./api";

const tokenInput = ref("");

onMounted(() => {
  tokenInput.value = getAdminToken();
});

function saveToken() {
  setAdminToken(tokenInput.value.trim());
  alert("已保存");
}
</script>

<style>
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #f4f6f1;
  color: #222;
}
.layout {
  max-width: 1100px;
  margin: 0 auto;
  padding: 16px;
}
.head h1 {
  margin: 0 0 8px;
  font-size: 1.25rem;
}
.head nav a {
  margin-right: 16px;
  color: #2f8f3a;
}
.token-row {
  margin-top: 12px;
  display: flex;
  gap: 8px;
}
.token-row input {
  flex: 1;
  padding: 8px;
}
.main {
  margin-top: 24px;
}
</style>
