import React, { useState, useEffect, useMemo } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, 
  SafeAreaView, ActivityIndicator, ImageBackground, Alert, Platform, Image, Modal 
} from 'react-native';
import { PieChart } from 'react-native-svg-charts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

// --- 常數定義 ---
// 請確保你的圖片路徑正確，檔名為 bg.jpg
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

// --- 子組件 1: 記帳表單 ---
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
            <Text style={[styles.currTextSmall, selectedCurr.code === c.code && {color:'#00E5FF'}]}>{c.flag} {c.code}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {selectedCurr.code !== 'HKD' && (
        <View style={styles.rateBox}>
          <Text style={styles.rateText}>實時匯率: 1 {selectedCurr.code} ≈ {(1 / (rates[selectedCurr.code] || 1)).toFixed(4)} HKD</Text>
        </View>
      )}

      <TextInput style={styles.cyberInput} placeholder="買咗咩？" placeholderTextColor="#999" value={item} onChangeText={setItem} />
      <TextInput style={styles.cyberInput} placeholder="金額" keyboardType="numeric" placeholderTextColor="#999" value={amount} onChangeText={setAmount} />
      
      <View style={styles.photoRow}>
        <TouchableOpacity style={styles.attachmentBtn} onPress={() => setIsPickerVisible(true)}><Text style={{color:'#FFF'}}>📷 附件</Text></TouchableOpacity>
        {capturedImage && <TouchableOpacity onPress={() => setViewingImage(capturedImage)}><Image source={{ uri: capturedImage }} style={styles.miniPreview} /></TouchableOpacity>}
      </View>

      <View style={styles.catGrid}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity key={cat.id} onPress={() => setSelectedCat(cat)} style={[styles.catItem, selectedCat.id === cat.id && {borderColor: cat.color, backgroundColor: 'rgba(255,255,255,0.1)'}]}>
            <Text style={{fontSize:18}}>{cat.icon}</Text>
            <Text style={styles.catLabel}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.addBtn} onPress={onSave}><Text style={styles.addBtnText}>{getButtonText()}</Text></TouchableOpacity>
      {editingId && <TouchableOpacity onPress={onReset} style={{marginTop:15, alignItems:'center'}}><Text style={{color:'#AAA'}}>取消修改</Text></TouchableOpacity>}
    </View>
  );
};

