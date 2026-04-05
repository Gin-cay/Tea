import { createApp } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import App from "./App.vue";
import Batches from "./views/Batches.vue";
import Roles from "./views/Roles.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: Batches },
    { path: "/roles", component: Roles }
  ]
});

createApp(App).use(router).mount("#app");
