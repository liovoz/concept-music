<template>
  <div class="relative select-none flex items-center justify-center" :class="containerSizeClass">
    
    <!-- 唱盘主体基座与唱片 (Vinyl Platter & Disc) -->
    <div class="relative w-full h-full flex items-center justify-center">
      
      <!-- 外层黑胶阴影与底座金属微边缘 -->
      <div 
        class="w-full h-full rounded-full flex items-center justify-center relative transition-transform duration-300"
        :class="[
          'shadow-[0_25px_65px_rgba(0,0,0,0.65)] dark:shadow-[0_30px_80px_rgba(0,0,0,0.85)]',
          'border-[3px] border-slate-700/30 dark:border-white/10'
        ]"
      >
        <!-- 旋转层：黑胶盘身纹理与唱片封面 (Rotating layer with fine micro-grooves) -->
        <div 
          class="w-full h-full rounded-full flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-[#121316] via-[#090a0c] to-[#16171b]"
          :style="{ transform: `rotate(${discRotation}deg)` }"
        >
          <!-- 超清同心圆密纹沟槽 (Concentric micro-grooves) -->
          <div 
            class="absolute inset-0 rounded-full pointer-events-none opacity-60" 
            style="background: repeating-radial-gradient(circle at center, #090a0c 0px, #16181e 1px, #090a0c 2px, #1c1f26 3.5px);"
          ></div>

          <!-- 黑胶外圈保护边缘线 (Outer vinyl rim ring) -->
          <div class="absolute inset-[3px] rounded-full border border-white/5 pointer-events-none"></div>
          <div class="absolute inset-[10px] rounded-full border border-white/[0.03] pointer-events-none"></div>

          <!-- 中心唱片贴纸区 (Center album label) -->
          <div class="w-[62%] h-[62%] rounded-full relative overflow-hidden shadow-[0_0_25px_rgba(0,0,0,0.95)] border-[3px] border-[#121316] flex items-center justify-center z-10 bg-slate-900">
            <img 
              :src="cover || defaultImg" 
              :alt="name || '唱片封面'" 
              class="w-full h-full object-cover select-none pointer-events-none" 
            />
            <!-- 唱片纸标内圈阴影与保护环 -->
            <div class="absolute inset-0 rounded-full shadow-inner pointer-events-none border border-black/40"></div>
          </div>
        </div>

        <!-- 静态双向平滑光泽层 (Stationary continuous bilateral specular sheen) -->
        <!-- 解决黑白不均匀/扇形切口问题：采用0~360度完全连续、对称且平滑衰减的双峰高光，不随唱片旋转，符合真实物理环境光 -->
        <div 
          class="absolute inset-0 rounded-full pointer-events-none mix-blend-screen opacity-55 z-20"
          style="background: conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0.03) 20deg, rgba(255,255,255,0.12) 45deg, rgba(255,255,255,0.03) 70deg, transparent 90deg, transparent 180deg, rgba(255,255,255,0.03) 200deg, rgba(255,255,255,0.12) 225deg, rgba(255,255,255,0.03) 250deg, transparent 270deg, transparent 360deg);"
        ></div>
        
        <!-- 玻璃质感圆弧边缘微光 -->
        <div class="absolute inset-0 rounded-full border border-white/10 pointer-events-none z-20"></div>
      </div>
    </div>

    <!-- 拟物 Hi-Fi 唱针 / 唱臂矢量结构 (Audiophile Precision Vector Tonearm) -->
    <div 
      v-if="showTonearm"
      class="tonearm-wrapper absolute pointer-events-none z-30"
      :class="tonearmPositionClass"
    >
      <svg 
        class="tonearm-svg transition-transform ease-out"
        :style="{ 
          transform: isPlaying ? 'rotate(22deg)' : 'rotate(-5deg)',
          transitionDuration: '750ms',
          transitionTimingFunction: 'cubic-bezier(0.34, 1.25, 0.64, 1)'
        }"
        viewBox="0 0 120 260" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <!-- 唱针投影 -->
          <filter id="tonearm-shadow" x="-30%" y="-20%" width="180%" height="160%" filterUnits="userSpaceOnUse">
            <feDropShadow dx="8" dy="12" stdDeviation="8" flood-color="#000000" flood-opacity="0.6" />
          </filter>

          <!-- 金属基座渐变 -->
          <radialGradient id="gimbal-base" cx="42" cy="42" r="30" fx="36" fy="34" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#94a3b8" />
            <stop offset="45%" stop-color="#475569" />
            <stop offset="85%" stop-color="#1e293b" />
            <stop offset="100%" stop-color="#0f172a" />
          </radialGradient>

          <!-- 轴承内芯金属渐变 -->
          <linearGradient id="gimbal-inner" x1="28" y1="28" x2="56" y2="56" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#f8fafc" />
            <stop offset="30%" stop-color="#cbd5e1" />
            <stop offset="70%" stop-color="#64748b" />
            <stop offset="100%" stop-color="#334155" />
          </linearGradient>

          <!-- 配重舵金属质感 -->
          <linearGradient id="counterweight-grad" x1="22" y1="6" x2="62" y2="24" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#f1f5f9" />
            <stop offset="25%" stop-color="#94a3b8" />
            <stop offset="60%" stop-color="#475569" />
            <stop offset="85%" stop-color="#cbd5e1" />
            <stop offset="100%" stop-color="#334155" />
          </linearGradient>

          <!-- 唱臂金属杆拉丝光泽 -->
          <linearGradient id="arm-tube-grad" x1="20" y1="40" x2="60" y2="240" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#f8fafc" />
            <stop offset="20%" stop-color="#cbd5e1" />
            <stop offset="50%" stop-color="#64748b" />
            <stop offset="75%" stop-color="#e2e8f0" />
            <stop offset="100%" stop-color="#475569" />
          </linearGradient>

          <!-- 唱头盒黑钛金属渐变 -->
          <linearGradient id="cartridge-grad" x1="16" y1="230" x2="36" y2="260" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#334155" />
            <stop offset="50%" stop-color="#0f172a" />
            <stop offset="100%" stop-color="#020617" />
          </linearGradient>
        </defs>

        <g filter="url(#tonearm-shadow)">
          <!-- 1. 后置配重舵组件 (Counterweight) -->
          <rect x="38" y="4" width="8" height="22" rx="2" fill="#64748b" stroke="#334155" stroke-width="0.5" />
          <rect x="26" y="8" width="32" height="18" rx="4" fill="url(#counterweight-grad)" stroke="#1e293b" stroke-width="1" />
          <!-- 配重刻度环与滚花条纹 -->
          <line x1="32" y1="8" x2="32" y2="26" stroke="#0f172a" stroke-width="1.2" />
          <line x1="37" y1="8" x2="37" y2="26" stroke="#0f172a" stroke-width="0.8" />
          <line x1="50" y1="8" x2="50" y2="26" stroke="#0f172a" stroke-width="1.2" />
          <circle cx="42" cy="17" r="1.5" fill="#ef4444" />

          <!-- 2. S型/J型高保真唱臂金属杆 (Curved Audiophile Tonearm Wand) -->
          <!-- 优雅流畅的曲度，从轴承中心(42, 42)延伸至唱头(34, 235) -->
          <path 
            d="M 42 42 Q 44 95, 54 140 Q 62 185, 48 215 L 34 235" 
            fill="none" 
            stroke="url(#arm-tube-grad)" 
            stroke-width="7" 
            stroke-linecap="round" 
            stroke-linejoin="round"
          />
          <!-- 臂管金属高光细线 -->
          <path 
            d="M 41.5 42 Q 43.5 95, 53.5 140 Q 61.5 185, 47.5 215 L 33.5 235" 
            fill="none" 
            stroke="#ffffff" 
            stroke-width="1.5" 
            stroke-linecap="round"
            opacity="0.75"
          />

          <!-- 3. 唱臂连接锁紧套环 (Headshell Connector Collar) -->
          <circle cx="34" cy="235" r="5.5" fill="url(#gimbal-inner)" stroke="#1e293b" stroke-width="1" />

          <!-- 4. 专业唱头壳与拾音盒 (Audiophile Cartridge & Headshell) -->
          <!-- 唱头壳主体 (Headshell body) -->
          <path 
            d="M 24 236 L 44 236 L 38 258 L 18 258 Z" 
            fill="url(#cartridge-grad)" 
            stroke="#475569" 
            stroke-width="1" 
          />
          <!-- 唱头壳手柄/提手 (Finger Lift Hook) -->
          <path 
            d="M 43 238 C 50 238, 54 234, 55 227" 
            fill="none" 
            stroke="url(#arm-tube-grad)" 
            stroke-width="2.5" 
            stroke-linecap="round" 
          />
          <!-- 唱头 Ortofon 经典红色铭牌饰条 (Ruby/Red Brand Accent) -->
          <rect x="20" y="247" width="16" height="2.5" rx="1" fill="#ef4444" />
          <!-- 唱针尖端护壳与针尖 (Stylus cantilever & needle point) -->
          <polygon points="26,258 30,258 28,264" fill="#f8fafc" />
          <circle cx="28" cy="264" r="1.5" fill="#ef4444" />

          <!-- 5. 唱臂基座万向轴承 (Gimbal Pivot Base Assembly) -->
          <!-- 处于最上层遮盖臂管根部，确保旋转中心完全吻合 -->
          <circle cx="42" cy="42" r="28" fill="url(#gimbal-base)" stroke="#0f172a" stroke-width="1.5" />
          <circle cx="42" cy="42" r="22" fill="url(#gimbal-inner)" stroke="#334155" stroke-width="1" />
          <circle cx="42" cy="42" r="13" fill="url(#gimbal-base)" />
          <circle cx="42" cy="42" r="6" fill="#0f172a" stroke="#cbd5e1" stroke-width="1.2" />
          <circle cx="42" cy="42" r="2" fill="#ef4444" />

          <!-- 唱臂升降控制杆 (Cueing Lever) -->
          <rect x="65" y="38" width="12" height="4" rx="2" fill="url(#counterweight-grad)" stroke="#1e293b" stroke-width="0.5" />
          <circle cx="76" cy="40" r="2.5" fill="#0f172a" />
        </g>
      </svg>
    </div>

  </div>
