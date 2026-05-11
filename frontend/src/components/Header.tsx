// Solid Maroon Header — logo (left), mode toggle (center-right), 3-dot menu (right)
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ModeToggle from './ModeToggle';
import { COLORS, FONT, SPACING } from '../constants/theme';

interface Props {
  ultraLite: boolean;
  onToggleMode: (v: boolean) => void;
  onMenu: () => void;
  onLogo: () => void;
}

const Header: React.FC<Props> = ({ ultraLite, onToggleMode, onMenu, onLogo }) => {
  return (
    <View style={styles.wrap} testID="header">
      <Pressable onPress={onLogo} style={styles.logoWrap} testID="header-logo">
        <Image
          source={require('../../assets/images/ultralite-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.brand}>UltraLite</Text>
      </Pressable>

      <View style={styles.right}>
        <ModeToggle ultraLite={ultraLite} onToggle={onToggleMode} />
        <Pressable
          onPress={onMenu}
          style={styles.iconBtn}
          testID="header-menu-btn"
          hitSlop={10}
        >
          <Ionicons name="ellipsis-vertical" size={22} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.maroon,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    minHeight: 60,
  },
  logoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  brand: {
    color: '#fff',
    fontWeight: FONT.weight.bold,
    fontSize: FONT.size.lg,
    letterSpacing: 0.3,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Header;
