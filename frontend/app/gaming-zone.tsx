// Gaming Zone - Offline Games Screen
// Version 1.0.3 - UltraLite Browser

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { LUDO_GAME_HTML } from '../src/games/gameContent';

// ── Design tokens ──
const COLORS = {
  bg: '#0F0F1A',
  cardBg: '#1A1A2E',
  text: '#FFFFFF',
  textMuted: '#888888',
  brandOrange: '#FF6B35',
  brandBlue: '#2196F3',
  accent: '#FFD700',
};

const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

const FONT = {
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 28,
  },
  weight: {
    normal: '400' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

interface Game {
  id: string;
  name: string;
  description: string;
  image: string;
  gameHtml: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const GAMES: Game[] = [
  {
    id: 'ludo',
    name: 'Ludo Classic',
    description: 'Roll the dice and race your tokens!',
    image: 'https://images.unsplash.com/photo-1596687909057-dfac2b25b891?w=600&h=400&fit=crop',
    gameHtml: LUDO_GAME_HTML,
    icon: 'dice-outline',
  },
];

export default function GamingZone() {
  const router = useRouter();
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [gameLoading, setGameLoading] = useState(false);

  const handlePlayGame = (game: Game) => {
    setGameLoading(true);
    setSelectedGame(game);
    // Small delay for smooth transition
    setTimeout(() => setGameLoading(false), 300);
  };

  const handleBackFromGame = () => {
    setSelectedGame(null);
  };

  // If a game is selected, show FULL SCREEN WebView
  if (selectedGame) {
    return (
      <View style={styles.fullScreenContainer}>
        <StatusBar hidden={true} />
        
        {/* Full Screen Game WebView */}
        {gameLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.brandOrange} />
            <Text style={styles.loadingText}>Loading Game...</Text>
          </View>
        ) : (
          <WebView
            source={{ html: selectedGame.gameHtml }}
            style={styles.fullScreenWebview}
            originWhitelist={['*']}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            scalesPageToFit={false}
            bounces={false}
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Floating Exit Button - Always visible on top */}
        <Pressable 
          onPress={handleBackFromGame} 
          style={styles.floatingExitButton}
        >
          <Ionicons name="close" size={20} color={COLORS.text} />
          <Text style={styles.exitButtonText}>EXIT</Text>
        </Pressable>
      </View>
    );
  }

  // Main Gaming Zone Screen
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerEmoji}>🎮</Text>
          <Text style={styles.headerTitle}>Gaming Zone</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Subtitle */}
      <Text style={styles.subtitle}>
        Play offline • No internet required
      </Text>

      {/* Games Grid */}
      <View style={styles.gamesContainer}>
        {GAMES.map((game) => (
          <Pressable
            key={game.id}
            onPress={() => handlePlayGame(game)}
            style={({ pressed }) => [
              styles.gameCard,
              pressed && styles.gameCardPressed,
            ]}
          >
            <Image
              source={{ uri: game.image }}
              style={styles.gameImage}
              resizeMode="cover"
            />
            <View style={styles.gameOverlay}>
              <View style={styles.gameInfo}>
                <View style={styles.gameIconWrap}>
                  <Ionicons name={game.icon} size={24} color={COLORS.accent} />
                </View>
                <View style={styles.gameTextWrap}>
                  <Text style={styles.gameName}>{game.name}</Text>
                  <Text style={styles.gameDescription}>{game.description}</Text>
                </View>
              </View>
              <View style={styles.playBadge}>
                <Ionicons name="play" size={16} color={COLORS.bg} />
                <Text style={styles.playText}>PLAY</Text>
              </View>
            </View>
          </Pressable>
        ))}
      </View>

      {/* Footer Info */}
      <View style={styles.footer}>
        <Ionicons name="wifi-outline" size={20} color={COLORS.textMuted} style={{ opacity: 0.5 }} />
        <Text style={styles.footerText}>
          Works without internet connection
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerEmoji: {
    fontSize: 28,
  },
  headerTitle: {
    fontSize: FONT.size.xl,
    fontWeight: FONT.weight.bold,
    color: COLORS.text,
    letterSpacing: 1,
  },
  subtitle: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: FONT.size.sm,
    marginBottom: SPACING.lg,
  },
  gamesContainer: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
  },
  gameCard: {
    flex: 1,
    maxHeight: 200,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: COLORS.cardBg,
  },
  gameCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  gameImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  gameOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: SPACING.md,
    justifyContent: 'space-between',
  },
  gameInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  gameIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameTextWrap: {
    flex: 1,
  },
  gameName: {
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
    color: COLORS.text,
  },
  gameDescription: {
    fontSize: FONT.size.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  playBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    gap: 6,
  },
  playText: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    color: COLORS.bg,
    letterSpacing: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: FONT.size.sm,
  },
  // Full Screen Game Styles
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullScreenWebview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.bg,
  },
  loadingText: {
    color: COLORS.text,
    fontSize: FONT.size.md,
  },
  floatingExitButton: {
    position: 'absolute',
    top: 40,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    zIndex: 999,
  },
  exitButtonText: {
    color: COLORS.text,
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.bold,
    letterSpacing: 1,
  },
});
