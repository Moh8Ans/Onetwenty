// src/components/RingCard.tsx
import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeContext';
import { fonts } from '@/theme/fonts';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedSvg = Animated.createAnimatedComponent(require('react-native-svg').default);

type RingCardProps = {
  label: string;
  icon: React.ReactNode;
  verified: number;
  target: number;
  gradientId: string;
  gradientColors: readonly [string, string];
  variant?: 'hero' | 'compact';
};

export function RingCard({ label, icon, verified, target, gradientId, gradientColors, variant = 'hero' }: RingCardProps) {
  const { theme } = useTheme();
  const isHero = variant === 'hero';

  const size = isHero ? 72 : 48;
  const strokeWidth = isHero ? 9 : 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const ringPoints = Math.min(verified, target);
  const pct = target > 0 ? ringPoints / target : 0;
  const met = verified >= target;
  const remaining = Math.max(0, target - verified);

  const animatedProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animatedProgress.setValue(0);
    Animated.timing(animatedProgress, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // strokeDashoffset isn't a native-driver-supported property
    }).start();
  }, [pct]);

  const strokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, circumference * (1 - pct)],
  });

  const ring = (
    <AnimatedSvg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={gradientColors[0]} />
          <Stop offset="1" stopColor={gradientColors[1]} />
        </LinearGradient>
      </Defs>
      <Circle cx={center} cy={center} r={radius} stroke={theme.colors.border} strokeWidth={strokeWidth} fill="none" />
      <AnimatedCircle
        cx={center} cy={center} r={radius}
        stroke={`url(#${gradientId})`}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        rotation={-90}
        originX={center}
        originY={center}
      />
    </AnimatedSvg>
  );

  if (!isHero) {
    return (
      <View style={[styles.compactCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        {ring}
        <View style={styles.compactLabelRow}>
          {icon}
          <Text style={[styles.compactLabel, { color: theme.colors.textPrimary, fontFamily: fonts.semibold }]}>{label}</Text>
        </View>
        <Text style={[styles.compactPoints, { color: theme.colors.textPrimary, fontFamily: fonts.semibold }]}>
          {verified} <Text style={[styles.compactPointsUnit, { color: theme.colors.textSecondary, fontFamily: fonts.regular }]}>/ {target}</Text>
        </Text>
        <Text style={[styles.compactStatus, { color: met ? gradientColors[0] : theme.colors.textSecondary, fontFamily: fonts.medium }]}>
          {met ? 'Target met' : `${remaining} needed`}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.heroCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      {ring}
      <View style={styles.info}>
        <View style={styles.labelRow}>
          {icon}
          <Text style={[styles.label, { color: theme.colors.textPrimary, fontFamily: fonts.semibold }]}>{label}</Text>
        </View>
        <Text style={[styles.points, { color: theme.colors.textPrimary, fontFamily: fonts.semibold }]}>
          {verified} <Text style={[styles.pointsUnit, { color: theme.colors.textSecondary, fontFamily: fonts.regular }]}>of {target} pts</Text>
        </Text>
        <Text style={[styles.status, { color: met ? gradientColors[0] : theme.colors.textSecondary, fontFamily: fonts.medium }]}>
          {met ? 'Target met' : `${remaining} pts needed`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: { borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 10, borderWidth: 1 },
  info: { flex: 1 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  label: { fontSize: 14 },
  points: { fontSize: 24 },
  pointsUnit: { fontSize: 13 },
  status: { fontSize: 12, marginTop: 2 },
  compactCard: { flex: 1, borderRadius: 14, padding: 12, borderWidth: 1 },
  compactLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  compactLabel: { fontSize: 13 },
  compactPoints: { fontSize: 16, marginTop: 2 },
  compactPointsUnit: { fontSize: 12 },
  compactStatus: { fontSize: 11, marginTop: 2 },
});