import { useEffect, useState } from 'react'

import { Asset } from 'expo-asset'
import { TransparentVideoView, useVideoPlayer } from 'expo-transparent-video'
import { Dimensions, StyleSheet, View } from 'react-native'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const VideoPlayer = ({ startUri, loopUri }) => {
  const [source, setSource] = useState(startUri)
  const player = useVideoPlayer(source)

  useEffect(() => {
    if (!player) return
    player.loop = false
    player.play()
  }, [player])

  const handleEnd = () => {
    setSource(loopUri)
    player.replace(loopUri)
    player.loop = true
    player.play()
  }

  return (
    <TransparentVideoView
      style={styles.video}
      player={player}
      videoAspectRatio={1}
      onEnd={handleEnd}
      testID="onboarding-data-local-media"
    />
  )
}

// expo-transparent-video only accepts URIs, not require()'d modules. In
// release builds the bundled mp4 lives inside the APK at file:///android_asset/
// which ExoPlayer's FileDataSource can't read, so we extract it via expo-asset
// to a regular file path before handing it to the player.
export const DataLocalVideo = () => {
  const [uris, setUris] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [start, loop] = await Promise.all([
        Asset.fromModule(
          require('../../../../assets/videos/onboarding_lock_start_android.mp4')
        ).downloadAsync(),
        Asset.fromModule(
          require('../../../../assets/videos/onboarding_lock_loop_android.mp4')
        ).downloadAsync()
      ])
      if (cancelled) return
      setUris({
        start: start.localUri ?? start.uri,
        loop: loop.localUri ?? loop.uri
      })
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!uris) return <View style={styles.video} />
  return <VideoPlayer startUri={uris.start} loopUri={uris.loop} />
}

const styles = StyleSheet.create({
  video: {
    width: SCREEN_WIDTH / 1.4,
    height: SCREEN_WIDTH / 1.4,
    aspectRatio: 1
  }
})
