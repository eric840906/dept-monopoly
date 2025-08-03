class AudioManager {
  constructor() {
    this.backgroundMusic = null
    this.isEnabled = true
    this.volume = 0.3
    this.isPlaying = false
    this.isLoaded = false
    
    this.init()
  }

  init() {
    this.backgroundMusic = new Audio('/audio/background-music.mp3')
    this.backgroundMusic.loop = true
    this.backgroundMusic.volume = this.volume
    
    this.backgroundMusic.addEventListener('loadeddata', () => {
      this.isLoaded = true
      console.log('Background music loaded successfully')
    })
    
    this.backgroundMusic.addEventListener('error', (e) => {
      console.warn('Background music failed to load:', e)
      this.isLoaded = false
    })
    
    this.backgroundMusic.addEventListener('ended', () => {
      this.isPlaying = false
    })
    
    this.backgroundMusic.addEventListener('play', () => {
      this.isPlaying = true
    })
    
    this.backgroundMusic.addEventListener('pause', () => {
      this.isPlaying = false
    })
  }

  play() {
    if (!this.isEnabled || !this.isLoaded) return
    
    this.backgroundMusic.play().then(() => {
      console.log('Background music started')
    }).catch(err => {
      console.warn('Failed to play background music:', err)
    })
  }

  pause() {
    if (this.backgroundMusic) {
      this.backgroundMusic.pause()
      console.log('Background music paused')
    }
  }

  stop() {
    if (this.backgroundMusic) {
      this.backgroundMusic.pause()
      this.backgroundMusic.currentTime = 0
      console.log('Background music stopped')
    }
  }

  toggle() {
    if (this.isPlaying) {
      this.pause()
    } else {
      this.play()
    }
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume))
    if (this.backgroundMusic) {
      this.backgroundMusic.volume = this.volume
    }
  }

  setEnabled(enabled) {
    this.isEnabled = enabled
    if (!enabled && this.isPlaying) {
      this.pause()
    }
  }

  getState() {
    return {
      isEnabled: this.isEnabled,
      isPlaying: this.isPlaying,
      isLoaded: this.isLoaded,
      volume: this.volume
    }
  }
}