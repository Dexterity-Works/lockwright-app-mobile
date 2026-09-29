import { useEffect } from 'react'

import { useLingui } from '@lingui/react/macro'
import { useTheme } from 'lockwright-lib-ui-react-native-components'
import { StyleSheet, View } from 'react-native'
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming
} from 'react-native-reanimated'
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop
} from 'react-native-svg'

const AnimatedRect = Animated.createAnimatedComponent(Rect)

// Port of desktop's VaultUnlockAnimation: same art in a 260 x 260 viewBox and
// the same 6 s loop. The door swings in 3D, which SVG transforms cannot do, so
// each moving part is its own layer.
const VIEW_BOX = '0 0 260 260'
const LOOP_MS = 6000
const PERSPECTIVE = 360 / 260
const HINGE = `${(36 / 260) * 100}% 50%`
const BOLT_Y = 42
const BOLTS = [0, 45, 90, 135, 180, 225, 270, 315]
// Brass highlight and shadow have no theme token.
const BRASS_LIGHT = '#e6c98a'
const BRASS_DARK = '#8a6a38'

// Keyframes as [progress, value]; each segment eases in and out like CSS.
const WHEEL = [
  [0, 0],
  [0.06, 0],
  [0.22, 270],
  [0.78, 270],
  [0.94, 0],
  [1, 0]
]
const BOLT = [
  [0, 0],
  [0.2, 0],
  [0.32, 14],
  [0.78, 14],
  [0.9, 0],
  [1, 0]
]
const DOOR = [
  [0, 0],
  [0.32, 0],
  [0.5, -86],
  [0.78, -86],
  [0.94, 0],
  [1, 0]
]
const GLOW = [
  [0, 0.2],
  [0.32, 0.2],
  [0.5, 0.7],
  [0.78, 0.7],
  [0.94, 0.2],
  [1, 0.2]
]
// Reduced motion holds the open vault.
const OPEN = 0.6
const OPEN_GLOW = 0.5

const ease = Easing.bezierFn(0.42, 0, 0.58, 1)

const at = (frames, progress) => {
  'worklet'
  for (let i = 1; i < frames.length; i++) {
    const [t1, v1] = frames[i]
    if (progress <= t1) {
      const [t0, v0] = frames[i - 1]
      return v0 + (v1 - v0) * ease((progress - t0) / (t1 - t0))
    }
  }
  return frames[frames.length - 1][1]
}

const Layer = ({ children }) => (
  <Svg viewBox={VIEW_BOX} width="100%" height="100%">
    {children}
  </Svg>
)

/**
 * @param {{ size: number }} props
 */
export const VaultUnlockAnimation = ({ size }) => {
  const { t } = useLingui()
  const { theme } = useTheme()
  const c = theme.colors
  const reduceMotion = useReducedMotion()
  const progress = useSharedValue(OPEN)

  useEffect(() => {
    if (reduceMotion) {
      progress.value = OPEN
      return
    }
    progress.value = 0
    progress.value = withRepeat(
      withTiming(1, { duration: LOOP_MS, easing: Easing.linear }),
      -1
    )
    return () => cancelAnimation(progress)
  }, [progress, reduceMotion])

  const glowStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion ? OPEN_GLOW : at(GLOW, progress.value)
  }))

  const doorStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: PERSPECTIVE * size },
      { rotateY: `${at(DOOR, progress.value)}deg` }
    ]
  }))

  const wheelStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${at(WHEEL, progress.value)}deg` }]
  }))

  const boltProps = useAnimatedProps(() => ({
    y: BOLT_Y + at(BOLT, progress.value)
  }))

  return (
    <View
      testID="vault-unlock-animation"
      accessible
      accessibilityRole="image"
      accessibilityLabel={t`Lockwright vault unlocking`}
      style={[styles.stage, { width: size, height: size }]}
    >
      <View style={StyleSheet.absoluteFill}>
        <Layer>
          <Circle cx="130" cy="130" r="118" fill={c.colorBackground} />
          <Circle
            cx="130"
            cy="130"
            r="108"
            fill="none"
            stroke={c.colorPrimary}
            strokeWidth="6"
          />
          <Circle
            cx="130"
            cy="130"
            r="100"
            fill="none"
            stroke={c.colorBorderPrimary}
            strokeWidth="2"
          />
        </Layer>
      </View>

      <Animated.View style={[StyleSheet.absoluteFill, glowStyle]}>
        <Layer>
          <Defs>
            <RadialGradient id="vault-void" cx="50%" cy="45%" r="60%">
              <Stop
                offset="0%"
                stopColor={c.colorSecondary}
                stopOpacity="0.55"
              />
              <Stop offset="55%" stopColor={c.colorBackground} />
              <Stop offset="100%" stopColor={c.colorBackground} />
            </RadialGradient>
          </Defs>
          <Ellipse cx="130" cy="130" rx="72" ry="72" fill="url(#vault-void)" />
        </Layer>
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, styles.door, doorStyle]}>
        <Layer>
          <Defs>
            <LinearGradient id="vault-brass" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={BRASS_LIGHT} />
              <Stop offset="45%" stopColor={c.colorSecondary} />
              <Stop offset="100%" stopColor={BRASS_DARK} />
            </LinearGradient>
            <LinearGradient id="vault-iron" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor={c.colorBorderPrimary} />
              <Stop offset="100%" stopColor={c.colorSurfacePrimary} />
            </LinearGradient>
          </Defs>
          <Circle cx="130" cy="130" r="94" fill="url(#vault-iron)" />
          <Circle
            cx="130"
            cy="130"
            r="94"
            fill="none"
            stroke={c.colorPrimary}
            strokeWidth="3"
          />
          <Circle
            cx="130"
            cy="130"
            r="78"
            fill="none"
            stroke={BRASS_DARK}
            strokeWidth="1.5"
            opacity="0.7"
          />
          {BOLTS.map((deg) => (
            <G key={deg} rotation={deg} originX={130} originY={130}>
              <AnimatedRect
                animatedProps={boltProps}
                x="126"
                y={BOLT_Y}
                width="8"
                height="22"
                rx="2"
                fill="url(#vault-brass)"
              />
            </G>
          ))}
        </Layer>

        <Animated.View style={[StyleSheet.absoluteFill, wheelStyle]}>
          <Layer>
            <Circle
              cx="130"
              cy="130"
              r="28"
              fill={c.colorSurfacePrimary}
              stroke={c.colorSecondary}
              strokeWidth="3"
            />
            <Rect
              x="127"
              y="104"
              width="6"
              height="52"
              rx="1"
              fill={c.colorSecondary}
            />
            <Rect
              x="104"
              y="127"
              width="52"
              height="6"
              rx="1"
              fill={c.colorSecondary}
            />
            <Circle cx="130" cy="130" r="8" fill={c.colorPrimary} />
          </Layer>
        </Animated.View>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  stage: {
    overflow: 'hidden'
  },
  door: {
    transformOrigin: HINGE
  }
})
