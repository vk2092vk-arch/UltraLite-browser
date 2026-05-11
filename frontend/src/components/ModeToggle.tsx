// "Shutter" style Normal | UltraLite toggle (left-to-right = Normal, right-to-left = UltraLite)
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { COLORS, FONT, RADIUS } from '../constants/theme';

interface Props {
  ultraLite: boolean;
  onToggle: (ultraLite: boolean) => void;
}

const KNOB_W = 78;
const TRACK_W = 156;

const ModeToggle: React.FC<Props> = ({ ultraLite, onToggle }) => {
  const x = useSharedValue(ultraLite ? TRACK_W - KNOB_W - 4 : 4);

  useEffect(() => {
    x.value = withTiming(ultraLite ? TRACK_W - KNOB_W - 4 : 4, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [ultraLite, x]);

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  return (
    <Pressable
      testID="mode-toggle"
      onPress={() => onToggle(!ultraLite)}
      style={styles.track}
      accessibilityRole="switch"
      accessibilityState={{ checked: ultraLite }}
    >
      <View style={styles.labels} pointerEvents="none">
        <Text
          style={[
            styles.label,
            !ultraLite ? styles.labelActive : styles.labelInactive,
          ]}
        >
          Normal
        </Text>
        <Text
          style={[
            styles.label,
            ultraLite ? styles.labelActive : styles.labelInactive,
          ]}
        >
          UltraLite
        </Text>
      </View>
      <Animated.View style={[styles.knob, knobStyle]} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  track: {
    width: TRACK_W,
    height: 36,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.maroonDark,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  labels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    height: '100%',
    zIndex: 2,
  },
  label: {
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.semibold,
    width: KNOB_W,
    textAlign: 'center',
  },
  labelActive: {
    color: COLORS.maroonDark,
  },
  labelInactive: {
    color: 'rgba(255,255,255,0.85)',
  },
  knob: {
    position: 'absolute',
    top: 3,
    left: 0,
    width: KNOB_W,
    height: 30,
    borderRadius: RADIUS.pill,
    backgroundColor: '#FFFFFF',
    zIndex: 1,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 2,
  },
});

export default ModeToggle;
