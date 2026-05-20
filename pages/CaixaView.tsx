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
  Users
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
    deleteTransaction,
    isDarkMode
  } = useStore();

  const [activeTab, setActiveTab] = useState<'resumo'|'extrato'|'clientes'|'servicos'|'agenda'>('resumo');
  const [periodo, setPeriodo] = useState<'dia'|'semana'|'mes'|'ano'>('mes');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showLancamento, setShowLancamento] = useState(false);
  const [showAllInativos, setShowAllInativos] = useState(false);

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

  const prevRange = useMemo(() => {
    const s = new Date(dateRange.start);
    const e = new Date(dateRange.end);
    const diff = e.getTime() - s.getTime() + 86400000;
    return {
      start: new Date(s.getTime() - diff).toISOString().split('T')[0],
      end: new Date(e.getTime() - diff).toISOString().split('T')[0],
    };
  }, [dateRange]);

  const renderResumo = () => {
    const prevCompleted = appointments.filter(a => a.status === 'completed' && a.date >= prevRange.start && a.date <= prevRange.end);
    const prevFaturamento = prevCompleted.reduce((s, a) => s + (a.price || 0), 0);
    const faturamentoDiff = prevFaturamento > 0 ? ((faturamento - prevFaturamento) / prevFaturamento * 100) : null;
    const prevTicket = prevCompleted.length > 0 ? prevFaturamento / prevCompleted.length : 0;
    const ticketDiff = prevTicket > 0 ? ((ticketMedio - prevTicket) / prevTicket * 100) : null;

    const chartData = (() => {
      if (periodo === 'dia') {
        return Array.from({ length: 13 }, (_, i) => {
          const h = i + 8;
          return { label: `${h}h`, value: completedApts.filter(a => parseInt(a.time) === h).length };
        });
      }
      if (periodo === 'semana') {
        const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        return dias.map((d, i) => ({
          label: d,
          value: completedApts.filter(a => {
            const [y, m, day] = a.date.split('-').map(Number);
            return new Date(y, m - 1, day).getDay() === i;
          }).length,
        }));
      }
      if (periodo === 'mes') {
        return Array.from({ length: 5 }, (_, i) => ({
          label: `S${i + 1}`,
          value: completedApts.filter(a => {
            const day = parseInt(a.date.split('-')[2]);
            return Math.floor((day - 1) / 7) === i;
          }).length,
        }));
      }
      const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      return meses.map((m, i) => ({
        label: m,
        value: completedApts.filter(a => parseInt(a.date.split('-')[1]) - 1 === i).length,
      }));
    })();
    const maxChart = Math.max(...chartData.map(d => d.value), 1);

    const Chip = ({ titulo, valor, diff, sub }: { titulo: string; valor: string; diff?: number | null; sub?: string }) => (
      <div className="min-w-[140px] rounded-[2rem] bg-white dark:bg-[#242438] shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-4 flex flex-col gap-1 flex-shrink-0">
        <span className="text-[10px] font-bold uppercase text-[#8A98A8]">{titulo}</span>
        <span className="text-lg font-black text-[#1A2332] dark:text-white">{valor}</span>
        {diff !== undefined && diff !== null && (
          <span className={`text-[11px] font-bold flex items-center gap-0.5 ${diff >= 0 ? 'text-[#34D399]' : 'text-[#F87171]'}`}>
            {diff >= 0 ? '▲' : '▼'} {Math.abs(diff).toFixed(1)}% vs anterior
          </span>
        )}
        {sub && <span className="text-[10px] text-[#8A98A8]">{sub}</span>}
      </div>
    );

    return (
      <div className="space-y-5">
        {/* KPI cards */}
        <div className="flex overflow-x-auto gap-3 pb-2 -mx-4 px-4 hide-scrollbar">
          <Chip titulo="Faturamento" valor={formatCurrency(faturamento)} diff={faturamentoDiff} />
          <Chip titulo="Atendimentos" valor={String(atendimentos)} sub={faltas > 0 ? `${faltas} falta${faltas > 1 ? 's' : ''}` : undefined} />
          <Chip titulo="Ticket Médio" valor={formatCurrency(ticketMedio)} diff={ticketDiff} />
          <Chip titulo="Lucro Estimado" valor={formatCurrency(lucroEstimado)} sub={expenseTotal === 0 ? 'Cadastre saídas' : undefined} />
        </div>

        {/* Alerta (máx 1) */}
        {noShowRate > 20 ? (
          <div className="bg-[#FEF2F2] dark:bg-[#3A1A1A] text-[#F87171] p-3 rounded-2xl text-xs font-bold">
            🚨 {noShowRate.toFixed(1)}% das marcações resultaram em falta
          </div>
        ) : (faturamentoDiff !== null && faturamentoDiff > 30) ? (
          <div className="bg-[#F0FDF4] dark:bg-[#1A3A1A] text-[#34D399] p-3 rounded-2xl text-xs font-bold">
            🎉 Ótimo período! +{faturamentoDiff.toFixed(1)}% acima do anterior
          </div>
        ) : null}

        {/* Gráfico */}
        <div className="bg-white dark:bg-[#242438] rounded-2xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <p className="text-[10px] font-bold uppercase text-[#8A98A8] mb-3">Atendimentos no Período</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#8A98A8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#8A98A8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill="#2898D8" fillOpacity={d.value === maxChart ? 1 : 0.3} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
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
            <div key={t.id} className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#242438] shadow-[0_1px_4px_rgba(0,0,0,0.06)] group">
              <div className="absolute inset-y-0 right-0 w-20 bg-red-500 flex items-center justify-center -z-10">
                <Trash2 size={20} className="text-white" />
              </div>
              <motion.div 
                id={`tx-${t.id}`}
                className="bg-white dark:bg-[#242438] p-4 flex items-center gap-3 z-10 w-full"
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
                  <p className="text-sm font-bold text-[#1A2332] dark:text-white truncate">
                    {t.description || getCategoryLabel(t.category)}
                  </p>
                  <p className="text-[11px] text-[#8A98A8] font-medium">{t.date.split('-').reverse().join('/')} · {getCategoryLabel(t.category)}</p>
                </div>
                <div className={`text-sm font-black ${t.type === 'income' ? 'text-[#34D399]' : 'text-[#F87171]'}`}>
                  {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                </div>
              </motion.div>
            </div>
          ))
        )}

        {/* Sticky footer */}
        <div className="fixed bottom-[64px] left-0 right-0 bg-[#F4F7FB] dark:bg-[#1A1A2E] border-t border-[#D0D8E4] dark:border-[#3A3A52] p-3 flex justify-between items-center text-[10px] font-bold z-20">
          <div className="text-center">
            <p className="text-[#8A98A8] uppercase mb-1">Entradas</p>
            <p className="text-[#34D399]">{formatCurrency(incomeTotal)}</p>
          </div>
          <div className="text-center">
            <p className="text-[#8A98A8] uppercase mb-1">Saídas</p>
            <p className="text-[#F87171]">{formatCurrency(expenseTotal)}</p>
          </div>
          <div className="text-center">
            <p className="text-[#8A98A8] uppercase mb-1">Resultado</p>
            <p className={lucroEstimado >= 0 ? 'text-[#34D399]' : 'text-[#F87171]'}>{formatCurrency(lucroEstimado)}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderClientes = () => {
    // Clientes ativos: tiveram ao menos 1 completed nos últimos 60 dias (ignora filtro de período)
    const hoje = new Date();
    const sessenta = new Date(hoje);
    sessenta.setDate(hoje.getDate() - 60);
    const sessentaStr = sessenta.toISOString().split('T')[0];
    const clientesAtivos = new Set(
      appointments
        .filter(a => a.status === 'completed' && a.date >= sessentaStr)
        .map(a => a.phone)
    ).size;

    // Clientes únicos no período
    const clientesPeriodo = completedApts.reduce<Record<string, { nome: string; visitas: number; total: number }>>((acc, a) => {
      if (!acc[a.phone]) acc[a.phone] = { nome: a.clientName, visitas: 0, total: 0 };
      acc[a.phone].visitas += 1;
      acc[a.phone].total += a.price || 0;
      return acc;
    }, {});
    const clientesArr = Object.entries(clientesPeriodo).map(([phone, v]) => ({ phone, ...v }));
    const returnRate = clientesArr.length > 0
      ? (clientesArr.filter(c => c.visitas >= 2).length / clientesArr.length * 100)
      : 0;

    const topFreq = [...clientesArr].sort((a, b) => b.visitas - a.visitas).slice(0, 5);
    const topValor = [...clientesArr].sort((a, b) => b.total - a.total).slice(0, 5);

    // Clientes inativos: último completed há mais de 30 dias
    const trintaStr = (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]; })();
    const ultimoCorte: Record<string, string> = {};
    appointments.filter(a => a.status === 'completed').forEach(a => {
      if (!ultimoCorte[a.phone] || a.date > ultimoCorte[a.phone]) ultimoCorte[a.phone] = a.date;
    });
    const inativos = Object.entries(ultimoCorte)
      .filter(([, date]) => date < trintaStr)
      .map(([phone, date]) => ({
        phone,
        nome: appointments.find(a => a.phone === phone)?.clientName || phone,
        diasAtraso: Math.floor((hoje.getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)),
      }))
      .sort((a, b) => b.diasAtraso - a.diasAtraso);

    const inativosVisiveis = showAllInativos ? inativos : inativos.slice(0, 5);

    const noShowClientes = clientesArr
      .map(c => ({ ...c, faltas: appointments.filter(a => a.phone === c.phone && a.status === 'no-show' && a.date >= dateRange.start && a.date <= dateRange.end).length }))
      .filter(c => c.faltas > 0)
      .sort((a, b) => b.faltas - a.faltas)
      .slice(0, 3);

    const ClienteItem = ({ nome, sub, valor }: { nome: string; sub: string; valor: string }) => (
      <div className="flex items-center gap-3 py-2">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0 ${getAvatarColor(nome)}`}>
          {getInitials(nome)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#1A2332] dark:text-white truncate">{nome}</p>
          <p className="text-[11px] text-[#8A98A8]">{sub}</p>
        </div>
        <span className="text-sm font-black text-[#2898D8]">{valor}</span>
      </div>
    );

    return (
      <div className="space-y-4 pb-6">
        {/* KPIs */}
        <div className="flex gap-3">
          <div className="flex-1 bg-white dark:bg-[#242438] rounded-2xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
            <p className="text-[10px] font-bold uppercase text-[#8A98A8] mb-1">Clientes Ativos</p>
            <p className="text-2xl font-black text-[#1A2332] dark:text-white">{clientesAtivos}</p>
            <p className="text-[10px] text-[#8A98A8]">últimos 60 dias</p>
          </div>
          <div className="flex-1 bg-white dark:bg-[#242438] rounded-2xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
            <p className="text-[10px] font-bold uppercase text-[#8A98A8] mb-1">Retorno</p>
            <p className="text-2xl font-black text-[#1A2332] dark:text-white">{returnRate.toFixed(0)}%</p>
            <p className="text-[10px] text-[#8A98A8]">≥ 2 visitas no período</p>
          </div>
        </div>

        {/* Top frequência */}
        {topFreq.length > 0 && (
          <div className="bg-white dark:bg-[#242438] rounded-2xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
            <p className="text-[10px] font-bold uppercase text-[#8A98A8] mb-3">Mais Frequentes</p>
            {topFreq.map(c => <ClienteItem key={c.phone} nome={c.nome} sub={`${c.visitas} visita${c.visitas > 1 ? 's' : ''}`} valor={formatCurrency(c.total)} />)}
          </div>
        )}

        {/* Top valor */}
        {topValor.length > 0 && (
          <div className="bg-white dark:bg-[#242438] rounded-2xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
            <p className="text-[10px] font-bold uppercase text-[#8A98A8] mb-3">Maior Valor</p>
            {topValor.map(c => <ClienteItem key={c.phone} nome={c.nome} sub={`${c.visitas} visita${c.visitas > 1 ? 's' : ''}`} valor={formatCurrency(c.total)} />)}
          </div>
        )}

        {/* Inativos */}
        {inativos.length > 0 && (
          <div className="bg-white dark:bg-[#242438] rounded-2xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
            <p className="text-[10px] font-bold uppercase text-[#8A98A8] mb-3">Clientes Inativos</p>
            {inativosVisiveis.map(c => (
              <div key={c.phone} className="flex items-center gap-3 py-2">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0 ${getAvatarColor(c.nome)}`}>
                  {getInitials(c.nome)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#1A2332] dark:text-white truncate">{c.nome}</p>
                  <p className={`text-[11px] font-medium ${c.diasAtraso > 60 ? 'text-[#F87171]' : 'text-[#FBBF24]'}`}>
                    Último corte: {c.diasAtraso} dias atrás
                  </p>
                </div>
              </div>
            ))}
            {inativos.length > 5 && (
              <button onClick={() => setShowAllInativos(!showAllInativos)} className="mt-2 text-xs text-[#2898D8] font-bold w-full text-center">
                {showAllInativos ? 'Ver menos' : `Ver todos (${inativos.length})`}
              </button>
            )}
          </div>
        )}

        {/* No-shows */}
        {noShowClientes.length > 0 && (
          <div className="bg-white dark:bg-[#242438] rounded-2xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
            <p className="text-[10px] font-bold uppercase text-[#8A98A8] mb-3">Maiores Faltantes</p>
            {noShowClientes.map(c => <ClienteItem key={c.phone} nome={c.nome} sub="no-shows no período" valor={`${c.faltas}x`} />)}
          </div>
        )}

        {clientesArr.length === 0 && (
          <div className="flex flex-col items-center justify-center p-8 text-[#8A98A8]">
            <Users size={48} className="mb-4 opacity-50" />
            <p className="text-sm font-medium">Nenhum cliente neste período.</p>
          </div>
        )}
      </div>
    );
  };

  const renderServicos = () => {
    const servicosMap = completedApts.reduce<Record<string, { total: number; count: number }>>((acc, a) => {
      if (!acc[a.service]) acc[a.service] = { total: 0, count: 0 };
      acc[a.service].total += a.price || 0;
      acc[a.service].count += 1;
      return acc;
    }, {});

    const servicosArr = Object.entries(servicosMap)
      .map(([name, v]) => ({ name, ...v, ticket: v.count > 0 ? v.total / v.count : 0 }))
      .sort((a, b) => b.total - a.total);

    const maxTotal = servicosArr[0]?.total || 1; // fix logic here

    const PIE_COLORS = ['#2898D8', '#34D399', '#FBBF24', '#F87171', '#A78BFA'];
    const totalApts = completedApts.length;
    const pieData = (() => {
      const top = servicosArr.slice(0, 5);
      const outros = servicosArr.slice(5).reduce((s, v) => s + v.count, 0);
      const data = top.map(s => ({ name: s.name, value: s.count }));
      if (outros > 0) data.push({ name: 'Outros', value: outros });
      return data;
    })();

    if (servicosArr.length === 0) return (
      <div className="flex flex-col items-center justify-center p-8 text-[#8A98A8]">
        <Scissors size={48} className="mb-4 opacity-50" />
        <p className="text-sm font-medium">Nenhum serviço realizado neste período.</p>
      </div>
    );

    return (
      <div className="space-y-4 pb-6">
        {/* Ranking */}
        <div className="bg-white dark:bg-[#242438] rounded-2xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <p className="text-[10px] font-bold uppercase text-[#8A98A8] mb-3">Ranking por Faturamento</p>
          <div className="space-y-3">
            {servicosArr.map((s, i) => (
              <div key={s.name}>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-sm font-bold text-[#1A2332] dark:text-white truncate max-w-[55%]">{s.name}</span>
                  <span className="text-xs font-black text-[#2898D8]">{formatCurrency(s.total)}</span>
                </div>
                <div className="w-full bg-[#F4F7FB] dark:bg-[#1A1A2E] rounded-full h-1.5">
                  <div className="bg-[#2898D8] h-1.5 rounded-full" style={{ width: `${(s.total / maxTotal) * 100}%` }} />
                </div>
                <p className="text-[10px] text-[#8A98A8] mt-0.5">{s.count} atend. · ticket {formatCurrency(s.ticket)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pizza */}
        {pieData.length > 0 && (
          <div className="bg-white dark:bg-[#242438] rounded-2xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
            <p className="text-[10px] font-bold uppercase text-[#8A98A8] mb-3">Distribuição por Atendimentos</p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={70} paddingAngle={2}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => [`${((v / totalApts) * 100).toFixed(1)}%`, '']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1 mt-2">
              {pieData.map((s, i) => (
                <div key={s.name} className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-[#1A2332] dark:text-white flex-1 truncate">{s.name}</span>
                  <span className="text-[#8A98A8] font-bold">{((s.value / totalApts) * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAgenda = () => {
    // Ocupação do período
    const totalSlots = (() => {
      let count = 0;
      const d = new Date(dateRange.start);
      // to offset timezone issues we add 12 hours here
      d.setHours(12);
      const end = new Date(dateRange.end);
      end.setHours(12);
      while (d <= end) {
        const dow = d.getDay();
        const cfg = weeklySchedule[dow];
        if (cfg?.isOpen && cfg.start && cfg.end) {
          const [sh, sm] = cfg.start.split(':').map(Number);
          const [eh, em] = cfg.end.split(':').map(Number);
          count += Math.floor(((eh * 60 + em) - (sh * 60 + sm)) / 30);
        }
        d.setDate(d.getDate() + 1);
      }
      return count;
    })();
    const usedSlots = completedApts.length + noShowApts.length;
    const ocupacao = totalSlots > 0 ? Math.round((usedSlots / totalSlots) * 100) : 0;
    const ocupacaoColor = ocupacao >= 70 ? '#34D399' : ocupacao >= 40 ? '#FBBF24' : '#F87171';

    // Dias mais movimentados (histórico completo)
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const porDia = [0, 0, 0, 0, 0, 0, 0];
    appointments.filter(a => a.status === 'completed').forEach(a => {
      const [y, m, d] = a.date.split('-').map(Number);
      porDia[new Date(y, m - 1, d).getDay()]++;
    });
    const maxDia = Math.max(...porDia, 1);

    // Horários de pico (histórico completo)
    const picoManha = [0, 0, 0, 0, 0, 0, 0];
    const picoTarde = [0, 0, 0, 0, 0, 0, 0];
    const picoNoite = [0, 0, 0, 0, 0, 0, 0];
    appointments.filter(a => a.status === 'completed').forEach(a => {
      const [y, m, d] = a.date.split('-').map(Number);
      const dow = new Date(y, m - 1, d).getDay();
      const h = parseInt(a.time?.split(':') || '0');
      if (h >= 8 && h < 12) picoManha[dow]++;
      else if (h >= 12 && h < 17) picoTarde[dow]++;
      else if (h >= 17 && h < 21) picoNoite[dow]++;
    });
    const maxPico = Math.max(...picoManha, ...picoTarde, ...picoNoite, 1);

    return (
      <div className="space-y-4 pb-6">
        {/* Ocupação */}
        <div className="bg-white dark:bg-[#242438] rounded-2xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <div className="flex justify-between items-baseline mb-2">
            <p className="text-[10px] font-bold uppercase text-[#8A98A8]">Taxa de Ocupação</p>
            <span className="text-2xl font-black" style={{ color: ocupacaoColor }}>{ocupacao}%</span>
          </div>
          <div className="w-full bg-[#F4F7FB] dark:bg-[#1A1A2E] rounded-full h-3">
            <div className="h-3 rounded-full transition-all" style={{ width: `${ocupacao}%`, backgroundColor: ocupacaoColor }} />
          </div>
          <p className="text-[11px] text-[#8A98A8] mt-1">{usedSlots} de {totalSlots} slots utilizados</p>
        </div>

        {/* Impacto no-show */}
        {faltas > 0 && (
          <div className="bg-[#FEF2F2] dark:bg-[#3A1A1A] rounded-2xl p-4">
            <p className="text-[10px] font-bold uppercase text-[#F87171] mb-1">Impacto das Faltas</p>
            <p className="text-sm text-[#F87171] font-bold">
              {faltas} falta{faltas > 1 ? 's' : ''} × {formatCurrency(ticketMedio)} = <span className="text-lg font-black">{formatCurrency(faltas * ticketMedio)}</span> perdidos
            </p>
          </div>
        )}

        {/* Dias movimentados */}
        <div className="bg-white dark:bg-[#242438] rounded-2xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <p className="text-[10px] font-bold uppercase text-[#8A98A8] mb-3">Dias Mais Movimentados</p>
          <div className="space-y-2">
            {diasSemana.map((d, i) => (
              <div key={d} className="flex items-center gap-2">
                <span className="text-xs text-[#8A98A8] w-8">{d}</span>
                <div className="flex-1 bg-[#F4F7FB] dark:bg-[#1A1A2E] rounded-full h-2">
                  <div className="bg-[#2898D8] h-2 rounded-full" style={{ width: `${(porDia[i] / maxDia) * 100}%` }} />
                </div>
                <span className="text-xs font-bold text-[#1A2332] dark:text-white w-6 text-right">{porDia[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Horários de pico */}
        <div className="bg-white dark:bg-[#242438] rounded-2xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <p className="text-[10px] font-bold uppercase text-[#8A98A8] mb-3">Horários de Pico</p>
          <div className="grid grid-cols-8 gap-1 text-center">
            <div className="text-[9px] text-[#8A98A8]"></div>
            {diasSemana.map(d => <div key={d} className="text-[9px] text-[#8A98A8] font-bold">{d}</div>)}
            {[{ label: 'Manhã', data: picoManha }, { label: 'Tarde', data: picoTarde }, { label: 'Noite', data: picoNoite }].map(row => (
              <React.Fragment key={row.label}>
                <div className="text-[9px] text-[#8A98A8] flex items-center">{row.label}</div>
                {row.data.map((v, i) => (
                  <div key={i} className="h-6 rounded" style={{ backgroundColor: `rgba(40,152,216,${v / maxPico})` }} />
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    );
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
    <div className="w-full h-full flex flex-col bg-[#F4F7FB] dark:bg-[#1A1A2E]">
      {/* Header */}
      <div className="px-4 py-4 flex items-center justify-between sticky top-0 bg-[#F4F7FB] dark:bg-[#1A1A2E] z-30">
        <h1 className="text-lg font-black text-[#1A2332] dark:text-white flex items-center gap-2">
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
      <div className="px-4 pb-4 sticky top-[60px] bg-[#F4F7FB] dark:bg-[#1A1A2E] z-30 space-y-3">
        <div className="flex gap-2 w-full">
          {(['dia', 'semana', 'mes', 'ano'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={`flex-1 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors ${
                periodo === p ? 'bg-[#2898D8] text-white shadow-md' : 'bg-white dark:bg-[#242438] text-[#8A98A8]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between bg-white dark:bg-[#242438] rounded-2xl p-2 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <button onClick={handlePrev} className="p-1 text-[#8A98A8] hover:text-[#2898D8]">
            <ChevronLeft size={20} />
          </button>
          <span className="text-xs font-bold text-[#1A2332] dark:text-white uppercase">{getPeriodLabel()}</span>
          <button onClick={handleNext} className="p-1 text-[#8A98A8] hover:text-[#2898D8]">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pb-4 sticky top-[152px] bg-[#F4F7FB] dark:bg-[#1A1A2E] z-30">
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

