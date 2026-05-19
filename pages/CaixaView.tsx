import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, 
  Smile, 
  Package, 
  Scissors, 
  Home, 
  ShoppingBag, 
  Wrench, 
  CreditCard, 
  CircleDollarSign,
  Plus,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart, 
  Pie
} from 'recharts';
import { AnimatePresence, motion } from 'motion/react';
import { useStore } from '../context/Store';
import { LancamentoModal } from '../components/LancamentoModal';
import { formatCurrency, getAvatarColor, getInitials } from '../utils/helpers';
import { Transaction } from '../types';
import { useSwipe } from '../hooks/useSwipe';

export const CaixaView: React.FC = () => {
  const { 
    transactions, 
    appointments, 
    customers, 
    services, 
    weeklySchedule, 
    loadTransactions, 
    deleteTransaction 
  } = useStore();

  const [activeTab, setActiveTab] = useState<'resumo'|'extrato'|'clientes'|'servicos'|'agenda'>('resumo');
  const [periodo, setPeriodo] = useState<'dia'|'semana'|'mes'|'ano'>('mes');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showLancamento, setShowLancamento] = useState(false);

  // Determine start/end of the current period
  const dateRange = useMemo(() => {
    const d = new Date(selectedDate);
    const start = new Date(d);
    const end = new Date(d);

    if (periodo === 'dia') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (periodo === 'semana') {
      const day = d.getDay();
      start.setDate(d.getDate() - day);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (periodo === 'mes') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(start.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
    } else if (periodo === 'ano') {
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
    }
    
    return { 
      start: start.toISOString().split('T')[0], 
      end: end.toISOString().split('T')[0] 
    };
  }, [periodo, selectedDate]);

  useEffect(() => {
    loadTransactions(dateRange.start, dateRange.end);
  }, [dateRange.start, dateRange.end]);

  const handlePrev = () => {
    const d = new Date(selectedDate);
    if (periodo === 'dia') d.setDate(d.getDate() - 1);
    if (periodo === 'semana') d.setDate(d.getDate() - 7);
    if (periodo === 'mes') d.setMonth(d.getMonth() - 1);
    if (periodo === 'ano') d.setFullYear(d.getFullYear() - 1);
    setSelectedDate(d);
  };

  const handleNext = () => {
    const d = new Date(selectedDate);
    if (periodo === 'dia') d.setDate(d.getDate() + 1);
    if (periodo === 'semana') d.setDate(d.getDate() + 7);
    if (periodo === 'mes') d.setMonth(d.getMonth() + 1);
    if (periodo === 'ano') d.setFullYear(d.getFullYear() + 1);
    setSelectedDate(d);
  };

  // Determine dark mode based on html class
  const isDarkMode = document.documentElement.classList.contains('dark');

  // Filter local state appointments for current period
  const periodAppointments = useMemo(() => {
    return appointments.filter(a => a.date >= dateRange.start && a.date <= dateRange.end);
  }, [appointments, dateRange]);

  const completedApts = periodAppointments.filter(a => a.status === 'completed');
  const noShowApts = periodAppointments.filter(a => a.status === 'no-show');
  
  // KPI Calculations
  const faturamento = completedApts.reduce((sum, a) => sum + (a.price || 0), 0);
  const atendimentos = completedApts.length;
  const faltas = noShowApts.length;
  const ticketMedio = atendimentos > 0 ? faturamento / atendimentos : 0;
  const noShowRate = (atendimentos + faltas) > 0 ? (faltas / (atendimentos + faltas)) * 100 : 0;
  
  const incomeTotal = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expenseTotal = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const lucroEstimado = incomeTotal - expenseTotal;

  // Render sub-views (simplified for space)
  const renderResumo = () => {
    return (
      <div className="space-y-6">
        <div className="flex overflow-x-auto gap-4 pb-2 hide-scrollbar">
          <div className="min-w-[140px] rounded-[2rem] bg-white dark:bg-[#242424] shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-4 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase text-[#8A98A8]">Faturamento</span>
            <span className="text-lg font-black text-slate-800 dark:text-white mt-1">{formatCurrency(faturamento * 100)}</span>
          </div>
          <div className="min-w-[140px] rounded-[2rem] bg-white dark:bg-[#242424] shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-4 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase text-[#8A98A8]">Atendimentos</span>
            <span className="text-lg font-black text-slate-800 dark:text-white mt-1">{atendimentos} <span className="text-xs text-red-400 font-normal ml-1">({faltas} faltas)</span></span>
          </div>
          <div className="min-w-[140px] rounded-[2rem] bg-white dark:bg-[#242424] shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-4 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase text-[#8A98A8]">Ticket Médio</span>
            <span className="text-lg font-black text-slate-800 dark:text-white mt-1">{formatCurrency(ticketMedio * 100)}</span>
          </div>
          <div className="min-w-[140px] rounded-[2rem] bg-white dark:bg-[#242424] shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-4 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase text-[#8A98A8]">Lucro Estimado</span>
            <span className="text-lg font-black text-slate-800 dark:text-white mt-1">{formatCurrency(lucroEstimado * 100)}</span>
            <span className="text-[9px] text-[#8A98A8] mt-1">{expenseTotal === 0 ? 'Cadastre saídas' : ''}</span>
          </div>
        </div>

        {/* Alerts */}
        {noShowRate > 20 && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-[2rem] text-sm font-medium flex items-center gap-2">
            🚨 {noShowRate.toFixed(1)}% das marcações resultaram em falta
          </div>
        )}
      </div>
    );
  };

  const getIcon = (category: string) => {
    switch(category) {
      case 'tip': return <Smile size={18} />;
      case 'product': return <Package size={18} />;
      case 'walk_in': return <Scissors size={18} />;
      case 'rent': return <Home size={18} />;
      case 'supply': return <ShoppingBag size={18} />;
      case 'equipment': return <Wrench size={18} />;
      case 'fee': return <CreditCard size={18} />;
      default: return <CircleDollarSign size={18} />;
    }
  };

  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      tip: 'Gorjeta', product: 'Produto', walk_in: 'Serviço Avulso', rent: 'Aluguel',
      supply: 'Insumos', equipment: 'Equipamento', fee: 'Taxa/Maquininha', other: 'Outro'
    };
    return labels[cat] || cat;
  };

  const renderExtrato = () => {
    return (
      <div className="space-y-4 pb-20">
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-[#8A98A8]">
            <Wallet size={48} className="mb-4 opacity-50" />
            <p className="text-sm font-medium">Nenhum lançamento neste período.</p>
          </div>
        ) : (
          transactions.map(t => (
            <div key={t.id} className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#242424] shadow-[0_1px_4px_rgba(0,0,0,0.06)] group">
              <div className="absolute inset-y-0 right-0 w-20 bg-red-500 flex items-center justify-center -z-10">
                <Trash2 size={20} className="text-white" />
              </div>
              <motion.div 
                id={`tx-${t.id}`}
                className="bg-white dark:bg-[#242424] p-4 flex items-center gap-3 z-10 w-full"
                drag="x"
                dragConstraints={{ left: -80, right: 0 }}
                onDragEnd={(e, info) => {
                  if (info.offset.x < -40) {
                    deleteTransaction(t.id);
                  }
                }}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-[#34D399]/20 text-[#34D399]' : 'bg-[#F87171]/20 text-[#F87171]'}`}>
                  {getIcon(t.category)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                    {t.description || getCategoryLabel(t.category)}
                  </p>
                  <p className="text-[11px] text-[#8A98A8] font-medium">{t.date.split('-').reverse().join('/')} · {getCategoryLabel(t.category)}</p>
                </div>
                <div className={`text-sm font-black ${t.type === 'income' ? 'text-[#34D399]' : 'text-[#F87171]'}`}>
                  {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount * 100)}
                </div>
              </motion.div>
            </div>
          ))
        )}

        {/* Sticky footer */}
        <div className="fixed bottom-[64px] left-0 right-0 bg-[#F4F7FB] dark:bg-[#1A1A1A] border-t border-[#E8EEF5] dark:border-[#2F2F2F] p-3 flex justify-between items-center text-[10px] font-bold z-20">
          <div className="text-center">
            <p className="text-[#8A98A8] uppercase mb-1">Entradas</p>
            <p className="text-[#34D399]">{formatCurrency(incomeTotal * 100)}</p>
          </div>
          <div className="text-center">
            <p className="text-[#8A98A8] uppercase mb-1">Saídas</p>
            <p className="text-[#F87171]">{formatCurrency(expenseTotal * 100)}</p>
          </div>
          <div className="text-center">
            <p className="text-[#8A98A8] uppercase mb-1">Resultado</p>
            <p className={lucroEstimado >= 0 ? 'text-[#34D399]' : 'text-[#F87171]'}>{formatCurrency(lucroEstimado * 100)}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderClientes = () => {
    return <div className="text-center p-8 text-[#8A98A8]">Aba Clientes em construção.</div>;
  };

  const renderServicos = () => {
    return <div className="text-center p-8 text-[#8A98A8]">Aba Serviços em construção.</div>;
  };
  
  const renderAgenda = () => {
    return <div className="text-center p-8 text-[#8A98A8]">Aba Agenda em construção.</div>;
  };

  const getPeriodLabel = () => {
    if (periodo === 'dia') return selectedDate.toLocaleDateString('pt-BR');
    if (periodo === 'semana') return `${dateRange.start.split('-').reverse().join('/')} - ${dateRange.end.split('-').reverse().join('/')}`;
    if (periodo === 'mes') {
      const mos = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      return `${mos[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
    }
    return `${selectedDate.getFullYear()}`;
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#F4F7FB] dark:bg-[#121212]">
      {/* Header */}
      <div className="px-4 py-4 flex items-center justify-between sticky top-0 bg-[#F4F7FB] dark:bg-[#121212] z-30">
        <h1 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
          <Wallet className="text-[#2898D8]" />
          Caixa
        </h1>
        <button
          onClick={() => setShowLancamento(true)}
          className="flex items-center gap-1 bg-[#2898D8] text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-md"
        >
          <Plus size={16} /> Lançar
        </button>
      </div>

      {/* Period Chips & Navigator */}
      <div className="px-4 pb-4 sticky top-[60px] bg-[#F4F7FB] dark:bg-[#121212] z-30 space-y-3">
        <div className="flex gap-2 w-full">
          {(['dia', 'semana', 'mes', 'ano'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={`flex-1 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors ${
                periodo === p ? 'bg-[#2898D8] text-white shadow-md' : 'bg-white dark:bg-[#242424] text-[#8A98A8]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between bg-white dark:bg-[#242424] rounded-2xl p-2 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <button onClick={handlePrev} className="p-1 text-[#8A98A8] hover:text-[#2898D8]">
            <ChevronLeft size={20} />
          </button>
          <span className="text-xs font-bold text-slate-800 dark:text-white uppercase">{getPeriodLabel()}</span>
          <button onClick={handleNext} className="p-1 text-[#8A98A8] hover:text-[#2898D8]">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pb-4 sticky top-[152px] bg-[#F4F7FB] dark:bg-[#121212] z-30">
        <div className="flex overflow-x-auto gap-2 hide-scrollbar pb-1">
          {(['resumo','extrato','clientes','servicos','agenda'] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                activeTab === t ? 'bg-[#2898D8]/10 text-[#2898D8]' : 'text-[#8A98A8]'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 w-full max-w-full overflow-x-hidden pt-2 pb-[100px]">
        {activeTab === 'resumo' && renderResumo()}
        {activeTab === 'extrato' && renderExtrato()}
        {activeTab === 'clientes' && renderClientes()}
        {activeTab === 'servicos' && renderServicos()}
        {activeTab === 'agenda' && renderAgenda()}
      </div>

      {/* Modal */}
      <LancamentoModal 
        isOpen={showLancamento} 
        onClose={() => setShowLancamento(false)} 
        isDarkMode={isDarkMode} 
      />
    </div>
  );
};
