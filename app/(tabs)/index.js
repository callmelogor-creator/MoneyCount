import React, { useState, useEffect, useMemo } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, 
  SafeAreaView, ActivityIndicator, ImageBackground, Alert, Platform, Image, Modal,
  BackHandler, TouchableWithoutFeedback, KeyboardAvoidingView
} from 'react-native';
import { PieChart } from 'react-native-svg-charts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// --- 常數設定 ---
const MY_CUSTOM_BACKGROUND = require('../../assets/bg.jpg'); 

const RAINBOW_COLORS = [
  '#FF4081', '#00E5FF', '#76FF03', '#AA00FF', '#FFAB00', 
  '#2979FF', '#EA80FC', '#D4E157', '#00BFA5', '#FF5252',
  '#1DE9B6', '#FF6E40', '#651FFF', '#C6FF00', '#FFD740',
  '#00B0FF', '#F50057', '#00E676', '#3D5AFE', '#FF3D00'
];

const CATEGORIES = [
  { id: '1', label: '食飲', icon: '🍱', color: '#00E5FF' },
  { id: '2', label: '交通', icon: '🚃', color: '#76FF03' },
  { id: '3', label: '住宿', icon: '🛌', color: '#D4E157' },
  { id: '4', label: '購物', icon: '🛍️', color: '#FF4081' },
  { id: '5', label: '藥妝', icon: '💅', color: '#EA80FC' },
  { id: '6', label: '門票', icon: '🎫', color: '#AA00FF' },
  { id: '7', label: '機票', icon: '🛫', color: '#2979FF' },
  { id: '8', label: '手信', icon: '🍓', color: '#FFAB00' },
  { id: '9', label: '按摩', icon: '💆', color: '#00BFA5' },
  { id: '10', label: '雜項', icon: '🫧', color: '#90A4AE' },
];

const CURRENCY_LIST = [
  { code: 'HKD', flag: '🇭🇰' }, { code: 'JPY', flag: '🇯🇵' }, { code: 'KRW', flag: '🇰🇷' }, 
  { code: 'TWD', flag: '🇹🇼' }, { code: 'THB', flag: '🇹🇭' }, { code: 'USD', flag: '🇺🇸' }, { code: 'CNY', flag: '🇨🇳' }
];

const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

