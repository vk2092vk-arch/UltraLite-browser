// Web stub — Banner ads are native-only.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../constants/theme';

interface Props {
  testID?: string;
}

const AdBanner: React.FC<Props> = ({ testID }) => (
  <View testID={testID} style={styles.container}>
    <Text style={styles.text}>[Ad slot — visible on the installed APK]</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: COLORS.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },
  text: { color: COLORS.textMuted, fontSize: 12 },
});

export default AdBanner;