// --- 子組件 2: 統計圖表 ---
const AnalyticsCharts = ({ filtered, catLabel, setCatLabel, dayLabel, setDayLabel }) => {
  const total = filtered.reduce((s, e) => s + e.hkdAmount, 0);
  if (total === 0) return null;

  const catMap = {};
  filtered.forEach(e => { catMap[e.category.id] = (catMap[e.category.id] || 0) + e.hkdAmount; });
  const catPieData = Object.keys(catMap).map(id => ({
    key: `cat-${id}`, value: catMap[id], svg: { fill: CATEGORIES.find(c => c.id === id)?.color || '#555' },
    onPress: () => setCatLabel({ title: CATEGORIES.find(c => c.id === id)?.label || '', val: catMap[id] })
  }));

  const dayMap = {};
  filtered.forEach(e => { dayMap[e.day] = (dayMap[e.day] || 0) + e.hkdAmount; });
  const maxDay = Object.entries(dayMap).reduce((a, b) => (b[1] > a[1] ? b : a), ["-", 0]);
  const dayPieData = Object.keys(dayMap).sort((a,b)=>Number(a)-Number(b)).map((day, idx) => ({
    key: `day-${day}`, value: dayMap[day], svg: { fill: RAINBOW_COLORS[idx % RAINBOW_COLORS.length] },
    onPress: () => setDayLabel({ title: `${day}日`, val: dayMap[day] })
  }));

  return (
    <View style={styles.chartsWrapper}>
      <View style={styles.chartFlexRow}>
        <View style={styles.chartContainer}>
          <PieChart style={{ height: 110, width: 110 }} data={catPieData} innerRadius="75%" />
          <View style={styles.chartCenterText} pointerEvents="none">
            <Text style={styles.centerTitle}>{catLabel.val === 0 ? "類別" : catLabel.title}</Text>
            <Text style={styles.centerVal}>${(catLabel.val === 0 ? total : catLabel.val).toFixed(0)}</Text>
          </View>
        </View>
        <View style={styles.chartContainer}>
          <PieChart style={{ height: 110, width: 110 }} data={dayPieData} innerRadius="75%" />
          <View style={styles.chartCenterText} pointerEvents="none">
            <Text style={styles.centerTitle}>{dayLabel.val === 0 ? `最高` : dayLabel.title}</Text>
            <Text style={styles.centerVal}>${(dayLabel.val === 0 ? maxDay[1] : dayLabel.val).toFixed(0)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

// --- 主程式進入點 ---
export default function Index() {
  const [activeTab, setActiveTab] = useState('RECORD');
  const [expenses, setExpenses] = useState([]);
  const [rates, setRates] = useState({ HKD: 1 });
  const [loading, setLoading] = useState(true);
  
  // 表單狀態
  const [editingId, setEditingId] = useState(null);
  const [item, setItem] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCurr, setSelectedCurr] = useState(CURRENCY_LIST[0]); 
  const [selectedCat, setSelectedCat] = useState(CATEGORIES[0]);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isPickerVisible, setIsPickerVisible] = useState(false);

  // 檢視狀態
  const [searchQuery, setSearchQuery] = useState('');
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(`${new Date().getMonth() + 1}月`);
  const [isYearlyView, setIsYearlyView] = useState(false);
  const [viewingImage, setViewingImage] = useState(null);
  const [catLabel, setCatLabel] = useState({ title: '總計', val: 0 });
  const [dayLabel, setDayLabel] = useState({ title: '最高支出', val: 0 });

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('MY_EXPENSES');
        if (saved) setExpenses(JSON.parse(saved));
        const res = await fetch('https://open.er-api.com/v6/latest/HKD');
        const data = await res.json();
        if (data?.rates) setRates(data.rates);
      } catch (e) { console.log("初始化錯誤:", e); } finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => { 
    AsyncStorage.setItem('MY_EXPENSES', JSON.stringify(expenses)); 
  }, [expenses]);

  const filteredData = useMemo(() => {
    return expenses.filter(e => {
      const matchSearch = e.item.toLowerCase().includes(searchQuery.toLowerCase()) || e.category.label.includes(searchQuery);
      const matchTime = isYearlyView ? e.year === viewYear : (e.year === viewYear && e.month === selectedMonth);
      return matchSearch && matchTime;
    });
  }, [expenses, searchQuery, viewYear, selectedMonth, isYearlyView]);

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
        image: capturedImage,
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
        {/* 黑色半透明遮罩層 */}
        <View style={styles.overlay}>
          <SafeAreaView style={{flex:1}}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
              <View style={styles.header}>
                <Text style={styles.headerTitle}>MoneyCount 💸</Text>
              </View>

              {activeTab === 'RECORD' ? (
                <ExpenseForm 
                  editingId={editingId} item={item} setItem={setItem} 
                  amount={amount} setAmount={setAmount} 
                  selectedCurr={selectedCurr} setSelectedCurr={setSelectedCurr}
                  selectedCat={selectedCat} setSelectedCat={setSelectedCat}
                  rates={rates} onSave={saveExpense} onReset={resetForm}
                  setIsPickerVisible={setIsPickerVisible} capturedImage={capturedImage} setViewingImage={setViewingImage}
                />
              ) : (
                <>
                  <View style={styles.searchContainer}>
                    <TextInput style={styles.searchInput} placeholder="🔍 搜尋項目/類別..." placeholderTextColor="#BBB" value={searchQuery} onChangeText={setSearchQuery} />
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

                  <View style={styles.monthGrid}>
                    {MONTHS.map(m => (
                      <TouchableOpacity key={m} onPress={() => { setSelectedMonth(m); setIsYearlyView(false); }} style={[styles.monthBox, (!isYearlyView && selectedMonth === m && styles.activeBorder)]}>
                        <Text style={{fontSize:10, color: (!isYearlyView && selectedMonth === m) ? '#00E5FF' : '#EEE'}}>{m}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

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
                      {Object.keys(filteredData.reduce((g, e) => { (g[e.day] = g[e.day] || []).push(e); return g; }, {})).sort((a,b)=>b-a).map(day => {
                        const dayItems = filteredData.filter(e => e.day === Number(day));
                        return (
                          <View key={`day-${day}`} style={styles.dayGroupWrapper}>
                            <View style={styles.dayHeader}>
                              <Text style={styles.dayHeaderText}>{day}日</Text>
                              <Text style={styles.daySumText}>日計: ${dayItems.reduce((s, e) => s + e.hkdAmount, 0).toFixed(0)}</Text>
                            </View>
                            {dayItems.map(exp => (
                              <View key={exp.id} style={styles.listItem}>
                                <Text style={{fontSize: 20}}>{exp.category.icon}</Text>
                                <View style={{flex:1, marginLeft:12}}>
                                  <Text style={{color: '#FFF', fontWeight: 'bold', textShadowColor: '#000', textShadowRadius: 1}}>{exp.item}</Text>
                                  <Text style={{color:'#CCC', fontSize:11}}>{exp.currency.code} {exp.foreignAmount} ({exp.category.label})</Text>
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
                    </>
                  )}
                </>
              )}
              <View style={{height:120}}/>
            </ScrollView>
          </SafeAreaView>

          <View style={styles.nav}>
            <TouchableOpacity onPress={() => setActiveTab('RECORD')} style={styles.navBtn}><Text style={[styles.navText, activeTab === 'RECORD' && styles.navActive]}>記帳</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveTab('OVERVIEW')} style={styles.navBtn}><Text style={[styles.navText, activeTab === 'OVERVIEW' && styles.navActive]}>總覽</Text></TouchableOpacity>
          </View>
        </View>
      </ImageBackground>

      {/* --- Modals --- */}
      <Modal visible={isPickerVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>添加收據圖片</Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => pickImage(true)}><Text style={styles.pickerBtnText}>📸 開啟相機</Text></TouchableOpacity>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => pickImage(false)}><Text style={styles.pickerBtnText}>🖼️ 從相簿選擇</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.pickerBtn, {backgroundColor: '#333', marginTop: 10}]} onPress={() => setIsPickerVisible(false)}><Text style={{color: '#FF5252', fontWeight: 'bold'}}>取消</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={!!viewingImage} transparent animationType="fade">
        <TouchableOpacity style={styles.modalBg} onPress={() => setViewingImage(null)}>
          <Image source={{ uri: viewingImage }} style={styles.fullImage} resizeMode="contain" />
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' }, 
  bgImage: { flex: 1, width: '100%' }, 
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }, // 背景遮罩
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  scrollContent: { padding: 20, paddingTop: 40 }, 
  header: { marginBottom: 15 }, 
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#00E5FF', textShadowColor: '#000', textShadowRadius: 3 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  searchContainer: { flexDirection: 'row', marginBottom: 15, alignItems: 'center' },
  searchInput: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', color: '#FFF', padding: 12, borderRadius: 15, borderWidth: 1, borderColor: '#666' },
  yearSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 10, padding: 8 },
  yearText: { color: '#FFF', marginHorizontal: 12, fontWeight: 'bold' }, 
  cyanText: { color: '#00E5FF', fontSize: 18 },
  yearlyToggle: { backgroundColor: 'rgba(0,229,255,0.2)', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#00E5FF' },
  cyberCard: { backgroundColor: 'rgba(0,0,0,0.85)', borderRadius: 25, padding: 20, borderWidth: 1, borderColor: '#555' },
  formStatusText: {color:'#00E5FF', marginBottom:10, fontWeight:'bold'},
  currBtnFull: { width: '100%', padding: 14, backgroundColor: '#111', borderRadius: 12, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#555' },
  currGridSmall: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 10 },
  currBtnSmall: { width: '31%', padding: 10, backgroundColor: '#111', borderRadius: 10, alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: '#333' },
  currActive: { borderColor: '#00E5FF' }, 
  currText: { color: '#AAA', fontWeight: 'bold' }, 
  currTextSmall: { color: '#AAA', fontSize: 11 },
  rateBox: { backgroundColor: 'rgba(0,229,255,0.1)', padding: 10, borderRadius: 10, marginBottom: 15 },
  rateText: { color: '#00E5FF', fontSize: 12, textAlign: 'center' },
  cyberInput: { backgroundColor: '#FFF', color: '#000', padding: 15, borderRadius: 15, marginBottom: 10, fontSize: 16 },
  photoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  attachmentBtn: { backgroundColor: '#333', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#00E5FF', marginRight: 15 },
  miniPreview: { width: 45, height: 45, borderRadius: 8, borderWidth: 1, borderColor: '#00E5FF' },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 10 },
  catItem: { width: '18%', aspectRatio: 1, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#444' },
  catLabel: { fontSize: 9, color: '#DDD', marginTop: 4, textAlign: 'center' },
  addBtn: { backgroundColor: '#00E5FF', padding: 18, borderRadius: 20, alignItems: 'center' },
  addBtnText: { color: '#000', fontWeight: 'bold', fontSize: 14, textAlign: 'center' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 15 },
  monthBox: { width: '15%', paddingVertical: 10, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 10, alignItems: 'center', marginBottom: 6, borderWidth: 1, borderColor: '#444' },
  activeBorder: { borderColor: '#00E5FF', backgroundColor: 'rgba(0,229,255,0.1)' },
  chartsWrapper: { backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: 25, padding: 15, marginBottom: 20 },
  chartFlexRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  chartContainer: { alignItems: 'center', justifyContent: 'center' },
  chartCenterText: { position: 'absolute', alignItems: 'center', justifyContent: 'center', width: 70 },
  centerTitle: { color: '#DDD', fontSize: 9, textAlign: 'center' }, 
  centerVal: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  dayGroupWrapper: { marginBottom: 20 },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderLeftWidth: 3, borderLeftColor: '#00E5FF', backgroundColor: 'rgba(0,0,0,0.6)', marginBottom: 8, borderRadius: 4 },
  dayHeaderText: { color: '#00E5FF', fontWeight: 'bold', fontSize: 14 },
  daySumText: { color: '#EEE', fontSize: 12 },
  listItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.65)', padding: 12, borderRadius: 18, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  listThumb: { width: 35, height: 35, borderRadius: 5, marginRight: 10 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  fullImage: { width: '90%', height: '80%' },
  yearlyListContainer: { backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: 25, padding: 20 },
  yearlyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  monthLabel: { color: '#FFF', width: 40 },
  barTrack: { flex: 1, height: 12, backgroundColor: '#222', borderRadius: 6, marginHorizontal: 12, overflow: 'hidden' },
  barFill: { height: '100%' }, 
  amountLabel: { color: '#EEE', width: 65, textAlign: 'right', fontSize: 12 },
  nav: { 
    position: 'absolute', 
    bottom: 0, 
    width: '100%', 
    flexDirection: 'row', 
    height: Platform.OS === 'android' ? 100 : 90, 
    paddingBottom: Platform.OS === 'android' ? 25 : 0, 
    backgroundColor: 'rgba(0,0,0,0.9)', 
    borderTopWidth: 1, 
    borderColor: '#444' 
  },
  navBtn: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  navText: { color: '#AAA', fontSize: 12 }, 
  navActive: { color: '#00E5FF', fontWeight: 'bold' },
  pickerCard: { backgroundColor: '#111', width: '80%', padding: 25, borderRadius: 25, borderWidth: 1, borderColor: '#00E5FF', alignItems: 'center' },
  pickerTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 20 },
  pickerBtn: { width: '100%', backgroundColor: '#222', padding: 15, borderRadius: 15, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#444' },
  pickerBtnText: { color: '#00E5FF', fontSize: 15, fontWeight: '500' }
});