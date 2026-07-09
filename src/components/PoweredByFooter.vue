<script setup>
defineProps({
  isDarkActive: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <hr class="border-dashed border-neutral-300 dark:border-neutral-800">
  <div class="flex flex-col items-center justify-center gap-1">
    <a
      href="https://www.valiantfinance.com/"
      target="_blank"
      rel="noopener noreferrer"
      class="group flex flex-col items-center gap-1"
    >
      <span class="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 transition-colors group-hover:text-neutral-600 dark:text-neutral-500 dark:group-hover:text-neutral-300">
        Powered by
      </span>
      <img
        :src="isDarkActive
          ? 'https://cdn.prod.website-files.com/673a45999b5a833529515830/69015e6c8ec38017de4c9616_Logo%20-%20Light.svg'
          : 'https://cdn.prod.website-files.com/673a45999b5a833529515830/673c1d91f74c14275f7e8aa1_Valiant-LOGO-RGB-blk.svg'"
        alt="Valiant Finance"
        class="h-7 opacity-75 transition-opacity group-hover:opacity-100"
      >
    </a>
  </div>
</template>
