<template>
  <div>
    <section class="card">
      <h2>新建批次</h2>
      <div class="row">
        <input v-model="productName" placeholder="产品名称" />
        <button type="button" @click="onCreate">生成溯源码</button>
      </div>
      <p v-if="lastBatch" class="ok">最新批次号：{{ lastBatch }}</p>
    </section>

    <section class="card">
      <h2>批次列表</h2>
      <button type="button" @click="loadList">刷新</button>
      <ul class="list">
        <li v-for="b in batches" :key="b.batchNo">
          <button type="button" class="link" @click="select(b.batchNo)">
            {{ b.batchNo }} · {{ b.productName }} · 状态 {{ b.status }}
          </button>
        </li>
      </ul>
    </section>

    <section v-if="selected" class="card">
      <h2>环节数据 · {{ selected }}</h2>
      <button type="button" @click="loadData">刷新数据</button>
      <table v-if="rows.length">
        <thead>
          <tr>
            <th>环节</th>
            <th>审核</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id">
            <td>{{ r.processLabel }}</td>
            <td>{{ r.auditStatus }}</td>
            <td>
              <button type="button" v-if="r.auditStatus === 0" @click="doAudit(r.id, true)">通过</button>
              <button type="button" v-if="r.auditStatus === 0" @click="doAudit(r.id, false)">驳回</button>
              <button type="button" @click="showLog(r.id)">日志</button>
            </td>
          </tr>
        </tbody>
      </table>
      <pre v-if="logText" class="log">{{ logText }}</pre>
    </section>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { api } from "../api";

const productName = ref("信阳毛尖");
const lastBatch = ref("");
const batches = ref([]);
const selected = ref("");
const rows = ref([]);
const logText = ref("");

async function onCreate() {
  try {
    const res = await api.createBatch(productName.value);
    lastBatch.value = res.batchNo;
    await loadList();
  } catch (e) {
    alert(e.message);
  }
}

async function loadList() {
  try {
    const res = await api.batchList();
    batches.value = res.list || [];
  } catch (e) {
    alert(e.message);
  }
}

function select(batchNo) {
  selected.value = batchNo;
  loadData();
}

async function loadData() {
  logText.value = "";
  if (!selected.value) return;
  try {
    const res = await api.dataList(selected.value);
    rows.value = res.list || [];
  } catch (e) {
    alert(e.message);
  }
}

async function doAudit(id, pass) {
  try {
    await api.audit(id, pass);
    await loadData();
  } catch (e) {
    alert(e.message);
  }
}

async function showLog(id) {
  try {
    const res = await api.dataLog(id);
    logText.value = JSON.stringify(res.list || [], null, 2);
  } catch (e) {
    alert(e.message);
  }
}

loadList();
</script>

<style scoped>
.card {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 8px rgba(0, 0, 0, 0.06);
}
.row {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.row input {
  flex: 1;
  padding: 8px;
}
.list {
  list-style: none;
  padding: 0;
}
.link {
  background: none;
  border: none;
  color: #1a5fb4;
  cursor: pointer;
  text-align: left;
  padding: 4px 0;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;
}
th,
td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}
.log {
  margin-top: 12px;
  background: #f8f8f8;
  padding: 8px;
  font-size: 12px;
  max-height: 240px;
  overflow: auto;
}
.ok {
  color: #2f8f3a;
}
</style>
