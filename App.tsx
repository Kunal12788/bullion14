
import React, { useState, useEffect, useMemo } from 'react';
import Layout from './components/Layout';
import InvoiceForm from './components/InvoiceForm';
import InventoryTable from './components/InventoryTable';
import StatsCard from './components/StatsCard';
import { DateRangePicker } from './components/DateRangePicker'; 
import { SingleDatePicker } from './components/SingleDatePicker';
import Toast, { ToastMessage } from './components/Toast'; 
import { Invoice, InventoryBatch, CustomerStat, AgingStats, SupplierStat, RiskAlert } from './types';
import { fetchData, saveData, resetData } from './services/storeService';
import { formatCurrency, formatGrams, calculateInventoryValueOnDate, getDateDaysAgo, calculateStockAging, calculateSupplierStats, calculateTurnoverStats, generateId, downloadCSV, downloadJSON } from './utils';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { 
  ArrowUpRight, ArrowDownLeft, Scale, Coins, Trash2, TrendingUp, AlertTriangle, 
  History, Percent, Award, Calendar, FileSpreadsheet, FileText, Info,
  AlertOctagon, BadgeAlert, TrendingDown, Hourglass, Factory, Lock, Search, Filter,
  ArrowRightLeft, LineChart, CandlestickChart, Download, Users, ChevronRight, Crown, Briefcase, ChevronUp, ChevronDown,
  Timer, PieChart as PieIcon, BarChart3, Activity, Wallet, FileDown, CheckSquare, X, UploadCloud, Settings, Save, HardDrive, Database, Loader2
} from 'lucide-react';
import { 
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart as ReLineChart, Line, AreaChart, Area, ComposedChart, PieChart, Pie
} from 'recharts';

// --- Shared UI Components ---

const Card: React.FC<{ children: React.ReactNode; className?: string; title?: React.ReactNode; action?: React.ReactNode, delay?: number }> = ({ children, className = '', title, action, delay = 0 }) => (
  <div 
    className={`bg-white rounded-2xl border border-slate-100 shadow-card flex flex-col overflow-hidden animate-slide-up ${className}`}
    style={{ animationDelay: `${delay}ms` }}
  >
    {title && (
      <div className="px-4 md:px-6 py-4 border-b border-slate-50 flex flex-wrap justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-10 gap-2">
        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">{title}</h3>
        {action && <div>{action}</div>}
      </div>
    )}
    <div className="p-4 md:p-6 flex-1 overflow-auto">{children}</div>
  </div>
);

const SectionHeader: React.FC<{ title: string; subtitle?: string; action?: React.ReactNode }> = ({ title, subtitle, action }) => (
  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 animate-slide-up">
    <div>
      <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h2>
      {subtitle && <p className="text-slate-500 text-sm mt-1 font-medium">{subtitle}</p>}
    </div>
    {action && <div className="flex gap-2 w-full md:w-auto">{action}</div>}
  </div>
);

const ExportMenu: React.FC<{ onExport: (type: 'CSV' | 'PDF') => void }> = ({ onExport }) => (
    <div className="flex gap-2">
        <button onClick={() => onExport('CSV')} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors">
            <FileSpreadsheet className="w-4 h-4" /> CSV
        </button>
        <button onClick={() => onExport('PDF')} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-slate-900 border border-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-sm">
            <FileText className="w-4 h-4" /> PDF
        </button>
    </div>
);

