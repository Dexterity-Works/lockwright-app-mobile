import { useEffect } from 'react'

import { useVideoPlayer, VideoView } from 'expo-video'
import { Dimensions, StyleSheet } from 'react-native'

const loopSource = require('../../../../assets/videos/onboarding_lock_loop_ios.mov')
const startSource = require('../../../../assets/videos/onboarding_lock_start_ios.mov')

const { width: SCREEN_WIDTH } = Dimensions.get('window')

export const DataLocalVideo = () => {
  const player = useVideoPlayer(startSource, (player) => {
    player.loop = false
    player.play()
  })

  useEffect(() => {
    if (!player) return

    let switchingToLoop = false

    const endSub = player.addListener('playToEnd', async () => {
      switchingToLoop = true
      player.loop = true
      await player.replaceAsync(loopSource)
    })

    const statusSub = player.addListener('statusChange', ({ status }) => {
      if (switchingToLoop && status === 'readyToPlay') {
        switchingToLoop = false
        player.play()
      }
    })

    return () => {
      endSub.remove()
      statusSub.remove()
    }
  }, [player])

  return (
    <VideoView
      style={styles.video}
      player={player}
      allowsFullscreen={false}
      allowsPictureInPicture={false}
      nativeControls={false}
      testID="onboarding-data-local-media"
    />
  )
}

const styles = StyleSheet.create({
  video: {
    width: SCREEN_WIDTH / 1.4,
    height: SCREEN_WIDTH / 1.4,
    aspectRatio: 1
  }
})
