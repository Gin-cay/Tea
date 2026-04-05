<template>
  <div class="card">
    <h2>分配溯源角色</h2>
    <p class="hint">userId 为小程序用户 <code>users.id</code>（可在数据库或扩展接口中查询）。</p>
    <div class="row">
      <input v-model="userId" placeholder="用户 ID" />
      <select v-model.number="roleId">
        <option :value="0" disabled>选择角色</option>
        <option v-for="r in roles" :key="r.id" :value="r.id">
          {{ r.roleName }}
        </option>
      </select>
      <button type="button" @click="onAssign">分配</button>
    </div>
    <button type="button" class="mt" @click="loadRoles">刷新角色列表</button>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { api } from "../api";

const userId = ref("");
const roleId = ref(0);
const roles = ref([]);

async function loadRoles() {
  try {
    const res = await api.roleList();
    roles.value = res.list || [];
    if (!roleId.value && roles.value.length) {
      roleId.value = roles.value[0].id;
    }
  } catch (e) {
    alert(e.message);
  }
}

async function onAssign() {
  if (!userId.value.trim() || !roleId.value) {
    alert("请填写用户 ID 并选择角色");
    return;
  }
  try {
    await api.assignRole(userId.value.trim(), roleId.value);
    alert("已分配");
  } catch (e) {
    alert(e.message);
  }
}

loadRoles();
</script>

<style scoped>
.card {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 8px rgba(0, 0, 0, 0.06);
}
.row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.row input,
.row select {
  padding: 8px;
  min-width: 200px;
}
.hint {
  color: #666;
  font-size: 14px;
}
.mt {
  margin-top: 12px;
}
</style>
