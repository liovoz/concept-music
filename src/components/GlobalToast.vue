// ====================
// 文件：src/components/GlobalToast.vue
// ====================
<template>
  <Teleport to="body">
    <div
      class="fixed left-1/2 -translate-x-1/2 w-full px-4 flex flex-col items-center pointer-events-none select-none no-drag"
      :style="{
        bottom: 'var(--toast-bottom-offset)',
        maxWidth: 'var(--toast-max-width)',
        zIndex: 'var(--toast-z-index)'
      }"
    >
      <TransitionGroup
        name="toast-stack"
        tag="div"
        class="relative flex flex-col items-center w-full"
        :style="{ gap: 'var(--toast-stack-gap)' }"
      >
        <div
          v-for="item in displayToasts"
          :key="item.id"
          :role="item.type === 'error' ? 'alert' : 'status'"
          aria-live="polite"
          @mouseenter="onMouseEnter(item)"
          @mouseleave="onMouseLeave(item)"
          class="global-toast-container cm-toast-surface pointer-events-auto flex items-center w-fit max-w-full"
          :class="hasControls(item) ? 'pl-4 pr-1 py-1' : 'px-4 py-2'"
        >
          <AppIcon
            :name="getIconName(item.type)"
            :stroke-width="1.75"
            class="w-4 h-4 shrink-0 mr-2"
            :style="{ color: getIconColor(item.type) }"
          />

          <span
            class="min-w-0 line-clamp-2 break-words type-meta-base font-medium"
            :class="{ 'py-1': hasControls(item) }"
          >{{ item.message }}</span>

          <div
            v-if="hasControls(item)"
            class="flex items-center gap-1 ml-3 shrink-0"
          >
            <button
              v-if="item.actionText"
              type="button"
              @click.stop="store.triggerToastAction(item.id)"
              class="cm-toast-action-btn h-8 px-3 type-meta-micro font-medium shrink-0 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 active:scale-[0.98]"
            >
              {{ item.actionText }}
            </button>

            <button
              v-if="item.closable || item.persistent"
              type="button"
              aria-label="关闭提示"
              @click.stop="handleClose(item)"
              class="cm-toast-close-btn w-8 h-8 flex items-center justify-center shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 active:scale-[0.98]"
            >
              <AppIcon name="close" :stroke-width="1.75" class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue';
import { usePlayerStore } from '../store/playerStore';

const store = usePlayerStore();

const displayToasts = computed(() => {
  const ephemeral = Array.isArray(store.toastList) ? store.toastList : [];
  if (store.isError && store.errorMessage) {
    const playbackError = {
      id: '__playback_error__',
      key: '__playback_error__',
      message: store.errorMessage,
      type: 'error',
      actionText: '',
      closable: true,
      persistent: true,
      duration: 0,
      isPlaybackError: true
    };
    return [...ephemeral.slice(-2), playbackError];
  }
  return ephemeral.slice(-3);
});

const hasControls = (item) => Boolean(item?.actionText || item?.closable || item?.persistent);

const getIconName = (type) => {
  if (type === 'success') return 'check';
  if (type === 'warning') return 'warning';
  if (type === 'error') return 'danger';
  return 'info';
};

const getIconColor = (type) => {
  if (type === 'success') return 'var(--toast-icon-success)';
  if (type === 'warning') return 'var(--toast-icon-warning)';
  if (type === 'error') return 'var(--toast-icon-error)';
  return 'var(--toast-icon-info)';
};

const handleClose = (item) => {
  if (item?.isPlaybackError) {
    store.clearError();
    return;
  }
  store.dismissToast(item.id);
};

const onMouseEnter = (item) => {
  if (!item || item.isPlaybackError || item.persistent) return;
  store.pauseToastTimer(item.id);
};

const onMouseLeave = (item) => {
  if (!item || item.isPlaybackError || item.persistent) return;
  store.resumeToastTimer(item.id);
};
</script>

<style scoped>
.cm-toast-surface {
  transition: background-color 150ms var(--toast-ease),
              border-color 150ms var(--toast-ease),
              color 150ms var(--toast-ease);
}

.cm-toast-action-btn {
  border-radius: var(--toast-control-radius);
  background-color: var(--toast-action-bg);
  border: 1px solid var(--toast-action-border);
  color: var(--toast-action-text);
  transition: background-color 150ms var(--toast-ease),
              border-color 150ms var(--toast-ease),
              color 150ms var(--toast-ease),
              transform 120ms var(--toast-ease);
}

.cm-toast-action-btn:hover {
  background-color: var(--toast-action-bg-hover);
}

.cm-toast-close-btn {
  border-radius: var(--toast-control-radius);
  color: var(--toast-text-muted);
  transition: background-color 150ms var(--toast-ease),
              color 150ms var(--toast-ease),
              transform 120ms var(--toast-ease);
}

.cm-toast-close-btn:hover {
  background-color: var(--toast-close-hover-bg);
  color: var(--toast-text);
}

.toast-stack-enter-active {
  transition: opacity var(--toast-enter-duration) var(--toast-ease),
              transform var(--toast-enter-duration) var(--toast-ease);
}

.toast-stack-leave-active {
  pointer-events: none;
  transition: opacity var(--toast-leave-duration) var(--toast-ease),
              transform var(--toast-leave-duration) var(--toast-ease);
}

.toast-stack-move {
  transition: transform var(--toast-move-duration) var(--toast-ease);
}

.toast-stack-enter-from {
  opacity: 0;
  transform: translateY(var(--toast-rise-distance)) scale(0.98);
}

.toast-stack-leave-to {
  opacity: 0;
  transform: translateY(4px) scale(0.98);
}
</style>
