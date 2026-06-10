import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useUserStore } from '../store/userStore';

export function AdBanner() {
  const isPremium = useUserStore((s) => s.isPremium);
  if (isPremium) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>[AdBanner Web Mock]</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 50,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    marginVertical: 8,
  },
  text: {
    color: '#666',
    fontSize: 12,
  },
});
