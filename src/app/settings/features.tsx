import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FeatureSection } from '@/components/feature-section';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// The text of the Features page, kept together at the top so it is easy to read and change.
// Symbols in braces, like {H}, are shown as Scryfall's pictures.

// How to use the life tracker (the d20 tab).
const LIFE_TIPS = [
  {
    name: 'Start a game',
    text: 'On the main screen, tap the number of players. The buttons you see depend on Max Players in Settings, and everyone starts at the Starting Life Total from Settings.',
  },
  {
    name: 'Change life',
    text: 'Tap + or - to change a life total by 1. Or put a finger on a player\'s area and slide it: down lowers the life total, up raises it, 1 point for every small slide. "Up" and "down" are from that player\'s seat, even for areas turned sideways or upside down.',
  },
  {
    name: 'See the recent change',
    text: 'A small number appears beside the total showing everything you just changed, like +3 or -5. It adds up as you keep going and disappears after 5 seconds.',
  },
  {
    name: 'Poison counters',
    text: 'The small {H} and number in the lower right corner of an area are that player\'s poison counters. Tap them and they swap places with the life total, so + and - (and sliding) now change the poison counters. Tap again to swap back. A player at the Max Poison Counters setting is defeated.',
  },
  {
    name: 'Commander damage',
    text: 'Swipe left on your life total to open commander damage. Every other player\'s area now shows how much commander damage they have dealt to YOU, turned to face you. Use + and - or slide a finger on their area to change it. Each point also takes 1 from your life total, and 21 from a single player defeats you (the number keeps counting past 21). Swipe right on your life total to close it.',
  },
  {
    name: 'Defeat',
    text: 'A player who has lost gets a white circle with a slash through it in the background of their area. You lose at 0 life, at the maximum poison counters, or at 21 commander damage from one player.',
  },
  {
    name: 'New game and Players',
    text: '"New game" (along the bottom) puts every life total back to the starting life and clears all poison counters and commander damage. "Players" goes back to choosing how many are playing.',
  },
  {
    name: 'Your game is saved',
    text: 'The game is saved on your phone after every change, so if you close the app, the game is still there when you open it again.',
  },
];

// How to use the card rulings page (the card tab).
const CARD_TIPS = [
  {
    name: 'Search for a card',
    text: 'Type any part of a card name in the search box at the top, even from the middle of the name. "Dragon" finds Ur-Dragon and Dragon\'s Fire. Punctuation counts as a space, so "krrik" finds K\'rrik, and small typing mistakes are forgiven.',
  },
  {
    name: 'Pick from the list',
    text: 'The matches drop down over the page, best match first. Scroll the list to see every match, then tap a card.',
  },
  {
    name: 'Read the card',
    text: 'You get the card\'s picture, its card text (with symbols like {W}{U}{B}{R}{G} shown as pictures), and its official rulings. With no card chosen, you see the back of a card.',
  },
  {
    name: 'Works offline',
    text: 'The list of card names is saved on your phone and refreshed in the background when you are online (at most once a week). Cards you have already looked at are saved too, so they still open without internet.',
  },
];

// What each setting does.
const SETTINGS_TIPS = [
  {
    name: 'Haptic Feedback',
    text: 'Turns the little vibrations on or off: a light tick for each + and - tap, slide step, switch and dropdown, and a firmer buzz for the bottom buttons.',
  },
  {
    name: 'Theme',
    text: 'Light, Dark, or System (follows your phone).',
  },
  {
    name: 'Max Players',
    text: 'The most players you will ever need, from 2 to 6. It decides which player count buttons appear on the main screen.',
  },
  {
    name: 'Starting Life Total',
    text: 'The life everyone begins a game with, from 20 to 60.',
  },
  {
    name: 'Max Poison Counters',
    text: 'How many poison counters defeat a player: 10 or 20.',
  },
  {
    name: 'Life Total Colors',
    text: 'Pick a color for each player\'s area: {W} white, {U} blue, {B} black, {R} red, {G} green, or {C} none for the normal look. Everything on Settings saves by itself, so there is no Save button.',
  },
];

// The Features page. You reach it with the "Features" button at the top of Settings. It is
// only text: a short guide to everything the app can do.
export default function FeaturesScreen() {
  const theme = useTheme();

  return (
    // The full-screen background.
    <ThemedView style={styles.container}>
      {/* SafeAreaView keeps content out of the phone's notch and status bar. */}
      <SafeAreaView style={styles.safeArea}>
        {/* ScrollView lets the page scroll, because there is a lot to read. */}
        <ScrollView contentContainerStyle={styles.content}>
          {/* The top row: the title, and a button back to Settings. */}
          <View style={styles.header}>
            <ThemedText type="subtitle">Features</ThemedText>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Back to Settings"
              style={({ pressed }) => [
                styles.backButton,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold">Settings</ThemedText>
            </Pressable>
          </View>

          <ThemedText themeColor="textSecondary">
            A guide to what this app can do and how to use it.
          </ThemedText>

          <FeatureSection title="Life Tracker" tips={LIFE_TIPS} />
          <FeatureSection title="Card Rulings" tips={CARD_TIPS} />
          <FeatureSection title="Settings" tips={SETTINGS_TIPS} />

          <ThemedText type="small" themeColor="textSecondary">
            Card names, card text, rulings and mana symbols come from Scryfall.
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  // Fill the whole screen and center the content column on wide screens (like a browser).
  container: {
    flex: 1,
    alignItems: 'center',
  },
  // The column is never wider than MaxContentWidth, so it stays readable on big screens.
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  // Space around the page's content, and between its boxes.
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  // The title on the left and the button on the right.
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // The small rounded button back to Settings.
  backButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.four,
  },
  // Slight dimming while pressed.
  pressed: {
    opacity: 0.6,
  },
});