const SettingsView: React.FC<{ onBackup: () => void; onRestore: (e: any) => void; onReset: () => void }> = ({ onBackup, onRestore, onReset }) => (
    <div className="space-y-6 animate-slide-up">
        <SectionHeader title="Data Management" subtitle="Backup, restore, or reset your secure cloud ledger." />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card title="Backup Database">
                <div className="flex flex-col items-center text-center p-4">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                        <Download className="w-8 h-8" />
                    </div>
                    <h3 className="font-bold text-slate-900 mb-2">Export to File</h3>
                    <p className="text-sm text-slate-500 mb-6">Download a secure JSON copy of your entire inventory and transaction history.</p>
                    <button onClick={onBackup} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
                        <FileDown className="w-4 h-4" /> Download Backup
                    </button>
                </div>
            </Card>

            <Card title="Restore Database">
                <div className="flex flex-col items-center text-center p-4">
                    <div className="w-16 h-16 bg-gold-50 text-gold-600 rounded-full flex items-center justify-center mb-4">
                        <UploadCloud className="w-8 h-8" />
                    </div>
                    <h3 className="font-bold text-slate-900 mb-2">Import from File</h3>
                    <p className="text-sm text-slate-500 mb-6">Restore your data from a previous backup. This will replace current cloud data.</p>
                    <label className="w-full py-3 bg-white border-2 border-slate-200 hover:border-gold-500 hover:text-gold-600 text-slate-600 font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2">
                        <HardDrive className="w-4 h-4" /> Select Backup File
                        <input type="file" accept=".json" onChange={onRestore} className="hidden" />
                    </label>
                </div>
            </Card>

             <Card title="Danger Zone">
                <div className="flex flex-col items-center text-center p-4">
                    <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4">
                        <Trash2 className="w-8 h-8" />
                    </div>
                    <h3 className="font-bold text-slate-900 mb-2">System Reset</h3>
                    <p className="text-sm text-slate-500 mb-6">Permanently delete all cloud data and start fresh. Cannot be undone.</p>
                    <button onClick={onReset} className="w-full py-3 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-100 font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> Factory Reset
                    </button>
                </div>
            </Card>
        </div>
        
        <div className="bg-slate-900 rounded-2xl p-6 flex items-start gap-4">
            <Database className="w-6 h-6 text-gold-500 flex-shrink-0 mt-1" />
            <div>
                <h4 className="text-white font-bold text-lg mb-1">Cloud Synchronization Active</h4>
                <p className="text-slate-400 text-sm leading-relaxed">
                    BullionKeep AI is connected to a secure Neon PostgreSQL database. All transactions and inventory changes are synchronized in real-time. 
                    Data entered on this device will be instantly available on all other devices connected to this application.
                </p>
            </div>
        </div>
    </div>
);

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [inventory, setInventory] = useState<InventoryBatch[]>([]);
  const [marketRate, setMarketRate] = useState<string>(''); 
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDataLoaded, setIsDataLoaded] = useState(false); // New state to track loading
  
  // Delete Modal State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const [dateRange, setDateRange] = useState({
      start: getDateDaysAgo(30),
      end: new Date().toISOString().split('T')[0]
  });
  const [lockDate, setLockDate] = useState<string | null>(localStorage.getItem('bullion_lock_date') || null);

  // Load Data Async from DB
  useEffect(() => {
    const initData = async () => {
        const { invoices: dbInvoices, inventory: dbInventory } = await fetchData();
        setInvoices(dbInvoices);
        setInventory(dbInventory);
        setIsDataLoaded(true); // Enable saving only after initial load
    };
    initData();
  }, []);

  // Save Data to DB on Change (Only if loaded)
  useEffect(() => {
    if (isDataLoaded) {
        saveData(invoices, inventory);
    }
  }, [invoices, inventory, isDataLoaded]);

  useEffect(() => {
      if(lockDate) localStorage.setItem('bullion_lock_date', lockDate);
      else localStorage.removeItem('bullion_lock_date');
  }, [lockDate]);

  const addToast = (type: 'SUCCESS' | 'ERROR', message: string) => {
      const id = generateId();
      setToasts(prev => [...prev, { id, type, message }]);
  };
  const removeToast = (id: string) => {
      setToasts(prev => prev.filter(t => t.id !== id));
  };

  // --- DERIVED INTELLIGENCE (GLOBAL) ---
  const filteredInvoices = useMemo(() => {
      const query = searchQuery.toLowerCase();
      return invoices.filter(inv => {
          const matchesDate = inv.date >= dateRange.start && inv.date <= dateRange.end;
          const matchesSearch = !query || inv.partyName.toLowerCase().includes(query);
          return matchesDate && matchesSearch;
      });
  }, [invoices, dateRange, searchQuery]);

  // Inventory filtered by Date AND Search (for Table View)
  const filteredInventory = useMemo(() => {
      const query = searchQuery.toLowerCase();
      return inventory.filter(batch => {
          const matchesDate = batch.date >= dateRange.start && batch.date <= dateRange.end;
          if (!matchesDate) return false;
          if (!query) return true;
          const invoice = invoices.find(inv => inv.id === batch.id);
          return invoice ? invoice.partyName.toLowerCase().includes(query) : false;
      });
  }, [inventory, invoices, dateRange, searchQuery]);

  // Inventory filtered ONLY by Search (for Global Stock Stats)
  const searchFilteredInventory = useMemo(() => {
      const query = searchQuery.toLowerCase();
      if (!query) return inventory;
      return inventory.filter(batch => {
          const invoice = invoices.find(inv => inv.id === batch.id);
          return invoice ? invoice.partyName.toLowerCase().includes(query) : false;
      });
  }, [inventory, invoices, searchQuery]);

  const currentStock = useMemo(() => searchFilteredInventory.reduce((acc, batch) => acc + batch.remainingQuantity, 0), [searchFilteredInventory]);
  const fifoValue = useMemo(() => searchFilteredInventory.reduce((acc, batch) => acc + (batch.remainingQuantity * batch.costPerGram), 0), [searchFilteredInventory]);
  
  const agingStats: AgingStats = useMemo(() => calculateStockAging(searchFilteredInventory), [searchFilteredInventory]);

  const { customerData, totalProfit, profitTrendData, dailyProfit } = useMemo(() => {
      const customerStats: Record<string, CustomerStat & { avgQtyPerTx?: number, avgSellingPrice?: number, behaviorPattern?: string }> = {};
      let totalRevenueExTax = 0;
      let totalProfitCalc = 0;

      filteredInvoices.forEach(inv => {
          if (!customerStats[inv.partyName]) {
              customerStats[inv.partyName] = { 
                  name: inv.partyName, totalGrams: 0, totalSpend: 0, profitContribution: 0, txCount: 0, avgProfitPerGram: 0
              };
          }
          customerStats[inv.partyName].txCount += 1;

          if (inv.type === 'SALE') {
              customerStats[inv.partyName].totalGrams += inv.quantityGrams;
              // Using taxableAmount (Ex-GST) for total spend analysis as requested
              customerStats[inv.partyName].totalSpend += inv.taxableAmount; 
              customerStats[inv.partyName].profitContribution += (inv.profit || 0);

              totalRevenueExTax += (inv.quantityGrams * inv.ratePerGram);
              totalProfitCalc += (inv.profit || 0);
          }
      });

      const data = Object.values(customerStats)
        .filter(stat => stat.totalSpend > 0)
        .map(stat => {
            const margin = stat.totalSpend > 0 ? (stat.profitContribution / stat.totalSpend) * 100 : 0;
            const avgQty = stat.totalGrams / stat.txCount;
            const avgSell = stat.totalGrams > 0 ? stat.totalSpend / stat.totalGrams : 0;
            const avgProfit = stat.totalGrams > 0 ? stat.profitContribution / stat.totalGrams : 0;
            
            let pattern = "Regular";
            if(avgQty > 100) pattern = "Bulk Buyer";
            else if(stat.txCount > 5) pattern = "Frequent";
            
            if(margin < 0.5) pattern += " (Price Sensitive)";
            else if(margin > 2.0) pattern += " (High Margin)";

            return {
                ...stat,
                margin: margin,
                avgProfitPerGram: avgProfit,
                avgQtyPerTx: avgQty,
                avgSellingPrice: avgSell,
                behaviorPattern: pattern
            };
        })
        .sort((a,b) => b.profitContribution - a.profitContribution);

      const pTrend = [];
      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          const sales = invoices.filter(inv => inv.type === 'SALE' && inv.date === dateStr); 
          const profit = sales.reduce((acc, inv) => acc + (inv.profit || 0), 0);
          const grams = sales.reduce((acc, inv) => acc + inv.quantityGrams, 0);
          pTrend.push({ 
             date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), 
             profit: profit,
             ppg: grams > 0 ? profit / grams : 0
          });
      }

      return {
          customerData: data,
          totalProfit: totalProfitCalc,
          profitMargin: totalRevenueExTax > 0 ? (totalProfitCalc / totalRevenueExTax) * 100 : 0,
          profitTrendData: pTrend,
          dailyProfit: pTrend
      };
  }, [filteredInvoices, dateRange, invoices]);

  const supplierData: SupplierStat[] = useMemo(() => calculateSupplierStats(filteredInvoices), [filteredInvoices]);
  const turnoverStats = useMemo(() => calculateTurnoverStats(invoices, dateRange.start, dateRange.end), [invoices, dateRange]);
  
  const alerts: RiskAlert[] = useMemo(() => {
    const list: RiskAlert[] = [];
    if (agingStats.buckets['30+'] > 0) {
      list.push({ id: 'old-stock', severity: 'HIGH', context: 'Inventory', message: `${formatGrams(agingStats.buckets['30+'])} of gold is older than 30 days.` });
    }
    const recentSales = invoices.filter(i => i.type === 'SALE').slice(0, 5);
    if (recentSales.length > 0) {
       const recentMargin = recentSales.reduce((acc, i) => acc + (i.profit || 0), 0) / recentSales.reduce((acc, i) => acc + (i.taxableAmount || 0), 0);
       if (recentMargin < 0.005) { 
         list.push({ id: 'low-margin', severity: 'MEDIUM', context: 'Profit', message: 'Recent sales margins are critically low (< 0.5%).' });
       }
    }
    return list;
  }, [agingStats, invoices]);

  // Recalculates entire inventory from scratch based on a list of invoices
  const recalculateAllData = (allInvoices: Invoice[]) => {
    const sorted = [...allInvoices].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let currentInventory: InventoryBatch[] = [];
    const processedInvoices: Invoice[] = [];

    for (const inv of sorted) {
        if (inv.type === 'PURCHASE') {
            const newBatch: InventoryBatch = {
                id: inv.id,
                date: inv.date,
                originalQuantity: inv.quantityGrams,
                remainingQuantity: inv.quantityGrams,
                costPerGram: inv.ratePerGram
            };
            currentInventory.push(newBatch);
            processedInvoices.push(inv);
        } else {
            // SALE Logic
            let remainingToSell = inv.quantityGrams;
            let totalCOGS = 0;
            
            for (const batch of currentInventory) {
                if (remainingToSell <= 0) break;
                if (batch.remainingQuantity > 0) {
                    const take = Math.min(batch.remainingQuantity, remainingToSell);
                    batch.remainingQuantity -= take;
                    remainingToSell -= take;
                    totalCOGS += (take * batch.costPerGram);
                    
                    if (batch.remainingQuantity < 0.0001) {
                         batch.remainingQuantity = 0;
                         batch.closedDate = inv.date;
                    }
                }
            }
            const profit = (inv.taxableAmount || (inv.quantityGrams * inv.ratePerGram)) - totalCOGS;
            processedInvoices.push({ ...inv, cogs: totalCOGS, profit });
        }
    }
    
    return {
        updatedInvoices: processedInvoices,
        updatedInventory: currentInventory
    };
  };

  const initiateDelete = (id: string) => {
      setDeleteId(id);
      setPendingDeleteIds([]);
      setDeletePassword('');
      setShowDeleteModal(true);
  };
  
  const initiateBulkDelete = (ids: string[]) => {
      setPendingDeleteIds(ids);
      setDeleteId(null);
      setDeletePassword('');
      setShowDeleteModal(true);
  };

  const confirmDelete = () => {
      if (deletePassword === 'QAZ@789') {
          let remainingInvoices = invoices;
          
          if (deleteId) {
             remainingInvoices = invoices.filter(i => i.id !== deleteId);
          } else if (pendingDeleteIds.length > 0) {
             remainingInvoices = invoices.filter(i => !pendingDeleteIds.includes(i.id));
          }

          if (deleteId || pendingDeleteIds.length > 0) {
              const { updatedInvoices, updatedInventory } = recalculateAllData(remainingInvoices);
              setInvoices(updatedInvoices);
              setInventory(updatedInventory);
              addToast('SUCCESS', deleteId ? 'Record deleted.' : `${pendingDeleteIds.length} Records deleted.`);
          }
          
          setShowDeleteModal(false);
          setDeleteId(null);
          setPendingDeleteIds([]);
          setDeletePassword('');
      } else {
          addToast('ERROR', 'Incorrect Admin Password.');
      }
  };

  const handleAddInvoice = (invoice: Invoice) => {
    if (invoice.type === 'PURCHASE') {
        setInvoices(prev => [invoice, ...prev]); 
        const newBatch: InventoryBatch = { id: invoice.id, date: invoice.date, originalQuantity: invoice.quantityGrams, remainingQuantity: invoice.quantityGrams, costPerGram: invoice.ratePerGram };
        setInventory(prev => [...prev, newBatch].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
        addToast('SUCCESS', 'Purchase recorded & Inventory Updated');
    } else {
        const latestInvoiceDate = invoices.length > 0 ? invoices[0].date : '';
        if (latestInvoiceDate && invoice.date < latestInvoiceDate) {
             const newInvoices = [...invoices, invoice];
             const { updatedInvoices, updatedInventory } = recalculateAllData(newInvoices);
             setInvoices(updatedInvoices.reverse()); 
             setInventory(updatedInventory);
             addToast('SUCCESS', 'Back-dated Sale recorded. History Recalculated.');
             return;
        }

        let remainingToSell = invoice.quantityGrams;
        let totalCOGS = 0;
        const newInventory = JSON.parse(JSON.stringify(inventory)) as InventoryBatch[];

        for (const batch of newInventory) {
            if (remainingToSell <= 0) break;
            if (batch.remainingQuantity > 0) {
                const take = Math.min(batch.remainingQuantity, remainingToSell);
                batch.totalRevenue = (batch.totalRevenue || 0) + (take * invoice.ratePerGram);
                batch.remainingQuantity -= take;
                remainingToSell -= take;
                totalCOGS += (take * batch.costPerGram);
                if (batch.remainingQuantity < 0.0001) { 
                    batch.remainingQuantity = 0;
                    batch.closedDate = invoice.date;
                }
            }
        }
        if (remainingToSell > 0.001) { addToast('ERROR', "FIFO Mismatch - Check Stock"); return; }
        const profit = (invoice.quantityGrams * invoice.ratePerGram) - totalCOGS;
        setInvoices(prev => [{ ...invoice, cogs: totalCOGS, profit }, ...prev]);
        setInventory(newInventory);
        addToast('SUCCESS', 'Sale recorded. FIFO Logic Applied.');
    }
  };
  
  // --- BACKUP & RESTORE LOGIC ---
  
  const handleBackup = () => {
      const backupData = { invoices, inventory, timestamp: new Date().toISOString(), app: "BullionKeepAI" };
      downloadJSON(backupData, `bullionkeep_backup_${new Date().toISOString().split('T')[0]}.json`);
      addToast('SUCCESS', 'Backup file downloaded successfully.');
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              const data = JSON.parse(event.target?.result as string);
              if (data.app !== "BullionKeepAI" && !window.confirm("Format looks different. Import anyway?")) return;
              if (Array.isArray(data.invoices) && Array.isArray(data.inventory)) {
                  setInvoices(data.invoices);
                  setInventory(data.inventory);
                  // Force sync to DB immediately after restore
                  await saveData(data.invoices, data.inventory);
                  addToast('SUCCESS', 'Database restored and synchronized to cloud.');
              } else {
                  addToast('ERROR', 'Invalid backup file.');
              }
          } catch (err) {
              console.error(err);
              addToast('ERROR', 'Failed to parse file.');
          }
      };
      reader.readAsText(file);
      e.target.value = ''; 
  };

  const handleReset = async () => {
      if(window.confirm("CRITICAL WARNING: This will permanently delete ALL data from the cloud database. There is no undo. Are you absolutely sure?")) {
          await resetData(); 
          setInvoices([]); setInventory([]);
          addToast('SUCCESS', 'System Reset Complete. Cloud data wiped.');
      }
  }

  // --- EXPORT HANDLERS (Same as before) ---
  const generatePDF = (title: string, head: string[][], body: (string | number)[][], summary?: string[]) => {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text(title, 14, 15);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 22);
      if (summary) summary.forEach((line, i) => doc.text(line, 14, 28 + (i * 5)));
      autoTable(doc, { startY: summary ? 30 + (summary.length * 5) : 30, head: head, body: body, theme: 'grid', styles: { fontSize: 8 }, headStyles: { fillColor: [209, 151, 38] } });
      doc.save(`${title.replace(/\s+/g, '_').toLowerCase()}.pdf`);
      addToast('SUCCESS', `${title} downloaded.`);
  };

  const handleInventoryExport = (type: 'CSV' | 'PDF') => {
      const data = inventory.filter(inv => inv.date >= dateRange.start && inv.date <= dateRange.end).map(b => ({
          batchId: b.id, date: b.date, originalQty: b.originalQuantity, remainingQty: b.remainingQuantity, costPerGram: b.costPerGram, totalValue: b.remainingQuantity * b.costPerGram, status: b.remainingQuantity > 0 ? 'Active' : 'Closed'
      }));
      if (type === 'CSV') {
          const headers = ['Batch ID', 'Date', 'Original Qty (g)', 'Remaining Qty (g)', 'Cost (INR/g)', 'Total Value (INR)', 'Status'];
          const csv = [headers.join(','), ...data.map(r => [r.batchId, r.date, r.originalQty, r.remainingQty, r.costPerGram, r.totalValue, r.status].join(','))].join('\n');
          downloadCSV(csv, `inventory_report_${new Date().toISOString().split('T')[0]}.csv`);
          addToast('SUCCESS', 'Inventory CSV downloaded.');
      } else {
          generatePDF('Inventory Report', [['Batch ID', 'Date', 'Original (g)', 'Remaining (g)', 'Cost/g', 'Value', 'Status']], data.map(r => [r.batchId, r.date, formatGrams(r.originalQty), formatGrams(r.remainingQty), formatCurrency(r.costPerGram), formatCurrency(r.totalValue), r.status]));
      }
  };
  const handlePriceExport = (type: 'CSV' | 'PDF', purchases: Invoice[]) => {
       if (type === 'CSV') {
           const headers = ['Date', 'Supplier', 'Quantity (g)', 'Rate (INR/g)', 'Total (INR)'];
           const csv = [headers.join(','), ...purchases.map(p => [p.date, `"${p.partyName}"`, p.quantityGrams, p.ratePerGram, p.quantityGrams * p.ratePerGram].join(','))].join('\n');
           downloadCSV(csv, `price_analysis_purchases_${dateRange.start}_${dateRange.end}.csv`);
           addToast('SUCCESS', 'Price Data CSV downloaded.');
       } else {
           generatePDF('Price Analysis - Purchases', [['Date', 'Supplier', 'Qty (g)', 'Rate (INR/g)', 'Total (INR)']], purchases.map(p => [p.date, p.partyName, formatGrams(p.quantityGrams), formatCurrency(p.ratePerGram), formatCurrency(p.quantityGrams * p.ratePerGram)]));
       }
  };
  const handleCustomerExport = (type: 'CSV' | 'PDF') => {
       if (type === 'CSV') {
           const headers = ['Customer', 'Frequency', 'Total Grams', 'Revenue (Ex GST)', 'Avg Price', 'Avg Profit/g', 'Pattern'];
           const csv = [headers.join(','), ...customerData.map(c => [`"${c.name}"`, c.txCount, c.totalGrams, c.totalSpend, c.avgSellingPrice, c.avgProfitPerGram, c.behaviorPattern].join(','))].join('\n');
           downloadCSV(csv, `customer_insights_${dateRange.start}_${dateRange.end}.csv`);
           addToast('SUCCESS', 'Customer Data CSV downloaded.');
       } else {
           generatePDF('Customer Intelligence Report', [['Customer', 'Freq', 'Total Grams', 'Revenue (Ex GST)', 'Avg Price', 'Profit/g', 'Pattern']], customerData.map(c => [c.name, c.txCount, formatGrams(c.totalGrams), formatCurrency(c.totalSpend), formatCurrency(c.avgSellingPrice || 0), formatCurrency(c.avgProfitPerGram || 0), c.behaviorPattern || '']));
       }
  };
  const handleSupplierExport = (type: 'CSV' | 'PDF') => {
       if (type === 'CSV') {
           const headers = ['Supplier', 'Transactions', 'Total Volume (g)', 'Avg Rate', 'Min Rate', 'Max Rate', 'Volatility'];
           const csv = [headers.join(','), ...supplierData.map(s => [`"${s.name}"`, s.txCount, s.totalGramsPurchased, s.avgRate, s.minRate, s.maxRate, s.volatility].join(','))].join('\n');
           downloadCSV(csv, `supplier_insights_${dateRange.start}_${dateRange.end}.csv`);
           addToast('SUCCESS', 'Supplier Data CSV downloaded.');
       } else {
           generatePDF('Supplier Insights Report', [['Supplier', 'Tx Count', 'Vol (g)', 'Avg Rate', 'Min', 'Max', 'Volatility']], supplierData.map(s => [s.name, s.txCount, formatGrams(s.totalGramsPurchased), formatCurrency(s.avgRate), formatCurrency(s.minRate), formatCurrency(s.maxRate), formatCurrency(s.volatility)]));
       }
  };
  const handleLedgerExport = (type: 'CSV' | 'PDF', monthlyData: any[], totals: any) => {
      if (type === 'CSV') {
          const headers = ['Month', 'Turnover (Ex GST)', 'Profit', 'Margin %', 'Qty Sold'];
          const csv = [headers.join(','), ...monthlyData.map(m => [m.date.toLocaleDateString('en-IN', {month: 'long', year: 'numeric'}), m.turnover, m.profit, (m.turnover > 0 ? (m.profit/m.turnover)*100 : 0).toFixed(2), m.qty].join(','))].join('\n');
          downloadCSV(csv, `business_ledger_lifetime.csv`);
          addToast('SUCCESS', 'Ledger CSV downloaded.');
      } else {
          generatePDF('Business Performance Ledger', [['Month', 'Turnover (Ex GST)', 'Profit', 'Margin %', 'Qty Sold']], monthlyData.map(m => [m.date.toLocaleDateString('en-IN', {month: 'long', year: 'numeric'}), formatCurrency(m.turnover), formatCurrency(m.profit), (m.turnover > 0 ? (m.profit/m.turnover)*100 : 0).toFixed(2) + '%', formatGrams(m.qty)]), [`Total Turnover (Ex GST): ${formatCurrency(totals.turnover)}`, `Total Profit: ${formatCurrency(totals.profit)}`, `Overall Margin: ${totals.margin.toFixed(2)}%`, `Total Gold Sold: ${formatGrams(totals.qty)}`]);
      }
  };
  const handleInvoicesExport = (type: 'CSV' | 'PDF', selectedOnly: Invoice[] | null = null) => {
       const source = selectedOnly || filteredInvoices;
       const data = [...source].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
       if (type === 'CSV') {
           const headers = ['Date', 'Type', 'Party', 'Qty (g)', 'Rate (INR/g)', 'My Cost (INR/g)', 'Taxable (Ex GST)', 'GST (INR)', 'Total (Inc GST)', 'My Total Cost (Ex GST)', 'Profit (Ex GST)'];
           const csv = [headers.join(','), ...data.map(i => {
                   const myCost = i.type === 'SALE' && i.cogs ? (i.cogs / i.quantityGrams) : 0;
                   const myTotalCost = i.type === 'SALE' ? (i.cogs || 0) : i.taxableAmount;
                   return [i.date, i.type, `"${i.partyName}"`, i.quantityGrams, i.ratePerGram, myCost > 0 ? myCost.toFixed(2) : '-', i.taxableAmount, i.gstAmount, i.totalAmount, myTotalCost, i.profit || 0].join(',')
               })].join('\n');
           downloadCSV(csv, `transactions_export_${new Date().toISOString().split('T')[0]}.csv`);
           addToast('SUCCESS', 'Transactions CSV downloaded.');
       } else {
           generatePDF('Transaction Report', [['Date', 'Type', 'Party', 'Qty', 'Rate', 'My Cost', 'Taxable', 'GST', 'Total', 'My Total Cost', 'Profit']], data.map(i => {
                 const myCost = i.type === 'SALE' && i.cogs ? (i.cogs / i.quantityGrams) : 0;
                 const myTotalCost = i.type === 'SALE' ? (i.cogs || 0) : i.taxableAmount;
                 return [i.date, i.type.substring(0,1), i.partyName, formatGrams(i.quantityGrams), formatCurrency(i.ratePerGram), myCost > 0 ? formatCurrency(myCost) : '-', formatCurrency(i.taxableAmount), formatCurrency(i.gstAmount), formatCurrency(i.totalAmount), formatCurrency(myTotalCost), i.profit ? formatCurrency(i.profit) : '-']
             }));
       }
  };
  const renderDateFilter = () => (<DateRangePicker startDate={dateRange.start} endDate={dateRange.end} onChange={(start, end) => setDateRange({ start, end })} />);

  // --- VIEW RENDERERS ---
  const DashboardView = () => (
      <div className="space-y-6 animate-enter">
          <SectionHeader title="Dashboard" subtitle="Overview of your inventory and financial health." action={renderDateFilter()}/>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard title="Current Stock" value={formatGrams(currentStock)} subValue={`${inventory.length} Batches`} icon={Coins} isActive/>
              <StatsCard title="Inventory Value" value={formatCurrency(fifoValue)} subValue="FIFO Basis" icon={Scale} delayIndex={1}/>
              <StatsCard title="Net Profit" value={formatCurrency(dailyProfit.reduce((sum, d) => sum + d.profit, 0))} subValue="Selected Period" icon={TrendingUp} delayIndex={2}/>
              <StatsCard title="Transactions" value={filteredInvoices.length.toString()} subValue={`${filteredInvoices.filter(i => i.type === 'SALE').length} Sales`} icon={ArrowRightLeft} delayIndex={3}/>
          </div>
          {/* Alerts */}
          {alerts.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {alerts.map((alert, idx) => (
                      <div key={idx} className={`p-4 rounded-xl border flex items-start gap-4 ${alert.severity === 'HIGH' ? 'bg-red-50 border-red-100 text-red-800' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
                          <div className={`p-2 rounded-lg ${alert.severity === 'HIGH' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}><AlertTriangle className="w-5 h-5" /></div>
                          <div><h4 className="font-bold text-sm uppercase tracking-wide mb-1">{alert.context}: {alert.severity} Risk</h4><p className="text-sm">{alert.message}</p></div>
                      </div>
                  ))}
              </div>
          )}
          {/* Quick Actions & Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card title="Profit Trend" className="lg:col-span-2 min-h-[350px]">
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={profitTrendData}>
                                <defs><linearGradient id="colorProfitDb" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}}/>
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} tickFormatter={(v) => `${v/1000}k`}/>
                                <Tooltip contentStyle={{backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} formatter={(value: number) => [formatCurrency(value), 'Net Profit']}/>
                                <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorProfitDb)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
              </Card>
              <Card title="Quick Actions" className="lg:col-span-1">
                  <div className="space-y-3">
                      <button onClick={() => setActiveTab('invoices')} className="w-full p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-gold-200 hover:shadow-md transition-all flex items-center gap-3 text-left group">
                          <div className="p-3 bg-white rounded-lg shadow-sm group-hover:bg-gold-50 text-gold-600 transition-colors"><FileText className="w-5 h-5"/></div>
                          <div><h4 className="font-bold text-slate-900">New Invoice</h4><p className="text-xs text-slate-500">Record purchase or sale</p></div>
                          <ChevronRight className="w-4 h-4 ml-auto text-slate-300 group-hover:text-gold-500"/>
                      </button>
                      <button onClick={() => setActiveTab('inventory')} className="w-full p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-blue-200 hover:shadow-md transition-all flex items-center gap-3 text-left group">
                          <div className="p-3 bg-white rounded-lg shadow-sm group-hover:bg-blue-50 text-blue-600 transition-colors"><ArrowUpRight className="w-5 h-5"/></div>
                          <div><h4 className="font-bold text-slate-900">Check Stock</h4><p className="text-xs text-slate-500">View inventory batches</p></div>
                          <ChevronRight className="w-4 h-4 ml-auto text-slate-300 group-hover:text-blue-500"/>
                      </button>
                      <button onClick={() => window.print()} className="w-full p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-300 hover:shadow-md transition-all flex items-center gap-3 text-left group">
                          <div className="p-3 bg-white rounded-lg shadow-sm group-hover:bg-slate-100 text-slate-600 transition-colors"><FileDown className="w-5 h-5"/></div>
                          <div><h4 className="font-bold text-slate-900">Print Report</h4><p className="text-xs text-slate-500">Export current view</p></div>
                          <ChevronRight className="w-4 h-4 ml-auto text-slate-300 group-hover:text-slate-500"/>
                      </button>
                  </div>
              </Card>
          </div>
      </div>
  );

  const InvoicesView = () => (
      <div className="space-y-6 animate-slide-up">
          <SectionHeader title="Invoices" subtitle="Record and manage all gold transactions." action={<div className="flex gap-2 items-center"><ExportMenu onExport={(t) => handleInvoicesExport(t)} />{renderDateFilter()}</div>}/>
          
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
               <div className="xl:col-span-1">
                   <InvoiceForm onAdd={handleAddInvoice} currentStock={currentStock} lockDate={lockDate} />
               </div>
               
               <div className="xl:col-span-2">
                   <div className="bg-white rounded-2xl shadow-card border border-slate-100 flex flex-col overflow-hidden h-full min-h-[500px]">
                       <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-white/50 backdrop-blur sticky top-0 z-10">
                           <h3 className="font-bold text-slate-800 flex items-center gap-2"><History className="w-4 h-4 text-slate-400"/> Recent Transactions</h3>
                           <div className="text-xs font-medium text-slate-400">{filteredInvoices.length} records found</div>
                       </div>
                       
                       <div className="overflow-auto flex-1">
                           <table className="w-full text-left text-sm">
                               <thead className="bg-slate-50/50 text-slate-500 font-medium border-b border-slate-100 sticky top-0 z-10">
                                   <tr>
                                       <th className="px-6 py-3">Date</th>
                                       <th className="px-6 py-3">Party</th>
                                       <th className="px-6 py-3 text-right">Qty (g)</th>
                                       <th className="px-6 py-3 text-right">Rate</th>
                                       <th className="px-6 py-3 text-right">Total</th>
                                       <th className="px-6 py-3 text-center">Action</th>
                                   </tr>
                               </thead>
                               <tbody className="divide-y divide-slate-50">
                                   {filteredInvoices.length === 0 ? (
                                       <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">No transactions found in this period.</td></tr>
                                   ) : (
                                       filteredInvoices.map((inv) => (
                                           <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                                               <td className="px-6 py-3 whitespace-nowrap text-slate-500 font-mono text-xs">{new Date(inv.date).toLocaleDateString('en-IN', {day: '2-digit', month: 'short'})}</td>
                                               <td className="px-6 py-3">
                                                   <div className="flex items-center gap-2">
                                                       <div className={`w-1.5 h-1.5 rounded-full ${inv.type === 'SALE' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                                                       <span className="font-medium text-slate-700">{inv.partyName}</span>
                                                   </div>
                                                   <div className="text-[10px] text-slate-400 ml-3.5">{inv.type}</div>
                                               </td>
                                               <td className="px-6 py-3 text-right font-mono text-slate-600">{formatGrams(inv.quantityGrams)}</td>
                                               <td className="px-6 py-3 text-right font-mono text-slate-500">{formatCurrency(inv.ratePerGram)}</td>
                                               <td className="px-6 py-3 text-right font-bold text-slate-900 font-mono">{formatCurrency(inv.totalAmount)}</td>
                                               <td className="px-6 py-3 text-center">
                                                   <button onClick={() => initiateDelete(inv.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                                       <Trash2 className="w-4 h-4"/>
                                                   </button>
                                               </td>
                                           </tr>
                                       ))
                                   )}
                               </tbody>
                           </table>
                       </div>
                   </div>
               </div>
          </div>
      </div>
  );

  const AnalyticsView = () => (
      <div className="space-y-6 animate-slide-up">
          <SectionHeader title="Analytics" subtitle="Performance metrics and trend analysis." action={renderDateFilter()}/>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Sales vs Purchases (Volume)" className="min-h-[350px]">
                  <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={(() => {
                          const data = [];
                          const start = new Date(dateRange.start);
                          const end = new Date(dateRange.end);
                          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                              const dateStr = d.toISOString().split('T')[0];
                              const dayInvoices = invoices.filter(i => i.date === dateStr);
                              const sold = dayInvoices.filter(i => i.type === 'SALE').reduce((acc, i) => acc + i.quantityGrams, 0);
                              const bought = dayInvoices.filter(i => i.type === 'PURCHASE').reduce((acc, i) => acc + i.quantityGrams, 0);
                              if (sold > 0 || bought > 0) data.push({ date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), Sold: sold, Bought: bought });
                          }
                          return data;
                      })()}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}}/>
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}}/>
                          <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} cursor={{fill: '#f8fafc'}}/>
                          <Legend />
                          <Bar dataKey="Sold" fill="#10b981" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Bought" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                  </ResponsiveContainer>
              </Card>

              <Card title="Inventory Aging Distribution" className="min-h-[350px]">
                   <ResponsiveContainer width="100%" height={300}>
                       <PieChart>
                           <Pie 
                                data={[
                                    { name: '< 7 Days', value: agingStats.buckets['0-7'], color: '#10b981' },
                                    { name: '8-15 Days', value: agingStats.buckets['8-15'], color: '#3b82f6' },
                                    { name: '16-30 Days', value: agingStats.buckets['16-30'], color: '#f59e0b' },
                                    { name: '> 30 Days', value: agingStats.buckets['30+'], color: '#ef4444' }
                                ].filter(d => d.value > 0)}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                innerRadius={60}
                                paddingAngle={5}
                           >
                               {[
                                    { name: '< 7 Days', value: agingStats.buckets['0-7'], color: '#10b981' },
                                    { name: '8-15 Days', value: agingStats.buckets['8-15'], color: '#3b82f6' },
                                    { name: '16-30 Days', value: agingStats.buckets['16-30'], color: '#f59e0b' },
                                    { name: '> 30 Days', value: agingStats.buckets['30+'], color: '#ef4444' }
                                ].filter(d => d.value > 0).map((entry, index) => (
                                   <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                               ))}
                           </Pie>
                           <Tooltip />
                           <Legend verticalAlign="bottom" height={36}/>
                       </PieChart>
                   </ResponsiveContainer>
              </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Turnover Ratio</p>
                  <p className="text-2xl font-mono font-bold text-slate-900">{turnoverStats.turnoverRatio.toFixed(2)}x</p>
              </div>
              <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Avg Days to Sell</p>
                  <p className="text-2xl font-mono font-bold text-slate-900">{turnoverStats.avgDaysToSell.toFixed(0)} Days</p>
              </div>
              <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Weighted Avg Age</p>
                  <p className="text-2xl font-mono font-bold text-slate-900">{agingStats.weightedAvgDays.toFixed(0)} Days</p>
              </div>
               <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Profit Margin</p>
                  <p className={`text-2xl font-mono font-bold ${turnoverStats.totalCOGS > 0 && totalProfit > 0 ? 'text-green-600' : 'text-slate-900'}`}>
                      {turnoverStats.totalCOGS > 0 ? ((totalProfit / turnoverStats.totalCOGS) * 100).toFixed(2) : 0}%
                  </p>
              </div>
          </div>
      </div>
  );

  const PriceAnalysisView = () => {
      const purchases = filteredInvoices.filter(i => i.type === 'PURCHASE').sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      return (
          <div className="space-y-6 animate-slide-up">
              <SectionHeader title="Price Analysis" subtitle="Gold rate trends based on your purchases." action={<div className="flex gap-2 items-center"><ExportMenu onExport={(t) => handlePriceExport(t, purchases)} />{renderDateFilter()}</div>}/>
              
              <Card title="Gold Rate Trend (Purchases)" className="min-h-[400px]">
                  <ResponsiveContainer width="100%" height={350}>
                      <AreaChart data={purchases}>
                          <defs><linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#eab308" stopOpacity={0.2}/><stop offset="95%" stopColor="#eab308" stopOpacity={0}/></linearGradient></defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                          <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString('en-IN', {day: '2-digit', month: 'short'})} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}}/>
                          <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}}/>
                          <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} formatter={(value: number) => [formatCurrency(value), 'Rate/g']}/>
                          <Area type="monotone" dataKey="ratePerGram" stroke="#eab308" strokeWidth={3} fillOpacity={1} fill="url(#colorRate)" />
                      </AreaChart>
                  </ResponsiveContainer>
              </Card>

              <div className="bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden">
                   <div className="px-6 py-4 border-b border-slate-50 font-bold text-slate-800">Purchase History</div>
                   <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-medium"><tr><th className="px-6 py-3">Date</th><th className="px-6 py-3">Supplier</th><th className="px-6 py-3 text-right">Qty</th><th className="px-6 py-3 text-right">Rate</th></tr></thead>
                        <tbody>
                            {purchases.map(p => (
                                <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                                    <td className="px-6 py-3 text-slate-500">{p.date}</td>
                                    <td className="px-6 py-3 font-medium text-slate-700">{p.partyName}</td>
                                    <td className="px-6 py-3 text-right font-mono">{formatGrams(p.quantityGrams)}</td>
                                    <td className="px-6 py-3 text-right font-mono font-bold text-slate-900">{formatCurrency(p.ratePerGram)}</td>
                                </tr>
                            ))}
                        </tbody>
                   </table>
              </div>
          </div>
      );
  };

  const CustomerInsightsView = () => (
      <div className="space-y-6 animate-slide-up">
          <SectionHeader title="Customer Insights" subtitle="Identify top buyers and behavior patterns." action={<div className="flex gap-2 items-center"><ExportMenu onExport={handleCustomerExport} />{renderDateFilter()}</div>}/>
          
          <div className="grid grid-cols-1 gap-6">
              {/* Top Cards for key metrics could go here */}
          </div>

          <div className="bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden">
               <div className="overflow-x-auto">
                   <table className="w-full text-left text-sm">
                       <thead className="bg-slate-50 text-slate-500 font-medium">
                           <tr>
                               <th className="px-6 py-3">Customer Name</th>
                               <th className="px-6 py-3 text-center">Freq</th>
                               <th className="px-6 py-3 text-right">Total Vol</th>
                               <th className="px-6 py-3 text-right">Total Revenue (Ex GST)</th>
                               <th className="px-6 py-3 text-right">Avg Price</th>
                               <th className="px-6 py-3 text-right">Margin %</th>
                               <th className="px-6 py-3">Pattern</th>
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                           {customerData.map((c, i) => (
                               <tr key={i} className="hover:bg-slate-50/50">
                                   <td className="px-6 py-3 font-bold text-slate-700">{c.name}</td>
                                   <td className="px-6 py-3 text-center"><span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-bold">{c.txCount}</span></td>
                                   <td className="px-6 py-3 text-right font-mono text-slate-600">{formatGrams(c.totalGrams)}</td>
                                   <td className="px-6 py-3 text-right font-mono font-medium text-slate-900">{formatCurrency(c.totalSpend)}</td>
                                   <td className="px-6 py-3 text-right font-mono text-slate-500 text-xs">{formatCurrency(c.avgSellingPrice || 0)}</td>
                                   <td className={`px-6 py-3 text-right font-mono font-bold ${c.margin && c.margin > 1 ? 'text-green-600' : 'text-amber-600'}`}>{(c.margin || 0).toFixed(2)}%</td>
                                   <td className="px-6 py-3"><span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">{c.behaviorPattern}</span></td>
                               </tr>
                           ))}
                       </tbody>
                   </table>
               </div>
          </div>
      </div>
  );

  const SupplierInsightsView = () => (
      <div className="space-y-6 animate-slide-up">
           <SectionHeader title="Supplier Insights" subtitle="Analyze procurement sources and costs." action={<div className="flex gap-2 items-center"><ExportMenu onExport={handleSupplierExport} />{renderDateFilter()}</div>}/>
           
           <div className="bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden">
               <div className="overflow-x-auto">
                   <table className="w-full text-left text-sm">
                       <thead className="bg-slate-50 text-slate-500 font-medium">
                           <tr>
                               <th className="px-6 py-3">Supplier Name</th>
                               <th className="px-6 py-3 text-center">Tx Count</th>
                               <th className="px-6 py-3 text-right">Total Purchased</th>
                               <th className="px-6 py-3 text-right">Avg Rate</th>
                               <th className="px-6 py-3 text-right">Rate Range (Min - Max)</th>
                               <th className="px-6 py-3 text-right">Volatility</th>
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                           {supplierData.map((s, i) => (
                               <tr key={i} className="hover:bg-slate-50/50">
                                   <td className="px-6 py-3 font-bold text-slate-700">{s.name}</td>
                                   <td className="px-6 py-3 text-center text-slate-500">{s.txCount}</td>
                                   <td className="px-6 py-3 text-right font-mono text-slate-600">{formatGrams(s.totalGramsPurchased)}</td>
                                   <td className="px-6 py-3 text-right font-mono font-medium text-slate-900">{formatCurrency(s.avgRate)}</td>
                                   <td className="px-6 py-3 text-right font-mono text-xs text-slate-500">{formatCurrency(s.minRate)} - {formatCurrency(s.maxRate)}</td>
                                   <td className="px-6 py-3 text-right font-mono text-slate-400">{formatCurrency(s.volatility)}</td>
                               </tr>
                           ))}
                       </tbody>
                   </table>
               </div>
           </div>
      </div>
  );

  const BusinessLedgerView = () => {
      const monthlyStats = useMemo(() => {
          const stats: Record<string, { date: Date, turnover: number, profit: number, qty: number }> = {};
          invoices.filter(i => i.type === 'SALE').forEach(inv => {
               const d = new Date(inv.date);
               const key = `${d.getFullYear()}-${d.getMonth()}`;
               if (!stats[key]) stats[key] = { date: new Date(d.getFullYear(), d.getMonth(), 1), turnover: 0, profit: 0, qty: 0 };
               stats[key].turnover += inv.taxableAmount || 0;
               stats[key].profit += inv.profit || 0;
               stats[key].qty += inv.quantityGrams;
          });
          return Object.values(stats).sort((a,b) => b.date.getTime() - a.date.getTime());
      }, [invoices]);

      const totals = monthlyStats.reduce((acc, m) => ({ turnover: acc.turnover + m.turnover, profit: acc.profit + m.profit, qty: acc.qty + m.qty }), { turnover: 0, profit: 0, qty: 0 });
      const totalMargin = totals.turnover > 0 ? (totals.profit / totals.turnover) * 100 : 0;

      return (
          <div className="space-y-6 animate-slide-up">
              <SectionHeader title="Business Ledger" subtitle="Lifetime monthly performance." action={<div className="flex gap-2 items-center"><ExportMenu onExport={(t) => handleLedgerExport(t, monthlyStats, {...totals, margin: totalMargin})} /></div>}/>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2">
                   <div className="p-4 bg-slate-900 rounded-xl text-white shadow-lg">
                       <p className="text-xs text-slate-400 font-bold uppercase mb-1">Lifetime Sales</p>
                       <p className="text-2xl font-mono font-bold">{formatCurrency(totals.turnover)}</p>
                   </div>
                   <div className="p-4 bg-slate-800 rounded-xl text-white shadow-lg">
                       <p className="text-xs text-slate-400 font-bold uppercase mb-1">Lifetime Profit</p>
                       <p className="text-2xl font-mono font-bold text-green-400">{formatCurrency(totals.profit)}</p>
                   </div>
                    <div className="p-4 bg-white border border-slate-200 rounded-xl text-slate-900">
                       <p className="text-xs text-slate-400 font-bold uppercase mb-1">Volume Sold</p>
                       <p className="text-2xl font-mono font-bold">{formatGrams(totals.qty)}</p>
                   </div>
                   <div className="p-4 bg-white border border-slate-200 rounded-xl text-slate-900">
                       <p className="text-xs text-slate-400 font-bold uppercase mb-1">Overall Margin</p>
                       <p className="text-2xl font-mono font-bold text-slate-900">{totalMargin.toFixed(2)}%</p>
                   </div>
              </div>

              <div className="bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden">
                   <table className="w-full text-left text-sm">
                       <thead className="bg-slate-50 text-slate-500 font-medium">
                           <tr>
                               <th className="px-6 py-3">Month</th>
                               <th className="px-6 py-3 text-right">Turnover (Ex GST)</th>
                               <th className="px-6 py-3 text-right">Profit</th>
                               <th className="px-6 py-3 text-right">Margin</th>
                               <th className="px-6 py-3 text-right">Volume</th>
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                           {monthlyStats.map((m, i) => (
                               <tr key={i} className="hover:bg-slate-50/50">
                                   <td className="px-6 py-3 font-bold text-slate-700">{m.date.toLocaleDateString('en-IN', {month: 'long', year: 'numeric'})}</td>
                                   <td className="px-6 py-3 text-right font-mono font-medium">{formatCurrency(m.turnover)}</td>
                                   <td className="px-6 py-3 text-right font-mono font-bold text-green-600">{formatCurrency(m.profit)}</td>
                                   <td className="px-6 py-3 text-right font-mono text-slate-500">{(m.turnover > 0 ? (m.profit/m.turnover)*100 : 0).toFixed(2)}%</td>
                                   <td className="px-6 py-3 text-right font-mono text-slate-600">{formatGrams(m.qty)}</td>
                               </tr>
                           ))}
                       </tbody>
                   </table>
              </div>
          </div>
      );
  };
  
  // Return Main Layout
  if (!isDataLoaded) {
      return (
          <div className="h-screen w-full flex items-center justify-center bg-slate-50 flex-col gap-4">
              <Loader2 className="w-10 h-10 text-gold-500 animate-spin" />
              <p className="text-slate-500 font-medium animate-pulse">Synchronizing Secure Ledger...</p>
          </div>
      );
  }

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab} searchQuery={searchQuery} onSearch={setSearchQuery}>
        <Toast toasts={toasts} removeToast={removeToast} />
        {/* Delete Modal */}
        {showDeleteModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-slate-200 animate-slide-up">
                    <div className="flex flex-col items-center text-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center"><Lock className="w-6 h-6"/></div>
                        <div><h3 className="text-lg font-bold text-slate-900">{pendingDeleteIds.length > 0 ? `Delete ${pendingDeleteIds.length} Items?` : 'Secure Deletion'}</h3><p className="text-xs text-slate-500 mt-1">Enter admin password to permanently delete.</p></div>
                    </div>
                    <input type="password" placeholder="Admin Password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-center mb-4 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none" />
                    <div className="flex gap-3">
                        <button onClick={() => { setShowDeleteModal(false); setDeletePassword(''); setPendingDeleteIds([]); setDeleteId(null); }} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors text-sm">Cancel</button>
                        <button onClick={confirmDelete} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20 text-sm">Delete</button>
                    </div>
                </div>
            </div>
        )}

        <div className="min-h-full pb-10">
            {activeTab === 'dashboard' && <DashboardView />}
            {activeTab === 'invoices' && <InvoicesView />}
            {activeTab === 'inventory' && (
                <div className="animate-slide-up">
                    <SectionHeader title="Inventory Management" action={<div className="flex gap-2 items-center"><ExportMenu onExport={handleInventoryExport} />{renderDateFilter()}</div>}/>
                    <InventoryTable batches={filteredInventory}/>
                </div>
            )}
            {activeTab === 'analytics' && <AnalyticsView />}
            {activeTab === 'price-analysis' && <PriceAnalysisView />}
            {activeTab === 'customer-insights' && <CustomerInsightsView />}
            {activeTab === 'supplier-insights' && <SupplierInsightsView />}
            {activeTab === 'business-ledger' && <BusinessLedgerView />}
            {activeTab === 'settings' && <SettingsView onBackup={handleBackup} onRestore={handleRestore} onReset={handleReset} />}
        </div>
    </Layout>
  );
}

export default App;
