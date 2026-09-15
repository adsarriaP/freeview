import { useEffect } from 'react';
import { Dimensions, Image, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const LOGO_SIZE = width * 0.45;

interface SplashScreenProps {
  onFinish: () => void;
  validationDone: boolean;
}

export function AppSplashScreen({ onFinish, validationDone }: SplashScreenProps) {
  const logoScale = useSharedValue(0.4);
  const logoOpacity = useSharedValue(0);
  const logoTranslateY = useSharedValue(30);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  const subtitleOpacity = useSharedValue(0);
  const barWidth = useSharedValue(0);
  const containerOpacity = useSharedValue(1);
  const shimmerX = useSharedValue(-LOGO_SIZE);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.back(1.5)) });
    logoScale.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.back(1.6)) });
    logoTranslateY.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.exp) });

    shimmerX.value = withRepeat(
      withSequence(
        withDelay(700, withTiming(LOGO_SIZE + 60, { duration: 900, easing: Easing.inOut(Easing.quad) })),
        withTiming(-LOGO_SIZE - 60, { duration: 0 })
      ),
      -1
    );

    titleOpacity.value = withDelay(500, withTiming(1, { duration: 400 }));
    titleTranslateY.value = withDelay(500, withTiming(0, { duration: 400, easing: Easing.out(Easing.exp) }));
    subtitleOpacity.value = withDelay(800, withTiming(1, { duration: 400 }));
  }, []);

  useEffect(() => {
    if (validationDone) {
      barWidth.value = withTiming(100, { duration: 600, easing: Easing.out(Easing.quad) }, (finished) => {
        if (finished) {
          containerOpacity.value = withDelay(300, withTiming(0, { duration: 450 }, () => {
            runOnJS(onFinish)();
          }));
        }
      });
    } else {
      barWidth.value = withTiming(85, { duration: 4000, easing: Easing.out(Easing.quad) });
    }
  }, [validationDone]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }, { translateY: logoTranslateY.value }],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  const barStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value}%`,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <View style={styles.bgGlow} />

      <Animated.View style={[styles.logoWrapper, logoStyle]}>
        <Image
          source={require('../../assets/images/freeview.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Animated.View style={[styles.shimmer, shimmerStyle]} pointerEvents="none" />
      </Animated.View>

      <Animated.Text style={[styles.appName, titleStyle]}>
        Freeview
      </Animated.Text>

      <Animated.Text style={[styles.subtitle, subtitleStyle]}>
        Verificando fuentes...
      </Animated.Text>

      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressBar, barStyle]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  bgGlow: {
    position: 'absolute',
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    backgroundColor: '#C0001A',
    opacity: 0.07,
    top: '50%',
    left: '50%',
    transform: [{ translateX: -(width * 0.6) }, { translateY: -(width * 0.6) }],
  },
  logoWrapper: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE * 0.22,
    overflow: 'hidden',
    marginBottom: 28,
    shadowColor: '#E0001A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 18,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: 'rgba(255,255,255,0.18)',
    transform: [{ skewX: '-18deg' }],
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 40,
    letterSpacing: 0.5,
  },
  progressTrack: {
    width: width * 0.55,
    height: 3,
    backgroundColor: '#1E1E1E',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#E0001A',
    borderRadius: 4,
  },
});