// --- 子組件: 簡易日曆選擇器 ---
const CustomCalendar = ({ onSelectRange, onSelectDate, onClose, mode = 'range', initialDate = new Date() }) => {
  const [currDate, setCurrDate] = useState(new Date(initialDate));
  const [start, setStart] = useState(mode === 'single' ? initialDate : null);
  const [end, setEnd] = useState(null);

  const year = currDate.getFullYear();
  const month = currDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const handleDayPress = (day) => {
    const selected = new Date(year, month, day);
    if (mode === 'single') {
      setStart(selected);
      onSelectDate(selected);
      onClose();
      return;
    }
    if (!start || (start && end)) {
      setStart(selected);
      setEnd(null);
    } else {
      if (selected < start) {
        setStart(selected);
      } else {
        setEnd(selected);
      }
    }
  };

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const getDayStatus = (day) => {
    if (!day) return 'none';
    const d = new Date(year, month, day).setHours(0,0,0,0);
    const s = start ? new Date(start).setHours(0,0,0,0) : null;
    const e = end ? new Date(end).setHours(0,0,0,0) : null;
    
    if (s && d === s) return 'active'; 
    if (e && d === e) return 'active'; 
    if (s && e && d > s && d < e) return 'between'; 
    return 'none';
  };

  const isReady = start && end;

  return (
    <View style={styles.calendarContainer}>
      <View style={styles.calendarHeader}>
        <TouchableOpacity onPress={() => setCurrDate(new Date(year, month - 1))}><Text style={styles.cyanText}>◀</Text></TouchableOpacity>
        <Text style={{color:'#FFF', fontWeight:'bold', fontSize: 18}}>{year}年 {month + 1}月</Text>
        <TouchableOpacity onPress={() => setCurrDate(new Date(year, month + 1))}><Text style={styles.cyanText}>▶</Text></TouchableOpacity>
      </View>
      <View style={styles.weekRow}>{['日','一','二','三','四','五','六'].map(d => <Text key={d} style={styles.weekText}>{d}</Text>)}</View>
      <View style={styles.daysGrid}>
        {days.map((day, idx) => {
          const status = getDayStatus(day);
          return (
            <TouchableOpacity 
              key={idx} 
              disabled={!day} 
              onPress={() => handleDayPress(day)} 
              style={[
                styles.dayBox, 
                status === 'active' && styles.dayBoxActive,
                status === 'between' && styles.dayBoxBetween
              ]}
            >
              <Text style={{
                color: day ? (status === 'active' ? '#000' : '#FFF') : 'transparent', 
                fontWeight: status === 'active' ? 'bold' : 'normal'
              }}>
                {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.calendarFooter}>
        {mode === 'range' && (
          <TouchableOpacity 
            disabled={!isReady}
            style={[styles.confirmBtn, !isReady && { backgroundColor: 'rgba(0,229,255,0.2)' }]} 
            onPress={() => { 
              if (isReady) {
                onSelectRange({ start, end }); 
                onClose(); 
              }
            }}>
            <Text style={{fontWeight:'bold', color: isReady ? '#000' : '#666'}}>確定選擇</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onClose} style={{padding: 10}}><Text style={{color:'#AAA', marginTop:10}}>取消</Text></TouchableOpacity>
      </View>
    </View>
  );
};

// --- 子組件: 統計圖表 ---
const AnalyticsCharts = ({ filtered, catLabel, setCatLabel, dayLabel, setDayLabel }) => {
  const total = filtered.reduce((s, e) => s + e.hkdAmount, 0);
  if (total === 0) return null;

  const catMap = {};
  filtered.forEach(e => { catMap[e.category.id] = (catMap[e.category.id] || 0) + e.hkdAmount; });
  const catPieData = Object.keys(catMap).map(id => ({
    key: `cat-${id}`, value: catMap[id], 
    svg: { 
      fill: CATEGORIES.find(c => c.id === id)?.color || '#555',
      onPress: () => setCatLabel({ title: CATEGORIES.find(c => c.id === id)?.label || '', val: catMap[id], id: id }),
      opacity: (catLabel.id === null || catLabel.id === id) ? 1 : 0.3
    },
    arc: { outerRadius: (catLabel.id === id) ? '105%' : '100%', padAngle: 0.02 }
  }));

  const dayMap = {};
  filtered.forEach(e => { 
    const monthNum = e.month.replace('月', '');
    const displayKey = `${monthNum}月${e.day}日`; 
    const storageKey = `${e.year}-${e.month}-${e.day}`;
    if(!dayMap[storageKey]) dayMap[storageKey] = { label: displayKey, amount: 0, key: storageKey };
    dayMap[storageKey].amount += e.hkdAmount;
  });

  const sortedDayKeys = Object.keys(dayMap).sort();

  const dayPieData = sortedDayKeys.map((key, idx) => ({
    key: `day-${key}`, value: dayMap[key].amount, 
    svg: { 
      fill: RAINBOW_COLORS[idx % RAINBOW_COLORS.length],
      onPress: () => setDayLabel({ title: dayMap[key].label, val: dayMap[key].amount, key: key }),
      opacity: (dayLabel.key === null || dayLabel.key === key) ? 1 : 0.3
    },
    arc: { outerRadius: (dayLabel.key === key) ? '105%' : '100%', padAngle: 0.02 }
  }));

  const topCats = Object.keys(catMap)
    .map(id => ({ ...CATEGORIES.find(c => c.id === id), amount: catMap[id] }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const topDates = Object.values(dayMap)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return (
    <View style={styles.chartsWrapper}>
      <View style={[styles.chartFlexRow, { flexWrap: 'nowrap' }]}>
        <View style={styles.chartContainer}>
          <PieChart style={{ height: 160, width: 160 }} data={catPieData} innerRadius="65%" outerRadius="95%" />
          <TouchableOpacity style={[styles.chartCenterText, { width: 100, height: 100 }]} onPress={() => setCatLabel({ title: '總計', val: 0, id: null })}>
            <Text style={styles.centerTitle}>{catLabel.val === 0 ? "類別總計" : catLabel.title}</Text>
            <Text style={styles.centerVal}>${(catLabel.val === 0 ? total : catLabel.val).toFixed(0)}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.chartContainer}>
          <PieChart style={{ height: 160, width: 160 }} data={dayPieData} innerRadius="65%" outerRadius="95%" />
          <TouchableOpacity style={[styles.chartCenterText, { width: 100, height: 100 }]} onPress={() => setDayLabel({ title: '總計', val: 0, key: null })}>
            <Text style={styles.centerTitle}>{dayLabel.val === 0 ? "區間總額" : dayLabel.title}</Text>
            <Text style={styles.centerVal}>${(dayLabel.val === 0 ? total : dayLabel.val).toFixed(0)}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 25, paddingHorizontal: 5 }}>
        <View style={{ width: '48%' }}>
          <Text style={{ color: '#FFF', fontSize: 14, fontWeight: 'bold', marginBottom: 12 }}>📊 類別排行</Text>
          {topCats.map((item, index) => {
            const isSelected = catLabel.id === item.id;
            const isDimmed = catLabel.id !== null && !isSelected;
            return (
              <TouchableOpacity 
                key={item.id} 
                style={[styles.rankGridItem, isDimmed && { opacity: 0.3 }]}
                onPress={() => setCatLabel({ title: item.label, val: item.amount, id: item.id })} 
              >
                <Text style={[styles.rankGridNum, {color: item.color}]}>{index + 1}</Text>
                <Text style={[styles.rankGridLabel, {color: item.color}]}>{item.icon} {item.label}</Text>
                <Text style={[styles.rankGridAmount, {color: item.color}]}>${item.amount.toFixed(0)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={{ width: '48%' }}>
          <Text style={{ color: '#FFF', fontSize: 14, fontWeight: 'bold', marginBottom: 12 }}>🗓️ 日期排行</Text>
          {topDates.map((item, index) => {
            const colorIdx = sortedDayKeys.indexOf(item.key);
            const itemColor = RAINBOW_COLORS[colorIdx % RAINBOW_COLORS.length];
            const isSelected = dayLabel.key === item.key;
            const isDimmed = dayLabel.key !== null && !isSelected;
            return (
              <TouchableOpacity 
                key={index} 
                style={[styles.rankGridItem, isDimmed && { opacity: 0.3 }]}
                onPress={() => setDayLabel({ title: item.label, val: item.amount, key: item.key })} 
              >
                <Text style={[styles.rankGridNum, {color: itemColor}]}>{index + 1}</Text>
                <Text style={[styles.rankGridLabel, {color: itemColor}]}>{item.label}</Text>
                <Text style={[styles.rankGridAmount, {color: itemColor}]}>${item.amount.toFixed(0)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

// --- 主程式 ---
export default function Index() {
  const [activeTab, setActiveTab] = useState('RECORD');
  const [expenses, setExpenses] = useState([]);
  const [rates, setRates] = useState({ HKD: 1 });
  const [loading, setLoading] = useState(true);
  
  const [editingId, setEditingId] = useState(null);
  const [item, setItem] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCurr, setSelectedCurr] = useState(CURRENCY_LIST[0]); 
  const [selectedCat, setSelectedCat] = useState(CATEGORIES[0]);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(`${new Date().getMonth() + 1}月`);
  const [isYearlyView, setIsYearlyView] = useState(false);
  const [customRange, setCustomRange] = useState(null); 
  const [showCalendar, setShowCalendar] = useState(false);
  const [viewingImage, setViewingImage] = useState(null);
  const [catLabel, setCatLabel] = useState({ title: '總計', val: 0, id: null });
  const [dayLabel, setDayLabel] = useState({ title: '總計', val: 0, key: null });

  // 監聽 Tab 切換，進入記帳時 Resume
  useEffect(() => {
    if (activeTab === 'RECORD' && !editingId) {
      resetForm();
    }
  }, [activeTab]);

  useEffect(() => {
    const backAction = () => {
      if (viewingImage) { setViewingImage(null); return true; }
      if (showDatePicker) { setShowDatePicker(false); return true; }
      if (showCalendar) { setShowCalendar(false); return true; }
      if (isPickerVisible) { setIsPickerVisible(false); return true; }
      if (activeTab === 'OVERVIEW') { handleResumeAndGoRecord(); return true; }
      return false; 
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, [viewingImage, showDatePicker, showCalendar, isPickerVisible, activeTab]);

  const handleResumeAndGoRecord = () => {
    setSearchQuery('');
    setViewYear(new Date().getFullYear());
    setSelectedMonth(`${new Date().getMonth() + 1}月`);
    setIsYearlyView(false);
    setCustomRange(null);
    resetChartLabels();
    setActiveTab('RECORD');
  };

  const resetChartLabels = () => {
    setCatLabel({ title: '總計', val: 0, id: null });
    setDayLabel({ title: '總計', val: 0, key: null });
  };

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('MY_EXPENSES');
        if (saved) setExpenses(JSON.parse(saved));
        const res = await fetch('https://open.er-api.com/v6/latest/HKD');
        const data = await res.json();
        if (data?.rates) setRates(data.rates);
      } catch (e) { console.log("Init Error:", e); } finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => { AsyncStorage.setItem('MY_EXPENSES', JSON.stringify(expenses)); }, [expenses]);

  const filteredData = useMemo(() => {
    return expenses.filter(e => {
      const matchSearch = e.item.toLowerCase().includes(searchQuery.toLowerCase()) || e.category.label.includes(searchQuery);
      if (isYearlyView) return matchSearch && e.year === viewYear;
      if (customRange) {
        const d = e.timestamp ? new Date(e.timestamp) : new Date(e.year, parseInt(e.month)-1, e.day);
        const start = new Date(customRange.start).setHours(0,0,0,0);
        const end = new Date(customRange.end).setHours(23,59,59,999);
        return matchSearch && d >= start && d <= end;
      }
      return matchSearch && e.year === viewYear && e.month === selectedMonth;
    });
  }, [expenses, searchQuery, viewYear, selectedMonth, isYearlyView, customRange]);

  const toggleYearlyView = () => {
    if (isYearlyView) {
      setSearchQuery('');
      setCustomRange(null);
      resetChartLabels();
    } else {
      setCustomRange(null);
      resetChartLabels();
    }
    setIsYearlyView(!isYearlyView);
  };

  const pickImage = async (useCamera) => {
    setIsPickerVisible(false);
    const options = { quality: 0.6 }; 
    try {
      let result = useCamera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (!result.canceled) setCapturedImage(result.assets[0].uri);
    } catch (e) { Alert.alert("錯誤", "無法開啟相機/相簿"); }
  };

  const saveExpense = () => {
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount)) { Alert.alert("錯誤", "請輸入有效的金額數字"); return; }
    const rateOfSelected = rates[selectedCurr.code] || 1;
    const hkdAmount = selectedCurr.code === 'HKD' ? parsedAmount : (parsedAmount / rateOfSelected);
    const targetDate = selectedDate;
    const finalItem = item.trim() === '' ? selectedCat.label : item.trim();
    
    if (editingId) {
      setExpenses(prev => prev.map(e => e.id === editingId ? {
        ...e, item: finalItem, foreignAmount: parsedAmount, hkdAmount: hkdAmount,
        category: selectedCat, currency: selectedCurr, image: capturedImage,
        day: targetDate.getDate(), year: targetDate.getFullYear(), month: `${targetDate.getMonth() + 1}月`,
        timestamp: targetDate.getTime()
      } : e));
      setEditingId(null);
    } else {
      setExpenses(prev => [{
        id: Math.random().toString(36).substr(2, 9),
        day: targetDate.getDate(), item: finalItem, foreignAmount: parsedAmount, hkdAmount: hkdAmount,
        category: selectedCat, currency: selectedCurr, year: targetDate.getFullYear(), month: `${targetDate.getMonth() + 1}月`,
        image: capturedImage, timestamp: targetDate.getTime()
      }, ...prev]);
    }
    resetForm(); setActiveTab('OVERVIEW');
  };

  const resetForm = () => {
    setItem(''); setAmount(''); setCapturedImage(null); setEditingId(null);
    setSelectedCat(CATEGORIES[0]); setSelectedCurr(CURRENCY_LIST[0]);
    setSelectedDate(new Date()); 
  };

  const startEdit = (exp) => {
    setEditingId(exp.id); setItem(exp.item); setAmount(exp.foreignAmount.toString());
    setSelectedCurr(exp.currency); setSelectedCat(exp.category); setCapturedImage(exp.image);
    const oldDate = exp.timestamp ? new Date(exp.timestamp) : new Date(exp.year, parseInt(exp.month)-1, exp.day);
    setSelectedDate(oldDate);
    setActiveTab('RECORD');
  };

  const handleDelete = (id) => {
    const doDel = () => setExpenses(prev => prev.filter(e => e.id !== id));
    if (Platform.OS === 'web') { if (window.confirm("確定刪除？")) doDel(); }
    else { Alert.alert("刪除", "確定刪除此筆記錄？", [{ text: "取消" }, { text: "刪除", onPress: doDel, style: 'destructive' }]); }
  };

  // --- 新增功能: CSV 導出 ---
  const handleExportCSV = async () => {
    if (expenses.length === 0) {
      Alert.alert("提示", "目前沒有數據可以導出");
      return;
    }
    
    const header = "日期,項目,類別,原始金額,幣別,HKD金額\n";
    const rows = expenses.map(e => 
      `${e.year}/${e.month}/${e.day},${e.item},${e.category.label},${e.foreignAmount},${e.currency.code},${e.hkdAmount.toFixed(2)}`
    ).join("\n");
    
    const csvString = header + rows;
    const fileUri = FileSystem.cacheDirectory + `MoneyCount_Backup_${new Date().getTime()}.csv`;

    try {
      await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(fileUri);
    } catch (err) {
      Alert.alert("導出失敗", err.message);
    }
  };

  // --- 新增功能: 模擬 Google Drive 同步 ---
  const handleSyncCloud = (type) => {
    if (type === 'BACKUP') {
      Alert.alert("雲端備份", "正在上傳數據至 Google Drive... (功能串接中)");
    } else {
      Alert.alert("雲端還原", "確定要從雲端還原嗎？這將覆蓋現有數據。", [
        { text: "取消" },
        { text: "確定還原", onPress: () => Alert.alert("提示", "還原成功！") }
      ]);
    }
  };

  const currentRate = rates[selectedCurr.code] || 1;
  const oneUnitInHKD = 1 / currentRate; 
  const convertedHKD = (parseFloat(amount) || 0) / currentRate;

  if (loading) return <View style={styles.loader}><ActivityIndicator size="large" color="#00E5FF" /></View>;

  return (
    <View style={styles.container}>
      <ImageBackground source={MY_CUSTOM_BACKGROUND} style={styles.bgImage}>
        <View style={styles.overlay}>
          <SafeAreaView style={{flex:1}}>
            <View style={styles.stickyHeader}>
              <Text style={styles.headerTitle}>MoneyCount 💸</Text>
            </View>

            {activeTab === 'RECORD' ? (
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.fixedContent}>
                <View style={styles.cyberCard}>
                  <Text style={styles.formStatusText}>{editingId ? "正在修改資料..." : "新入數"}</Text>
                  <TouchableOpacity onPress={() => setSelectedCurr(CURRENCY_LIST[0])} style={[styles.currBtnFull, selectedCurr.code === 'HKD' && styles.currActive]}>
                    <Text style={[styles.currText, selectedCurr.code === 'HKD' && {color:'#00E5FF'}]}>🇭🇰 HKD 港幣</Text>
                  </TouchableOpacity>
                  <View style={styles.currGridSmall}>
                    {CURRENCY_LIST.slice(1).map(c => (
                      <TouchableOpacity key={c.code} onPress={() => setSelectedCurr(c)} style={[styles.currBtnSmall, selectedCurr.code === c.code && styles.currActive]}>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                          <Text style={{fontSize: 12}}>{c.flag}</Text>
                          <Text style={[styles.currTextSmall, selectedCurr.code === c.code && {color:'#00E5FF'}]}>{" " + c.code}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {selectedCurr.code !== 'HKD' && (
                    <View style={styles.rateInfoBox}>
                      <Text style={styles.rateText}>1 {selectedCurr.code} ≈ {oneUnitInHKD.toFixed(3)} HKD | 約合 ${convertedHKD.toFixed(1)}</Text>
                    </View>
                  )}
                  <TextInput style={styles.cyberInput} placeholder="買咗咩？" placeholderTextColor="#666" value={item} onChangeText={setItem} />
                  <TextInput style={styles.cyberInput} placeholder="金額" keyboardType="numeric" placeholderTextColor="#666" value={amount} onChangeText={setAmount} />
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10}}>
                    <TouchableOpacity style={[styles.datePickerBtn, {flex:1, marginRight:5}]} onPress={() => setShowDatePicker(true)}>
                      <Text style={{color: '#FFF', fontSize: 13}}>📅 {selectedDate.toLocaleDateString()}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.attachmentBtn, {flex:1, marginLeft:5}, capturedImage && {backgroundColor: 'rgba(0,229,255,0.3)'}]} onPress={() => setIsPickerVisible(true)}>
                      <Text style={{color:'#FFF', fontSize: 13}}>📸 附件 {capturedImage ? '✅' : ''}</Text>
                    </TouchableOpacity>
                  </View>
                  {capturedImage && (
                    <TouchableOpacity onPress={() => setViewingImage(capturedImage)} style={{marginBottom: 10, alignItems: 'center'}}>
                      <Image source={{uri: capturedImage}} style={{width: '100%', height: 80, borderRadius: 10}} />
                      <Text style={{color: '#AAA', fontSize: 10, marginTop: 4}}>點擊放大圖片</Text>
                    </TouchableOpacity>
                  )}
                  <View style={styles.catGrid}>
                    {CATEGORIES.map(cat => (
                      <TouchableOpacity key={cat.id} onPress={() => setSelectedCat(cat)} style={[styles.catItem, selectedCat.id === cat.id && {borderColor: cat.color, backgroundColor: 'rgba(255,255,255,0.15)'}]}>
                        <Text style={{fontSize:16}}>{cat.icon}</Text>
                        <Text style={styles.catLabel}>{cat.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity style={styles.addBtn} onPress={saveExpense}><Text style={styles.addBtnText}>{editingId ? "更新記錄" : "確認入數"}</Text></TouchableOpacity>
                  {editingId && <TouchableOpacity onPress={resetForm} style={{marginTop:8, alignItems:'center'}}><Text style={{color:'#EEE'}}>取消修改</Text></TouchableOpacity>}
                </View>
              </KeyboardAvoidingView>
            ) : (
              <ScrollView contentContainerStyle={styles.scrollContent} bounces={true}>
                {/* 新增：工具欄 */}
                <View style={styles.toolBar}>
                  <TouchableOpacity style={styles.toolItem} onPress={handleExportCSV}>
                    <Text style={styles.toolText}>📄 導出 CSV</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.toolItem} onPress={() => handleSyncCloud('BACKUP')}>
                    <Text style={styles.toolText}>☁️ 備份</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.toolItem, {borderColor: '#555'}]} onPress={() => handleSyncCloud('RESTORE')}>
                    <Text style={[styles.toolText, {color: '#AAA'}]}>🔄 還原</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.searchContainer}>
                  <TextInput style={styles.searchInput} placeholder="🔍 搜尋..." placeholderTextColor="#CCC" value={searchQuery} onChangeText={setSearchQuery} />
                </View>

                <View style={styles.headerRow}>
                  <View style={styles.yearSelector}>
                    <TouchableOpacity onPress={() => setViewYear(v => v - 1)}><Text style={styles.cyanText}>◀</Text></TouchableOpacity>
                    <Text style={styles.yearText}>{viewYear}</Text>
                    <TouchableOpacity onPress={() => setViewYear(v => v + 1)}><Text style={styles.cyanText}>▶</Text></TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={toggleYearlyView} style={[styles.yearlyToggle, isYearlyView && {backgroundColor: '#00E5FF'}]}>
                    <Text style={{color: isYearlyView ? '#000' : '#00E5FF', fontSize:13, fontWeight:'bold'}}>{isYearlyView ? "返去月覽" : "全年總結"}</Text>
                  </TouchableOpacity>
                </View>

                {!isYearlyView && (
                  <>
                    {customRange ? (
                      <TouchableOpacity style={styles.rangeCancelBtn} onPress={() => { setCustomRange(null); resetChartLabels(); }}>
                        <Text style={{color: '#FFF', fontWeight:'bold', fontSize: 14}}>❌ 取消篩選 ({customRange.start.toLocaleDateString()} - {customRange.end.toLocaleDateString()})</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={styles.rangeBtn} onPress={() => setShowCalendar(true)}>
                        <Text style={{color: '#00E5FF', fontWeight:'bold', fontSize: 13}}>📅 跨月分析 (選擇日期範圍)</Text>
                      </TouchableOpacity>
                    )}
                    {!customRange && (
                      <View style={styles.monthGrid}>
                        {MONTHS.map(m => (
                          <TouchableOpacity key={m} onPress={() => { setSelectedMonth(m); resetChartLabels(); }} style={[styles.monthBox, (selectedMonth === m && styles.activeBorder)]}>
                            <Text style={{fontSize:10, color: (selectedMonth === m) ? '#00E5FF' : '#EEE'}}>{m}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </>
                )}

                {isYearlyView ? (
                  <View style={styles.yearlyListContainer}>
                    <AnalyticsCharts filtered={filteredData} catLabel={catLabel} setCatLabel={setCatLabel} dayLabel={dayLabel} setDayLabel={setDayLabel} />
                    <View style={{marginTop: 20}}>
                      {MONTHS.map((m, idx) => {
                        const monthTotal = expenses.filter(e => e.year === viewYear && e.month === m).reduce((s, e) => s + e.hkdAmount, 0);
                        const max = Math.max(...MONTHS.map(mon => expenses.filter(e => e.year === viewYear && e.month === mon).reduce((s, e) => s + e.hkdAmount, 0)), 1);
                        return (
                          <TouchableOpacity key={m} style={styles.yearlyRow} onPress={() => { setSelectedMonth(m); setIsYearlyView(false); resetChartLabels(); setSearchQuery(''); }}>
                            <Text style={styles.monthLabel}>{m}</Text>
                            <View style={styles.barTrack}><View style={[styles.barFill, { width: `${(monthTotal/max)*100}%`, backgroundColor: RAINBOW_COLORS[idx % RAINBOW_COLORS.length] }]} /></View>
                            <Text style={styles.amountLabel}>${monthTotal.toFixed(0)}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ) : filteredData.length === 0 ? (
                  <Text style={{color:'#DDD', textAlign:'center', marginTop:40}}>冇記錄 🫧</Text>
                ) : (
                  <>
                    <AnalyticsCharts filtered={filteredData} catLabel={catLabel} setCatLabel={setCatLabel} dayLabel={dayLabel} setDayLabel={setDayLabel} />
                    {Object.keys(filteredData.reduce((g, e) => { 
                      const key = `${e.month}-${e.day}`;
                      (g[key] = g[key] || []).push(e); return g; 
                    }, {})).sort((a,b) => {
                      const [am, ad] = a.split('-').map(v => parseInt(v));
                      const [bm, bd] = b.split('-').map(v => parseInt(v));
                      return bm !== am ? bm - am : bd - ad;
                    }).map(dateKey => {
                      const dayItems = filteredData.filter(e => `${e.month}-${e.day}` === dateKey);
                      const [m, d] = dateKey.split('-');
                      return (
                        <View key={dateKey} style={{marginBottom: 15}}>
                          <View style={styles.dayHeader}>
                            <Text style={styles.dayHeaderText}>{m}{d}日</Text>
                            <Text style={styles.daySumText}>${dayItems.reduce((s, e) => s + e.hkdAmount, 0).toFixed(0)}</Text>
                          </View>
                          {dayItems.map(exp => (
                            <View key={exp.id} style={styles.listItem}>
                              <Text style={{fontSize: 20}}>{exp.category.icon}</Text>
                              <View style={{flex:1, marginLeft:12}}>
                                <Text style={{color: exp.category.color, fontWeight: 'bold'}}>{exp.item}</Text>
                                <Text style={{color: '#EEE', opacity: 0.9, fontSize:11}}>{exp.currency.code} {exp.foreignAmount}</Text>
                              </View>
                              {exp.image && (
                                <TouchableOpacity onPress={() => setViewingImage(exp.image)} style={{marginRight: 10}}>
                                  <Image source={{uri: exp.image}} style={styles.listThumbnail} />
                                </TouchableOpacity>
                              )}
                              <Text style={{color: exp.category.color, fontWeight:'bold', marginRight:10}}>${exp.hkdAmount.toFixed(0)}</Text>
                              <TouchableOpacity onPress={() => startEdit(exp)}><Text>✏️</Text></TouchableOpacity>
                              <TouchableOpacity onPress={() => handleDelete(exp.id)} style={{marginLeft:10}}><Text>🗑️</Text></TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      );
                    })}
                  </>
                )}
                <View style={{height: 120}} />
              </ScrollView>
            )}
          </SafeAreaView>

          <View style={styles.nav}>
            <TouchableOpacity onPress={handleResumeAndGoRecord} style={styles.navBtn}><Text style={[styles.navText, activeTab === 'RECORD' && styles.navActive]}>記帳</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveTab('OVERVIEW')} style={styles.navBtn}><Text style={[styles.navText, activeTab === 'OVERVIEW' && styles.navActive]}>總覽</Text></TouchableOpacity>
          </View>
        </View>
      </ImageBackground>

      <Modal visible={isPickerVisible} transparent animationType="slide" onRequestClose={() => setIsPickerVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setIsPickerVisible(false)}>
          <View style={styles.modalBg}>
            <View style={styles.pickerCard}>
              <TouchableOpacity style={styles.pickerBtn} onPress={() => pickImage(true)}><Text style={styles.pickerBtnText}>📸 相機</Text></TouchableOpacity>
              <TouchableOpacity style={styles.pickerBtn} onPress={() => pickImage(false)}><Text style={styles.pickerBtnText}>🖼️ 相簿</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.pickerBtn, {backgroundColor: '#555', marginTop: 10}]} onPress={() => setIsPickerVisible(false)}><Text style={styles.pickerBtnText}>取消</Text></TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal visible={!!viewingImage} transparent onRequestClose={() => setViewingImage(null)}>
        <TouchableOpacity style={styles.modalBg} onPress={() => setViewingImage(null)}>
          <Image source={{ uri: viewingImage }} style={styles.fullImage} resizeMode="contain" />
          <TouchableOpacity style={styles.closeImageBtn} onPress={() => setViewingImage(null)}>
            <Text style={{color: '#FFF', fontWeight: 'bold'}}>關閉</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showCalendar} transparent animationType="fade" onRequestClose={() => setShowCalendar(false)}>
        <TouchableWithoutFeedback onPress={() => setShowCalendar(false)}>
          <View style={styles.modalBg}>
            <TouchableWithoutFeedback><View style={{width: '100%', alignItems: 'center'}}><CustomCalendar mode="range" onSelectRange={setCustomRange} onClose={() => setShowCalendar(false)} /></View></TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      
      <Modal visible={showDatePicker} transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
        <TouchableWithoutFeedback onPress={() => setShowDatePicker(false)}>
          <View style={styles.modalBg}>
            <TouchableWithoutFeedback><View style={{width: '100%', alignItems: 'center'}}><CustomCalendar mode="single" onSelectDate={setSelectedDate} onClose={() => setShowDatePicker(false)} initialDate={selectedDate} /></View></TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  bgImage: { flex: 1, width: '100%' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }, 
  loader: { flex: 1, justifyContent: 'center', backgroundColor: '#000' },
  stickyHeader: { paddingTop: Platform.OS === 'ios' ? 10 : 40, paddingHorizontal: 20, paddingBottom: 5, zIndex: 99 },
  fixedContent: { flex: 1, paddingHorizontal: 15, justifyContent: 'flex-start' },
  scrollContent: { paddingHorizontal: 15, paddingTop: 5 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#00E5FF' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, alignItems: 'center' },
  yearSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 8 },
  yearText: { color: '#FFF', marginHorizontal: 15, fontWeight: 'bold' },
  cyanText: { color: '#00E5FF', fontSize: 20 },
  yearlyToggle: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#00E5FF' },
  searchContainer: { marginBottom: 10 },
  searchInput: { backgroundColor: 'rgba(0,0,0,0.5)', color: '#FFF', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#333' },
  rangeBtn: { backgroundColor: 'rgba(0,0,0,0.6)', padding: 12, borderRadius: 12, marginBottom: 10, borderWidth: 1.5, borderColor: '#00E5FF', alignItems: 'center' },
  rangeCancelBtn: { backgroundColor: '#FF4081', padding: 12, borderRadius: 12, marginBottom: 10, alignItems: 'center' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 10 },
  monthBox: { width: '15%', paddingVertical: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, alignItems: 'center', marginBottom: 6, borderWidth: 1, borderColor: '#333' },
  activeBorder: { borderColor: '#00E5FF', backgroundColor: 'rgba(0,229,255,0.2)' },
  cyberCard: { backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 20, padding: 15, borderWidth: 1, borderColor: '#333' },
  formStatusText: { color: '#00E5FF', marginBottom: 8, fontWeight: 'bold', fontSize: 13 },
  currBtnFull: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 10, borderRadius: 10, marginBottom: 8, alignItems: 'center', borderWidth: 1, borderColor: '#444' },
  currGridSmall: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 8 },
  currBtnSmall: { width: '32%', backgroundColor: 'rgba(255,255,255,0.05)', padding: 8, borderRadius: 8, marginBottom: 6, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  currActive: { borderColor: '#00E5FF', backgroundColor: 'rgba(0,229,255,0.1)' },
  currText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  currTextSmall: { color: '#EEE', fontSize: 11 },
  rateInfoBox: { padding: 6, backgroundColor: 'rgba(0,229,255,0.08)', borderRadius: 10, marginBottom: 8, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,229,255,0.2)' },
  rateText: { color: '#00E5FF', fontSize: 11, fontWeight: 'bold' },
  cyberInput: { backgroundColor: '#FFF', color: '#000', padding: 12, borderRadius: 12, marginBottom: 8, fontSize: 14 },
  datePickerBtn: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#444' },
  attachmentBtn: { backgroundColor: '#333', padding: 12, borderRadius: 12, alignItems: 'center' },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 10 },
  catItem: { width: '18%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#333', marginBottom: 8 },
  catLabel: { color: '#EEE', fontSize: 9, marginTop: 2 },
  addBtn: { backgroundColor: '#00E5FF', padding: 15, borderRadius: 15, alignItems: 'center' },
  addBtnText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  chartsWrapper: { backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, padding: 15, marginBottom: 15 },
  chartFlexRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  chartContainer: { alignItems: 'center', justifyContent: 'center' },
  chartCenterText: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  centerTitle: { color: '#AAA', fontSize: 10 },
  centerVal: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  rankGridItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 8, borderRadius: 10, marginBottom: 5, borderWidth: 1, borderColor: 'transparent' },
  rankGridNum: { fontSize: 12, width: 18, fontWeight: 'bold' },
  rankGridLabel: { fontSize: 12, flex: 1 },
  rankGridAmount: { fontSize: 12, fontWeight: 'bold' },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, backgroundColor: 'rgba(0,229,255,0.1)', borderRadius: 8, marginBottom: 6 },
  dayHeaderText: { color: '#00E5FF', fontWeight: 'bold' },
  daySumText: { color: '#FFF', fontWeight: 'bold' },
  listItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 12, marginBottom: 6 },
  listThumbnail: { width: 35, height: 35, borderRadius: 6, borderWidth: 1, borderColor: '#444' },
  closeImageBtn: { position: 'absolute', bottom: 50, backgroundColor: 'rgba(255,255,255,0.2)', padding: 12, borderRadius: 20 },
  nav: { 
    position: 'absolute', 
    bottom: 0, 
    width: '100%', 
    flexDirection: 'row', 
    height: Platform.OS === 'android' ? 90 : 80, 
    backgroundColor: 'rgba(0,0,0,0.95)', 
    borderTopWidth: 1, 
    borderColor: '#333',
    paddingBottom: Platform.OS === 'android' ? 15 : 0 
  },
  navBtn: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  navText: { color: '#777', fontSize: 12 },
  navActive: { color: '#00E5FF', fontWeight: 'bold' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  pickerCard: { backgroundColor: '#222', padding: 25, borderRadius: 20, width: '75%' },
  pickerBtn: { backgroundColor: '#333', padding: 15, borderRadius: 12, marginBottom: 10, alignItems: 'center' },
  pickerBtnText: { color: '#FFF', fontWeight: 'bold' },
  fullImage: { width: '90%', height: '80%' },
  calendarContainer: { backgroundColor: '#1A1A1A', padding: 15, borderRadius: 20, width: '90%', borderWidth: 1, borderColor: '#00E5FF' },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  weekText: { color: '#555', width: '14.2%', textAlign: 'center', fontSize: 12 },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayBox: { width: '14.2%', height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20 },
  dayBoxActive: { backgroundColor: '#00E5FF' },
  dayBoxBetween: { backgroundColor: 'rgba(0,229,255,0.2)' },
  calendarFooter: { alignItems: 'center', marginTop: 10 },
  confirmBtn: { backgroundColor: '#00E5FF', paddingHorizontal: 30, paddingVertical: 10, borderRadius: 15 },
  yearlyListContainer: { backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 20, padding: 15 },
  yearlyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  monthLabel: { color: '#FFF', width: 35, fontSize: 12 },
  barTrack: { flex: 1, height: 12, backgroundColor: '#333', borderRadius: 6, marginHorizontal: 8, overflow: 'hidden' },
  barFill: { height: '100%' },
  amountLabel: { color: '#00E5FF', width: 65, textAlign: 'right', fontWeight: 'bold', fontSize: 12 },
  
  // 新增樣式
  toolBar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  toolItem: { flex: 1, padding: 8, borderRadius: 10, borderWidth: 1, borderColor: '#00E5FF', marginRight: 5, alignItems: 'center', backgroundColor: 'rgba(0,229,255,0.05)' },
  toolText: { color: '#00E5FF', fontSize: 11, fontWeight: 'bold' }
});