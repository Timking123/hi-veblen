<template>
  <aside class="museum-map" aria-label="展厅地图">
    <p>MUSEUM MAP</p>
    <RouterLink v-for="room in rooms" :key="room.path" :to="room.path" class="museum-map__room">
      <span>{{ room.code }}</span>{{ room.label }}
    </RouterLink>
  </aside>
</template>

<script setup lang="ts">
const rooms = [
  { code: 'A', label: 'Signal Hall', path: '/' },
  { code: 'B', label: 'Identity', path: '/about' },
  { code: 'C', label: 'Works', path: '/projects' },
  { code: 'D', label: 'Visual Memory', path: '/gallery' },
  { code: 'E', label: 'Legacy Terminal', path: '/os' },
]
</script>