</template>

<script setup>
import { computed } from 'vue';

const defaultImg = 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=300&q=80';

const props = defineProps({
  cover: {
    type: String,
    default: ''
  },
  name: {
    type: String,
    default: '唱片'
  },
  isPlaying: {
    type: Boolean,
    default: false
  },
  discRotation: {
    type: Number,
    default: 0
  },
  size: {
    type: String,
    default: 'normal' // 'normal' | 'immersive' | 'small'
  },
  showTonearm: {
    type: Boolean,
    default: true
  }
});

const containerSizeClass = computed(() => {
  if (props.size === 'immersive') {
    return 'w-[360px] h-[360px] xl:w-[460px] xl:h-[460px] 2xl:w-[500px] 2xl:h-[500px]';
  }
  if (props.size === 'small') {
    return 'w-[260px] h-[260px]';
  }
  // normal size
  return 'w-[320px] h-[320px] xl:w-[400px] xl:h-[400px]';
});

const tonearmPositionClass = computed(() => {
  if (props.size === 'immersive') {
    return '-top-14 -right-10 w-44 xl:w-52 2xl:w-56 h-auto';
  }
  // normal
  return '-top-12 -right-8 w-36 xl:w-44 h-auto';
});
</script>

<style scoped>
.tonearm-svg {
  width: 100%;
  height: 100%;
  /* 轴承基座中心位于 SVG 坐标 (42, 42)，精确计算百分比 pivot 点 (42/120 = 35%, 42/260 = 16.15%) */
  transform-origin: 35% 16.15%;
  filter: drop-shadow(0 15px 25px rgba(0, 0, 0, 0.45));
}
</style>
