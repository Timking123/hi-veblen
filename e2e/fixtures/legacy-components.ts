import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ContactForm from '../../src/components/common/ContactForm.vue'
import GameContainer from '../../src/components/game/GameContainer.vue'
import { GameEngine } from '../../src/game/GameEngine'
import { useEasterEggStore } from '../../src/stores/easterEgg'

// 测试入口由 Vite 开发服务器加载，不属于生产构建入口。
const pinia = createPinia()
const isGame = new URLSearchParams(location.search).get('component') === 'game'
if (isGame) {
  const originalStart = GameEngine.prototype.start
  let generation = 0
  GameEngine.prototype.start = function () {
    // 仅暴露只读快照，输入、碰撞、更新与绘制仍执行真实代码。
    Object.assign(window, {
      legacyGameGeneration: ++generation,
      legacyGameSnapshot: () => {
        const player = this.getEntities().find(entity => entity.id === 'player')
        return player
          ? { x: player.x, y: player.y, width: player.width, height: player.height }
          : null
      },
    })
    return originalStart.call(this)
  }
  useEasterEggStore(pinia).enterGame()
}
createApp(isGame ? GameContainer : ContactForm)
  .use(pinia)
  .mount('#app')
