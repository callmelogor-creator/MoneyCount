import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Platform, StatusBar as RNStatusBar } from 'react-native';

export default function RootLayout() {
  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: '#000', // 底層強制黑色
    }}>
      {/* 這裡是重點：translucent 必須為 true，且 backgroundColor 必須為 transparent */}
      <StatusBar style="light" translucent={true} backgroundColor="transparent" />
      
      <View style={{ 
        flex: 1, 
        // 這裡如果還有白邊，嘗試加上 marginTop: -50 (針對某些強行留白的版本)
        marginTop: -40 
      }}>
        <Slot />
      </View>
    </View>
  );
}