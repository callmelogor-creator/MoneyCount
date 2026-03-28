import { Colors } from '../constants/theme'; 
import { useColorScheme } from './use-color-scheme';

/**
 * 根據現時主題（Light/Dark）獲取對應顏色
 * @param {Object} props - 可選的覆蓋顏色 { light: '...', dark: '...' }
 * @param {string} colorName - constants/theme.js 裡面定義的顏色名稱
 */
export function useThemeColor(props, colorName) {
  // 獲取現時主題，如果拎唔到就 default 用 'light'
  const theme = useColorScheme() ?? 'light';
  
  // 如果 Component 有傳入特定顏色，就優先用佢
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    // 否則就去 constants/theme.js 拎對應主題嘅色
    return Colors[theme][colorName];
  }
}