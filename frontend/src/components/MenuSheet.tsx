// Chrome-style 3-dot menu sheet
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT, RADIUS, SPACING } from '../constants/theme';

interface Item {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  testID?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  items: Item[];
}

const MenuSheet: React.FC<Props> = ({ visible, onClose, items }) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} testID="menu-backdrop">
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          {items.map((it, idx) => (
            <Pressable
              key={it.key}
              testID={it.testID || `menu-item-${it.key}`}
              onPress={() => {
                onClose();
                setTimeout(it.onPress, 80);
              }}
              style={({ pressed }) => [
                styles.row,
                pressed && { backgroundColor: COLORS.cardSoft },
                idx === items.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <Ionicons name={it.icon} size={20} color={COLORS.text} />
              <Text style={styles.label}>{it.label}</Text>
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 64,
    paddingRight: 8,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    minWidth: 240,
    paddingVertical: SPACING.xs,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    gap: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  label: {
    fontSize: FONT.size.md,
    color: COLORS.text,
    fontWeight: FONT.weight.medium,
  },
});

export default MenuSheet;
