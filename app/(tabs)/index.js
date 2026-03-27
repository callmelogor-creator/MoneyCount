import React, { useState, useEffect, useMemo } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, 
  SafeAreaView, ActivityIndicator, ImageBackground, Alert, Platform, Image, Modal 
} from 'react-native';
import { PieChart } from 'react-native-svg-charts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

// --- 常數 ---
const MY_CUSTOM_BACKGROUND = require('../../assets/bg.jpg'); 

const RAINBOW_COLORS = ['#FF4081', '#00E5FF', '#76FF03', '#AA00FF', '#FFAB00', '#2979FF', '#EA80FC', '#D4E157', '#00BFA5', '#FF5252'];
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

// --- 子組件: 記帳表單 (保持原封不動) ---
const ExpenseForm = ({ 
  editingId, item, setItem, amount, setAmount, selectedCurr, setSelectedCurr, 
  selectedCat, setSelectedCat, rates, onSave, onReset, setIsPickerVisible, capturedImage, setViewingImage 
}) => {
  const getButtonText = () => {
    const val = parseFloat(amount);
    if (!amount || isNaN(val) || val <= 0) return editingId ? "更新資料 ✨" : "入數 ⚡";
    const rateOfSelected = rates[selectedCurr.code] || 1;
    const hkdValue = selectedCurr.code === 'HKD' ? val : val / rateOfSelected;
    return editingId ? `更新 (≈ $${hkdValue.toFixed(1)} HKD) ✨` : `入數 (≈ $${hkdValue.toFixed(1)} HKD) ⚡`;
  };

  return (
    <View style={styles.cyberCard}>
      <Text style={styles.formStatusText}>{editingId ? "正在修改資料..." : "新入數"}</Text>
      
      <TouchableOpacity onPress={() => setSelectedCurr(CURRENCY_LIST[0])} style={[styles.currBtnFull, selectedCurr.code === 'HKD' && styles.currActive]}>
        <Text style={[styles.currText, selectedCurr.code === 'HKD' && {color:'#00E5FF'}]}>🇭🇰 HKD 港幣</Text>
      </TouchableOpacity>

      <View style={styles.currGridSmall}>
        {CURRENCY_LIST.slice(1).map(c => (
          <TouchableOpacity key={c.code} onPress={() => setSelectedCurr(c)} style={[styles.currBtnSmall, selectedCurr.code === c.code && styles.currActive]}>
            <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}>
              <Text style={{fontSize: 12}}>{c.flag}</Text>
              <Text style={[styles.currTextSmall, selectedCurr.code === c.code && {color:'#00E5FF'}]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{" " + c.code}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {selectedCurr.code !== 'HKD' && (
        <View style={styles.rateBox}>
          <Text style={styles.rateText}>實時匯率: 1 {selectedCurr.code} ≈ {(1 / (rates[selectedCurr.code] || 1)).toFixed(4)} HKD</Text>
        </View>
      )}

      <TextInput style={styles.cyberInput} placeholder="買咗咩？" placeholderTextColor="#666" value={item} onChangeText={setItem} />
      <TextInput style={styles.cyberInput} placeholder="金額" keyboardType="numeric" placeholderTextColor="#666" value={amount} onChangeText={setAmount} />
      
      <View style={styles.photoRow}>
        <TouchableOpacity style={styles.attachmentBtn} onPress={() => setIsPickerVisible(true)}><Text style={{color:'#FFF'}}>📷 附件</Text></TouchableOpacity>
        {capturedImage && <TouchableOpacity onPress={() => setViewingImage(capturedImage)}><Image source={{ uri: capturedImage }} style={styles.miniPreview} /></TouchableOpacity>}
      </View>

      <View style={styles.catGrid}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity key={cat.id} onPress={() => setSelectedCat(cat)} style={[styles.catItem, selectedCat.id === cat.id && {borderColor: cat.color, backgroundColor: 'rgba(255,255,255,0.15)'}]}>
            <Text style={{fontSize:18}}>{cat.icon}</Text>
            <Text style={styles.catLabel}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.addBtn} onPress={onSave}><Text style={styles.addBtnText}>{getButtonText()}</Text></TouchableOpacity>
      {editingId && <TouchableOpacity onPress={onReset} style={{marginTop:15, alignItems:'center'}}><Text style={{color:'#EEE'}}>取消修改</Text></TouchableOpacity>}
    </View>
  );
};

// --- 子組件: 簡易日曆選擇器 ---
const CustomCalendar = ({ onSelectRange, onClose }) => {
  const [currDate, setCurrDate] = useState(new Date());
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);

  const year = currDate.getFullYear();
  const month = currDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const handleDayPress = (day) => {
    const selected = new Date(year, month, day);
    if (!start || (start && end)) { setStart(selected); setEnd(null); }
    else if (selected < start) { setStart(selected); }
    else { setEnd(selected); }
  };

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const isSelected = (day) => {
    if (!day) return false;
    const d = new Date(year, month, day);
    if (start && d.getTime() === start.getTime()) return true;
    if (end && d.getTime() === end.getTime()) return true;
    if (start && end && d > start && d < end) return true;
    return false;
  };

  return (
    <View style={styles.calendarContainer}>
      <View style={styles.calendarHeader}>
        <TouchableOpacity onPress={() => setCurrDate(new Date(year, month - 1))}><Text style={styles.cyanText}>◀</Text></TouchableOpacity>
        <Text style={{color:'#FFF', fontWeight:'bold'}}>{year}年 {month + 1}月</Text>
        <TouchableOpacity onPress={() => setCurrDate(new Date(year, month + 1))}><Text style={styles.cyanText}>▶</Text></TouchableOpacity>
      </View>
      <View style={styles.weekRow}>{['日','一','二','三','四','五','六'].map(d => <Text key={d} style={styles.weekText}>{d}</Text>)}</View>
      <View style={styles.daysGrid}>
        {days.map((day, idx) => (
          <TouchableOpacity key={idx} disabled={!day} onPress={() => handleDayPress(day)} style={[styles.dayBox, isSelected(day) && styles.dayBoxActive]}>
            <Text style={{color: day ? (isSelected(day) ? '#000' : '#FFF') : 'transparent'}}>{day}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.calendarFooter}>
        <TouchableOpacity style={styles.confirmBtn} onPress={() => { if (start && end) { onSelectRange({ start, end }); onClose(); } else { Alert.alert("提示", "請選擇範圍"); } }}>
          <Text style={{fontWeight:'bold'}}>確定選擇</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose}><Text style={{color:'#AAA', marginTop:10}}>取消</Text></TouchableOpacity>
      </View>
    </View>
  );
};

// --- 子組件: 統計圖表 (重點修正：類別排行顏色跟隨類別定義) ---
const AnalyticsCharts = ({ filtered, catLabel, setCatLabel, dayLabel, setDayLabel }) => {
  const total = filtered.reduce((s, e) => s + e.hkdAmount, 0);
  if (total === 0) return null;

  // 1. 類別數據
  const catMap = {};
  filtered.forEach(e => { catMap[e.category.id] = (catMap[e.category.id] || 0) + e.hkdAmount; });
  const catPieData = Object.keys(catMap).map(id => ({
    key: `cat-${id}`, value: catMap[id], svg: { fill: CATEGORIES.find(c => c.id === id)?.color || '#555' },
    onPress: () => setCatLabel({ title: CATEGORIES.find(c => c.id === id)?.label || '', val: catMap[id] })
  }));

  // 2. 日期數據
  const dayMap = {};
  filtered.forEach(e => { 
    const monthNum = e.month.replace('月', '');
    const displayKey = `${monthNum}/${e.day}`;
    const storageKey = `${e.year}-${e.month}-${e.day}`;
    if(!dayMap[storageKey]) dayMap[storageKey] = { label: displayKey, amount: 0 };
    dayMap[storageKey].amount += e.hkdAmount;
  });

  const dayPieData = Object.keys(dayMap).map((key, idx) => ({
    key: `day-${key}`, value: dayMap[key].amount, svg: { fill: RAINBOW_COLORS[idx % RAINBOW_COLORS.length] },
    onPress: () => setDayLabel({ title: dayMap[key].label, val: dayMap[key].amount })
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
      <View style={styles.chartFlexRow}>
        <View style={styles.chartContainer}>
          <PieChart style={{ height: 110, width: 110 }} data={catPieData} innerRadius="75%" />
          <TouchableOpacity style={styles.chartCenterText} onPress={() => setCatLabel({ title: '總計', val: 0 })}>
            <Text style={styles.centerTitle}>{catLabel.val === 0 ? "類別總計" : catLabel.title}</Text>
            <Text style={styles.centerVal}>${(catLabel.val === 0 ? total : catLabel.val).toFixed(0)}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.chartContainer}>
          <PieChart style={{ height: 110, width: 110 }} data={dayPieData} innerRadius="75%" />
          <TouchableOpacity style={styles.chartCenterText} onPress={() => setDayLabel({ title: '總計', val: 0 })}>
            <Text style={styles.centerTitle}>{dayLabel.val === 0 ? "區間總額" : dayLabel.title}</Text>
            <Text style={styles.centerVal}>${(dayLabel.val === 0 ? total : dayLabel.val).toFixed(0)}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, paddingHorizontal: 5 }}>
        {/* 左側：類別排行 (文字顏色跟隨類別定義) */}
        <View style={{ width: '48%' }}>
          <Text style={{ color: '#FFF', fontSize: 13, fontWeight: 'bold', marginBottom: 10 }}>📊 類別排行</Text>
          {topCats.map((item, index) => (
            <View key={item.id} style={styles.rankGridItem}>
              <Text style={[styles.rankGridNum, {color: item.color}]}>{index + 1}</Text>
              <Text style={[styles.rankGridLabel, {color: item.color}]}>{item.icon} {item.label}</Text>
              <Text style={[styles.rankGridAmount, {color: item.color}]}>${item.amount.toFixed(0)}</Text>
            </View>
          ))}
        </View>

        {/* 右側：日期排行 (文字顏色跟隨 Rainbow 系列) */}
        <View style={{ width: '48%' }}>
          <Text style={{ color: '#FFF', fontSize: 13, fontWeight: 'bold', marginBottom: 10 }}>🗓️ 日期排行</Text>
          {topDates.map((item, index) => (
            <View key={index} style={styles.rankGridItem}>
              <Text style={[styles.rankGridNum, {color: RAINBOW_COLORS[index % RAINBOW_COLORS.length]}]}>{index + 1}</Text>
              <Text style={[styles.rankGridLabel, {color: RAINBOW_COLORS[index % RAINBOW_COLORS.length]}]}>{item.label}</Text>
              <Text style={[styles.rankGridAmount, {color: RAINBOW_COLORS[index % RAINBOW_COLORS.length]}]}>${item.amount.toFixed(0)}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

// --- 主程式 (其他邏輯與樣式完全不變) ---
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
  const [searchQuery, setSearchQuery] = useState('');
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(`${new Date().getMonth() + 1}月`);
  const [isYearlyView, setIsYearlyView] = useState(false);
  const [viewingImage, setViewingImage] = useState(null);
  const [catLabel, setCatLabel] = useState({ title: '總計', val: 0 });
  const [dayLabel, setDayLabel] = useState({ title: '總計', val: 0 });
  const [customRange, setCustomRange] = useState(null); 
  const [showCalendar, setShowCalendar] = useState(false);

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
      if (customRange) {
        const d = e.timestamp ? new Date(e.timestamp) : new Date(e.year, parseInt(e.month)-1, e.day);
        const start = new Date(customRange.start).setHours(0,0,0,0);
        const end = new Date(customRange.end).setHours(23,59,59,999);
        return matchSearch && d >= start && d <= end;
      }
      const matchTime = isYearlyView ? e.year === viewYear : (e.year === viewYear && e.month === selectedMonth);
      return matchSearch && matchTime;
    });
  }, [expenses, searchQuery, viewYear, selectedMonth, isYearlyView, customRange]);

  const pickImage = async (useCamera) => {
    setIsPickerVisible(false);
    const options = { allowsEditing: true, aspect: [4, 3], quality: 0.4 };
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
    const now = new Date();
    
    if (editingId) {
      setExpenses(prev => prev.map(e => e.id === editingId ? {
        ...e, item: item.trim() || "未命名項目", foreignAmount: parsedAmount, hkdAmount: hkdAmount,
        category: selectedCat, currency: selectedCurr, image: capturedImage
      } : e));
      setEditingId(null);
    } else {
      setExpenses(prev => [{
        id: Math.random().toString(36).substr(2, 9),
        day: now.getDate(), item: item.trim() || "未命名項目", foreignAmount: parsedAmount, hkdAmount: hkdAmount,
        category: selectedCat, currency: selectedCurr, year: now.getFullYear(), month: `${now.getMonth() + 1}月`,
        image: capturedImage, timestamp: now.getTime()
      }, ...prev]);
    }
    resetForm(); setActiveTab('OVERVIEW');
  };

  const resetForm = () => {
    setItem(''); setAmount(''); setCapturedImage(null); setEditingId(null);
    setSelectedCat(CATEGORIES[0]); setSelectedCurr(CURRENCY_LIST[0]);
  };

  const startEdit = (exp) => {
    setEditingId(exp.id); setItem(exp.item); setAmount(exp.foreignAmount.toString());
    setSelectedCurr(exp.currency); setSelectedCat(exp.category); setCapturedImage(exp.image);
    setActiveTab('RECORD');
  };

  const handleDelete = (id) => {
    const doDel = () => setExpenses(prev => prev.filter(e => e.id !== id));
    if (Platform.OS === 'web') { if (window.confirm("確定刪除？")) doDel(); }
    else { Alert.alert("刪除", "確定刪除此筆記錄？", [{ text: "取消" }, { text: "刪除", onPress: doDel, style: 'destructive' }]); }
  };

  if (loading) return <View style={styles.loader}><ActivityIndicator size="large" color="#00E5FF" /></View>;

  return (
    <View style={styles.container}>
      <ImageBackground source={MY_CUSTOM_BACKGROUND} style={styles.bgImage}>
        <View style={styles.overlay}>
          <SafeAreaView style={{flex:1}}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
              <View style={styles.header}><Text style={styles.headerTitle}>MoneyCount 💸</Text></View>

              {activeTab === 'RECORD' ? (
                <ExpenseForm 
                  editingId={editingId} item={item} setItem={setItem} amount={amount} setAmount={setAmount} 
                  selectedCurr={selectedCurr} setSelectedCurr={setSelectedCurr} selectedCat={selectedCat} setSelectedCat={setSelectedCat}
                  rates={rates} onSave={saveExpense} onReset={resetForm} setIsPickerVisible={setIsPickerVisible} 
                  capturedImage={capturedImage} setViewingImage={setViewingImage}
                />
              ) : (
                <>
                  <View style={styles.searchContainer}>
                    <TextInput style={styles.searchInput} placeholder="🔍 搜尋項目/類別..." placeholderTextColor="#CCC" value={searchQuery} onChangeText={setSearchQuery} />
                  </View>

                  <View style={styles.headerRow}>
                    <View style={styles.yearSelector}>
                      <TouchableOpacity onPress={() => setViewYear(v => v - 1)}><Text style={styles.cyanText}>◀</Text></TouchableOpacity>
                      <Text style={styles.yearText}>{viewYear}</Text>
                      <TouchableOpacity onPress={() => setViewYear(v => v + 1)}><Text style={styles.cyanText}>▶</Text></TouchableOpacity>
                    </View>
                    <TouchableOpacity onPress={() => setIsYearlyView(!isYearlyView)} style={styles.yearlyToggle}>
                      <Text style={{color:'#00E5FF', fontSize:12}}>{isYearlyView ? "返去月覽" : "全年總結"}</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity style={styles.rangeBtn} onPress={() => setShowCalendar(true)}>
                    <Text style={{color: '#00E5FF', fontWeight:'bold', fontSize: 13}}>
                      {customRange ? `📅 ${customRange.start.toLocaleDateString()} - ${customRange.end.toLocaleDateString()}` : "📅 跨月分析 (選擇自定義範圍)"}
                    </Text>
                    {customRange && <TouchableOpacity onPress={() => setCustomRange(null)}><Text style={{color:'#FFF', marginLeft:10}}>✕</Text></TouchableOpacity>}
                  </TouchableOpacity>

                  {!customRange && (
                    <View style={styles.monthGrid}>
                      {MONTHS.map(m => (
                        <TouchableOpacity key={m} onPress={() => { setSelectedMonth(m); setIsYearlyView(false); }} style={[styles.monthBox, (!isYearlyView && selectedMonth === m && styles.activeBorder)]}>
                          <Text style={{fontSize:10, color: (!isYearlyView && selectedMonth === m) ? '#00E5FF' : '#EEE'}}>{m}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {isYearlyView ? (
                    <View style={styles.yearlyListContainer}>
                      {MONTHS.map(m => {
                        const monthTotal = expenses.filter(e => e.year === viewYear && e.month === m).reduce((s, e) => s + e.hkdAmount, 0);
                        const max = Math.max(...MONTHS.map(mon => expenses.filter(e => e.year === viewYear && e.month === mon).reduce((s, e) => s + e.hkdAmount, 0)), 1);
                        return (
                          <TouchableOpacity key={m} style={styles.yearlyRow} onPress={() => { setSelectedMonth(m); setIsYearlyView(false); }}>
                            <Text style={styles.monthLabel}>{m}</Text>
                            <View style={styles.barTrack}><View style={[styles.barFill, { width: `${(monthTotal/max)*100}%`, backgroundColor: '#FF4081' }]} /></View>
                            <Text style={styles.amountLabel}>${monthTotal.toFixed(0)}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : filteredData.length === 0 ? (
                    <Text style={{color:'#DDD', textAlign:'center', marginTop:40, textShadowColor: '#000', textShadowRadius: 2}}>冇符合記錄 🫧</Text>
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
                          <View key={`day-${dateKey}`} style={styles.dayGroupWrapper}>
                            <View style={styles.dayHeader}>
                              <Text style={styles.dayHeaderText}>{m}{d}日</Text>
                              <Text style={styles.daySumText}>日計: ${dayItems.reduce((s, e) => s + e.hkdAmount, 0).toFixed(0)}</Text>
                            </View>
                            {dayItems.map(exp => (
                              <View key={exp.id} style={styles.listItem}>
                                <Text style={{fontSize: 20}}>{exp.category.icon}</Text>
                                <View style={{flex:1, marginLeft:12}}>
                                  <Text style={{color: exp.category.color, fontWeight: 'bold', textShadowColor: '#000', textShadowRadius: 1}}>{exp.item}</Text>
                                  <Text style={{color: exp.category.color, opacity: 0.9, fontSize:11}}>{exp.currency.code} {exp.foreignAmount} ({exp.category.label})</Text>
                                </View>
                                {exp.image && <TouchableOpacity onPress={() => setViewingImage(exp.image)}><Image source={{ uri: exp.image }} style={styles.listThumb} /></TouchableOpacity>}
                                <Text style={{color: exp.category.color, fontWeight:'bold', marginRight:10, fontSize:16, textShadowColor: '#000', textShadowRadius: 1}}>${exp.hkdAmount.toFixed(0)}</Text>
                                <TouchableOpacity onPress={() => startEdit(exp)} style={{padding:5}}><Text>✏️</Text></TouchableOpacity>
                                <TouchableOpacity onPress={() => handleDelete(exp.id)} style={{padding:5}}><Text>🗑️</Text></TouchableOpacity>
                              </View>
                            ))}
                          </View>
                        )
                      })}
                      <View style={{height:120}}/>
                    </>
                  )}
                </>
              )}
            </ScrollView>
          </SafeAreaView>

          <View style={styles.nav}>
            <TouchableOpacity onPress={() => setActiveTab('RECORD')} style={styles.navBtn}><Text style={[styles.navText, activeTab === 'RECORD' && styles.navActive]}>記帳</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveTab('OVERVIEW')} style={styles.navBtn}><Text style={[styles.navText, activeTab === 'OVERVIEW' && styles.navActive]}>總覽</Text></TouchableOpacity>
          </View>
        </View>
      </ImageBackground>

      <Modal visible={isPickerVisible} transparent animationType="slide">
        <View style={styles.modalBg}><View style={styles.pickerCard}>
          <Text style={styles.pickerTitle}>添加收據圖片</Text>
          <TouchableOpacity style={styles.pickerBtn} onPress={() => pickImage(true)}><Text style={styles.pickerBtnText}>📸 開啟相機</Text></TouchableOpacity>
          <TouchableOpacity style={styles.pickerBtn} onPress={() => pickImage(false)}><Text style={styles.pickerBtnText}>🖼️ 從相簿選擇</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.pickerBtn, {backgroundColor: '#333', marginTop: 10}]} onPress={() => setIsPickerVisible(false)}><Text style={{color: '#FF5252', fontWeight: 'bold'}}>取消</Text></TouchableOpacity>
        </View></View>
      </Modal>

      <Modal visible={!!viewingImage} transparent animationType="fade">
        <TouchableOpacity style={styles.modalBg} onPress={() => setViewingImage(null)}>
          <Image source={{ uri: viewingImage }} style={styles.fullImage} resizeMode="contain" />
        </TouchableOpacity>
      </Modal>

      <Modal visible={showCalendar} transparent animationType="fade">
        <View style={styles.modalBg}><CustomCalendar onSelectRange={setCustomRange} onClose={() => setShowCalendar(false)} /></View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' }, 
  bgImage: { flex: 1, width: '100%' }, 
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  scrollContent: { padding: 20, paddingTop: 40 }, 
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#00E5FF', textShadowColor: '#000', textShadowRadius: 3 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  searchContainer: { flexDirection: 'row', marginBottom: 15, alignItems: 'center' },
  searchInput: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', color: '#FFF', padding: 12, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  rangeBtn: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.6)', padding: 12, borderRadius: 15, marginBottom: 15, borderWidth: 1, borderColor: '#00E5FF', justifyContent: 'center', alignItems: 'center' },
  yearSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, padding: 8 },
  yearText: { color: '#FFF', marginHorizontal: 12, fontWeight: 'bold' }, 
  cyanText: { color: '#00E5FF', fontSize: 18 },
  yearlyToggle: { backgroundColor: 'rgba(0,229,255,0.15)', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#00E5FF' },
  cyberCard: { backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 25, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  formStatusText: {color:'#00E5FF', marginBottom:10, fontWeight:'bold'},
  currBtnFull: { width: '100%', padding: 14, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  currGridSmall: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 10 },
  currBtnSmall: { width: '32%', height: 45, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  currActive: { borderColor: '#00E5FF', backgroundColor: 'rgba(0,229,255,0.1)' }, 
  currText: { color: '#EEE', fontWeight: 'bold' }, 
  currTextSmall: { color: '#EEE', fontSize: 12, fontWeight: 'bold', marginLeft: 2 },
  rateBox: { backgroundColor: 'rgba(0,229,255,0.1)', padding: 10, borderRadius: 10, marginBottom: 15 },
  rateText: { color: '#00E5FF', fontSize: 12, textAlign: 'center' },
  cyberInput: { backgroundColor: 'rgba(255,255,255,0.9)', color: '#000', padding: 15, borderRadius: 15, marginBottom: 10, fontSize: 16 },
  photoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  attachmentBtn: { backgroundColor: 'rgba(0,0,0,0.5)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#00E5FF', marginRight: 15 },
  miniPreview: { width: 45, height: 45, borderRadius: 8, borderWidth: 1, borderColor: '#00E5FF' },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 10 },
  catItem: { width: '18%', aspectRatio: 1, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  catLabel: { fontSize: 9, color: '#EEE', marginTop: 4, textAlign: 'center' },
  addBtn: { backgroundColor: '#00E5FF', padding: 18, borderRadius: 20, alignItems: 'center' },
  addBtnText: { color: '#000', fontWeight: 'bold', fontSize: 14, textAlign: 'center' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 15 },
  monthBox: { width: '15%', paddingVertical: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, alignItems: 'center', marginBottom: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  activeBorder: { borderColor: '#00E5FF', backgroundColor: 'rgba(0,229,255,0.1)' },
  chartsWrapper: { backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 25, padding: 15, marginBottom: 20 },
  chartFlexRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  chartContainer: { alignItems: 'center', justifyContent: 'center' },
  chartCenterText: { position: 'absolute', alignItems: 'center', justifyContent: 'center', width: 80, height: 80 },
  centerTitle: { color: '#EEE', fontSize: 9, textAlign: 'center' }, 
  centerVal: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  rankGridItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', padding: 8, borderRadius: 10, marginBottom: 5 },
  rankGridNum: { fontWeight: 'bold', fontSize: 10, width: 12 },
  rankGridLabel: { fontSize: 10, flex: 1, marginLeft: 5 },
  rankGridAmount: { fontSize: 10, fontWeight: 'bold' },
  dayGroupWrapper: { marginBottom: 20 },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderLeftWidth: 3, borderLeftColor: '#00E5FF', backgroundColor: 'rgba(0,0,0,0.5)', marginBottom: 8, borderRadius: 4 },
  dayHeaderText: { color: '#00E5FF', fontWeight: 'bold', fontSize: 14 },
  daySumText: { color: '#EEE', fontSize: 12 },
  listItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 12, borderRadius: 18, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  listThumb: { width: 35, height: 35, borderRadius: 5, marginRight: 10 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  fullImage: { width: '90%', height: '80%' },
  yearlyListContainer: { backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 25, padding: 20 },
  yearlyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  monthLabel: { color: '#FFF', width: 40 },
  barTrack: { flex: 1, height: 12, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 6, marginHorizontal: 12, overflow: 'hidden' },
  barFill: { height: '100%' }, 
  amountLabel: { color: '#EEE', width: 65, textAlign: 'right', fontSize: 12 },
  nav: { 
    position: 'absolute', bottom: 0, width: '100%', flexDirection: 'row', 
    height: Platform.OS === 'android' ? 100 : 90, 
    paddingBottom: Platform.OS === 'android' ? 25 : 0, 
    backgroundColor: 'rgba(0,0,0,0.8)', borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.1)' 
  },
  navBtn: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  navText: { color: '#AAA', fontSize: 12 }, 
  navActive: { color: '#00E5FF', fontWeight: 'bold' },
  pickerCard: { backgroundColor: '#111', width: '80%', padding: 25, borderRadius: 25, borderWidth: 1, borderColor: '#00E5FF', alignItems: 'center' },
  pickerTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 20 },
  pickerBtn: { backgroundColor: 'rgba(255,255,255,0.1)', width: '100%', padding: 15, borderRadius: 15, alignItems: 'center', marginBottom: 10 },
  pickerBtnText: { color: '#FFF', fontWeight: 'bold' },
  calendarContainer: { backgroundColor: '#111', padding: 20, borderRadius: 30, width: '90%', borderWidth: 1, borderColor: '#00E5FF' },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  weekText: { color: '#666', width: '14.2%', textAlign: 'center', fontSize: 12 },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayBox: { width: '14.2%', height: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 5, borderRadius: 10 },
  dayBoxActive: { backgroundColor: '#00E5FF' },
  calendarFooter: { alignItems: 'center', marginTop: 20 },
  confirmBtn: { backgroundColor: '#00E5FF', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 20 }
});